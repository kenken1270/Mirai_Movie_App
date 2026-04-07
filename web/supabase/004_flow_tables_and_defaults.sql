-- Extend mirai_sns for production workflow:
-- need research -> buzzwords -> ideas -> scripts

begin;

create table if not exists mirai_sns.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null default '未来塾',
  business_summary text,
  target_audience text,
  value_proposition text,
  tone_of_voice text,
  default_platform text not null default 'instagram',
  default_duration_sec int not null default 30,
  default_goal text not null default 'save',
  default_cta text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists mirai_sns.need_researches (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  audience text,
  pain_point text,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists mirai_sns.buzzwords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  context text,
  source text not null default 'manual',
  priority int not null default 3 check (priority between 1 and 5),
  saved boolean not null default true,
  need_research_id uuid references mirai_sns.need_researches(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table mirai_sns.ideas
  add column if not exists buzzword_id uuid references mirai_sns.buzzwords(id) on delete set null;

alter table mirai_sns.ideas
  add column if not exists source_note text;

create index if not exists ideas_buzzword_id_idx on mirai_sns.ideas(buzzword_id);
create index if not exists buzzwords_priority_idx on mirai_sns.buzzwords(priority desc, created_at desc);

create or replace function mirai_sns.touch_brand_profile_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists brand_profiles_set_updated_at on mirai_sns.brand_profiles;
create trigger brand_profiles_set_updated_at
before update on mirai_sns.brand_profiles
for each row execute function mirai_sns.touch_brand_profile_updated_at();

alter table mirai_sns.brand_profiles enable row level security;
alter table mirai_sns.need_researches enable row level security;
alter table mirai_sns.buzzwords enable row level security;

drop policy if exists "auth read write brand_profiles" on mirai_sns.brand_profiles;
drop policy if exists "auth read write need_researches" on mirai_sns.need_researches;
drop policy if exists "auth read write buzzwords" on mirai_sns.buzzwords;

create policy "auth read write brand_profiles"
on mirai_sns.brand_profiles
for all to authenticated
using (true) with check (true);

create policy "auth read write need_researches"
on mirai_sns.need_researches
for all to authenticated
using (true) with check (true);

create policy "auth read write buzzwords"
on mirai_sns.buzzwords
for all to authenticated
using (true) with check (true);

grant select, insert, update, delete on mirai_sns.brand_profiles to authenticated;
grant select, insert, update, delete on mirai_sns.need_researches to authenticated;
grant select, insert, update, delete on mirai_sns.buzzwords to authenticated;

alter default privileges in schema mirai_sns
grant select, insert, update, delete on tables to authenticated;

insert into mirai_sns.brand_profiles (
  name,
  business_summary,
  target_audience,
  value_proposition,
  tone_of_voice,
  default_platform,
  default_duration_sec,
  default_goal,
  default_cta
)
select
  '未来塾',
  '中高生の学習支援と保護者向け学習サポートを行う塾',
  '中高生本人・保護者',
  '実践ベースで再現性のある学習改善を伝える',
  '誠実で具体的、押しつけない',
  'instagram',
  30,
  'save',
  '保存して後で見返してください'
where not exists (select 1 from mirai_sns.brand_profiles);

commit;
