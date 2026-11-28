-- Migration 003 — run ONCE after 002. (Fresh installs: schema.sql already has this.)

alter table public.groups
  add column if not exists member_count int,
  add column if not exists last_checked_at timestamptz,
  add column if not exists check_fail_count int not null default 0;

create index if not exists idx_groups_last_checked on public.groups (last_checked_at nulls first);

-- Hindi / Hinglish + college niches
insert into public.categories (platform, slug, name, sort_order) values
  ('instagram', 'hindi',   'Hindi / Hinglish', 13),
  ('instagram', 'college', 'College',          14),
  ('telegram',  'hindi',   'Hindi / Hinglish', 13),
  ('telegram',  'college', 'College',          14),
  ('discord',   'hindi',   'Hindi / Hinglish', 12)
on conflict (platform, slug) do nothing;
