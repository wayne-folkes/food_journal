-- S6: add a created_at index to support efficient age-based cleanup,
-- and delete any rows older than 90 days (cache is warm, not permanent).
create index if not exists food_lookup_created_at_idx
  on public.food_lookup (created_at desc);

delete from public.food_lookup
where created_at < now() - interval '90 days';
