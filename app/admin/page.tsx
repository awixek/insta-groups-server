import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Group } from "@/lib/types";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 mt-8">
          <p className="text-muted">Login required.</p>
        </main>
        <Footer />
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <>
        <Header />
        <main className="max-w-lg mx-auto px-4 mt-8">
          <p className="text-muted">You don't have admin access.</p>
        </main>
        <Footer />
      </>
    );
  }

  const { data: pending } = await supabase
    .from("groups")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { data: reports } = await supabase
    .from("reports")
    .select("*, groups(name)")
    .eq("resolved", false);

  const { count: totalGroups } = await supabase
    .from("groups")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-6">Admin dashboard</h1>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="card">
            <p className="text-2xl font-semibold">{totalGroups ?? 0}</p>
            <p className="text-sm text-muted">Total groups</p>
          </div>
          <div className="card">
            <p className="text-2xl font-semibold">{pending?.length ?? 0}</p>
            <p className="text-sm text-muted">Pending review</p>
          </div>
        </div>

        <h2 className="font-medium mb-3">Manual review queue</h2>
        <div className="flex flex-col gap-3 mb-8">
          {(pending as Group[] | null)?.map((g) => (
            <div key={g.id} className="card">
              <p className="font-medium">{g.name}</p>
              <p className="text-sm text-muted mb-2">{g.description}</p>
              <p className="text-xs text-muted mb-3">Flags: {g.ai_flags?.join(", ") || "none"}</p>
              <div className="flex gap-2">
                <form action={`/api/admin/approve?id=${g.id}`} method="post">
                  <button className="btn-primary text-sm py-1.5 px-3">Approve</button>
                </form>
                <form action={`/api/admin/reject?id=${g.id}`} method="post">
                  <button className="btn-ghost text-sm py-1.5 px-3">Reject</button>
                </form>
              </div>
            </div>
          ))}
          {(pending?.length ?? 0) === 0 && (
            <p className="text-muted text-sm">Queue is empty — AI is handling everything.</p>
          )}
        </div>

        <h2 className="font-medium mb-3">Open reports</h2>
        <div className="flex flex-col gap-3">
          {(reports as any[] | null)?.map((r) => (
            <div key={r.id} className="card text-sm">
              <p className="font-medium">{r.groups?.name}</p>
              <p className="text-muted">{r.type} {r.note ? `— ${r.note}` : ""}</p>
            </div>
          ))}
          {(reports?.length ?? 0) === 0 && (
            <p className="text-muted text-sm">No open reports.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
