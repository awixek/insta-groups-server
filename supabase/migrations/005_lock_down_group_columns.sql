-- Migration 005 — run ONCE, AFTER the new code is deployed (the new code only selects explicit columns).
--
-- Row-level security only hides ROWS. Anyone with your public anon key could still call the Supabase REST API
-- and read internal COLUMNS of live groups (reviewed_by = admin's user id, ai_flags, check_fail_count, …).
-- This limits what the browser-side roles (anon / authenticated) may read to the columns the site actually shows.
-- The server (service role) is not affected.
--
-- ⚠ After this, `select *` on public.groups from a browser/user client fails — always list columns
--   (the code uses PUBLIC_GROUP_COLUMNS in lib/types.ts). Add a column to BOTH places if you ever need it public.

revoke select on public.groups from anon, authenticated;

grant select (
  id, owner_id, platform, name, invite_link, description, ai_description, category_id,
  status, upvotes, downvotes, net_score, report_full_count, report_broken_count,
  member_count, rejection_reason, created_at
) on public.groups to anon, authenticated;

-- the is_adult column is no longer used anywhere
alter table public.groups drop column if exists is_adult;
