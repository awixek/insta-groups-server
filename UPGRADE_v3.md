# v3 — security + moderation upgrade (do these in THIS order)

## 1. Supabase SQL Editor (run each file once, in order)
1. `supabase/migrations/004_hardening_and_adult_removal.sql`  ← run BEFORE deploying
   (removes the Adult category + hides adult groups, cleans bad Telegram links, adds the atomic `cast_vote` function)
2. Deploy the new code (push to GitHub → Vercel).
3. `supabase/migrations/005_lock_down_group_columns.sql`  ← run AFTER deploy
   (browser can no longer read internal group columns; drops `is_adult`)
4. `supabase/migrations/006_rename_flagged_groups.sql`  ← optional: renames the 7 groups from your screenshots

## 2. Vercel
- `npm install` locally/Claude Code once so a `package-lock.json` is created and committed (the zip had none).
- Optional but recommended env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (global rate limit),
  `NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME` (your real name for the Grievance Officer section), `NEXT_PUBLIC_CONTACT_EMAIL`.

## What changed
Security: stored-XSS on /g/[id] fixed · Telegram proxy/socks/settings links blocked + path allowlist · atomic vote quota ·
owner edit can't re-activate hidden groups · report brigading blocked (only 3-day-old accounts count for auto actions) ·
Telegram link checker no longer auto-deletes on a guess · public API/pages select only safe columns (+ DB column lock) ·
generic error messages · session-refresh middleware · security headers (clickjacking etc.) · image optimizer off ·
Next.js 14.2.35 · Upstash-ready rate limiter.
Moderation: Adult category removed everywhere (code, DB, sitemap, AI prompt) · AI rejects adult/profanity/personal info ·
normalised blocklist (leet, spaced letters, unicode, Hindi/Hinglish) · new accounts' groups wait for admin ·
prompt-injection guard · personal handles/phones/emails refused.
Admin panel: Reports tab shows every group reported by 2+ different people, tick any groups → Remove / Dismiss / Delete in bulk ·
bulk select in Queue and All groups · Rename / Edit text buttons.
Legal: grievance officer, minors / safety, takedown process added to Terms, Privacy, Editorial.

## Still on you / worth knowing
- Next.js 14 is end-of-life; security patches now go only to 15.5.x / 16.x. This app doesn't use next/image, server actions or
  `use cache`, so the recent critical advisories don't touch it, but plan a move to 15.5.x (needs async cookies()/params edits).
- Legal text is a sensible baseline, not legal advice — have it checked, especially for under-18 users (India's DPDP Act).
