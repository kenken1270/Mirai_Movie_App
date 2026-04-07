-- ネタ詳細・週次運用・素材リンク・AIログ用

begin;

alter table mirai_sns.ideas
  add column if not exists scheduled_filming_at timestamptz,
  add column if not exists scheduled_publish_at timestamptz,
  add column if not exists tags text[] not null default '{}',
  add column if not exists production_checklist jsonb not null default
    '{"hook":false,"subtitles":false,"thumbnail":false,"bgm":false,"cta":false}'::jsonb;

comment on column mirai_sns.ideas.scheduled_filming_at is '撮影予定（任意）';
comment on column mirai_sns.ideas.scheduled_publish_at is '公開予定（任意）';
comment on column mirai_sns.ideas.tags is '勝ちパターン用タグ（フック型・尺など）';
comment on column mirai_sns.ideas.production_checklist is '公開前チェック JSON';

create table if not exists mirai_sns.idea_assets (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references mirai_sns.ideas(id) on delete cascade,
  label text,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idea_assets_idea_id_idx on mirai_sns.idea_assets(idea_id);

create table if not exists mirai_sns.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references mirai_sns.ideas(id) on delete set null,
  kind text not null,
  model text,
  prompt_summary text,
  created_at timestamptz not null default now()
);

create index if not exists ai_generation_logs_idea_id_idx on mirai_sns.ai_generation_logs(idea_id);
create index if not exists ai_generation_logs_created_idx on mirai_sns.ai_generation_logs(created_at desc);

alter table mirai_sns.idea_assets enable row level security;
alter table mirai_sns.ai_generation_logs enable row level security;

drop policy if exists "auth read write idea_assets" on mirai_sns.idea_assets;
create policy "auth read write idea_assets"
on mirai_sns.idea_assets
for all
to authenticated
using (true)
with check (true);

drop policy if exists "auth read write ai_generation_logs" on mirai_sns.ai_generation_logs;
create policy "auth read write ai_generation_logs"
on mirai_sns.ai_generation_logs
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on mirai_sns.idea_assets to authenticated;
grant select, insert, update, delete on mirai_sns.ai_generation_logs to authenticated;

commit;
