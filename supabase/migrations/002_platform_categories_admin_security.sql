-- Migration 002 — run ONCE in Supabase SQL Editor on your EXISTING database.
-- (Fresh installs: just run supabase/schema.sql, it already includes all of this.)
--
-- What this does:
--  1. Categories become per-platform (Instagram / Telegram / Discord each get their own set)
--  2. Admin tooling columns + audit log table
--  3. SECURITY FIXES for holes in the v1 RLS policies (see section 3)
--  4. Auto-creates a profiles row on signup (trigger)

-- ───────────────────────── 1. Per-platform categories ─────────────────────────
alter table public.categories
  add column if not exists platform group_platform not null default 'instagram';

alter table public.categories drop constraint if exists categories_slug_key;
create unique index if not exists categories_platform_slug_key
  on public.categories (platform, slug);

insert into public.categories (platform, slug, name, sort_order) values
  ('telegram', 'chat',    'Chat / Chill',     1),
  ('telegram', 'crypto',  'Crypto & Trading', 2),
  ('telegram', 'tech',    'Tech & Coding',    3),
  ('telegram', 'study',   'Study & Exams',    4),
  ('telegram', 'jobs',    'Jobs & Careers',   5),
  ('telegram', 'movies',  'Movies & Series',  6),
  ('telegram', 'memes',   'Memes',            7),
  ('telegram', 'news',    'News',             8),
  ('telegram', 'music',   'Music',            9),
  ('telegram', 'gaming',  'Gaming',           10),
  ('telegram', 'deals',   'Deals & Offers',   11),
  ('discord',  'gaming',    'Gaming',          1),
  ('discord',  'chill',     'Chill / Hangout', 2),
  ('discord',  'anime',     'Anime',           3),
  ('discord',  'music',     'Music',           4),
  ('discord',  'dev',       'Coding & Dev',    5),
  ('discord',  'art',       'Art & Design',    6),
  ('discord',  'study',     'Study',           7),
  ('discord',  'roleplay',  'Roleplay',        8),
  ('discord',  'memes',     'Memes',           9),
  ('discord',  'community', 'Community',       10)
on conflict (platform, slug) do nothing;

-- Any existing telegram/discord group still pointing at an instagram category:
-- detach so admin can re-categorise (instagram groups are untouched).
update public.groups g
   set category_id = null
  from public.categories c
 where g.category_id = c.id and g.platform <> c.platform;

-- ───────────────────────── 2. Admin columns + audit log ─────────────────────────
alter table public.groups
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.profiles
  add column if not exists ban_reason text;

alter table public.reports
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

create index if not exists idx_groups_platform on public.groups (platform);
create index if not exists idx_groups_owner on public.groups (owner_id, created_at desc);
create index if not exists idx_groups_invite_link on public.groups (lower(invite_link));
create index if not exists idx_reports_open on public.reports (resolved, created_at desc);

create table if not exists public.admin_actions (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.admin_actions enable row level security; -- no policies = service role only

-- ───────────────────────── 3. SECURITY FIXES ─────────────────────────
-- v1 let ANY logged-in user (a) make themselves admin by updating profiles.is_admin,
-- (b) approve their own group / edit votes+score by updating groups,
-- (c) insert groups with status='active' directly, skipping AI moderation,
-- (d) insert unlimited votes ignoring the daily quota,
-- and categories had no RLS at all (anyone with the anon key could edit them).
-- All writes now go through our API routes using the server-side service role.

-- (a) profiles: users may only change display_name / avatar_url
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- (b)+(c) groups: read-only from the browser
drop policy if exists "owners can update own pending groups" on public.groups;
drop policy if exists "logged in users can insert groups" on public.groups;

-- (d) votes / reports: read-own only from the browser
drop policy if exists "users insert own votes" on public.votes;
drop policy if exists "users update own votes" on public.votes;
drop policy if exists "users can file reports" on public.reports;

-- categories: public read, no browser writes
alter table public.categories enable row level security;
drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories for select using (true);

-- profiles were readable by everyone INCLUDING emails. Keep public read of
-- non-sensitive columns only.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, created_at) on public.profiles to anon, authenticated;
-- (the logged-in user's own is_admin / is_banned / quota are read server-side via service role)

-- ───────────────────────── 4. Auto-create profile on signup ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
