import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { detectPlatform, validateInviteLink } from "@/lib/platforms";
import { fetchLinkMeta } from "@/lib/linkcheck";
import { cleanName } from "@/lib/submission";

// POST /api/groups/preview { url } -> { platform, url, name?, description?, memberCount? }
// No login needed: it only reads public invite previews for the 3 supported platforms.
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "preview", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = String(body?.url ?? "").trim();
  const platform = detectPlatform(raw);
  if (!platform) {
    return NextResponse.json(
      { error: "Paste an Instagram, Telegram or Discord invite link." },
      { status: 400 }
    );
  }
  const link = validateInviteLink(platform, raw);
  if (!link.ok) return NextResponse.json({ error: link.error }, { status: 400 });

  const meta = await fetchLinkMeta(platform, link.url);
  return NextResponse.json({
    platform,
    url: link.url,
    name: meta.name ? cleanName(meta.name).slice(0, 60) : undefined,
    description: meta.description?.slice(0, 300),
    memberCount: meta.memberCount,
  });
}
