# InstaGroups AI

AI-moderated directory to discover working Instagram (and future Telegram/Discord)
chat groups. Built to be run entirely from a phone: GitHub + Vercel + Supabase +
Claude Code, no local terminal required.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres DB, Google OAuth, Row Level Security
- Groq (Llama 3.3 70B) for AI moderation — called from a Next.js API route,
  no separate Python worker
- Vercel for hosting (auto-deploys on every push to `main`)

## ⚠️ v4 upgrade: see UPGRADE_v4.md (deploy → run migration 007)

## ⚠️ v3 upgrade: see UPGRADE_v3.md (run migrations 004 → deploy → 005 → 006)

## ⚠️ Upgrading an existing deployment (v1 → v2)
1. Supabase → SQL Editor → paste & run `supabase/migrations/002_platform_categories_admin_security.sql` **once**.
   (It adds per-platform categories, admin tables and closes security holes in the v1 RLS policies.)
   Then run `supabase/migrations/003_link_checker_owner_controls.sql` the same way.
2. Vercel → Environment Variables: add `CRON_SECRET` (any long random string). `vercel.json` schedules the daily
   Telegram/Discord link checker (`/api/cron/check-links`).
3. Push the code; Vercel redeploys.
4. Fresh installs: run `supabase/schema.sql` instead (it already includes everything).

## What's new in v2
- `/instagram`, `/telegram`, `/discord` — each platform has its **own category set** (`/telegram/category/crypto`, ...)
- Register form: platform picker, per-platform categories, per-platform invite-link validation, duplicate-link check, 5 submissions/day limit
- Admin panel (`/admin`): review queue, all-groups manager (status / category / delete), grouped reports, user ban + admin management, category manager per platform, activity log
- Group pages `/g/[id]` (SEO + share), Top/New/Biggest sorting, Share button, 🇮🇳 Hindi & College categories
- Daily link checker (Telegram/Discord; auto-removes confirmed-dead invites after 2 failed checks, stores member counts)
- Owners can edit / mark full / reopen / delete their groups; edits are re-moderated
- Anti-spam: keyword blocklist, new-account cooldown, bulk-reject AI-flagged spam in admin
- Fixed: votes not counting, admin actions silently failing, privilege-escalation RLS holes, Groq crash at build without key

## Branding & design
- Per-platform skins: `/instagram` (black + sunset gradient), `/telegram` (navy + blue), `/discord` (charcoal + blurple). Tokens live in `app/globals.css`.
- Favicon / app icon: `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/icon-*.png` (used for every page + home-screen install).
- Platform badges: `public/platforms/{instagram,telegram,discord}.svg` are neutral placeholders. To show the **official logos**,
  download them from each brand's press/brand-asset page and overwrite those 3 files (same names — no code change needed).

## Phone-first setup order

1. **Push this repo to GitHub.**
   - Create an empty repo `instagroups-ai` on GitHub (mobile app or browser).
   - Use Claude Code to commit and push these files.

2. **Create a Supabase project** (supabase.com, mobile browser works fine).
   - Go to SQL Editor → paste the contents of `supabase/schema.sql` → Run.
   - Go to Authentication → Providers → enable **Google**. You'll need a
     Google Cloud OAuth Client ID/Secret (see step 3).
   - Go to Project Settings → API → copy `Project URL` and `anon public` key,
     and the `service_role` key (Settings → API → keep this one secret).

3. **Google OAuth client** (console.cloud.google.com).
   - Create OAuth 2.0 Client ID (Web application).
   - Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Paste the Client ID + Secret into Supabase's Google provider settings.
   - This step is the fiddliest on a small screen — go slow, double check the
     redirect URI has no typos.

4. **Get a Groq API key** (console.groq.com) — free tier is enough to start.

5. **Deploy to Vercel** (vercel.com, mobile browser).
   - Import the GitHub repo.
   - Add environment variables (copy from `.env.example`):
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_SITE_URL`
     (set to your Vercel production URL once you have it).
   - Deploy. Every future push to `main` redeploys automatically — no CLI needed.

6. **Make yourself admin.**
   - Log in once via Google on the live site so your `profiles` row exists.
   - In Supabase Table Editor → `profiles`, set your row's `is_admin` to `true`.
   - Visit `/admin` on the live site.

## Local dev (optional — only if you ever get a laptop)
```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Project structure
```
app/                 Next.js App Router pages + API routes
  page.tsx           Homepage
  category/[slug]/   Category-filtered listing
  register/          Group submission form
  saved/             Saved groups
  my-groups/         Groups the logged-in user registered
  profile/           Google login/logout
  admin/             Moderation queue + reports
  api/groups/        CRUD + AI moderation trigger
  api/groups/vote/   Daily-quota voting
  api/groups/save/   Save/unsave
  api/admin/         groups / reports / users / categories (admin only, audit-logged)
  [platform]/        /instagram /telegram /discord (+ /category/[slug])
  auth/callback/     OAuth redirect handler
components/          Header, SearchBar, GroupCard, CategoryScroll, etc.
lib/
  supabase/          Browser + server + admin Supabase clients
  groq.ts            AI moderation call (with manual_review fallback)
  ranking.ts         Net-score ranking + shuffle
  types.ts           Shared TS types
supabase/schema.sql  Full DB schema + RLS policies
```

## What's intentionally NOT built (v1, per blueprint)
- No trending / most-viewed / popular-today
- No individual page per group
- No WhatsApp support
- No in-site chat

## Next steps once deployed
- Wire real category icons/images
- Owner "mark my group full / edit / delete" from My Groups
- Auto link-checker (cron) to flag dead invites 
