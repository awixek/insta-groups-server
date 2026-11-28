-- Migration 004 — run ONCE in the Supabase SQL Editor, BEFORE deploying the new code.
-- (Safe for the old code too: nothing here removes a column the old code still reads.)
--
--  1. Removes the Adult (18+) category everywhere and hides every adult group
--  2. Cleans up Telegram links that are not real groups (proxy / socks / settings links) + strips tracking params
--  3. Atomic vote function (daily quota can no longer be bypassed with parallel requests)
--  4. Small index for the admin reports panel

-- ───────────── 1. Adult category + adult groups ─────────────
-- hide every adult group (kept in the table for your records, never shown anywhere)
update public.groups
   set status = 'rejected',
       rejection_reason = 'Adult category removed',
       reviewed_at = now()
 where is_adult = true
    or category_id in (select id from public.categories where slug = 'adult');

-- detach, then delete the category rows (groups.category_id has no ON DELETE rule, so detach first)
update public.groups
   set category_id = null
 where category_id in (select id from public.categories where slug = 'adult');

delete from public.categories where slug = 'adult';

-- ───────────── 2. Telegram / Discord link clean-up ─────────────
update public.groups
   set status = 'rejected',
       rejection_reason = 'Unsupported Telegram link type (auto-cleanup)',
       reviewed_at = now()
 where platform = 'telegram'
   and invite_link ~* '^https://(www\.)?(t\.me|telegram\.me|telegram\.dog)/(proxy|socks|setlanguage|addstickers|addemoji|addtheme|addlist|share|login|bg|invoice|confirmphone|iv|contact|boost|giftcode)(/|\?|$)';

-- query strings on Telegram / Discord invites are never needed (and ?server= / ?start= can be abused)
update public.groups
   set invite_link = split_part(invite_link, '?', 1)
 where platform in ('telegram', 'discord')
   and invite_link like '%?%';

-- ───────────── 3. Atomic voting ─────────────
-- One function does: lock voter row -> check daily quota -> write vote -> recount. Because the voter's
-- profile row is locked (FOR UPDATE), parallel requests from the same user run one after another.
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

-- ───────────── 4. Admin reports panel ─────────────
create index if not exists idx_reports_group on public.reports (group_id);
