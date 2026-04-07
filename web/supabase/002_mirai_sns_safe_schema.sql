-- Mirai SNS safe schema for shared Supabase project
-- This migration does NOT drop any existing table.
-- It creates a dedicated schema and app tables inside it.

begin;

create extension if not exists pgcrypto;
create schema if not exists mirai_sns;

create table if not exists mirai_sns.content_pillars (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists mirai_sns.audience_segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists mirai_sns.hypotheses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem_statement text not null,
  hook_hypothesis text,
  success_metric text not null default 'save_rate',
  target_value numeric(8,3),
  priority int not null default 3 check (priority between 1 and 5),
  status text not null default 'draft'
    check (status in ('draft','ready','testing','validated','invalidated','archived')),
  pillar_id uuid references mirai_sns.content_pillars(id) on delete set null,
  audience_segment_id uuid references mirai_sns.audience_segments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mirai_sns.ideas (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references mirai_sns.hypotheses(id) on delete cascade,
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

create table if not exists mirai_sns.scripts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references mirai_sns.ideas(id) on delete cascade,
  version int not null default 1,
  language text not null default 'ja',
  content text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists scripts_current_unique_idx
  on mirai_sns.scripts(idea_id) where is_current = true;

create table if not exists mirai_sns.publishes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references mirai_sns.ideas(id) on delete cascade,
  platform text not null check (platform in ('instagram','youtube','tiktok','x','other')),
  platform_post_id text,
  published_at timestamptz not null,
  content_type text not null default 'short_video',
  url text,
  created_at timestamptz not null default now()
);

create table if not exists mirai_sns.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  publish_id uuid not null references mirai_sns.publishes(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  views int not null default 0,
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  saves int not null default 0,
  avg_view_duration_sec numeric(10,2),
  completion_rate numeric(6,3)
);

create table if not exists mirai_sns.retrospectives (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references mirai_sns.hypotheses(id) on delete cascade,
  publish_id uuid references mirai_sns.publishes(id) on delete set null,
  summary text not null,
  what_worked text,
  what_failed text,
  next_action text not null,
  created_at timestamptz not null default now()
);

create or replace function mirai_sns.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hypotheses_set_updated_at on mirai_sns.hypotheses;
create trigger hypotheses_set_updated_at
before update on mirai_sns.hypotheses
for each row execute function mirai_sns.set_updated_at();

drop trigger if exists ideas_set_updated_at on mirai_sns.ideas;
create trigger ideas_set_updated_at
before update on mirai_sns.ideas
for each row execute function mirai_sns.set_updated_at();

insert into mirai_sns.content_pillars(code, name, description) values
('learning', '学習ノウハウ', '勉強法や成績アップの実践知'),
('parent', '保護者コミュニケーション', '保護者の不安解消・意思決定支援'),
('classroom', '教室のリアル', '未来塾の日常や教育現場の裏側')
on conflict (code) do nothing;

insert into mirai_sns.audience_segments(code, name, description) values
('students', '中高生本人', '成績を上げたい・悩みを解決したい層'),
('parents', '保護者', '子どもの学習支援に悩む層')
on conflict (code) do nothing;

alter table mirai_sns.content_pillars enable row level security;
alter table mirai_sns.audience_segments enable row level security;
alter table mirai_sns.hypotheses enable row level security;
alter table mirai_sns.ideas enable row level security;
alter table mirai_sns.scripts enable row level security;
alter table mirai_sns.publishes enable row level security;
alter table mirai_sns.metric_snapshots enable row level security;
alter table mirai_sns.retrospectives enable row level security;

drop policy if exists "prototype read write content_pillars" on mirai_sns.content_pillars;
drop policy if exists "prototype read write audience_segments" on mirai_sns.audience_segments;
drop policy if exists "prototype read write hypotheses" on mirai_sns.hypotheses;
drop policy if exists "prototype read write ideas" on mirai_sns.ideas;
drop policy if exists "prototype read write scripts" on mirai_sns.scripts;
drop policy if exists "prototype read write publishes" on mirai_sns.publishes;
drop policy if exists "prototype read write metric_snapshots" on mirai_sns.metric_snapshots;
drop policy if exists "prototype read write retrospectives" on mirai_sns.retrospectives;

-- Prototype policy for shared project. Tighten later with auth uid ownership.
create policy "prototype read write content_pillars" on mirai_sns.content_pillars for all using (true) with check (true);
create policy "prototype read write audience_segments" on mirai_sns.audience_segments for all using (true) with check (true);
create policy "prototype read write hypotheses" on mirai_sns.hypotheses for all using (true) with check (true);
create policy "prototype read write ideas" on mirai_sns.ideas for all using (true) with check (true);
create policy "prototype read write scripts" on mirai_sns.scripts for all using (true) with check (true);
create policy "prototype read write publishes" on mirai_sns.publishes for all using (true) with check (true);
create policy "prototype read write metric_snapshots" on mirai_sns.metric_snapshots for all using (true) with check (true);
create policy "prototype read write retrospectives" on mirai_sns.retrospectives for all using (true) with check (true);

commit;
