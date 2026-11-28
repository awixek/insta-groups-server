-- Migration 008 — run ONCE in the Supabase SQL Editor (safe to re-run).
--
-- Makes sure "Report: link is broken / group is full / spam" can always be saved:
--  1. the enum has every report type the app sends
--  2. duplicate reports (same user + group + type) are cleaned up, keeping the oldest
--  3. the unique index the report API relies on exists
--  4. an index so the per-user daily report count is fast

alter type report_type add value if not exists 'full';
alter type report_type add value if not exists 'broken_invite';
alter type report_type add value if not exists 'spam';
alter type report_type add value if not exists 'other';

delete from public.reports r
 using public.reports d
 where r.group_id = d.group_id
   and r.reporter_id = d.reporter_id
   and r.type = d.type
   and (r.created_at, r.id) > (d.created_at, d.id);

create unique index if not exists idx_reports_unique_user_group_type
  on public.reports (group_id, reporter_id, type);

create index if not exists idx_reports_reporter_recent
  on public.reports (reporter_id, created_at desc);
