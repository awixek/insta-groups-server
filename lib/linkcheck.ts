import type { Platform } from "./platforms";

export interface LinkCheck {
  /**
   * ok      = link works
   * dead    = CONFIRMED invalid/expired (Discord API 404, Telegram HTTP 404) — safe to act on
   * suspect = looks invalid but not provable (Telegram served a generic page). Never auto-reject on this alone:
   *           datacenter IPs sometimes get a generic page from Telegram for perfectly good links.
   * unknown = couldn't tell (network, rate limit, Instagram)
   */
  state: "ok" | "dead" | "suspect" | "unknown";
  memberCount?: number;
}

const UA = "Mozilla/5.0 (compatible; RandomGroupChatsBot/1.0)";
const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const TIMEOUT_MS = 5000;

/**
 * Best-effort invite validity check.
 *  - Discord: official public invite API (reliable; also gives member count)
 *  - Telegram: parses the public t.me preview page (heuristic)
 *  - Instagram: not checkable without login -> "unknown"
 * Anything uncertain returns "unknown" so we never hide a working group on a hunch.
 */
export async function checkInviteLink(platform: Platform, url: string): Promise<LinkCheck> {
  try {
    if (platform === "discord") return await checkDiscord(url);
    if (platform === "telegram") return await checkTelegram(url);
  } catch {
    /* timeout / network */
  }
  return { state: "unknown" };
}

async function checkDiscord(url: string): Promise<LinkCheck> {
  const code = new URL(url).pathname.split("/").filter(Boolean).pop();
  if (!code) return { state: "dead" };
  const res = await fetch(
    `https://discord.com/api/v9/invites/${encodeURIComponent(code)}?with_counts=true`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" }
  );
  if (res.status === 404) return { state: "dead" };
  if (!res.ok) return { state: "unknown" };
  const j: any = await res.json().catch(() => null);
  const n = Number(j?.approximate_member_count);
  return { state: "ok", memberCount: Number.isFinite(n) ? n : undefined };
}

async function checkTelegram(url: string): Promise<LinkCheck> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
    redirect: "follow",
  });
  if (res.status === 404) return { state: "dead" };
  if (!res.ok) return { state: "unknown" };
  // If we were redirected somewhere that isn't Telegram, don't trust the page content.
  try {
    const finalHost = new URL(res.url).hostname.toLowerCase();
    if (!/(^|\.)(t\.me|telegram\.me|telegram\.dog|telegram\.org)$/.test(finalHost)) return { state: "unknown" };
  } catch {
    /* ignore */
  }
  const html = await res.text();

  const extra = html.match(/tgme_page_extra[^>]*>\s*([\d\s,.]+)\s*(members|subscribers)/i);
  if (extra) {
    const n = parseInt(extra[1].replace(/[^\d]/g, ""), 10);
    return { state: "ok", memberCount: Number.isFinite(n) ? n : undefined };
  }
  // A real group/channel preview has a title + a join/view action
  if (/tgme_page_title/.test(html) && /tgme_action_button_new|tgme_page_action/.test(html)) {
    return { state: "ok" };
  }
  // No title at all: Telegram's generic page. Looks dead, but can't be proven from here -> "suspect".
  if (!/tgme_page_title/.test(html)) return { state: "suspect" };
  return { state: "unknown" };
}

export interface LinkMeta {
  name?: string;
  description?: string;
  memberCount?: number;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Best-effort name/description for the "paste a link" form.
 *  - Discord: official invite API (reliable)
 *  - Telegram: og:title / og:description from the public t.me page (may fail)
 *  - Instagram: nothing available without login
 * Never throws; returns {} when nothing could be read.
 */
export async function fetchLinkMeta(platform: Platform, url: string): Promise<LinkMeta> {
  try {
    if (platform === "discord") {
      const code = new URL(url).pathname.split("/").filter(Boolean).pop();
      if (!code) return {};
      const res = await fetch(`https://discord.com/api/v9/invites/${encodeURIComponent(code)}?with_counts=true`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) return {};
      const j: any = await res.json().catch(() => null);
      const n = Number(j?.approximate_member_count);
      return {
        name: j?.guild?.name || undefined,
        description: j?.guild?.description || undefined,
        memberCount: Number.isFinite(n) ? n : undefined,
      };
    }
    if (platform === "telegram") {
      const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) return {};
      const html = await res.text();
      const title = html.match(/<meta property="og:title" content="([^"]*)"/i)?.[1];
      const desc = html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1];
      const extra = html.match(/tgme_page_extra[^>]*>\s*([\d\s,.]+)\s*(members|subscribers)/i);
      const n = extra ? parseInt(extra[1].replace(/[^\d]/g, ""), 10) : NaN;
      // Telegram's generic "join" page title means the link has no real preview
      const name = title && !/^telegram:/i.test(title) ? decodeHtml(title) : undefined;
      return {
        name,
        description: name && desc ? decodeHtml(desc) : undefined,
        memberCount: Number.isFinite(n) ? n : undefined,
      };
    }
  } catch {
    /* timeout / network */
  }
  return {};
}
