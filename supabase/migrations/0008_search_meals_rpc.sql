create extension if not exists pg_trgm with schema extensions;

create index if not exists meal_items_description_trgm
  on public.meal_items using gin (description gin_trgm_ops);

create or replace function public.search_meals(p_query text)
returns table (
  id uuid,
  user_id uuid,
  consumed_at timestamptz,
  meal_type public.meal_type,
  raw_input text,
  created_at timestamptz,
  updated_at timestamptz,
  items jsonb
)
language sql
security invoker
set search_path = public
as $$
  with escaped_query as (
    select replace(
      replace(
        replace(trim(p_query), '\\', '\\\\'),
        '%',
        '\\%'
      ),
      '_',
      '\\_'
    ) as value
  ),
  matched_meals as (
    select distinct meal_id
    from public.meal_items, escaped_query
    where description ilike '%' || escaped_query.value || '%' escape '\\'
  )
  select
    meal.id,
    meal.user_id,
    meal.consumed_at,
    meal.meal_type,
    meal.raw_input,
    meal.created_at,
    meal.updated_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item.id,
            'meal_id', item.meal_id,
            'description', item.description,
            'position', item.position,
            'consumed_at', item.consumed_at,
            'created_at', item.created_at,
            'calories', item.calories
          )
          order by item.position
        )
        from public.meal_items item
        where item.meal_id = meal.id
      ),
      '[]'::jsonb
    ) as items
  from public.meals meal
  join matched_meals on matched_meals.meal_id = meal.id
  order by meal.consumed_at desc
  limit 50;
$$;

grant execute on function public.search_meals(text) to authenticated;