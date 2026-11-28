import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getCategoryCounts, getListing, getFreshGroups, PAGE_SIZE } from "@/lib/cached";
import { rankGroups, shuffleGroups } from "@/lib/ranking";
import { sanitizeSearchTerm } from "@/lib/search";
import { PLATFORM_LIST, PLATFORMS, type Platform } from "@/lib/platforms";
import type { Category, Group } from "@/lib/types";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import PlatformTabs from "@/components/PlatformTabs";
import CategoryScroll from "@/components/CategoryScroll";
import InfiniteGroups from "@/components/InfiniteGroups";
import GroupCard from "@/components/GroupCard";
import PlatformIcon from "@/components/PlatformIcon";
import Footer from "@/components/Footer";
import SeoContent from "@/components/SeoContent";
import JsonLd from "@/components/JsonLd";
import { HOME_SEO, PLATFORM_SEO, categoryIntro } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import Link from "next/link";

interface Props {
  /** undefined = all platforms (homepage) */
  platform?: Platform;
  categorySlug?: string;
  searchParams: { search?: string; shuffle?: string; page?: string; sort?: string };
}

/**
 * One listing component for "/", "/[platform]" and "/[platform]/category/[slug]"
 * so all three behave identically (search, shuffle, pagination, vote/save state).
 */
