-- S2: per-user hourly rate limit table for serverless API endpoints.
create table if not exists public.api_rate_limit (
  user_id      uuid        not null,
  window_start timestamptz not null,
  count        smallint    not null default 0,
  primary key (user_id, window_start)
);

alter table public.api_rate_limit enable row level security;

-- Atomic increment + cleanup. Returns true if the user is OVER the limit.
create or replace function public.check_and_increment_api_rate_limit(
  p_user_id uuid,
  p_limit   int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
  current_window timestamptz := date_trunc('hour', now());
begin
  delete from public.api_rate_limit
  where window_start < now() - interval '24 hours';

  insert into public.api_rate_limit (user_id, window_start, count)
  values (p_user_id, current_window, 1)
  on conflict (user_id, window_start)
  do update set count = api_rate_limit.count + 1
  returning count into current_count;

  return current_count > p_limit;
end;
$$;
