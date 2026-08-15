-- InstaGroups AI — core schema (v1)
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
  upvotes_used_today int default 0,
  downvotes_used_today int default 0,
  votes_reset_at date default current_date,
  created_at timestamptz default now()
);

-- CATEGORIES
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  name_hi text,
  sort_order int default 0,
  created_at timestamptz default now()
);

insert into public.categories (slug, name, sort_order) values
  ('philosophy', 'Philosophy', 1),
  ('chill', 'Chill', 2),
  ('memes', 'Memes', 3),
  ('politics', 'Politics', 4),
  ('study', 'Study', 5),
  ('gaming', 'Gaming', 6),
  ('anime', 'Anime', 7),
  ('music', 'Music', 8),
  ('sports', 'Sports', 9),
  ('business', 'Business', 10),
  ('adult', 'Adult (18+)', 11),
  ('baka', 'Baka', 12)
on conflict (slug) do nothing;

-- GROUPS
create type group_status as enum ('active', 'almost_full', 'possibly_full', 'pending', 'rejected');
create type group_platform as enum ('instagram', 'telegram', 'discord');

create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete set null,
  platform group_platform not null default 'instagram',
  name text not null,
  invite_link text not null,
  description text not null,          -- user-submitted
  ai_description text,                -- AI-generated SEO-friendly version
  category_id uuid references public.categories(id),
  is_adult boolean default false,
  status group_status not null default 'pending',
  ai_flags jsonb default '[]'::jsonb, -- e.g. ["possible_duplicate","spam_language"]
  ai_reviewed_at timestamptz,
  upvotes int default 0,
  downvotes int default 0,
  net_score int generated always as (upvotes - downvotes) stored,
  report_full_count int default 0,
  report_broken_count int default 0,
  owner_verify_requested_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_groups_ranking on public.groups (net_score desc, created_at asc);
create index if not exists idx_groups_category on public.groups (category_id);
create index if not exists idx_groups_status on public.groups (status);

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
  created_at timestamptz default now()
);

-- Stops a user from filing the same report type on the same group more than
-- once (repeat clicks on "Request removal" / "Report" no longer inflate counts).
create unique index if not exists idx_reports_unique_user_group_type
  on public.reports (group_id, reporter_id, type);

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.votes enable row level security;
alter table public.saved_groups enable row level security;
alter table public.reports enable row level security;

-- profiles: users can read all, edit only their own
create policy "profiles are viewable by everyone" on public.profiles for select using (true);
create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);

-- groups: anyone can read active groups; only owner/admin edit
create policy "approved groups are public" on public.groups for select using (status in ('active','almost_full','possibly_full') or owner_id = auth.uid());
create policy "logged in users can insert groups" on public.groups for insert with check (auth.uid() is not null);
create policy "owners can update own pending groups" on public.groups for update using (owner_id = auth.uid());

-- votes: users manage only their own vote rows
create policy "users see own votes" on public.votes for select using (auth.uid() = user_id);
create policy "users insert own votes" on public.votes for insert with check (auth.uid() = user_id);
create policy "users update own votes" on public.votes for update using (auth.uid() = user_id);

-- saved groups: private to the user
create policy "users manage own saved groups" on public.saved_groups for all using (auth.uid() = user_id);

-- reports: any logged-in user can file, only admins read all (handled in API layer via service role)
create policy "users can file reports" on public.reports for insert with check (auth.uid() is not null);
