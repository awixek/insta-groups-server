import { createClient } from "@/lib/supabase/server";
import { rankGroups } from "@/lib/ranking";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryScroll from "@/components/CategoryScroll";
import GroupCard from "@/components/GroupCard";
import FloatingRegisterButton from "@/components/FloatingRegisterButton";
import Footer from "@/components/Footer";
import type { Group, Category } from "@/lib/types";

const PAGE_SIZE = 20;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const { data: categories } = await supabase.from("categories").select("*").order("sort_order");
  const { data: cat } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.slug)
    .single();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: groupsRaw, count } = await supabase
    .from("groups")
    .select("*", { count: "exact" })
    .eq("category_id", cat?.id ?? "")
    .in("status", ["active", "almost_full", "possibly_full"])
    .order("net_score", { ascending: false })
    .order("created_at", { ascending: true })
    .range(from, to);

  const ranked = rankGroups((groupsRaw ?? []) as Group[]);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <Header />
      <SearchBar />
      <CategoryScroll categories={(categories ?? []) as Category[]} activeSlug={params.slug} />

      <section className="max-w-5xl mx-auto px-4 mt-8">
        <h1 className="text-lg font-semibold mb-4">{cat?.name ?? params.slug}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
          {ranked.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {ranked.length === 0 && (
            <p className="text-muted text-sm">No groups in this category yet.</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pb-24">
            {page > 1 ? (
              <a href={`/category/${params.slug}?page=${page - 1}`} className="pill">← Prev</a>
            ) : (
              <span className="pill opacity-40">← Prev</span>
            )}
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <a href={`/category/${params.slug}?page=${page + 1}`} className="pill">Next →</a>
            ) : (
              <span className="pill opacity-40">Next →</span>
            )}
          </div>
        )}
        {totalPages <= 1 && <div className="pb-24" />}
      </section>

      <FloatingRegisterButton />
      <Footer />
    </>
  );
}
