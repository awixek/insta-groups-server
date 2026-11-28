import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { evaluateSubmission, cleanName, autoDescription } from "@/lib/submission";
import { rankGroups } from "@/lib/ranking";
import { sanitizeSearchTerm } from "@/lib/search";
import { isPlatform } from "@/lib/platforms";
import { getCategories, getListing, invalidateGroups, PAGE_SIZE } from "@/lib/cached";
import { cookies } from "next/headers";
import { PUBLIC_GROUP_COLUMNS } from "@/lib/types";
import { serverError } from "@/lib/http";

const MAX_PER_DAY = 5;
const MAX_PER_DAY_NEW_ACCOUNT = 2; // accounts younger than 24h
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;

// GET /api/groups?platform=telegram&category=memes&search=foo&page=1
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "list", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  if (platform && !isPlatform(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // category slug -> id (cached), then the listing itself (cached 30 min unless it's a search)
  let categoryId: string | null | undefined = undefined;
  if (category) {
    if (platform) {
      const cats = await getCategories(platform);
      categoryId = cats.find((c) => c.slug === category)?.id ?? null;
    } else {
      const { data: cats } = await supabase.from("categories").select("id").eq("slug", category);
      categoryId = cats?.[0]?.id ?? null;
    }
    if (categoryId === null) {
      return NextResponse.json({ groups: [], page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
    }
  }
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "new" || sortParam === "members" ? sortParam : "top";
  const safeSearch = search ? sanitizeSearchTerm(search) : "";

  const listing = await getListing({ platform: platform ?? undefined, categoryId, search: safeSearch || undefined, sort, page, shuffle: false });
  if (listing.error) return serverError("groups list", new Error("listing query failed"));
  const data = listing.rows;
  const count = listing.count;

  // only logged-in visitors need the session lookup
  const hasSession = cookies().getAll().some((c) => c.name.startsWith("sb-"));
  const user = hasSession ? (await supabase.auth.getUser()).data.user : null;
  const votes: Record<string, string> = {};
  let saved: string[] = [];
  if (user && data && data.length > 0) {
    const ids = data.map((g: { id: string }) => g.id);
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from("votes").select("group_id, value").eq("user_id", user.id).in("group_id", ids),
      supabase.from("saved_groups").select("group_id").eq("user_id", user.id).in("group_id", ids),
    ]);
    for (const row of v ?? []) votes[row.group_id] = row.value;
    saved = (s ?? []).map((r) => r.group_id);
  }

  return NextResponse.json({
    votes,
    saved,
    groups: sortParam ? data : rankGroups(data),
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}

// POST /api/groups — register a new group. Runs AI moderation synchronously.
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, profile, admin } = auth;
  const limited = await rateLimit(req, "submit", { limit: 6, windowMs: 10 * 60_000 }, user.id);
  if (limited) return limited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const platform = body.platform ?? "instagram";
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // Spam defence: daily cap, stricter for brand-new accounts (admins exempt)
  if (!profile.is_admin) {
    const accountAgeMs = Date.now() - new Date(profile.created_at ?? 0).getTime();
    const limit = accountAgeMs < NEW_ACCOUNT_WINDOW_MS ? MAX_PER_DAY_NEW_ACCOUNT : MAX_PER_DAY;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("groups")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error:
            limit === MAX_PER_DAY_NEW_ACCOUNT
              ? `New accounts can register ${MAX_PER_DAY_NEW_ACCOUNT} groups per day. Try again tomorrow.`
              : `You can register up to ${MAX_PER_DAY} groups per day. Try again tomorrow.`,
        },
        { status: 429 }
      );
    }
  }

  const name = cleanName(String(body.name ?? ""));
  const description = String(body.description ?? "").trim() || autoDescription(platform, name);

  const result = await evaluateSubmission(admin, {
    platform,
    name,
    description,
    inviteLink: String(body.invite_link ?? ""),
    categorySlug: body.category_slug ? String(body.category_slug) : null,
    owner: profile,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const { data: inserted, error } = await admin
    .from("groups")
    .insert({
      owner_id: user.id,
      platform,
      name,
      description,
      ...result.fields,
    })
    .select(PUBLIC_GROUP_COLUMNS)
    .single();

  // unique index on live invite links (migration 007): a parallel duplicate submit lands here
  if (error?.code === "23505") return NextResponse.json({ error: "This group link is already registered." }, { status: 409 });
  if (error) return serverError("groups insert", error);

  invalidateGroups(); // a new live group should appear on the lists right away

  // only send the browser what it needs (not the full AI flag list / internal columns)
  return NextResponse.json({
    group: inserted,
    moderation: { reason: result.moderation.decision === "approve" && inserted.status === "active" ? "" : "Waiting for a quick review." },
  });
}
