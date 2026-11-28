# v4 — privacy, search speed, duplicate links, Join-click tracking

## Order
1. Push + deploy the new code (Vercel). It works with the old DB too (clicks just aren't counted until step 2).
2. Supabase SQL Editor → run `supabase/migrations/007_privacy_search_clicks.sql` once.
3. Smoke test (2 min):
   - open a live group's page + click Join → you land on the real invite link
   - log in as a group owner → `/my-groups` loads and shows "Join clicks"
   - open your own PENDING group at `/g/<id>` as the owner → still visible (relies on RLS policy; if this breaks tell me)
   - search for a word on the home page → results appear

## What changed
- **Privacy:** `owner_id` removed from the public columns; `profiles` closed to the browser (names/avatars/emails of users can no longer be read with the anon key).
- **Search:** pg_trgm GIN indexes on name + description, plus a partial index for the default listing.
- **Duplicates:** case-insensitive unique index on live invite links (existing duplicates: oldest kept, others auto-rejected). Parallel double-submits now return a clean 409.
- **Click tracking:** Join button goes to `/go/<id>` → counts the click → 302 to the invite link. Bots/previews and HEAD requests are not counted. Owners see "last 7 days / total" in My groups.
- `/api/groups/mine` update no longer returns internal columns to the browser.

## Notes
- An admin approving a *rejected duplicate* of a still-live link will now fail on the unique index (that is the point). Admin routes don't surface DB errors yet — it will look like nothing happened.
- `/go/` is disallowed in robots.txt and skipped by the session middleware.
