import { createClient, createAdminClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/auth";
import Header from "@/components/Header";
import GroupCard from "@/components/GroupCard";
import Footer from "@/components/Footer";
import OwnerActions from "@/components/OwnerActions";
import { PUBLIC_GROUP_COLUMNS, type Group } from "@/lib/types";

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

  // owner_id is not readable from the browser roles any more (privacy), so this read goes through the server client.
  const admin = createAdminClient();
  const { data } = await admin
    .from("groups")
    .select(`${PUBLIC_GROUP_COLUMNS}, click_count`)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const groups = (data ?? []) as unknown as Group[];

  // clicks on the Join button over the last 7 days (IST days)
  const since = new Date(new Date(todayIST() + "T00:00:00Z").getTime() - 6 * 86400_000).toISOString().slice(0, 10);
  const week: Record<string, number> = {};
  if (groups.length > 0) {
    const { data: clicks } = await admin
      .from("group_clicks")
      .select("group_id, clicks")
      .in("group_id", groups.map((g) => g.id))
      .gte("day", since);
    for (const c of clicks ?? []) week[c.group_id] = (week[c.group_id] ?? 0) + (c.clicks ?? 0);
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">My groups</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="text-xs text-muted mb-1">
                Status: {g.status}
                {g.status === "rejected" && g.rejection_reason ? ` — ${g.rejection_reason}` : ""}
                {g.status === "pending" ? " — waiting for review" : ""}
              </p>
              {(g.click_count ?? 0) > 0 && (
                <p className="text-xs text-muted mb-1">
                  👆 {week[g.id] ?? 0} Join clicks in the last 7 days · {g.click_count} total
                </p>
              )}
              <GroupCard group={g} />
              <OwnerActions group={g} />
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
