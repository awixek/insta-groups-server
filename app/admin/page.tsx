import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminButton from "@/components/admin/AdminButton";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminCategoryForm from "@/components/admin/AdminCategoryForm";
import SelectableList from "@/components/admin/SelectableList";
import { PLATFORM_LIST, PLATFORMS, isPlatform, type Platform } from "@/lib/platforms";
import { sanitizeSearchTerm } from "@/lib/search";
import type { Category, Group, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "queue", label: "Review queue" },
  { id: "groups", label: "All groups" },
  { id: "reports", label: "Reports" },
  { id: "users", label: "Users" },
  { id: "categories", label: "Categories" },
  { id: "log", label: "Activity log" },
] as const;

const STATUS_OPTIONS = ["active", "almost_full", "possibly_full", "pending", "rejected"].map((s) => ({
  value: s,
  label: s.replace("_", " "),
}));

const PAGE_SIZE = 25;
/** A group shows up in the Reports tab once this many DIFFERENT people have reported it. */
const REPORT_REVIEW_THRESHOLD = 2;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 mt-8">{children}</main>
      <Footer />
    </>
  );
}

interface SP {
  tab?: string;
  platform?: string;
  status?: string;
  q?: string;
  page?: string;
  min?: string; // reports tab: "1" = show every reported group, default = 2+ reporters
}

export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Shell><p className="text-muted">Login required.</p></Shell>;

  // service-role client: RLS hides pending groups / reports / emails from the
  // browser client, which is why the v1 admin page always looked empty.
  const db = createAdminClient();
  const { data: me } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return <Shell><p className="text-muted">You don&apos;t have admin access.</p></Shell>;

  const tab = TABS.some((t) => t.id === searchParams.tab) ? searchParams.tab! : "queue";
  const page = Math.max(1, Number(searchParams.page) || 1);

  // ── stats ──
  const head = { count: "exact" as const, head: true };
  const [total, pendingCount, openReports, users, banned, ...perPlatform] = await Promise.all([
    db.from("groups").select("*", head),
    db.from("groups").select("*", head).eq("status", "pending"),
    db.from("reports").select("*", head).eq("resolved", false),
    db.from("profiles").select("*", head),
    db.from("profiles").select("*", head).eq("is_banned", true),
    ...PLATFORM_LIST.map((p) => db.from("groups").select("*", head).eq("platform", p)),
  ]);

  const { data: allCats } = await db.from("categories").select("*").order("platform").order("sort_order");
  const categories = (allCats ?? []) as Category[];
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  const stat = (n: number | null, label: string, href?: string) => {
    const inner = (
      <div className="card !p-3">
        <p className="text-xl font-semibold">{n ?? 0}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
  };

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 mt-8 pb-24">
        <h1 className="text-lg font-semibold mb-4">Admin dashboard</h1>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
          {stat(total.count, "Total groups")}
          {PLATFORM_LIST.map((p, i) => (
            <div key={p}>{stat(perPlatform[i].count, `${PLATFORMS[p].emoji} ${PLATFORMS[p].label}`)}</div>
          ))}
          {stat(pendingCount.count, "Pending", "/admin?tab=queue")}
          {stat(openReports.count, "Open reports", "/admin?tab=reports")}
          {stat(users.count, "Users", "/admin?tab=users")}
          {stat(banned.count, "Banned")}
        </div>

        <nav className="flex gap-2 overflow-x-auto mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <Link key={t.id} href={`/admin?tab=${t.id}`} className={`pill ${tab === t.id ? "pill-active" : ""}`}>
              {t.label}
              {t.id === "queue" && (pendingCount.count ?? 0) > 0 ? ` (${pendingCount.count})` : ""}
              {t.id === "reports" && (openReports.count ?? 0) > 0 ? ` (${openReports.count})` : ""}
            </Link>
          ))}
        </nav>

        {tab === "queue" && <QueueTab db={db} catName={catName} />}
        {tab === "groups" && <GroupsTab db={db} sp={searchParams} page={page} categories={categories} />}
        {tab === "reports" && <ReportsTab db={db} showAll={searchParams.min === "1"} />}
        {tab === "users" && <UsersTab db={db} sp={searchParams} page={page} meId={user.id} />}
        {tab === "categories" && <CategoriesTab db={db} categories={categories} />}
        {tab === "log" && <LogTab db={db} />}
      </main>
      <Footer />
    </>
  );
}

