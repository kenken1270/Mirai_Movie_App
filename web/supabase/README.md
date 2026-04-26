# Supabase SQL order

Apply these SQL files in order depending on your goal.

## 新規 / 空の Supabase プロジェクト（`mirai-juku` など）

1. まず **`002_mirai_sns_safe_schema.sql` を全文**を SQL Editor に貼り、**Run**（`mirai_sns` の作成＋全テーブル）。
2. 本番では **`003_mirai_sns_harden_rls.sql`** 推奨（認証ユーザのみ）。
3. 以降の拡張として **`013_three_pillars_and_note.sql`**（三本柱＋独立 Note 用列・制約）。

`013` だけ先に実行すると、**`schema "mirai_sns" does not exist`** になります。順番は上記どおりにしてください。

1. `002_mirai_sns_safe_schema.sql`
   - Creates `mirai_sns` schema and all app tables.
   - Keeps prototype-friendly access for quick setup.

2. `003_mirai_sns_harden_rls.sql`
   - Tightens access to authenticated users only.
   - Removes anon access.

`001_reset_and_rebuild.sql` is destructive and for disposable databases only.

3. `013_three_pillars_and_note.sql` (after 002, 003)
   - Extends `publishes.platform` with `xiaohongshu` and `note` (keeps legacy values).
   - Makes `publishes.idea_id` nullable for **standalone Note** posts only (`platform = 'note'`), with a check so non-`note` rows still require `idea_id`.
   - Adds optional `publishes.title` for display when there is no linked idea.
   - **Rollback note:** Dropping the new checks while rows have `note` + `null` idea_id will fail unless those rows are deleted or repointed first.
