import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import GroupCard from "@/components/GroupCard";
import Footer from "@/components/Footer";
import type { Group } from "@/lib/types";

export default async function SavedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 mt-8">
          <p className="text-muted">Login to see your saved groups.</p>
        </main>
        <Footer />
      </>
    );
  }

  const { data } = await supabase
    .from("saved_groups")
    .select("groups(*)")
    .eq("user_id", user.id);

  const groups = (data ?? []).map((row: any) => row.groups) as Group[];

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">Saved groups</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {groups.length === 0 && <p className="text-muted text-sm">Nothing saved yet.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