export default async function ListingPage({ platform, categorySlug, searchParams }: Props) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const isShuffle = !!searchParams.shuffle;
  const sort = searchParams.sort === "new" || searchParams.sort === "members" ? searchParams.sort : "top";
  const isHome = !platform && !searchParams.search;
  const basePath = platform ? (categorySlug ? `/${platform}/category/${categorySlug}` : `/${platform}`) : "/";

  // Categories (cached 30 min, shared by everyone).
  let categories: Category[] = [];
  let category: Category | null = null;
  if (platform) {
    categories = await getCategories(platform);
    if (categorySlug) category = categories.find((c) => c.slug === categorySlug) ?? null;
  }
  // Empty categories are dead-ends for visitors and Google: hide them (a missing count = unknown = keep it)
  const counts = platform ? await getCategoryCounts(platform) : {};
  const visibleCategories = categories.filter((c) => counts[c.id] === undefined || counts[c.id] > 0 || c.slug === categorySlug);
  // undefined = no category filter; null = unknown category slug (matches nothing)
  const categoryId = categorySlug ? category?.id ?? null : undefined;
  const safeSearch = searchParams.search ? sanitizeSearchTerm(searchParams.search) : "";

  // "Fresh" row: brand-new listings with few votes would otherwise sit at the bottom forever (cold start).
  // Only on the plain first page of the default sort.
  const wantFresh = !searchParams.search && page === 1 && !isShuffle && sort === "top";

  // Session check only for visitors who actually have a login cookie: anonymous visitors cost zero extra network calls.
  const hasSession = cookies()
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  const supabase = createClient();

  const [{ rows: groupsRaw, count }, freshRaw, userRes] = await Promise.all([
    getListing({ platform, categoryId, search: safeSearch || undefined, sort, page, shuffle: isShuffle }),
    wantFresh ? getFreshGroups(platform ?? null, categoryId) : Promise.resolve([] as Group[]),
    hasSession ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
  ]);
  const user = userRes.data.user;
  const fresh = freshRaw.filter((g, i, arr) => arr.findIndex((x) => x.invite_link.toLowerCase() === g.invite_link.toLowerCase()) === i);
  const seenLinks = new Set<string>();
  const groups = groupsRaw.filter((g) => {
    const k = g.invite_link.toLowerCase();
    if (seenLinks.has(k)) return false;
    seenLinks.add(k);
    return true;
  });
  const totalPages = isShuffle ? 1 : Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const ranked = isShuffle ? shuffleGroups(groups) : sort === "top" ? rankGroups(groups) : groups;

  // Current user's votes + saves for what's on screen, so the cards render the
  // right state immediately.
  let voteMap: Record<string, "up" | "down"> = {};
  let savedSet = new Set<string>();
  const shown = [...groups, ...fresh];
  if (user && shown.length > 0) {
    const ids = shown.map((g) => g.id);
    const [{ data: votes }, { data: saves }] = await Promise.all([
      supabase.from("votes").select("group_id, value").eq("user_id", user.id).in("group_id", ids),
      supabase.from("saved_groups").select("group_id").eq("user_id", user.id).in("group_id", ids),
    ]);
    voteMap = Object.fromEntries((votes ?? []).map((v) => [v.group_id, v.value]));
    savedSet = new Set((saves ?? []).map((s) => s.group_id));
  }

  const platformLabel = platform ? PLATFORMS[platform].label : "";
  const heading = searchParams.search
    ? `Results for "${searchParams.search}"`
    : category
    ? `${category.name} groups`
    : platform
    ? "All groups"
    : "All groups";

  // Only the first, unfiltered page carries the long copy (avoids duplicate text on search/sort/pages)
  const showSeo = !searchParams.search && page === 1 && !isShuffle && sort === "top";

  const crumbs = [{ name: "Home", url: SITE_URL + "/" }];
  if (platform) crumbs.push({ name: platformLabel, url: `${SITE_URL}/${platform}` });
  if (platform && category) crumbs.push({ name: category.name, url: `${SITE_URL}/${platform}/category/${category.slug}` });
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ranked.slice(0, 20).map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.name,
      url: `${SITE_URL}/g/${g.id}`,
    })),
  };

  const body = (
    <>
      <section className="max-w-6xl mx-auto px-4 mt-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold">{heading}</h2>
          <Link href={isShuffle ? basePath : `${basePath}?shuffle=1`} className="btn-ghost text-sm !py-1.5 !px-3 gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            Shuffle
          </Link>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar" role="tablist" aria-label="Sort">
          {(
            [
              ["top", "Top"],
              ["new", "New"],
              ["members", "Biggest"],
            ] as const
          ).map(([key, label]) => {
            const params = new URLSearchParams();
            if (searchParams.search) params.set("search", searchParams.search);
            if (key !== "top") params.set("sort", key);
            const qs = params.toString();
            const on = !isShuffle && sort === key;
            return (
              <Link
                key={key}
                href={qs ? `${basePath}?${qs}` : basePath}
                role="tab"
                aria-selected={on}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  on ? "bg-fg/10 text-fg" : "text-muted hover:text-fg hover:bg-fg/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {fresh.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold mb-2">🆕 Fresh groups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {fresh.map((g) => (
                <GroupCard key={`fresh-${g.id}`} group={g} initialVote={voteMap[g.id] ?? null} initialSaved={savedSet.has(g.id)} />
              ))}
            </div>
          </div>
        )}

        {ranked.length > 0 ? (
          <InfiniteGroups
            key={`${basePath}|${sort}|${searchParams.search ?? ""}|${isShuffle}`}
            initialGroups={ranked}
            initialVotes={voteMap}
            initialSaved={Array.from(savedSet)}
            startPage={page}
            totalPages={totalPages}
            query={{ platform, category: categorySlug, search: searchParams.search, sort }}
          />
        ) : (
          <div className="card text-center py-12 flex flex-col items-center gap-3">
            {platform ? <PlatformIcon platform={platform} size={48} className="opacity-80" /> : null}
            <p className="font-semibold">
              {searchParams.search ? "Nothing matched your search" : `No ${platformLabel} groups here yet`}
            </p>
            <p className="text-sm text-muted max-w-sm">
              {searchParams.search
                ? "Try a different word, or browse a category."
                : "Be the first — add your group and it goes live after a quick review."}
            </p>
            <Link href={platform ? `/register?platform=${platform}` : "/register"} className="btn-primary">
              + Add your group
            </Link>
          </div>
        )}

      </section>
    </>
  );

  return (
    <div className="skin" data-skin={platform} data-platform={platform}>
      <Header />

      {/* ───────── Home hero ───────── */}
      {isHome && (
        <section className="hero-glow border-b border-border">
          <div className="max-w-6xl mx-auto px-4 pt-6 pb-5 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              Join <span className="text-accent">random group chats</span> on Instagram, Telegram &amp; Discord
            </h1>
            <p className="text-muted mt-2 max-w-xl mx-auto text-sm sm:text-base">
              Free invite links, checked by AI and ranked by votes. No login needed to join.
            </p>
            <SearchBar basePath="/" initial="" className="max-w-xl mx-auto mt-4" />
          </div>
        </section>
      )}

      {/* ───────── Platform / category banner ───────── */}
      {platform && (
        <section className="hero-glow border-b border-border">
          <div className="max-w-6xl mx-auto px-4 pt-8 pb-6 flex items-center gap-4">
            <PlatformIcon platform={platform} size={60} className="shadow-lg" />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight truncate">
                {category ? `${category.name} ${platformLabel} groups` : PLATFORM_SEO[platform].h1}
              </h1>
              <p className="text-muted text-sm sm:text-base mt-1">
                {PLATFORMS[platform].tagline}
                {typeof count === "number" ? ` · ${count.toLocaleString("en-IN")} group${count === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <Link href={`/register?platform=${platform}`} className="btn-primary ml-auto hidden sm:inline-flex shrink-0">
              + Add your group
            </Link>
          </div>
        </section>
      )}

      {!isHome && (
        <SearchBar
          basePath={basePath}
          initial={searchParams.search ?? ""}
          placeholder={platform ? `Search ${platformLabel} groups…` : "Search groups…"}
        />
      )}

      {isHome ? (
        <section className="max-w-6xl mx-auto px-4 mt-4 grid grid-cols-3 gap-2 sm:gap-4">
          {PLATFORM_LIST.map((p) => (
            <Link
              key={p}
              href={`/${p}`}
              data-platform={p}
              className="card group !p-3 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 hover:border-accent/60 transition-colors"
            >
              <PlatformIcon platform={p} size={32} />
              <div className="min-w-0 text-center sm:text-left">
                <p className="font-semibold text-sm">{PLATFORMS[p].label}</p>
                <p className="text-xs text-muted hidden sm:block">{PLATFORMS[p].tagline}</p>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        !platform && <PlatformTabs active={platform} />
      )}

      {platform && <CategoryScroll categories={visibleCategories} platform={platform} activeSlug={categorySlug} />}

      {body}

      {showSeo && isHome && <SeoContent heading="Random group chats for everyone" paragraphs={HOME_SEO.intro} faqs={HOME_SEO.faqs} />}
      {showSeo && platform && !category && (
        <SeoContent
          heading={`About ${platformLabel} groups`}
          paragraphs={PLATFORM_SEO[platform].intro}
          faqs={PLATFORM_SEO[platform].faqs}
        />
      )}
      {showSeo && platform && category && (
        <SeoContent heading={`${category.name} ${platformLabel} groups`} paragraphs={[categoryIntro(platformLabel, category.name)]} />
      )}

      <JsonLd data={breadcrumbLd} />
      {ranked.length > 0 && <JsonLd data={itemListLd} />}

      <Footer />
    </div>
  );
}
