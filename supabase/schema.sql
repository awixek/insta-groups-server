-- InstaGroups AI — core schema (v3: per-platform categories, admin tooling, hardened RLS, atomic votes, column lock-down; no adult category)
-- FRESH installs only. Existing DB? Run supabase/migrations/002_*.sql instead.
-- Run this in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- USERS (mirrors Supabase auth.users, extended with app-level fields)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  is_admin boolean default false,
  is_banned boolean default false,
  ban_reason text,
  upvotes_used_today int default 0,
  downvotes_used_today int default 0,
  votes_reset_at date default current_date,
  created_at timestamptz default now()
);

-- ENUMS
create type group_status as enum ('active', 'almost_full', 'possibly_full', 'pending', 'rejected');
create type group_platform as enum ('instagram', 'telegram', 'discord');

-- CATEGORIES (each platform has its own category set)
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  platform group_platform not null default 'instagram',
  slug text not null,
  name text not null,
  name_hi text,
  sort_order int default 0,
  created_at timestamptz default now()
);
create unique index if not exists categories_platform_slug_key on public.categories (platform, slug);

insert into public.categories (platform, slug, name, sort_order) values
  ('instagram', 'philosophy', 'Philosophy', 1),
  ('instagram', 'chill', 'Chill', 2),
  ('instagram', 'memes', 'Memes', 3),
  ('instagram', 'politics', 'Politics', 4),
  ('instagram', 'study', 'Study', 5),
  ('instagram', 'gaming', 'Gaming', 6),
  ('instagram', 'anime', 'Anime', 7),
  ('instagram', 'music', 'Music', 8),
  ('instagram', 'sports', 'Sports', 9),
  ('instagram', 'business', 'Business', 10),
  ('instagram', 'baka', 'Baka', 12),
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
  ('discord',  'community', 'Community',       10),
  ('instagram', 'hindi',   'Hindi / Hinglish', 13),
  ('instagram', 'college', 'College',          14),
  ('telegram',  'hindi',   'Hindi / Hinglish', 13),
  ('telegram',  'college', 'College',          14),
  ('discord',   'hindi',   'Hindi / Hinglish', 12)
on conflict (platform, slug) do nothing;

-- GROUPS
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete set null,
  platform group_platform not null default 'instagram',
  name text not null,
  invite_link text not null,
  description text not null,          -- user-submitted
  ai_description text,                -- AI-generated SEO-friendly version
  category_id uuid references public.categories(id),
  status group_status not null default 'pending',
  ai_flags jsonb default '[]'::jsonb, -- e.g. ["possible_duplicate","spam_language"]
  ai_reviewed_at timestamptz,
  upvotes int default 0,
  downvotes int default 0,
  net_score int generated always as (upvotes - downvotes) stored,
  report_full_count int default 0,
  report_broken_count int default 0,
  owner_verify_requested_at timestamptz,
  rejection_reason text,
  member_count int,
  last_checked_at timestamptz,
  check_fail_count int not null default 0,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_groups_ranking on public.groups (net_score desc, created_at asc);
create index if not exists idx_groups_category on public.groups (category_id);
create index if not exists idx_groups_status on public.groups (status);
create index if not exists idx_groups_platform on public.groups (platform);
create index if not exists idx_groups_owner on public.groups (owner_id, created_at desc);

-- VOTES
create type vote_value as enum ('up', 'down');

create table if not exists public.votes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  value vote_value not null,
  created_at timestamptz default now(),
  unique (user_id, group_id) -- one vote per group, can be changed (update row)
);

-- SAVED GROUPS
create table if not exists public.saved_groups (
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, group_id)
);

-- REPORTS
create type report_type as enum ('full', 'broken_invite', 'spam', 'other');

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  type report_type not null,
  note text,
  resolved boolean default false,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Stops a user from filing the same report type on the same group more than
-- once (repeat clicks on "Request removal" / "Report" no longer inflate counts).
create unique index if not exists idx_reports_unique_user_group_type
  on public.reports (group_id, reporter_id, type);

