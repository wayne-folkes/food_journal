-- P6 cleanup: drop the unused entries table from the original 0001_init.sql.
-- The app uses meals/meal_items exclusively. Removes dead index, RLS policies,
-- and updated_at trigger from the plan cache.
drop table if exists public.entries cascade;
