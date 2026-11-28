import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { serverError } from "@/lib/http";
import { invalidateGroups } from "@/lib/cached";
import { PUBLIC_STATUSES } from "@/lib/types";

const VALID_TYPES = ["full", "broken_invite", "spam", "other"] as const;
type ReportType = (typeof VALID_TYPES)[number];

// Auto-moderation thresholds. Only reports from TRUSTED reporters count towards them
// (account older than 3 days, not banned) — so 5 fresh Google accounts can't take down a rival's group.
// Every report is still stored and shown in the admin panel (groups with 2+ reports are listed there).
const FULL_REPORTS_TO_MARK_FULL = 3; // -> status "possibly_full" (🔴)
const BROKEN_REPORTS_TO_HIDE = 5; // -> back to the admin queue ("pending")
const CONTENT_REPORTS_TO_HIDE = 3; // "spam" / "other" (inappropriate content) -> admin queue
const TRUSTED_REPORTER_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// POST /api/groups/report  { group_id, type, note? }
// "full" = "request removal" (group's slots are full)
// "broken_invite" = "link is broken"
// "spam" = "inappropriate / spam"
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;
  const limited = await rateLimit(req, "report", { limit: 10, windowMs: 60_000 }, user.id);
  if (limited) return limited;

  const { group_id, type, note } = await req.json().catch(() => ({}));
  if (typeof group_id !== "string" || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
  }

  // Three independent look-ups run in parallel (was 3 sequential round-trips -> the "hang").
  const [groupRes, existingRes, todayRes] = await Promise.all([
    admin.from("groups").select("id, status, ai_flags, owner_id").eq("id", group_id).maybeSingle(),
    admin.from("reports").select("id").eq("group_id", group_id).eq("reporter_id", user.id).eq("type", type).limit(1),
    // hard daily cap, enforced in the database (survives restarts / multiple instances)
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", user.id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const group = groupRes.data;
  if (groupRes.error) return serverError("report group lookup", groupRes.error);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.owner_id === user.id) {
    return NextResponse.json({ error: "You can't report your own group. Use My groups to edit or remove it." }, { status: 400 });
  }
  if ((existingRes.data?.length ?? 0) > 0) {
    // same user already filed this exact report: treat as success, don't count twice
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if ((todayRes.count ?? 0) >= 30) {
    return NextResponse.json({ error: "Daily report limit reached." }, { status: 429 });
  }

  // Plain insert (no ON CONFLICT): works even if the unique index is missing in the live DB.
  // 23505 = unique violation (double-click / two tabs) -> already filed, fine.
  const { error: insertError } = await admin.from("reports").insert({
    group_id,
    reporter_id: user.id,
    type: type as ReportType,
    note: typeof note === "string" ? note.slice(0, 300) : null,
  });
  if (insertError && insertError.code !== "23505") return serverError("report insert", insertError);

  // Count distinct reporters per type, split into "all" (shown to admin) and "trusted" (drives auto-actions)
  const { data: rows, error: rowsError } = await admin
    .from("reports")
    .select("type, reporter_id, profiles:reporter_id(created_at, is_banned)")
    .eq("group_id", group_id);
  if (rowsError) {
    // The report itself is saved; only the auto-moderation recount failed. Don't fail the user's action.
    console.error("[report recount]", rowsError);
    return NextResponse.json({ ok: true });
  }

  const cutoff = Date.now() - TRUSTED_REPORTER_AGE_MS;
  const all: Record<string, Set<string>> = {};
  const trusted: Record<string, Set<string>> = {};
  for (const r of (rows ?? []) as any[]) {
    const rid = String(r.reporter_id ?? "");
    (all[r.type] ??= new Set()).add(rid);
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const created = p?.created_at ? new Date(p.created_at).getTime() : Date.now();
    if (!p?.is_banned && created < cutoff) (trusted[r.type] ??= new Set()).add(rid);
  }
  const n = (m: Record<string, Set<string>>, t: string) => m[t]?.size ?? 0;
  const trustedContent = n(trusted, "spam") + n(trusted, "other");

  const update: Record<string, unknown> = {
    report_full_count: n(all, "full"),
    report_broken_count: n(all, "broken_invite"),
  };

  const isLive = PUBLIC_STATUSES.includes(group.status);
  if (isLive && (n(trusted, "broken_invite") >= BROKEN_REPORTS_TO_HIDE || trustedContent >= CONTENT_REPORTS_TO_HIDE)) {
    update.status = "pending";
    update.ai_flags = Array.from(
      new Set([...(group.ai_flags ?? []), trustedContent >= CONTENT_REPORTS_TO_HIDE ? "auto_hidden_content_reports" : "auto_hidden_broken_reports"])
    );
  } else if (n(trusted, "full") >= FULL_REPORTS_TO_MARK_FULL && group.status === "active") {
    update.status = "possibly_full";
  }

  const { error: updateError } = await admin.from("groups").update(update).eq("id", group_id);
  if (updateError) console.error("[report counters update]", updateError);
  else if (update.status) invalidateGroups(); // group got hidden / marked full -> refresh lists // report is saved; counters catch up on the next report

  return NextResponse.json({ ok: true });
}
