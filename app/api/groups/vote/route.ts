import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DAILY_UPVOTE_QUOTA, DAILY_DOWNVOTE_QUOTA } from "@/lib/ranking";

// POST /api/groups/vote  { group_id, value: "up" | "down" }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { group_id, value } = await req.json();
  if (!group_id || !["up", "down", "remove"].includes(value)) {
    return NextResponse.json({ error: "Invalid vote payload" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.is_banned) return NextResponse.json({ error: "Account banned" }, { status: 403 });

  // reset daily quota if it's a new day
  const today = new Date().toISOString().slice(0, 10);
  let upUsed = profile.upvotes_used_today;
  let downUsed = profile.downvotes_used_today;
  if (profile.votes_reset_at !== today) {
    upUsed = 0;
    downUsed = 0;
  }

  const { data: existingVote } = await supabase
    .from("votes")
    .select("*")
    .eq("user_id", user.id)
    .eq("group_id", group_id)
    .maybeSingle();

  // Reddit-style un-vote: clicking the arrow you already pressed removes
  // your vote entirely. Doesn't cost quota (nothing new is being cast).
  if (value === "remove") {
    if (existingVote) {
      await supabase.from("votes").delete().eq("user_id", user.id).eq("group_id", group_id);
    }
    const { count: upCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group_id)
      .eq("value", "up");
    const { count: downCount } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group_id)
      .eq("value", "down");

    await supabase
      .from("groups")
      .update({ upvotes: upCount ?? 0, downvotes: downCount ?? 0 })
      .eq("id", group_id);

    return NextResponse.json({ ok: true, vote: null });
  }

  // Changing an existing vote doesn't cost additional quota; only a brand-new vote does.
  const isNewVote = !existingVote;

  if (isNewVote) {
    if (value === "up" && upUsed >= DAILY_UPVOTE_QUOTA) {
      return NextResponse.json({ error: "Daily upvote quota reached" }, { status: 429 });
    }
    if (value === "down" && downUsed >= DAILY_DOWNVOTE_QUOTA) {
      return NextResponse.json({ error: "Daily downvote quota reached" }, { status: 429 });
    }
  }

  // upsert vote
  const { error: voteError } = await supabase.from("votes").upsert(
    { user_id: user.id, group_id, value },
    { onConflict: "user_id,group_id" }
  );
  if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 });

  // recompute group's up/down counts from source of truth (votes table)
  const { count: upCount } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group_id)
    .eq("value", "up");
  const { count: downCount } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group_id)
    .eq("value", "down");

  await supabase
    .from("groups")
    .update({ upvotes: upCount ?? 0, downvotes: downCount ?? 0 })
    .eq("id", group_id);

  // update quota usage only if this was a new vote
  if (isNewVote) {
    await supabase
      .from("profiles")
      .update({
        upvotes_used_today: value === "up" ? upUsed + 1 : upUsed,
        downvotes_used_today: value === "down" ? downUsed + 1 : downUsed,
        votes_reset_at: today,
      })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true, vote: value });
}
