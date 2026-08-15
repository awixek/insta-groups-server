import { createClient } from "@/lib/supabase/server";
import { rankGroups, shuffleGroups } from "@/lib/ranking";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryScroll from "@/components/CategoryScroll";
import GroupCard from "@/components/GroupCard";
import FloatingRegisterButton from "@/components/FloatingRegisterButton";
import Footer from "@/components/Footer";
import type { Group, Category } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { search?: string; shuffle?: string };
}) {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  let query = supabase
    .from("groups")
    .select("*")
    .in("status", ["active", "almost_full", "possibly_full"]);

  if (searchParams.search) {
    query = query.or(
      `name.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`
    );
  }

  const { data: groupsRaw } = await query;
  const groups = (groupsRaw ?? []) as Group[];

  const randomPicks = shuffleGroups(groups).slice(0, 6);
  const ranked = searchParams.shuffle ? shuffleGroups(groups) : rankGroups(groups);

  return (
    <>
      <Header />
      <SearchBar />
      <CategoryScroll categories={(categories ?? []) as Category[]} />

      {!searchParams.search && randomPicks.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-6">
          <h2 className="text-sm font-medium text-muted mb-2">Discover something new</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {randomPicks.map((g) => (
              <div key={g.id} className="min-w-[240px]">
                <GroupCard group={g} />
              </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-24">
          {ranked.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {ranked.length === 0 && (
            <p className="text-muted text-sm">No groups found yet. Be the first to register one!</p>
          )}
        </div>
      </section>

      <FloatingRegisterButton />
      <Footer />
    </>
  );
}
