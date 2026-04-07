-- Harden mirai_sns RLS for authenticated-only operation.
-- Run this after 002_mirai_sns_safe_schema.sql.
--
-- NOTE:
-- - This removes anon access.
-- - App users must sign in via Supabase Auth to read/write.
-- - For now, all authenticated users can access all rows.
--   (Owner-based policies can be added in the next migration.)

begin;

-- Ensure RLS is enabled
alter table mirai_sns.content_pillars enable row level security;
alter table mirai_sns.audience_segments enable row level security;
alter table mirai_sns.hypotheses enable row level security;
alter table mirai_sns.ideas enable row level security;
alter table mirai_sns.scripts enable row level security;
alter table mirai_sns.publishes enable row level security;
alter table mirai_sns.metric_snapshots enable row level security;
alter table mirai_sns.retrospectives enable row level security;

-- Remove prototype full-open policies
drop policy if exists "prototype read write content_pillars" on mirai_sns.content_pillars;
drop policy if exists "prototype read write audience_segments" on mirai_sns.audience_segments;
drop policy if exists "prototype read write hypotheses" on mirai_sns.hypotheses;
drop policy if exists "prototype read write ideas" on mirai_sns.ideas;
drop policy if exists "prototype read write scripts" on mirai_sns.scripts;
drop policy if exists "prototype read write publishes" on mirai_sns.publishes;
drop policy if exists "prototype read write metric_snapshots" on mirai_sns.metric_snapshots;
drop policy if exists "prototype read write retrospectives" on mirai_sns.retrospectives;

-- Authenticated-only policies (shared workspace model)
create policy "auth read write content_pillars"
on mirai_sns.content_pillars
for all
to authenticated
using (true)
with check (true);

create policy "auth read write audience_segments"
on mirai_sns.audience_segments
for all
to authenticated
using (true)
with check (true);

create policy "auth read write hypotheses"
on mirai_sns.hypotheses
for all
to authenticated
using (true)
with check (true);

create policy "auth read write ideas"
on mirai_sns.ideas
for all
to authenticated
using (true)
with check (true);

create policy "auth read write scripts"
on mirai_sns.scripts
for all
to authenticated
using (true)
with check (true);

create policy "auth read write publishes"
on mirai_sns.publishes
for all
to authenticated
using (true)
with check (true);

create policy "auth read write metric_snapshots"
on mirai_sns.metric_snapshots
for all
to authenticated
using (true)
with check (true);

create policy "auth read write retrospectives"
on mirai_sns.retrospectives
for all
to authenticated
using (true)
with check (true);

-- Revoke anon privileges at schema/table level
revoke usage on schema mirai_sns from anon;
revoke all on all tables in schema mirai_sns from anon;
revoke all on all sequences in schema mirai_sns from anon;

-- Keep authenticated privileges
grant usage on schema mirai_sns to authenticated;
grant select, insert, update, delete on all tables in schema mirai_sns to authenticated;
grant usage, select on all sequences in schema mirai_sns to authenticated;

alter default privileges in schema mirai_sns
grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema mirai_sns
grant usage, select on sequences to authenticated;

commit;
