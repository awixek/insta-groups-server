import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkInviteLink } from "@/lib/linkcheck";
import { invalidateGroups } from "@/lib/cached";
import { PUBLIC_STATUSES, type Group } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 200; // groups per run — stalest first, so every group is eventually covered
const CONCURRENCY = 20;
const TIME_BUDGET_MS = 48_000; // stop starting new chunks after this, so we always finish inside maxDuration
const DISCORD_FAILS_TO_REMOVE = 2; // Discord's API gives a real 404 -> reliable
const TELEGRAM_FAILS_TO_REVIEW = 3; // Telegram can only be guessed from a web page -> never auto-delete

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const admin = createAdminClient();
  const { data } = await admin
    .from("groups")
    .select("id, platform, invite_link, status, ai_flags, member_count, check_fail_count")
    .in("status", PUBLIC_STATUSES)
    .in("platform", ["telegram", "discord"]) // Instagram links can't be checked without login
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);
  const groups = (data ?? []) as Pick<
    Group,
    "id" | "platform" | "invite_link" | "status" | "ai_flags" | "member_count" | "check_fail_count"
  >[];

  let ok = 0, dead = 0, removed = 0, sentToReview = 0, unknown = 0, skipped = 0;

  for (let i = 0; i < groups.length; i += CONCURRENCY) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      skipped = groups.length - i;
      break;
    }
    await Promise.all(
      groups.slice(i, i + CONCURRENCY).map(async (g) => {
        const res = await checkInviteLink(g.platform, g.invite_link);
        const now = new Date().toISOString();

        if (res.state === "ok") {
          ok++;
          await admin
            .from("groups")
            .update({ last_checked_at: now, check_fail_count: 0, member_count: res.memberCount ?? g.member_count ?? null })
            .eq("id", g.id);
          return;
        }

        if (res.state === "dead" || res.state === "suspect") {
          dead++;
          const fails = (g.check_fail_count ?? 0) + 1;
          const flags = Array.from(new Set([...(g.ai_flags ?? []), "dead_link"]));

          // Confirmed dead (Discord 404 / Telegram HTTP 404): reject after 2 strikes.
          if (res.state === "dead" && fails >= DISCORD_FAILS_TO_REMOVE) {
            removed++;
            await admin
              .from("groups")
              .update({
                status: "rejected",
                rejection_reason: "Invite link expired or invalid (auto-check)",
                last_checked_at: now,
                check_fail_count: fails,
                ai_flags: flags,
              })
              .eq("id", g.id);
            return;
          }
          // Only "looks dead": after 3 strikes hide it from the public and let an admin decide.
          if (res.state === "suspect" && fails >= TELEGRAM_FAILS_TO_REVIEW) {
            sentToReview++;
            await admin
              .from("groups")
              .update({
                status: "pending",
                last_checked_at: now,
                check_fail_count: fails,
                ai_flags: Array.from(new Set([...flags, "dead_link_suspected"])),
              })
              .eq("id", g.id);
            return;
          }
          await admin.from("groups").update({ last_checked_at: now, check_fail_count: fails }).eq("id", g.id);
          return;
        }

        unknown++;
        await admin.from("groups").update({ last_checked_at: now }).eq("id", g.id);
      })
    );
  }

  if (removed + sentToReview > 0) invalidateGroups(); // dead groups just left the public lists

  return NextResponse.json({ checked: groups.length - skipped, ok, dead, removed, sentToReview, unknown, skipped });
}
