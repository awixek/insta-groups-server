import { createClient } from "@/lib/supabase/server";
import { rankGroups, shuffleGroups } from "@/lib/ranking";
import { sanitizeSearchTerm } from "@/lib/search";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryScroll from "@/components/CategoryScroll";
import GroupCard from "@/components/GroupCard";
import FloatingRegisterButton from "@/components/FloatingRegisterButton";
import Footer from "@/components/Footer";
import type { Group, Category } from "@/lib/types";

const PAGE_SIZE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { search?: string; shuffle?: string; page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const isShuffle = !!searchParams.shuffle;

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  let query = supabase
    .from("groups")
    .select("*", { count: "exact" })
    .in("status", ["active", "almost_full", "possibly_full"]);

  if (searchParams.search) {
    const safeSearch = sanitizeSearchTerm(searchParams.search);
    if (safeSearch) {
      query = query.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
    }
  }

  query = query.order("net_score", { ascending: false }).order("created_at", { ascending: true });

  // Shuffle mode fetches the whole filtered list and randomizes client-side,
  // so it doesn't make sense to also paginate it with a DB range.
  if (!isShuffle) {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);
  }

  const { data: groupsRaw, count } = await query;
  const groups = (groupsRaw ?? []) as Group[];
  const totalPages = isShuffle ? 1 : Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const randomPicks = shuffleGroups(groups).slice(0, 6);
  const ranked = isShuffle ? shuffleGroups(groups) : rankGroups(groups);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (searchParams.search) params.set("search", searchParams.search);
    params.set("page", String(targetPage));
    return `/?${params.toString()}`;
  }

  return (
    <>
      <Header />
      <SearchBar />
      <CategoryScroll categories={(categories ?? []) as Category[]} />

      {!searchParams.search && page === 1 && randomPicks.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-6">
          <h2 className="text-sm font-medium text-muted mb-2">Discover something new</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {randomPicks.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted">
            {searchParams.search ? `Results for "${searchParams.search}"` : "All groups"}
          </h2>
          <a
            href={searchParams.shuffle ? "/" : "/?shuffle=1"}
            className="text-sm pill"
          >
            🎲 Shuffle
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
          {ranked.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {ranked.length === 0 && (
            <p className="text-muted text-sm">No groups found yet. Be the first to register one!</p>
          )}
        </div>

        {!isShuffle && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pb-24">
            {page > 1 ? (
              <a href={pageHref(page - 1)} className="pill">← Prev</a>
            ) : (
              <span className="pill opacity-40">← Prev</span>
            )}
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <a href={pageHref(page + 1)} className="pill">Next →</a>
            ) : (
              <span className="pill opacity-40">Next →</span>
            )}
          </div>
        )}
        {(isShuffle || totalPages <= 1) && <div className="pb-24" />}
      </section>

      <FloatingRegisterButton />
      <Footer />
    </>
  );
}
