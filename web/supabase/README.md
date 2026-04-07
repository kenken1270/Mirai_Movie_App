# Supabase SQL order

Apply these SQL files in order depending on your goal.

1. `002_mirai_sns_safe_schema.sql`
   - Creates `mirai_sns` schema and all app tables.
   - Keeps prototype-friendly access for quick setup.

2. `003_mirai_sns_harden_rls.sql`
   - Tightens access to authenticated users only.
   - Removes anon access.

`001_reset_and_rebuild.sql` is destructive and for disposable databases only.
