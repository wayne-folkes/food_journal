-- RPC: get_recent_item_descriptions
-- Returns distinct item descriptions ordered by most-recently consumed,
-- used to populate the autocomplete suggestion list in the client.

create or replace function public.get_recent_item_descriptions(p_limit int default 500)
returns table (description text)
language sql
security invoker
set search_path = public
as $$
  select (array_agg(mi.description order by m.consumed_at desc))[1] as description
  from public.meal_items mi
  join public.meals m on m.id = mi.meal_id
  group by lower(mi.description)
  order by max(m.consumed_at) desc
  limit p_limit;
$$;

grant execute on function public.get_recent_item_descriptions(int) to authenticated;
