-- Fix Supabase lint 0011: pin search_path on public.set_updated_at()
-- This prevents callers from influencing name resolution at runtime.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
