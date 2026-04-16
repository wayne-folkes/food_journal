-- Phase 3 bug fix: set the user_id default on the entries table so that
-- rows inserted by authenticated users are automatically associated with
-- their uid. Applied early in the project via the Supabase dashboard.
-- The entries table was later dropped in 0011_drop_entries_table.sql.
alter table if exists public.entries
  alter column user_id set default auth.uid();
