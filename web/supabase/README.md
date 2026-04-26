# Supabase SQL order

Apply these SQL files in order depending on your goal.

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