-- ADMIN AUDIT LOG
create table if not exists public.admin_actions (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_reports_open on public.reports (resolved, created_at desc);

-- ROW LEVEL SECURITY
-- Philosophy: the browser can only READ public data. Every write goes through
-- our Next.js API routes, which use the server-side service role after checking
-- auth / ban / admin status / quotas. (v1 allowed direct writes, which let any
-- user make themselves admin or approve their own groups.)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.groups enable row level security;
alter table public.votes enable row level security;
alter table public.saved_groups enable row level security;
alter table public.reports enable row level security;
alter table public.admin_actions enable row level security; -- no policies = service role only

create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- users may only change cosmetic columns; is_admin / is_banned / quotas are locked
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
-- don't leak emails / admin flags to the public
revoke select on public.profiles from anon, authenticated; -- v4: profiles are server-only (service role)

create policy "categories are public" on public.categories for select using (true);

create policy "approved groups are public" on public.groups
  for select using (status in ('active','almost_full','possibly_full') or owner_id = auth.uid());

create policy "users see own votes" on public.votes for select using (auth.uid() = user_id);

create policy "users manage own saved groups" on public.saved_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reports: written + read via service role only

-- Auto-create profile row on signup
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


-- ───────────── Atomic voting (see migrations/004 for the explanation) ─────────────
create or replace function public.cast_vote(
  p_user uuid,
  p_group uuid,
  p_value text,
  p_up_quota int,
  p_down_quota int,
  p_today date
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof public.profiles%rowtype;
  v_status group_status;
  v_up_used int;
  v_down_used int;
  v_exists boolean;
  v_new_up int;
  v_new_down int;
  v_vote text;
begin
  if p_value not in ('up', 'down', 'remove') then
    return jsonb_build_object('error', 'bad_value');
  end if;

  select * into v_prof from public.profiles where id = p_user for update;
  if not found then
    return jsonb_build_object('error', 'profile_not_found');
  end if;

  select status into v_status from public.groups where id = p_group;
  if not found or v_status not in ('active', 'almost_full', 'possibly_full') then
    return jsonb_build_object('error', 'group_not_found');
  end if;

  if v_prof.votes_reset_at is distinct from p_today then
    v_up_used := 0;
    v_down_used := 0;
  else
    v_up_used := coalesce(v_prof.upvotes_used_today, 0);
    v_down_used := coalesce(v_prof.downvotes_used_today, 0);
  end if;

  select exists (select 1 from public.votes where user_id = p_user and group_id = p_group) into v_exists;

  if p_value = 'remove' then
    delete from public.votes where user_id = p_user and group_id = p_group;
    v_vote := null;
  else
    -- changing an existing vote is free; only a brand-new vote costs quota
    if not v_exists then
      if p_value = 'up' and v_up_used >= p_up_quota then
        return jsonb_build_object('error', 'quota_up');
      end if;
      if p_value = 'down' and v_down_used >= p_down_quota then
        return jsonb_build_object('error', 'quota_down');
      end if;
      if p_value = 'up' then v_up_used := v_up_used + 1; else v_down_used := v_down_used + 1; end if;
    end if;

    insert into public.votes (user_id, group_id, value)
    values (p_user, p_group, p_value::vote_value)
    on conflict (user_id, group_id) do update set value = excluded.value;
    v_vote := p_value;
  end if;

  update public.profiles
     set upvotes_used_today = v_up_used,
         downvotes_used_today = v_down_used,
         votes_reset_at = p_today
   where id = p_user;

  update public.groups g
     set upvotes = (select count(*) from public.votes v where v.group_id = p_group and v.value = 'up'),
         downvotes = (select count(*) from public.votes v where v.group_id = p_group and v.value = 'down')
   where g.id = p_group
  returning g.upvotes, g.downvotes into v_new_up, v_new_down;

  return jsonb_build_object('ok', true, 'vote', v_vote, 'upvotes', v_new_up, 'downvotes', v_new_down);
end
$$;

-- only the server (service role) may call it — never the browser
revoke all on function public.cast_vote(uuid, uuid, text, int, int, date) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, text, int, int, date) to service_role;


create index if not exists idx_reports_group on public.reports (group_id);

-- ───────────── Column lock-down (see migrations/005) ─────────────
-- The browser roles may read only these columns of public.groups; the server uses the service role.
revoke select on public.groups from anon, authenticated;
grant select (
  id, platform, name, invite_link, description, ai_description, category_id,
  status, upvotes, downvotes, net_score, report_full_count, report_broken_count,
  member_count, rejection_reason, created_at
) on public.groups to anon, authenticated;


-- ───────────── v4 (see migrations/007): search, unique links, click tracking ─────────────
create extension if not exists pg_trgm;
create index if not exists idx_groups_name_trgm on public.groups using gin (name gin_trgm_ops);
create index if not exists idx_groups_desc_trgm on public.groups using gin (description gin_trgm_ops);
create index if not exists idx_groups_public_rank
  on public.groups (platform, net_score desc, created_at asc)
  where status in ('active', 'almost_full', 'possibly_full');
create unique index if not exists uq_groups_invite_link_live
  on public.groups (lower(invite_link)) where status <> 'rejected';

alter table public.groups add column if not exists click_count int not null default 0;
create table if not exists public.group_clicks (
  group_id uuid not null references public.groups(id) on delete cascade,
  day date not null,
  clicks int not null default 0,
  primary key (group_id, day)
);
alter table public.group_clicks enable row level security;

create or replace function public.record_click(p_group uuid, p_day date)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_link text;
  v_status group_status;
begin
  select invite_link, status into v_link, v_status from public.groups where id = p_group;
  if not found or v_status not in ('active', 'almost_full', 'possibly_full') then
    return null;
  end if;
  insert into public.group_clicks (group_id, day, clicks) values (p_group, p_day, 1)
  on conflict (group_id, day) do update set clicks = public.group_clicks.clicks + 1;
  update public.groups set click_count = click_count + 1 where id = p_group;
  return v_link;
end $$;
revoke all on function public.record_click(uuid, date) from public, anon, authenticated;
grant execute on function public.record_click(uuid, date) to service_role;
