import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { adminDbError } from "@/lib/http";
import { invalidateGroups } from "@/lib/cached";

const MAX_BULK = 200;
const UUID_RE = /^[0-9a-f-]{36}$/i;

// POST /api/admin/reports
// { action: "resolve", id }                      -> dismiss one report
// { action: "resolve_group", group_id }          -> dismiss every open report on a group
// { action: "remove_group", group_id }           -> reject the group + resolve its reports
// { action: "bulk_remove", group_ids: [...] }    -> reject the selected groups + resolve their reports
// { action: "bulk_dismiss", group_ids: [...] }   -> dismiss all open reports on the selected groups
// { action: "bulk_delete", group_ids: [...] }    -> permanently delete the selected groups
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const { action, id, group_id, group_ids } = await req.json().catch(() => ({}));
  const nowIso = new Date().toISOString();
  const now = { resolved: true, resolved_by: user.id, resolved_at: nowIso };

  if (action === "bulk_remove" || action === "bulk_dismiss" || action === "bulk_delete") {
    const ids: string[] = Array.isArray(group_ids) ? group_ids.filter((x: unknown) => typeof x === "string" && UUID_RE.test(x)) : [];
    if (ids.length === 0) return NextResponse.json({ error: "Select at least one group" }, { status: 400 });
    if (ids.length > MAX_BULK) return NextResponse.json({ error: `Select at most ${MAX_BULK} groups at a time` }, { status: 400 });

    if (action === "bulk_remove") {
      {
        const { error: dbErr } = await admin
        .from("groups")
        .update({ status: "rejected", rejection_reason: "Removed after user reports", reviewed_by: user.id, reviewed_at: nowIso })
        .in("id", ids);
        if (dbErr) return adminDbError("admin reports", dbErr);
      }
      {
        const { error: dbErr } = await admin.from("reports").update(now).in("group_id", ids).eq("resolved", false);
        if (dbErr) return adminDbError("admin reports", dbErr);
      }
    } else if (action === "bulk_dismiss") {
      {
        const { error: dbErr } = await admin.from("reports").update(now).in("group_id", ids).eq("resolved", false);
        if (dbErr) return adminDbError("admin reports", dbErr);
      }
    } else {
      {
        const { error: dbErr } = await admin.from("groups").delete().in("id", ids);
        if (dbErr) return adminDbError("admin reports", dbErr);
      } // reports cascade-delete with the group
    }
    await logAdminAction(admin, user.id, `report.${action}`, "group", null, { count: ids.length, ids });
    invalidateGroups();
    return NextResponse.json({ ok: true, count: ids.length });
  }

  if (action === "resolve" && id) {
    {
      const { error: dbErr } = await admin.from("reports").update(now).eq("id", id);
      if (dbErr) return adminDbError("admin reports", dbErr);
    }
    await logAdminAction(admin, user.id, "report.resolve", "report", id);
  } else if (action === "resolve_group" && group_id) {
    {
      const { error: dbErr } = await admin.from("reports").update(now).eq("group_id", group_id).eq("resolved", false);
      if (dbErr) return adminDbError("admin reports", dbErr);
    }
    await logAdminAction(admin, user.id, "report.resolve_group", "group", group_id);
  } else if (action === "remove_group" && group_id) {
    {
      const { error: dbErr } = await admin
      .from("groups")
      .update({ status: "rejected", rejection_reason: "Removed after user reports", reviewed_by: user.id, reviewed_at: nowIso })
      .eq("id", group_id);
      if (dbErr) return adminDbError("admin reports", dbErr);
    }
    {
      const { error: dbErr } = await admin.from("reports").update(now).eq("group_id", group_id).eq("resolved", false);
      if (dbErr) return adminDbError("admin reports", dbErr);
    }
    await logAdminAction(admin, user.id, "report.remove_group", "group", group_id);
  } else {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  invalidateGroups();
  return NextResponse.json({ ok: true });
}
