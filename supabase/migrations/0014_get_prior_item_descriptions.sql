-- 11.1: RPC to fetch all distinct item descriptions logged before a given date.
-- Used by the weekly view to identify "new this week" items.
create or replace function public.get_prior_item_descriptions(p_before_date timestamptz)
returns table (description text)
language sql
security invoker
set search_path = public
as $$
  select distinct lower(mi.description) as description
  from public.meal_items mi
  join public.meals m on m.id = mi.meal_id
  where m.consumed_at < p_before_date;
$$;

grant execute on function public.get_prior_item_descriptions(timestamptz) to authenticated;
