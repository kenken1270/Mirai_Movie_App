-- Mirai Movie App: Scrap & Build schema (Phase 1)
-- This script drops legacy tables and rebuilds the app around
-- hypothesis -> production -> publish -> retrospective loops.
-- WARNING:
-- Use only on disposable databases. For shared production databases,
-- run 002_mirai_sns_safe_schema.sql instead.

begin;

create extension if not exists pgcrypto;

-- Drop legacy tables (safe to run multiple times)
drop table if exists project_metrics cascade;
drop table if exists video_subtitles cascade;
drop table if exists video_scripts cascade;
drop table if exists video_projects cascade;
drop table if exists video_themes cascade;
drop table if exists idea_categories cascade;

-- Drop new tables when rerunning this script
drop table if exists metric_snapshots cascade;
drop table if exists retrospectives cascade;
drop table if exists publishes cascade;
drop table if exists scripts cascade;
drop table if exists ideas cascade;
drop table if exists hypotheses cascade;
drop table if exists audience_segments cascade;
drop table if exists content_pillars cascade;

create table content_pillars (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table audience_segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table hypotheses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem_statement text not null,
  hook_hypothesis text,
  success_metric text not null default 'save_rate',
  target_value numeric(8,3),
  priority int not null default 3 check (priority between 1 and 5),
  status text not null default 'draft'
    check (status in ('draft','ready','testing','validated','invalidated','archived')),
  pillar_id uuid references content_pillars(id) on delete set null,
  audience_segment_id uuid references audience_segments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references hypotheses(id) on delete cascade,
  title text not null,
  hook text,
  angle text,
  cta text,
  status text not null default 'backlog'
    check (status in ('backlog','writing','recording','editing','scheduled','published','dropped')),
  score numeric(8,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scripts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  version int not null default 1,
  language text not null default 'ja',
  content text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index scripts_current_unique_idx on scripts(idea_id) where is_current = true;

create table publishes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references ideas(id) on delete cascade,
  platform text not null check (platform in ('instagram','youtube','tiktok','x','other')),
  platform_post_id text,
  published_at timestamptz not null,
  content_type text not null default 'short_video',
  url text,
  created_at timestamptz not null default now()
);

create table metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  publish_id uuid not null references publishes(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  views int not null default 0,
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  saves int not null default 0,
  avg_view_duration_sec numeric(10,2),
  completion_rate numeric(6,3)
);

create table retrospectives (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references hypotheses(id) on delete cascade,
  publish_id uuid references publishes(id) on delete set null,
  summary text not null,
  what_worked text,
  what_failed text,
  next_action text not null,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hypotheses_set_updated_at
before update on hypotheses
for each row execute function set_updated_at();

create trigger ideas_set_updated_at
before update on ideas
for each row execute function set_updated_at();

-- Seed minimal master data
insert into content_pillars(code, name, description) values
('learning', '学習ノウハウ', '勉強法や成績アップの実践知'),
('parent', '保護者コミュニケーション', '保護者の不安解消・意思決定支援'),
('classroom', '教室のリアル', '未来塾の日常や教育現場の裏側');

insert into audience_segments(code, name, description) values
('students', '中高生本人', '成績を上げたい・悩みを解決したい層'),
('parents', '保護者', '子どもの学習支援に悩む層');

-- Prototype phase: allow anon access.
-- Replace these policies once auth is introduced.
alter table content_pillars enable row level security;
alter table audience_segments enable row level security;
alter table hypotheses enable row level security;
alter table ideas enable row level security;
alter table scripts enable row level security;
alter table publishes enable row level security;
alter table metric_snapshots enable row level security;
alter table retrospectives enable row level security;

create policy "prototype read write content_pillars" on content_pillars for all using (true) with check (true);
create policy "prototype read write audience_segments" on audience_segments for all using (true) with check (true);
create policy "prototype read write hypotheses" on hypotheses for all using (true) with check (true);
create policy "prototype read write ideas" on ideas for all using (true) with check (true);
create policy "prototype read write scripts" on scripts for all using (true) with check (true);
create policy "prototype read write publishes" on publishes for all using (true) with check (true);
create policy "prototype read write metric_snapshots" on metric_snapshots for all using (true) with check (true);
create policy "prototype read write retrospectives" on retrospectives for all using (true) with check (true);

commit;
