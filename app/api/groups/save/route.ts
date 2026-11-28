import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { serverError } from "@/lib/http";
import { PUBLIC_GROUP_COLUMNS } from "@/lib/types";

// POST /api/groups/save  { group_id }  -> toggles save state
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const limited = await rateLimit(req, "save", { limit: 40, windowMs: 60_000 }, user.id);
  if (limited) return limited;

  const { group_id } = await req.json().catch(() => ({}));
  if (!group_id) return NextResponse.json({ error: "group_id required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("saved_groups")
    .select("*")
    .eq("user_id", user.id)
    .eq("group_id", group_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_groups")
      .delete()
      .eq("user_id", user.id)
      .eq("group_id", group_id);
    return NextResponse.json({ saved: false });
  } else {
    await supabase.from("saved_groups").insert({ user_id: user.id, group_id });
    return NextResponse.json({ saved: true });
  }
}

// GET /api/groups/save -> list current user's saved groups
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { data, error } = await supabase
    .from("saved_groups")
    .select(`group_id, groups(${PUBLIC_GROUP_COLUMNS})`)
    .eq("user_id", user.id);

  if (error) return serverError("saved list", error);
  return NextResponse.json({ saved: data });
}
