import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { moderateGroupSubmission } from "@/lib/groq";
import { rankGroups } from "@/lib/ranking";

// GET /api/groups?category=memes&search=foo
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let query = supabase
    .from("groups")
    .select("*")
    .in("status", ["active", "almost_full", "possibly_full"]);

  if (category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ groups: rankGroups(data ?? []) });
}

// POST /api/groups — register a new group. Runs AI moderation synchronously.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const { name, invite_link, description, platform = "instagram" } = body;

  if (!name || !invite_link || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: categories } = await admin.from("categories").select("*");
  const { data: recent } = await admin
    .from("groups")
    .select("name")
    .order("created_at", { ascending: false })
    .limit(200);

  const moderation = await moderateGroupSubmission({
    name,
    description,
    inviteLink: invite_link,
    categories: categories ?? [],
    recentGroupNames: (recent ?? []).map((r) => r.name),
  });

  const matchedCategory = (categories ?? []).find(
    (c) => c.slug === moderation.category_slug
  );

  const status =
    moderation.decision === "approve"
      ? "active"
      : moderation.decision === "reject"
      ? "rejected"
      : "pending"; // manual_review sits in admin queue

  const { data: inserted, error } = await admin
    .from("groups")
    .insert({
      owner_id: user.id,
      platform,
      name,
      invite_link,
      description,
      ai_description: moderation.ai_description,
      category_id: matchedCategory?.id ?? null,
      is_adult: moderation.is_adult,
      status,
      ai_flags: moderation.flags,
      ai_reviewed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ group: inserted, moderation });
}
