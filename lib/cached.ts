import { unstable_cache, revalidateTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_STATUSES, PUBLIC_GROUP_COLUMNS, type Category, type Group } from "@/lib/types";

/**
 * Public listing data is cached for 30 minutes (shared by ALL visitors) instead of hitting the
 * database on every page view. The cache is cleared immediately (invalidateGroups) whenever a group
 * goes live / is approved / rejected / removed / hidden by reports, so new groups still show up fast.
 * Vote counts are NOT invalidated per vote (that would defeat the cache) -> scores can lag up to 30 min;
 * a user's own vote is shown instantly from their own browser state.
 */
export const CACHE_SECONDS = 30 * 60;
const GROUPS_TAG = "groups";
const CATEGORIES_TAG = "categories";
const NO_CATEGORY = "00000000-0000-0000-0000-000000000000";
export const PAGE_SIZE = 50;
export const FRESH_DAYS = 7;
export const FRESH_COUNT = 3;

/** Cookie-less read-only client (anon key). Cached data must never depend on who is logged in. */
export function anon() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Call after any write that changes what the public lists show. Never throws. */
export function invalidateGroups() {
  try {
    revalidateTag(GROUPS_TAG);
    revalidateTag(CATEGORIES_TAG);
  } catch (e) {
    console.error("[invalidateGroups]", e);
  }
}

export interface ListingArgs {
  platform?: string;
  categoryId?: string | null;
  search?: string; // already sanitised
  sort: "top" | "new" | "members";
  page: number; // ignored when shuffle
  shuffle: boolean;
}

async function listingUncached(a: ListingArgs): Promise<{ rows: Group[]; count: number; error: boolean }> {
  const supabase = anon();
  let query = supabase.from("groups").select(PUBLIC_GROUP_COLUMNS, { count: "exact" }).in("status", PUBLIC_STATUSES);
  if (a.platform) query = query.eq("platform", a.platform);
  if (a.categoryId !== undefined) query = query.eq("category_id", a.categoryId ?? NO_CATEGORY);
  if (a.search) query = query.or(`name.ilike.%${a.search}%,description.ilike.%${a.search}%`);

  query =
    a.sort === "new"
      ? query.order("created_at", { ascending: false })
      : a.sort === "members"
      ? query.order("member_count", { ascending: false, nullsFirst: false }).order("net_score", { ascending: false })
      : query.order("net_score", { ascending: false }).order("created_at", { ascending: true });
  if (!a.shuffle) {
    const from = (a.page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);
  }
  const { data, count, error } = await query;
  // throw (instead of returning an empty result) so a failed query is NEVER stored in the 30-min cache
  if (error) throw new Error(`listing query failed: ${error.message}`);
  return { rows: (data ?? []) as unknown as Group[], count: count ?? 0, error: false };
}

const listingCached = unstable_cache(listingUncached, ["listing-v1"], { revalidate: CACHE_SECONDS, tags: [GROUPS_TAG] });

/** Searches are free-text (endless variations) -> not cached. Page lists are. */
export async function getListing(a: ListingArgs): Promise<{ rows: Group[]; count: number; error: boolean }> {
  try {
    // shuffle returns every row (can exceed the 2 MB cache item limit) -> not cached either
    return a.search || a.shuffle ? await listingUncached(a) : await listingCached(a);
  } catch (e) {
    console.error("[listing]", e);
    return { rows: [], count: 0, error: true };
  }
}

const categoriesCached = unstable_cache(
  async (platform: string): Promise<Category[]> => {
    const { data, error } = await anon().from("categories").select("*").eq("platform", platform).order("sort_order");
    if (error) throw new Error(`categories query failed: ${error.message}`);
    return (data ?? []) as Category[];
  },
  ["categories-v1"],
  { revalidate: CACHE_SECONDS, tags: [CATEGORIES_TAG] }
);

export async function getCategories(platform: string): Promise<Category[]> {
  try {
    return await categoriesCached(platform);
  } catch (e) {
    console.error("[categories]", e);
    return [];
  }
}

/** categoryKey: "" = no category filter, "none" = unknown category (matches nothing), otherwise the category id. */
const freshCached = unstable_cache(
  async (platform: string, categoryKey: string): Promise<Group[]> => {
    let q = anon()
      .from("groups")
      .select(PUBLIC_GROUP_COLUMNS)
      .in("status", PUBLIC_STATUSES)
      .gte("created_at", new Date(Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000).toISOString())
      .lte("net_score", 2)
      .order("created_at", { ascending: false })
      .limit(FRESH_COUNT);
    if (platform) q = q.eq("platform", platform);
    if (categoryKey) q = q.eq("category_id", categoryKey === "none" ? NO_CATEGORY : categoryKey);
    const { data, error } = await q;
    if (error) throw new Error(`fresh query failed: ${error.message}`);
    return (data ?? []) as unknown as Group[];
  },
  ["fresh-v2"],
  { revalidate: CACHE_SECONDS, tags: [GROUPS_TAG] }
);

export async function getFreshGroups(platform: string | null, categoryId: string | null | undefined): Promise<Group[]> {
  try {
    return await freshCached(platform ?? "", categoryId === undefined ? "" : categoryId === null ? "none" : categoryId);
  } catch (e) {
    console.error("[fresh]", e);
    return [];
  }
}

/** Live-group count per category id for one platform (cached). Used to hide empty categories. */
const countsCached = unstable_cache(
  async (platform: string): Promise<Record<string, number>> => {
    const supabase = anon();
    const { data: cats, error } = await supabase.from("categories").select("id").eq("platform", platform);
    if (error) throw new Error(`category counts failed: ${error.message}`);
    const entries = await Promise.all(
      (cats ?? []).map(async (c) => {
        const { count } = await supabase
          .from("groups")
          .select("id", { count: "exact", head: true })
          .eq("category_id", c.id)
          .in("status", PUBLIC_STATUSES);
        return [c.id as string, count ?? 0] as const;
      })
    );
    return Object.fromEntries(entries);
  },
  ["category-counts-v1"],
  { revalidate: CACHE_SECONDS, tags: [GROUPS_TAG, CATEGORIES_TAG] }
);

export async function getCategoryCounts(platform: string): Promise<Record<string, number>> {
  try {
    return await countsCached(platform);
  } catch (e) {
    console.error("[category counts]", e);
    return {}; // unknown -> callers must treat a missing key as "don't hide"
  }
}

/** Similar live groups for a /g/ page (same category, else same platform), cached. */
const relatedCached = unstable_cache(
  async (platform: string, categoryId: string, excludeId: string): Promise<Group[]> => {
    let q = anon()
      .from("groups")
      .select(PUBLIC_GROUP_COLUMNS)
      .neq("id", excludeId)
      .in("status", PUBLIC_STATUSES)
      .order("net_score", { ascending: false })
      .limit(4);
    q = categoryId ? q.eq("category_id", categoryId) : q.eq("platform", platform);
    const { data, error } = await q;
    if (error) throw new Error(`related query failed: ${error.message}`);
    return (data ?? []) as unknown as Group[];
  },
  ["related-v1"],
  { revalidate: CACHE_SECONDS, tags: [GROUPS_TAG] }
);

export async function getRelatedGroups(platform: string, categoryId: string | null, excludeId: string): Promise<Group[]> {
  try {
    return await relatedCached(platform, categoryId ?? "", excludeId);
  } catch (e) {
    console.error("[related]", e);
    return [];
  }
}
