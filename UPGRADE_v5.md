# v5 — report fix, speed, contact email, Instagram validation, admin errors, Fresh row

## Deploy order
1. Push this code → Vercel deploys.
2. Supabase SQL Editor, in this order (skip any you already ran):
   - `007_privacy_search_clicks.sql`  (v4, if not run yet)
   - `008_reports_fix.sql`           (new)
3. Vercel → Settings → Environment Variables: if `NEXT_PUBLIC_CONTACT_EMAIL` is set, change it to
   `contact.randomgc@gmail.com` (it overrides the default in the code) and redeploy.
4. Smoke test: open home + a platform page twice (2nd load should be instant); approve a pending group in admin → it appears on the list right away.
5. Smoke test: Report → "link is broken" on a group (logged in) → "Thanks" toast, no error.

## What changed
- **Report/vote hang + "link broken" not submitting:** report API no longer needs ON CONFLICT (works even if the unique index is missing),
  3 DB look-ups run in parallel, DB errors are checked; client has a 15s timeout and shows the real error message.
- **Speed:** listing page runs categories + session check in parallel (one round-trip less per page view).
- **Contact email:** everywhere → contact.randomgc@gmail.com (feedback, contact, FAQ, site.ts used by Terms/Privacy/Editorial).
- **Fresh row:** top of the default listing shows up to 3 new groups (≤7 days old, score ≤2) → cold-start fix.
- **Cron coverage:** 60 → 200 groups per run (concurrency 20; still stops at the time budget).
- **Instagram validation:** only `ig.me/j/<code>` and `instagram.com/direct/join/<code>`; query params stripped.
- **Groq timeout:** 7s hard cap, then `manual_review` fallback (submit can't hang).
- **Admin routes:** failed DB writes now return an error toast instead of `ok: true`; duplicate-link conflicts get a clear message.
- **30-minute cache (ISR-style):** listing pages (`/`, `/[platform]`, categories, "load more") read groups/categories from a shared
  cache (`lib/cached.ts`, 30 min) instead of the DB on every view. Anonymous visitors (no login cookie) make no auth call at all.
  Cache is cleared instantly when a group goes live, is approved/rejected/deleted, hidden by reports, found dead by the cron,
  or a category changes. Searches and 🎲 shuffle are NOT cached. Failed queries are never cached.
  Trade-off: vote counts / ranking can lag up to 30 min (your own vote shows instantly).
- **Light theme:** hard-coded `text-white/90` headings → theme colour.
- **Blocklist:** removed "hitman" (false positive on gaming groups).

## SEO pass (added)
- **Canonical bug fixed:** the root layout gave EVERY page `canonical="/"`, so About/FAQ/Privacy/Terms… looked like copies of the home page.
  Now each page has its own canonical.
- **noindex,follow** for search results, 🎲 shuffle, `?sort=` and `?page=2+` (home, platform, category pages).
- **Empty categories** are hidden from the category pills and the sitemap, and an empty category page is noindex until it has groups.
- **noindex** for register / saved / my-groups / profile / admin (register and feedback removed from the sitemap).
- **Sitemap** is cached (30 min) and no longer needs cookies/DB per crawler hit.
- **/g/<id> pages:** extra unique copy (category, platform, members, since when, "How to join"), BreadcrumbList JSON-LD,
  related groups fall back to the same platform and are cached; page data is loaded once instead of twice.
- After deploy: Google Search Console → resubmit `sitemap.xml`; use "URL Inspection" on `/about` and check "User-declared canonical".

## Google Analytics 4
- Set `NEXT_PUBLIC_GA_ID` (G-XXXXXXXXXX) in Vercel → redeploy. Empty = analytics off.
- Loaded as plain `<script>` tags in the server-rendered `<head>` (visible in page source and to GA's "Test installation").
- Tracks page views automatically + a custom `join_click` event (group_id, platform). Not loaded on /admin.
- Privacy page cookie section mentions Google Analytics.

## Not done (needs you / bigger job)
- Fully static ISR pages (needs personal vote/save state moved to the browser). The 30-min data cache above covers most of the benefit.
- Upstash env vars (Vercel dashboard): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Admin "blocked submissions" log, Instagram previews, Next 14 → 15 upgrade.