type DB = ReturnType<typeof createAdminClient>;

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="text-xs pill !py-0.5 !px-2">
      {PLATFORMS[platform]?.emoji} {PLATFORMS[platform]?.label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted text-sm">{children}</p>;
}

// ───────────────────────── Review queue ─────────────────────────
async function QueueTab({ db, catName }: { db: DB; catName: (id: string | null) => string }) {
  const { data } = await db
    .from("groups")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  const groups = (data ?? []) as Group[];

  const items = groups.map((g) => ({
    id: g.id,
    node: (
      <div className="card">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium">{g.name}</p>
          <PlatformBadge platform={g.platform} />
        </div>
        <p className="text-sm text-muted mb-1">{g.description}</p>
        {g.ai_description && <p className="text-xs text-muted mb-1">AI summary: {g.ai_description}</p>}
        <p className="text-xs text-muted mb-1">
          Category: {catName(g.category_id)} · Flags: {g.ai_flags?.join(", ") || "none"}
        </p>
        <p className="text-xs mb-3 break-all">
          <a href={g.invite_link} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            {g.invite_link}
          </a>
        </p>
        <div className="flex gap-2 flex-wrap">
          <AdminButton url="/api/admin/groups" body={{ action: "approve", id: g.id }} label="Approve" variant="primary" />
          <AdminButton
            url="/api/admin/groups"
            body={{ action: "reject", id: g.id }}
            label="Reject"
            prompt={{ field: "reason", message: "Reason for rejection (shown to the owner):", optional: true }}
          />
          <AdminButton
            url="/api/admin/groups"
            body={{ action: "rename", id: g.id }}
            label="Rename"
            prompt={{ field: "name", message: "New name:", defaultValue: g.name }}
          />
        </div>
      </div>
    ),
  }));

  return (
    <div className="flex flex-col gap-3">
      {groups.length > 0 && (
        <div>
          <AdminButton
            url="/api/admin/groups"
            body={{ action: "bulk_reject_spam" }}
            label="Reject all AI-flagged spam"
            variant="danger"
            confirmMessage="Reject every pending group flagged as spam/scam by the AI?"
          />
        </div>
      )}
      <SelectableList
        items={items}
        emptyText="Queue is empty — nothing waiting for review."
        actions={[
          { label: "Approve selected", url: "/api/admin/groups", body: { action: "bulk_approve" }, idsField: "ids", variant: "primary", confirmMessage: "Approve {n} group(s)?" },
          { label: "Reject selected", url: "/api/admin/groups", body: { action: "bulk_reject", reason: "Rejected by admin" }, idsField: "ids", confirmMessage: "Reject {n} group(s)?" },
          { label: "Delete selected", url: "/api/admin/groups", body: { action: "bulk_delete" }, idsField: "ids", variant: "danger", confirmMessage: "PERMANENTLY delete {n} group(s)? This also removes their votes, saves and reports." },
        ]}
      />
    </div>
  );
}

