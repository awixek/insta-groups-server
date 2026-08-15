import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const VALID_TYPES = ["full", "broken_invite", "spam", "other"] as const;
type ReportType = (typeof VALID_TYPES)[number];

// POST /api/groups/report  { group_id, type: "full" | "broken_invite" | "spam" | "other", note? }
// "full" = "request removal" (group's slots are full, ask us to take it down)
// "broken_invite" = "report" (bad link / doesn't work)
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { group_id, type, note } = await req.json();
  if (!group_id || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
  }

  // upsert instead of plain insert: if this user already filed this exact
  // report type for this group, ignore the repeat click instead of
  // inflating the report count with duplicates.
  const { error: insertError } = await supabase.from("reports").upsert(
    {
      group_id,
      reporter_id: user.id,
      type: type as ReportType,
      note: note ?? null,
    },
    { onConflict: "group_id,reporter_id,type", ignoreDuplicates: true }
  );
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Recompute the group's report counters from the reports table (source of
  // truth), same approach as the vote route. Needs the admin client since
  // regular users aren't allowed to update groups.report_* via RLS.
  const admin = createAdminClient();
  const { count: fullCount } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group_id)
    .eq("type", "full");
  const { count: brokenCount } = await admin
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group_id)
    .eq("type", "broken_invite");

  await admin
    .from("groups")
    .update({
      report_full_count: fullCount ?? 0,
      report_broken_count: brokenCount ?? 0,
    })
    .eq("id", group_id);

  return NextResponse.json({ ok: true });
}
