import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { evaluateSubmission, cleanName } from "@/lib/submission";
import { serverError } from "@/lib/http";
import { PUBLIC_STATUSES } from "@/lib/types";
import { invalidateGroups } from "@/lib/cached";

// POST /api/groups/mine
// { action: "update", id, name, description, invite_link, category_slug? }  -> re-runs moderation
// { action: "mark_full" | "reopen" | "delete", id }
// Only the group's owner (or an admin) may do this.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, profile, admin } = auth;
  const limited = await rateLimit(req, "mine", { limit: 20, windowMs: 10 * 60_000 }, user.id);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const { action, id } = body as { action?: string; id?: string };
  if (!action || !id) return NextResponse.json({ error: "action and id required" }, { status: 400 });

  const { data: group } = await admin.from("groups").select("*").eq("id", id).maybeSingle();
  if (!group || (group.owner_id !== user.id && !profile.is_admin)) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (action === "delete") {
    await admin.from("groups").delete().eq("id", id);
    invalidateGroups();
    return NextResponse.json({ ok: true });
  }

  if (action === "mark_full") {
    if (group.status === "pending" || group.status === "rejected") {
      return NextResponse.json({ error: "Only live groups can be marked full" }, { status: 400 });
    }
    await admin.from("groups").update({ status: "possibly_full" }).eq("id", id);
    invalidateGroups();
    return NextResponse.json({ ok: true });
  }

  if (action === "reopen") {
    if (group.status !== "possibly_full" && group.status !== "almost_full") {
      return NextResponse.json({ error: "Group is not marked full" }, { status: 400 });
    }
    await admin
      .from("groups")
      .update({ status: "active", report_full_count: 0 })
      .eq("id", id);
    await admin.from("reports").delete().eq("group_id", id).eq("type", "full");
    invalidateGroups();
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    const newName = cleanName(String(body.name ?? ""));
    const newDescription = String(body.description ?? "").trim();
    const result = await evaluateSubmission(admin, {
      platform: group.platform,
      name: newName,
      description: newDescription,
      inviteLink: String(body.invite_link ?? ""),
      categorySlug: body.category_slug ? String(body.category_slug) : null,
      excludeId: id,
      owner: profile,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    // An edit must NEVER be a way to bring a hidden group back:
    //  - pending (admin queue / auto-hidden by reports) and rejected groups stay pending until an admin approves them
    //  - a live group stays live only if the AI is happy with the new text, otherwise it goes back to the queue
    const wasPublic = PUBLIC_STATUSES.includes(group.status);
    let status: "active" | "almost_full" | "possibly_full" | "pending";
    if (profile.is_admin) {
      status = wasPublic ? (result.fields.status === "active" ? group.status : "pending") : result.fields.status;
    } else if (!wasPublic) {
      status = "pending";
    } else {
      status = result.fields.status === "active" ? group.status : "pending";
    }
    const flags = wasPublic
      ? result.fields.ai_flags
      : Array.from(new Set([...(group.ai_flags ?? []), ...result.fields.ai_flags]));

    const { data: updated, error } = await admin
      .from("groups")
      .update({
        name: newName,
        description: newDescription,
        ...result.fields,
        ai_flags: flags,
        status,
        rejection_reason: null,
        check_fail_count: 0,
      })
      .eq("id", id)
      .select()
      .single();
    if (error?.code === "23505") return NextResponse.json({ error: "This group link is already registered." }, { status: 409 });
    if (error) return serverError("groups/mine update", error);
    // never send internal columns (ai_flags, reviewed_by, owner_id…) back to the browser
    const { ai_flags: _f, reviewed_by: _r, owner_id: _o, ai_reviewed_at: _a, reviewed_at: _ra, check_fail_count: _c, last_checked_at: _l, owner_verify_requested_at: _v, ...safe } = (updated ?? {}) as Record<string, unknown>;
    invalidateGroups();
    return NextResponse.json({ ok: true, group: safe });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
