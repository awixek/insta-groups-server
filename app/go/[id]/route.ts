import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { todayIST } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { detectPlatform, validateInviteLink } from "@/lib/platforms";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
// crawlers / link-preview fetchers must not inflate click counts (and /go/ is disallowed in robots.txt anyway)
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|embed|fetch|curl|wget|python|axios/i;

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

// GET /go/<group id>  ->  counts one Join click, then 302s to the real invite link.
// Why: the invite link is no longer sitting in every card, and owners / admin get real click numbers.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const home = new URL("/", req.url);
  if (!UUID_RE.test(id)) return noStore(NextResponse.redirect(home, 302));

  const landing = new URL(`/g/${id}`, req.url);
  if (BOT_RE.test(req.headers.get("user-agent") ?? "")) return noStore(NextResponse.redirect(landing, 302));

  const limited = await rateLimit(req, "go", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  // One DB round-trip: records the click AND returns the invite link (null if the group isn't public).
  const { data, error } = await createAdminClient().rpc("record_click", { p_group: id, p_day: todayIST() });
  if (error || typeof data !== "string") return noStore(NextResponse.redirect(landing, 302));

  // Defence in depth: only ever redirect to a valid invite link on the group's own platform.
  const platform = detectPlatform(data);
  const link = platform ? validateInviteLink(platform, data) : null;
  if (!link || !link.ok) return noStore(NextResponse.redirect(landing, 302));

  return noStore(NextResponse.redirect(link.url, 302));
}

// HEAD must not count as a click (Next would otherwise run GET for it)
export async function HEAD() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
