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
  api/admin/         Approve/reject actions
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
- Add report-full / report-broken buttons to `GroupCard`
- Add rate limiting to `/api/groups` POST (basic spam defense beyond AI review)
- Add pagination once group count grows past ~100