// ───────────────────────── All groups ─────────────────────────
async function GroupsTab({
  db,
  sp,
  page,
  categories,
}: {
  db: DB;
  sp: SP;
  page: number;
  categories: Category[];
}) {
  const platform = isPlatform(sp.platform) ? sp.platform : "";
  const status = STATUS_OPTIONS.some((s) => s.value === sp.status) ? sp.status! : "";
  const q = sp.q ? sanitizeSearchTerm(sp.q) : "";

  let query = db.from("groups").select("*", { count: "exact" });
  if (platform) query = query.eq("platform", platform);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${q}%,invite_link.ilike.%${q}%`);
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const groups = (data ?? []) as Group[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (p: number) => {
    const params = new URLSearchParams({ tab: "groups", page: String(p) });
    if (platform) params.set("platform", platform);
    if (status) params.set("status", status);
    if (sp.q) params.set("q", sp.q);
    return `/admin?${params.toString()}`;
  };

  const input = "rounded-xl bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <>
      <form className="flex flex-wrap gap-2 mb-4" action="/admin">
        <input type="hidden" name="tab" value="groups" />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name / link" className={input} />
        <select name="platform" defaultValue={platform} className={input}>
          <option value="">All platforms</option>
          {PLATFORM_LIST.map((p) => (
            <option key={p} value={p}>{PLATFORMS[p].label}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={input}>
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="btn-primary text-sm !py-2">Filter</button>
      </form>

      <p className="text-xs text-muted mb-2">{count ?? 0} groups</p>
      <SelectableList
        emptyText="No groups match."
        items={groups.map((g) => {
          const platformCats = categories.filter((c) => c.platform === g.platform);
          return {
            id: g.id,
            node: (
              <div className="card !p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{g.name}</p>
                  <PlatformBadge platform={g.platform} />
                  <span className="text-xs text-muted">▲{g.upvotes} ▼{g.downvotes}</span>
                  {g.member_count != null && <span className="text-xs text-muted">👥 {g.member_count}</span>}
                  {(g.check_fail_count ?? 0) > 0 && <span className="text-xs text-red-400">link fails: {g.check_fail_count}</span>}
                  {(g.report_full_count > 0 || g.report_broken_count > 0) && (
                    <span className="text-xs text-amber-400">
                      full:{g.report_full_count} broken:{g.report_broken_count}
                    </span>
                  )}
                </div>
                <a href={g.invite_link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline break-all">
                  {g.invite_link}
                </a>
                <div className="flex gap-2 flex-wrap items-center mt-2">
                  <AdminSelect
                    url="/api/admin/groups"
                    baseBody={{ action: "set_status", id: g.id }}
                    field="status"
                    value={g.status}
                    options={STATUS_OPTIONS}
                  />
                  <AdminSelect
                    url="/api/admin/groups"
                    baseBody={{ action: "set_category", id: g.id }}
                    field="category_id"
                    value={g.category_id ?? ""}
                    options={[{ value: "", label: "No category" }, ...platformCats.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                  <AdminButton
                    url="/api/admin/groups"
                    body={{ action: "rename", id: g.id }}
                    label="Rename"
                    prompt={{ field: "name", message: "New name:", defaultValue: g.name }}
                  />
                  <AdminButton
                    url="/api/admin/groups"
                    body={{ action: "set_description", id: g.id }}
                    label="Edit text"
                    prompt={{ field: "description", message: "New description (10–300 chars):", defaultValue: g.description }}
                  />
                  <AdminButton
                    url="/api/admin/groups"
                    body={{ action: "delete", id: g.id }}
                    label="Delete"
                    variant="danger"
                    confirmMessage={`Permanently delete "${g.name}"? This also removes its votes, saves and reports.`}
                  />
                </div>
              </div>
            ),
          };
        })}
        actions={[
          { label: "Approve selected", url: "/api/admin/groups", body: { action: "bulk_approve" }, idsField: "ids", variant: "primary", confirmMessage: "Approve (make live) {n} group(s)?" },
          { label: "Remove selected", url: "/api/admin/groups", body: { action: "bulk_reject", reason: "Removed by admin" }, idsField: "ids", confirmMessage: "Remove (reject) {n} group(s)? They disappear from the site but can be restored." },
          { label: "Delete selected", url: "/api/admin/groups", body: { action: "bulk_delete" }, idsField: "ids", variant: "danger", confirmMessage: "PERMANENTLY delete {n} group(s)?" },
        ]}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          {page > 1 ? <Link href={href(page - 1)} className="pill">← Prev</Link> : <span className="pill opacity-40">← Prev</span>}
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          {page < totalPages ? <Link href={href(page + 1)} className="pill">Next →</Link> : <span className="pill opacity-40">Next →</span>}
        </div>
      )}
    </>
  );
}

// ───────────────────────── Reports ─────────────────────────
async function ReportsTab({ db, showAll }: { db: DB; showAll: boolean }) {
  const { data } = await db
    .from("reports")
    .select("id, type, note, created_at, group_id, reporter_id, groups(name, platform, status, invite_link), profiles:reporter_id(email)")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(1000);
  const reports = (data ?? []) as any[];

  // one card per group; "people" = DIFFERENT reporters (the same person reporting twice counts once)
  const byGroup = new Map<string, any[]>();
  for (const r of reports) byGroup.set(r.group_id, [...(byGroup.get(r.group_id) ?? []), r]);
  const rows = Array.from(byGroup.entries())
    .map(([groupId, rs]) => ({ groupId, rs, people: new Set(rs.map((r) => r.reporter_id ?? r.id)).size }))
    .sort((a, b) => b.people - a.people);

  const visible = showAll ? rows : rows.filter((r) => r.people >= REPORT_REVIEW_THRESHOLD);
  const hiddenCount = rows.length - visible.length;

  const items = visible.map(({ groupId, rs, people }) => {
    const g = rs[0].groups;
    return {
      id: groupId,
      node: (
        <div className="card text-sm">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-medium">{g?.name ?? "(deleted group)"}</p>
            {g?.platform && <PlatformBadge platform={g.platform} />}
            <span className="text-xs text-muted">{g?.status}</span>
            <span className="text-xs text-amber-400">
              {people} {people === 1 ? "person" : "people"} · {rs.length} report{rs.length > 1 ? "s" : ""}
            </span>
          </div>
          {g?.invite_link && (
            <a href={g.invite_link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline break-all">
              {g.invite_link}
            </a>
          )}
          <ul className="text-xs text-muted my-2 list-disc pl-4">
            {rs.map((r) => (
              <li key={r.id} className="flex items-center gap-2 flex-wrap">
                <span>
                  {r.type}
                  {r.note ? ` — ${r.note}` : ""} · {r.profiles?.email ?? "unknown"}
                </span>
                <AdminButton url="/api/admin/reports" body={{ action: "resolve", id: r.id }} label="Dismiss" />
              </li>
            ))}
          </ul>
          <div className="flex gap-2 flex-wrap">
            <AdminButton url="/api/admin/reports" body={{ action: "resolve_group", group_id: groupId }} label="Dismiss all" />
            <AdminButton
              url="/api/admin/reports"
              body={{ action: "remove_group", group_id: groupId }}
              label="Remove group"
              variant="danger"
              confirmMessage="Reject this group and resolve all its reports?"
            />
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <Link href="/admin?tab=reports" className={`pill ${!showAll ? "pill-active" : ""}`}>
          {REPORT_REVIEW_THRESHOLD}+ people
        </Link>
        <Link href="/admin?tab=reports&min=1" className={`pill ${showAll ? "pill-active" : ""}`}>
          All reported (1+)
        </Link>
        {!showAll && hiddenCount > 0 && (
          <span className="text-xs text-muted">{hiddenCount} group{hiddenCount > 1 ? "s" : ""} with only 1 reporter hidden</span>
        )}
      </div>
      <SelectableList
        items={items}
        emptyText={showAll ? "No open reports." : `No group has ${REPORT_REVIEW_THRESHOLD}+ reports right now.`}
        actions={[
          { label: "Remove selected", url: "/api/admin/reports", body: { action: "bulk_remove" }, idsField: "group_ids", variant: "danger", confirmMessage: "Remove (reject) {n} group(s) and resolve their reports?" },
          { label: "Dismiss selected", url: "/api/admin/reports", body: { action: "bulk_dismiss" }, idsField: "group_ids", confirmMessage: "Dismiss all reports on {n} group(s)? They stay live." },
          { label: "Delete selected", url: "/api/admin/reports", body: { action: "bulk_delete" }, idsField: "group_ids", variant: "danger", confirmMessage: "PERMANENTLY delete {n} group(s)?" },
        ]}
      />
    </div>
  );
}

// ───────────────────────── Users ─────────────────────────
async function UsersTab({ db, sp, page, meId }: { db: DB; sp: SP; page: number; meId: string }) {
  const q = sp.q ? sanitizeSearchTerm(sp.q) : "";
  let query = db.from("profiles").select("*", { count: "exact" });
  if (q) query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const profiles = (data ?? []) as Profile[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const input = "rounded-xl bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <>
      <form className="flex gap-2 mb-4" action="/admin">
        <input type="hidden" name="tab" value="users" />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search email / name" className={input} />
        <button className="btn-primary text-sm !py-2">Search</button>
      </form>
      <div className="flex flex-col gap-2">
        {profiles.map((p) => (
          <div key={p.id} className="card !p-3 text-sm flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium">
                {p.display_name ?? p.email}
                {p.is_admin && <span className="ml-2 text-xs text-accent2">admin</span>}
                {p.is_banned && <span className="ml-2 text-xs text-red-400">banned</span>}
              </p>
              <p className="text-xs text-muted">
                {p.email}
                {p.is_banned && p.ban_reason ? ` · ${p.ban_reason}` : ""}
              </p>
            </div>
            {p.id !== meId && (
              <div className="flex gap-2 flex-wrap">
                {p.is_banned ? (
                  <AdminButton url="/api/admin/users" body={{ action: "unban", user_id: p.id }} label="Unban" />
                ) : (
                  !p.is_admin && (
                    <AdminButton
                      url="/api/admin/users"
                      body={{ action: "ban", user_id: p.id }}
                      label="Ban"
                      variant="danger"
                      prompt={{ field: "reason", message: "Ban reason (optional):", optional: true }}
                    />
                  )
                )}
                {p.is_admin ? (
                  <AdminButton
                    url="/api/admin/users"
                    body={{ action: "remove_admin", user_id: p.id }}
                    label="Remove admin"
                    confirmMessage={`Remove admin rights from ${p.email}?`}
                  />
                ) : (
                  <AdminButton
                    url="/api/admin/users"
                    body={{ action: "make_admin", user_id: p.id }}
                    label="Make admin"
                    confirmMessage={`Give ${p.email} FULL admin access?`}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        {profiles.length === 0 && <Empty>No users found.</Empty>}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          {page > 1 ? <Link href={`/admin?tab=users&page=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className="pill">← Prev</Link> : <span className="pill opacity-40">← Prev</span>}
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          {page < totalPages ? <Link href={`/admin?tab=users&page=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className="pill">Next →</Link> : <span className="pill opacity-40">Next →</span>}
        </div>
      )}
    </>
  );
}

// ───────────────────────── Categories ─────────────────────────
async function CategoriesTab({ db, categories }: { db: DB; categories: Category[] }) {
  const { data } = await db.from("groups").select("category_id");
  const counts = new Map<string, number>();
  for (const r of data ?? []) if (r.category_id) counts.set(r.category_id, (counts.get(r.category_id) ?? 0) + 1);

  return (
    <>
      <AdminCategoryForm defaultPlatform="instagram" />
      {PLATFORM_LIST.map((p) => (
        <section key={p} className="mb-6">
          <h2 className="font-medium mb-2">
            {PLATFORMS[p].emoji} {PLATFORMS[p].label}
          </h2>
          <div className="flex flex-col gap-2">
            {categories
              .filter((c) => c.platform === p)
              .map((c) => (
                <div key={c.id} className="card !p-3 text-sm flex items-center justify-between gap-2 flex-wrap">
                  <p>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted"> · /{c.slug} · {counts.get(c.id) ?? 0} groups · order {c.sort_order}</span>
                  </p>
                  <div className="flex gap-2">
                    <AdminButton
                      url="/api/admin/categories"
                      body={{ action: "rename", id: c.id }}
                      label="Rename"
                      prompt={{ field: "name", message: "New display name:", defaultValue: c.name }}
                    />
                    <AdminButton
                      url="/api/admin/categories"
                      body={{ action: "reorder", id: c.id }}
                      label="Order"
                      prompt={{ field: "sort_order", message: "Sort position (1 = first):", defaultValue: String(c.sort_order) }}
                    />
                    <AdminButton
                      url="/api/admin/categories"
                      body={{ action: "delete", id: c.id }}
                      label="Delete"
                      variant="danger"
                      confirmMessage={`Delete category "${c.name}"?`}
                    />
                  </div>
                </div>
              ))}
            {categories.filter((c) => c.platform === p).length === 0 && <Empty>No categories yet.</Empty>}
          </div>
        </section>
      ))}
    </>
  );
}

// ───────────────────────── Activity log ─────────────────────────
async function LogTab({ db }: { db: DB }) {
  const { data } = await db
    .from("admin_actions")
    .select("id, action, target_type, target_id, details, created_at, profiles:admin_id(email)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as any[];
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.id} className="card !p-2.5 text-xs">
          <span className="font-medium">{r.action}</span>{" "}
          <span className="text-muted">
            by {r.profiles?.email ?? "unknown"} · {new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </span>
          {r.details && Object.keys(r.details).length > 0 && (
            <p className="text-muted break-all">{JSON.stringify(r.details)}</p>
          )}
        </div>
      ))}
      {rows.length === 0 && <Empty>No admin actions yet.</Empty>}
    </div>
  );
}
