-- 台本の表示名・構造化データ（表形式・一工夫メモなど）

begin;

alter table mirai_sns.scripts
  add column if not exists display_title text,
  add column if not exists structured_data jsonb;

comment on column mirai_sns.scripts.display_title is '保管庫・カンペ用の表示タイトル（回タイトルなど）';
comment on column mirai_sns.scripts.structured_data is 'テーマ・ターゲット・秒数行・字幕/BGMメモ等のJSON';

commit;
