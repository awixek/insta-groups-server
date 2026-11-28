import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth";
import { adminDbError } from "@/lib/http";
import { cleanName } from "@/lib/submission";
import { findBlockedTerm } from "@/lib/blocklist";
import { invalidateGroups } from "@/lib/cached";

const STATUSES = ["active", "almost_full", "possibly_full", "pending", "rejected"];
const MAX_BULK = 200;
const UUID_RE = /^[0-9a-f-]{36}$/i;

// POST /api/admin/groups
// single:  { action: "approve" | "reject" | "set_status" | "set_category" | "rename" | "set_description" | "delete", id, ... }
// bulk:    { action: "bulk_approve" | "bulk_reject" | "bulk_delete", ids: string[], reason? }
//          { action: "bulk_reject_spam" }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;

  const body = await req.json().catch(() => ({}));
  const { action, id } = body as { action?: string; id?: string };
  const review = { reviewed_by: user.id, reviewed_at: new Date().toISOString() };

  // Bulk: reject every pending group the AI flagged as spam / scam
  if (action === "bulk_reject_spam") {
    const { data: rejected, error: spamErr } = await admin
      .from("groups")
      .update({ status: "rejected", rejection_reason: "Flagged as spam", ...review })
      .eq("status", "pending")
      .overlaps("ai_flags", ["spam_language", "fake_link_pattern", "scam", "spam", "prompt_injection"])
      .select("id");
    if (spamErr) return adminDbError("admin bulk_reject_spam", spamErr);
    await logAdminAction(admin, user.id, "group.bulk_reject_spam", "group", null, { count: rejected?.length ?? 0 });
    invalidateGroups();
    return NextResponse.json({ ok: true, count: rejected?.length ?? 0 });
  }

  // Bulk actions on a hand-picked selection
  if (action === "bulk_approve" || action === "bulk_reject" || action === "bulk_delete") {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string" && UUID_RE.test(x)) : [];
    if (ids.length === 0) return NextResponse.json({ error: "Select at least one group" }, { status: 400 });
    if (ids.length > MAX_BULK) return NextResponse.json({ error: `Select at most ${MAX_BULK} groups at a time` }, { status: 400 });

    if (action === "bulk_delete") {
      {
        const { error: dbErr } = await admin.from("groups").delete().in("id", ids);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
    } else if (action === "bulk_reject") {
      const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.slice(0, 300) : "Removed by admin";
      {
        const { error: dbErr } = await admin.from("groups").update({ status: "rejected", rejection_reason: reason, ...review }).in("id", ids);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      // their open reports are handled now
      {
        const { error: dbErr } = await admin
        .from("reports")
        .update({ resolved: true, resolved_by: user.id, resolved_at: review.reviewed_at })
        .in("group_id", ids)
        .eq("resolved", false);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
    } else {
      {
        const { error: dbErr } = await admin.from("groups").update({ status: "active", rejection_reason: null, ...review }).in("id", ids);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
    }
    await logAdminAction(admin, user.id, `group.${action}`, "group", null, { count: ids.length, ids });
    invalidateGroups();
    return NextResponse.json({ ok: true, count: ids.length });
  }

  if (!action || !id) return NextResponse.json({ error: "action and id required" }, { status: 400 });

  const { data: group } = await admin.from("groups").select("id, name, platform").eq("id", id).maybeSingle();
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  switch (action) {
    case "approve": {
      {
        const { error: dbErr } = await admin.from("groups").update({ status: "active", rejection_reason: null, ...review }).eq("id", id);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      break;
    }
    case "reject": {
      const reason = typeof body.reason === "string" ? body.reason.slice(0, 300) : null;
      {
        const { error: dbErr } = await admin.from("groups").update({ status: "rejected", rejection_reason: reason, ...review }).eq("id", id);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      break;
    }
    case "set_status": {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      {
        const { error: dbErr } = await admin.from("groups").update({ status: body.status, ...review }).eq("id", id);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      break;
    }
    case "set_category": {
      if (body.category_id) {
        const { data: cat } = await admin
          .from("categories")
          .select("id, platform")
          .eq("id", body.category_id)
          .maybeSingle();
        if (!cat || cat.platform !== group.platform) {
          return NextResponse.json({ error: "Category belongs to a different platform" }, { status: 400 });
        }
        {
          const { error: dbErr } = await admin.from("groups").update({ category_id: cat.id }).eq("id", id);
          if (dbErr) return adminDbError("admin groups", dbErr);
        }
      } else {
        {
          const { error: dbErr } = await admin.from("groups").update({ category_id: null }).eq("id", id);
          if (dbErr) return adminDbError("admin groups", dbErr);
        }
      }
      break;
    }
    case "rename": {
      const name = cleanName(String(body.name ?? ""));
      if (name.length < 3 || name.length > 60) {
        return NextResponse.json({ error: "Name must be 3–60 characters" }, { status: 400 });
      }
      if (findBlockedTerm(name)) {
        return NextResponse.json({ error: "That name contains a blocked word" }, { status: 400 });
      }
      {
        const { error: dbErr } = await admin.from("groups").update({ name }).eq("id", id);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      break;
    }
    case "set_description": {
      const description = String(body.description ?? "").trim();
      if (description.length < 10 || description.length > 300) {
        return NextResponse.json({ error: "Description must be 10–300 characters" }, { status: 400 });
      }
      if (findBlockedTerm(description)) {
        return NextResponse.json({ error: "That description contains a blocked word" }, { status: 400 });
      }
      // ai_description is regenerated text of the OLD description, so clear it
      {
        const { error: dbErr } = await admin.from("groups").update({ description, ai_description: null }).eq("id", id);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      break;
    }
    case "delete": {
      {
        const { error: dbErr } = await admin.from("groups").delete().eq("id", id);
        if (dbErr) return adminDbError("admin groups", dbErr);
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await logAdminAction(admin, user.id, `group.${action}`, "group", id, {
    name: group.name,
    platform: group.platform,
    ...(body.reason ? { reason: body.reason } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.category_id ? { category_id: body.category_id } : {}),
    ...(action === "rename" ? { new_name: body.name } : {}),
  });
  invalidateGroups();
  return NextResponse.json({ ok: true });
}
