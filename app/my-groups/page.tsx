import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import GroupCard from "@/components/GroupCard";
import Footer from "@/components/Footer";
import type { Group } from "@/lib/types";

export default async function MyGroupsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 mt-8">
          <p className="text-muted">Login to see groups you've registered.</p>
        </main>
        <Footer />
      </>
    );
  }

  const { data } = await supabase
    .from("groups")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const groups = (data ?? []) as Group[];

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">My groups</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="text-xs text-muted mb-1">Status: {g.status}</p>
              <GroupCard group={g} />
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-muted text-sm">You haven't registered any groups yet.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
