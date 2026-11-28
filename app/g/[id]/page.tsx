import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GroupCard from "@/components/GroupCard";
import JsonLd from "@/components/JsonLd";
import { PLATFORMS } from "@/lib/platforms";
import { getRelatedGroups } from "@/lib/cached";
import { compactCount } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { PUBLIC_STATUSES, PUBLIC_GROUP_COLUMNS, type Category, type Group } from "@/lib/types";

const UUID_RE = /^[0-9a-f-]{36}$/i;

const load = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  // RLS: public groups for everyone, plus the owner's own pending ones
  const { data: group } = await supabase.from("groups").select(PUBLIC_GROUP_COLUMNS).eq("id", id).maybeSingle();
  if (!group) return null;
  let category: Category | null = null;
  if (group.category_id) {
    const { data } = await supabase.from("categories").select("*").eq("id", group.category_id).maybeSingle();
    category = data as Category | null;
  }
  return { supabase, group: group as Group, category };
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await load(params.id);
  if (!r) return { title: "Group not found" };
  const { group, category } = r;
  const p = PLATFORMS[group.platform].label;
  const title = `${group.name} — ${category ? category.name + " " : ""}${p} group`;
  const description = group.ai_description || group.description;
  const isPublic = PUBLIC_STATUSES.includes(group.status);
  return {
    title,
    description,
    alternates: { canonical: `/g/${group.id}` },
    openGraph: { title, description, url: `/g/${group.id}` },
    // unlisted (pending / rejected) pages must never be indexed
    robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function GroupPage({ params }: { params: { id: string } }) {
  const r = await load(params.id);
  if (!r) notFound();
  const { supabase, group, category } = r;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let vote: "up" | "down" | null = null;
  let saved = false;
  if (user) {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from("votes").select("value").eq("user_id", user.id).eq("group_id", group.id).maybeSingle(),
      supabase.from("saved_groups").select("group_id").eq("user_id", user.id).eq("group_id", group.id).maybeSingle(),
    ]);
    vote = (v?.value as "up" | "down") ?? null;
    saved = !!s;
  }

  // more of the same kind (cached 30 min; falls back to the same platform when there is no category)
  const related: Group[] = PUBLIC_STATUSES.includes(group.status)
    ? await getRelatedGroups(group.platform, group.category_id, group.id)
    : [];

  const p = PLATFORMS[group.platform];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: group.name,
    description: group.ai_description || group.description,
    url: `${SITE_URL}/g/${group.id}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  const crumbs = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: p.label, url: `${SITE_URL}/${group.platform}` },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/${group.platform}/category/${category.slug}` }] : []),
    { name: group.name, url: `${SITE_URL}/g/${group.id}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };

  const content = (
    <main className="max-w-2xl mx-auto px-4 mt-6 pb-24">
      <nav className="text-xs text-muted mb-3">
        <Link href="/" className="hover:underline">Home</Link> ›{" "}
        <Link href={`/${group.platform}`} className="hover:underline">{p.label}</Link>
        {category && (
          <>
            {" "}› <Link href={`/${group.platform}/category/${category.slug}`} className="hover:underline">{category.name}</Link>
          </>
        )}
      </nav>

      {!PUBLIC_STATUSES.includes(group.status) && (
        <p className="card text-sm mb-3">
          This group is <b>{group.status}</b> and only visible to you
          {group.status === "rejected" && group.rejection_reason ? ` — ${group.rejection_reason}` : ""}.
        </p>
      )}

      <GroupCard group={group} initialVote={vote} initialSaved={saved} />

      <section className="mt-6 text-sm text-muted">
        <h2 className="text-fg font-semibold mb-1">About this {p.label} group</h2>
        <p>{group.description}</p>
        {category && (
          <p className="mt-2">
            Category: <Link className="text-accent underline" href={`/${group.platform}/category/${category.slug}`}>{category.name}</Link>
          </p>
        )}
        <p className="mt-2">
          {group.name} is {category ? `a ${category.name.toLowerCase()} ` : "a "}
          {p.label} group{group.member_count ? ` with about ${compactCount(group.member_count)} members` : ""}, listed on {SITE_NAME} since{" "}
          {new Date(group.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}.
          It currently has {group.upvotes} upvote{group.upvotes === 1 ? "" : "s"} from the community.
        </p>
        <h2 className="text-fg font-semibold mt-5 mb-1">How to join</h2>
        <ol className="list-decimal pl-5 flex flex-col gap-1">
          <li>Tap the Join button above. No account is needed on this site.</li>
          <li>The {p.label} invite opens in the app or browser. Make sure you are logged in to {p.label}.</li>
          <li>Accept the invite. Group admins may approve requests manually, so it can take a little while.</li>
        </ol>
        <p className="mt-3 text-xs">
          Join links are submitted by group owners and AI-checked. If it&apos;s full or broken, use ⋮ → Report on the card.
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted mb-2">More {category ? `${category.name} ` : `${p.label} `}groups</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}
    </main>
  );

  return (
    <div className="skin" data-skin={group.platform} data-platform={group.platform}>
      <Header />
      {/* JsonLd escapes "<" so a group name like </script><script>… can never break out of the tag (stored-XSS fix) */}
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      {content}
      <Footer />
    </div>
  );
}
