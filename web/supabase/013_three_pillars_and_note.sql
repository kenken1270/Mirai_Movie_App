-- 三本柱（instagram / xiaohongshu / note）+ 独立 Note 行（idea_id NULL）対応
--
-- 【必須の前提】このファイルは mirai_sns.publishes が**既にある**こと前提です。
-- ERROR: schema "mirai_sns" does not exist が出たら、**先に** 002 を丸ごと実行してください:
--   → web/supabase/002_mirai_sns_safe_schema.sql
-- その後、本番なら 003（RLS）を推奨し、最後にこの 013 を再実行します。
--
-- ロールバック: 独立 Note 行（idea_id is null）を失う/移行するまで DROP 非推奨

begin;

do $guard$
begin
  if not exists (
    select 1 from information_schema.schemata where schema_name = 'mirai_sns'
  ) then
    raise exception
      'mirai_sns スキーマがありません。先に 002_mirai_sns_safe_schema.sql を SQL Editor で実行してから、013 を再実行してください。';
  end if;
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'mirai_sns' and table_name = 'publishes'
  ) then
    raise exception
      'mirai_sns.publishes がありません。先に 002_mirai_sns_safe_schema.sql を実行してください。';
  end if;
end;
$guard$;

-- 1) 独立 Note 用の表示タイトル（idea なしのときのみ必須はアプリ側）
alter table mirai_sns.publishes
  add column if not exists title text;

-- 2) idea_id: 小紅書・IG 等は必須。note のみ NULL 可
alter table mirai_sns.publishes
  alter column idea_id drop not null;

-- 3) 旧 platform CHECK を外して新列挙（レガシー行はそのまま）
alter table mirai_sns.publishes
  drop constraint if exists publishes_platform_check;

alter table mirai_sns.publishes
  add constraint publishes_platform_check
  check (platform in (
    'instagram',
    'xiaohongshu',
    'note',
    'youtube',
    'tiktok',
    'x',
    'other'
  ));

-- 4) 非 note で idea_id 欠落を禁止: (note) OR (idea_id IS NOT NULL)
alter table mirai_sns.publishes
  drop constraint if exists publishes_idea_id_platform_check;

alter table mirai_sns.publishes
  add constraint publishes_idea_id_platform_check
  check (platform = 'note' or idea_id is not null);

commit;
