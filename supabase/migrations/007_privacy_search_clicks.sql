-- Migration 007 — run ONCE in the Supabase SQL Editor, AFTER deploying the v4 code
-- (the new code no longer selects owner_id in the browser and reads my-groups on the server).
--
--  1. Privacy: group owners are no longer identifiable from the public API (owner_id + public profiles)
--  2. Search: trigram indexes so "name/description ilike %x%" stops scanning the whole table
--  3. Duplicates: unique index on live invite links (case-insensitive) + clean-up of existing duplicates
--  4. Join-click tracking: groups.click_count, group_clicks (per day) and record_click()

-- ───────────── 1. Privacy ─────────────
revoke select on public.groups from anon, authenticated;
grant select (
  id, platform, name, invite_link, description, ai_description, category_id,
  status, upvotes, downvotes, net_score, report_full_count, report_broken_count,
  member_count, rejection_reason, created_at
) on public.groups to anon, authenticated;
-- (the RLS policy "owner_id = auth.uid()" still lets owners open their own pending group at /g/<id>)

-- profiles: nothing in the browser reads them any more (server uses the service role). Close them completely.
revoke select on public.profiles from anon, authenticated;
drop policy if exists "profiles are viewable by everyone" on public.profiles;

-- ───────────── 2. Search + listing indexes ─────────────
create extension if not exists pg_trgm;
create index if not exists idx_groups_name_trgm on public.groups using gin (name gin_trgm_ops);
create index if not exists idx_groups_desc_trgm on public.groups using gin (description gin_trgm_ops);

-- the default listing: live groups of a platform, best first
create index if not exists idx_groups_public_rank
  on public.groups (platform, net_score desc, created_at asc)
  where status in ('active', 'almost_full', 'possibly_full');

-- ───────────── 3. Unique live invite links ─────────────
-- keep the OLDEST live copy of every link, reject the later duplicates (they stay in the table for your records)
with ranked as (
  select id,
         row_number() over (partition by lower(invite_link) order by created_at asc, id) as rn
    from public.groups
   where status <> 'rejected'
)
update public.groups g
   set status = 'rejected',
       rejection_reason = 'Duplicate link (auto-cleanup)',
       reviewed_at = now()
  from ranked r
 where g.id = r.id and r.rn > 1;

create unique index if not exists uq_groups_invite_link_live
  on public.groups (lower(invite_link))
  where status <> 'rejected';

drop index if exists public.idx_groups_invite_link; -- the unique index above replaces it

-- ───────────── 4. Join-click tracking ─────────────
alter table public.groups add column if not exists click_count int not null default 0;

create table if not exists public.group_clicks (
  group_id uuid not null references public.groups(id) on delete cascade,
  day date not null,
  clicks int not null default 0,
  primary key (group_id, day)
);
alter table public.group_clicks enable row level security; -- no policies = service role only

-- Counts one click and returns the invite link in a single round-trip. Returns null if the group is not public.
create or replace function public.record_click(p_group uuid, p_day date)
returns text
language plpgsql
security definer
set search_path = public
as $$
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
end
$$;

revoke all on function public.record_click(uuid, date) from public, anon, authenticated;
grant execute on function public.record_click(uuid, date) to service_role;
