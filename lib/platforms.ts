export type Platform = "instagram" | "telegram" | "discord";

export const PLATFORM_LIST: Platform[] = ["instagram", "telegram", "discord"];

export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORM_LIST as string[]).includes(v);
}

interface PlatformConfig {
  label: string;
  emoji: string;
  /** hostnames (lowercase, no www.) allowed for invite links */
  hosts: string[];
  /** optional path prefixes a link on a *shared* host must start with */
  pathPrefix?: Record<string, string[]>;
  placeholder: string;
  tagline: string;
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  instagram: {
    label: "Instagram",
    emoji: "📸",
    hosts: ["instagram.com", "ig.me"],
    // only real group-chat invites: ig.me/j/<code> and instagram.com/direct/join/<code>
    // (profiles, reels, posts etc. are rejected)
    pathPrefix: { "instagram.com": ["/direct/join/"], "ig.me": ["/j/"] },
    placeholder: "https://ig.me/j/...",
    tagline: "Random insta GC & group chats",
  },
  telegram: {
    label: "Telegram",
    emoji: "✈️",
    hosts: ["t.me", "telegram.me", "telegram.dog"],
    placeholder: "https://t.me/+AbCdEf... or https://t.me/groupname",
    tagline: "Telegram groups & channels",
  },
  discord: {
    label: "Discord",
    emoji: "🎮",
    hosts: ["discord.gg", "discord.com", "discordapp.com"],
    pathPrefix: { "discord.com": ["/invite/"], "discordapp.com": ["/invite/"] },
    placeholder: "https://discord.gg/...",
    tagline: "Discord servers",
  },
};

/**
 * Validates + normalises an invite link for a platform.
 * Returns the cleaned https URL, or an error message.
 */
export function validateInviteLink(
  platform: Platform,
  raw: string
): { ok: true; url: string } | { ok: false; error: string } {
  const cfg = PLATFORMS[platform];
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invite link is not a valid URL" };
  }
  if (u.protocol !== "https:") {
    return { ok: false, error: "Invite link must start with https://" };
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!cfg.hosts.includes(host)) {
    return {
      ok: false,
      error: `That doesn't look like a ${cfg.label} link (expected ${cfg.hosts.join(" / ")})`,
    };
  }
  const prefixes = cfg.pathPrefix?.[host];
  if (prefixes && !prefixes.some((p) => u.pathname.startsWith(p))) {
    return { ok: false, error: `${cfg.label} invite links look like https://${host}${prefixes[0]}...` };
  }
  if (u.pathname.replace(/\//g, "").length < 2) {
    return { ok: false, error: "Invite link is missing the group/invite part" };
  }
  u.hash = "";

  if (platform === "telegram") {
    // Only real group / channel invites. t.me also hosts proxy / socks / login / sticker / bot
    // links that change a user's settings — those must never be listed.
    const path = u.pathname.replace(/\/+$/, "");
    const joinchat = /^\/joinchat\/[A-Za-z0-9_-]{8,}$/.test(path);
    const plusInvite = /^\/\+[A-Za-z0-9_-]{8,}$/.test(path);
    const username = /^\/[A-Za-z][A-Za-z0-9_]{3,31}$/.test(path);
    const reservedName = TELEGRAM_RESERVED.has(path.slice(1).toLowerCase());
    const botLike = /bot$/i.test(path);
    if (!(joinchat || plusInvite || username) || (username && (reservedName || botLike))) {
      return { ok: false, error: "Use a Telegram group/channel link like https://t.me/+AbCdEf… or https://t.me/groupname" };
    }
    u.search = ""; // ?start= / ?server= / tracking params are not needed (and are abusable)
  } else if (platform === "discord") {
    const code = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!/^[A-Za-z0-9-]{2,32}$/.test(code)) {
      return { ok: false, error: "That doesn't look like a Discord invite code" };
    }
    u.search = "";
  } else if (platform === "instagram") {
    const code = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(code)) {
      return { ok: false, error: "That doesn't look like an Instagram group invite code" };
    }
    u.search = ""; // ?igsh= / utm params would let the same invite be listed twice
  }
  const url = u.toString().replace(/\/$/, "");
  return { ok: true, url };
}

// First path segments on t.me that are NOT groups/channels (settings changers, tools, login, etc.)
const TELEGRAM_RESERVED = new Set([
  "proxy", "socks", "setlanguage", "addstickers", "addemoji", "addtheme", "addlist", "share", "login", "bg", "invoice",
  "confirmphone", "iv", "c", "s", "contact", "boost", "giftcode", "m", "joinchat", "telegram", "durov", "support",
  "username", "settings", "premium", "stickers", "emoji", "wallpaper", "web", "apps", "login", "auth", "api",
]);

/** Guess the platform from an invite link's host (null if unknown). */
export function detectPlatform(raw: string): Platform | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  return PLATFORM_LIST.find((p) => PLATFORMS[p].hosts.includes(host)) ?? null;
}
