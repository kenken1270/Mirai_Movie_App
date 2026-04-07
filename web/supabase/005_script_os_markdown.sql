-- 台本「絶対ルール（OS）」をブランドに紐づけて保存する
begin;

alter table mirai_sns.brand_profiles
  add column if not exists script_os_markdown text;

comment on column mirai_sns.brand_profiles.script_os_markdown is
  'ショート動画台本の絶対ルール（フック/P.A.S./プラットフォーム別など）。AI台本生成の固定コンテキストとして使用。';

commit;
