-- ネタストック（idea_stock_items）→ パイプライン（ideas）へコピー
-- 前提: 011_idea_stock.sql 適用済みで idea_stock_items に50件あること
-- 再実行: 同一仮説＋同一タイトルのネタは追加しない（重複防止）

begin;

insert into mirai_sns.hypotheses (
  id,
  title,
  problem_statement,
  hook_hypothesis,
  success_metric,
  priority,
  status
) values
  (
    '8b3c0d1e-1001-4000-8000-000000000001',
    '【権威性×教育現場の裏側】戦略',
    '「元公立小教師」という肩書きを最大限に活かし、学校教育の限界と未来塾の必要性を説く。',
    null,
    'save_rate',
    3,
    'ready'
  ),
  (
    '8b3c0d1e-1002-4000-8000-000000000002',
    '【親の痛み（インサイト）直撃】戦略',
    '在日中国人家庭の「中途半端な抑圧・甘やかし」を指摘し、親の行動変容を促す。',
    null,
    'save_rate',
    3,
    'ready'
  ),
  (
    '8b3c0d1e-1003-4000-8000-000000000003',
    '【メソッドの可視化（自走OS）】戦略',
    '未来塾独自の「自律・自己調整」のプロセスを見せ、他塾との圧倒的な差を示す。',
    null,
    'save_rate',
    3,
    'ready'
  ),
  (
    '8b3c0d1e-1004-4000-8000-000000000004',
    '【未来への適応（AI×人間力）】戦略',
    '予測不能な未来（非予定調和）を生き抜く力を強調し、高意識層を惹きつける。',
    null,
    'save_rate',
    3,
    'ready'
  ),
  (
    '8b3c0d1e-1005-4000-8000-000000000005',
    '【安心感と多言語サポート】戦略',
    '奥様との連携、中国語対応、日本教育への橋渡しとしての役割を強調する。',
    null,
    'save_rate',
    3,
    'ready'
  )
on conflict (id) do update set
  title = excluded.title,
  problem_statement = excluded.problem_statement,
  priority = excluded.priority,
  status = excluded.status;

insert into mirai_sns.ideas (
  hypothesis_id,
  title,
  status,
  source_note,
  tags
)
select
  case i.strategy_order
    when 1 then '8b3c0d1e-1001-4000-8000-000000000001'::uuid
    when 2 then '8b3c0d1e-1002-4000-8000-000000000002'::uuid
    when 3 then '8b3c0d1e-1003-4000-8000-000000000003'::uuid
    when 4 then '8b3c0d1e-1004-4000-8000-000000000004'::uuid
    when 5 then '8b3c0d1e-1005-4000-8000-000000000005'::uuid
  end,
  i.hook_text,
  'backlog',
  coalesce(i.strategy_purpose, ''),
  array['ネタストック', i.strategy_name]::text[]
from mirai_sns.idea_stock_items i
where not exists (
  select 1
  from mirai_sns.ideas e
  where e.hypothesis_id = case i.strategy_order
    when 1 then '8b3c0d1e-1001-4000-8000-000000000001'::uuid
    when 2 then '8b3c0d1e-1002-4000-8000-000000000002'::uuid
    when 3 then '8b3c0d1e-1003-4000-8000-000000000003'::uuid
    when 4 then '8b3c0d1e-1004-4000-8000-000000000004'::uuid
    when 5 then '8b3c0d1e-1005-4000-8000-000000000005'::uuid
  end
  and e.title = i.hook_text
);

commit;
