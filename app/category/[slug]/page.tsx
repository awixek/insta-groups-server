import { createClient } from "@/lib/supabase/server";
import { rankGroups } from "@/lib/ranking";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryScroll from "@/components/CategoryScroll";
import GroupCard from "@/components/GroupCard";
import FloatingRegisterButton from "@/components/FloatingRegisterButton";
import Footer from "@/components/Footer";
import type { Group, Category } from "@/lib/types";

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: categories } = await supabase.from("categories").select("*").order("sort_order");
  const { data: cat } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.slug)
    .single();

  const { data: groupsRaw } = await supabase
    .from("groups")
    .select("*")
    .eq("category_id", cat?.id ?? "")
    .in("status", ["active", "almost_full", "possibly_full"]);

  const ranked = rankGroups((groupsRaw ?? []) as Group[]);

  return (
    <>
      <Header />
      <SearchBar />
      <CategoryScroll categories={(categories ?? []) as Category[]} activeSlug={params.slug} />

      <section className="max-w-5xl mx-auto px-4 mt-8">
        <h1 className="text-lg font-semibold mb-4">{cat?.name ?? params.slug}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-24">
          {ranked.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {ranked.length === 0 && (
            <p className="text-muted text-sm">No groups in this category yet.</p>
          )}
        </div>
      </section>

      <FloatingRegisterButton />
      <Footer />
    </>
  );
}
