import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatform } from "@/lib/platforms";
import { rateLimit } from "@/lib/ratelimit";
import { serverError } from "@/lib/http";

// GET /api/categories?platform=telegram
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "cats", { limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const platform = new URL(req.url).searchParams.get("platform") ?? "instagram";
  if (!isPlatform(platform)) return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("platform", platform)
    .order("sort_order");
  if (error) return serverError("categories", error);
  return NextResponse.json({ categories: data ?? [] });
}
