import { NextRequest, NextResponse } from "next/server";
import { requireUser, todayIST } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { DAILY_UPVOTE_QUOTA, DAILY_DOWNVOTE_QUOTA } from "@/lib/ranking";
import { serverError } from "@/lib/http";

// POST /api/groups/vote  { group_id, value: "up" | "down" | "remove" }
//
// The whole thing (quota check + vote write + counter recount) runs inside ONE database
// function (`cast_vote`, see supabase/migrations/004_*.sql) that locks the voter's profile row,
// so 30 parallel requests can't slip past the daily quota.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, admin } = auth;
  const limited = await rateLimit(req, "vote", { limit: 30, windowMs: 60_000 }, user.id);
  if (limited) return limited;

  const { group_id, value } = await req.json().catch(() => ({}));
  if (typeof group_id !== "string" || !["up", "down", "remove"].includes(value)) {
    return NextResponse.json({ error: "Invalid vote payload" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("cast_vote", {
    p_user: user.id,
    p_group: group_id,
    p_value: value,
    p_up_quota: DAILY_UPVOTE_QUOTA,
    p_down_quota: DAILY_DOWNVOTE_QUOTA,
    p_today: todayIST(),
  });
  if (error) return serverError("vote rpc", error);

  const r = (data ?? {}) as { ok?: boolean; error?: string; vote?: string | null; upvotes?: number; downvotes?: number };
  if (r.error === "group_not_found") return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (r.error === "quota_up") return NextResponse.json({ error: "Daily upvote quota reached" }, { status: 429 });
  if (r.error === "quota_down") return NextResponse.json({ error: "Daily downvote quota reached" }, { status: 429 });
  if (!r.ok) return serverError("vote rpc result", r);

  return NextResponse.json({ ok: true, vote: r.vote ?? null, upvotes: r.upvotes ?? 0, downvotes: r.downvotes ?? 0 });
}
