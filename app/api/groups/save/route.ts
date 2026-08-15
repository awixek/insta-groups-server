import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/groups/save  { group_id }  -> toggles save state
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { group_id } = await req.json();
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
    .select("group_id, groups(*)")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: data });
}
