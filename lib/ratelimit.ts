import { NextResponse } from "next/server";

/**
 * Rate limiter.
 *
 *  - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (free tier is enough), counters live in
 *    Redis, so the limit is GLOBAL across all Vercel instances.
 *  - Otherwise it falls back to an in-memory counter (per serverless instance = best-effort only).
 *  - If Redis is configured but down, it silently falls back to memory (never blocks real users).
 *
 * Callers: `const limited = await rateLimit(req, "name", { limit, windowMs }, userId?); if (limited) return limited;`
 */
const hits = new Map<string, number[]>();
let lastSweep = 0;

export function clientIp(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown";
  return ip.trim();
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests — please slow down and try again in a moment." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

/** Fixed-window counter in Upstash Redis via its REST API (no extra package needed). Returns null if unavailable. */
async function redisHit(key: string, windowMs: number): Promise<{ count: number; ttlMs: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
        ["PTTL", key],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { result?: number }[];
    const count = Number(out?.[0]?.result);
    const ttl = Number(out?.[2]?.result);
    if (!Number.isFinite(count)) return null;
    return { count, ttlMs: Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs };
  } catch {
    return null;
  }
}

/** Returns a 429 response when over the limit, otherwise null. */
export async function rateLimit(
  req: Request,
  name: string,
  opts: { limit: number; windowMs: number },
  userId?: string
): Promise<NextResponse | null> {
  const now = Date.now();
  const id = userId ?? clientIp(req);

  const redis = await redisHit(`rl:${name}:${id}`, opts.windowMs);
  if (redis) {
    return redis.count > opts.limit ? tooMany(Math.ceil(redis.ttlMs / 1000)) : null;
  }

  // ── in-memory fallback ──
  const key = `${name}:${id}`;
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    hits.forEach((arr, k) => {
      if (arr.every((t) => now - t > 10 * 60_000)) hits.delete(k);
    });
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);
  if (recent.length >= opts.limit) {
    hits.set(key, recent);
    return tooMany(Math.ceil((opts.windowMs - (now - recent[0])) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  return null;
}
