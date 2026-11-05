-- Per-item protein and fiber (grams), estimated the same way calories are.
--
-- mobile-compat: no RPC signature changes. create/update_meal_with_items still
-- take (…, p_items jsonb); the item objects simply gain optional `protein_g`
-- and `fiber_g` keys. Older clients omit them and get NULL.
-- update_meal_with_items replaces all items, so when an item object has no
-- `protein_g` / `fiber_g` key at all (older web bundles, iOS builds that predate
-- this migration) the existing value for the same position + description is
-- kept. An explicit null still clears the value, which is what the web client
-- sends when the user empties a field.

alter table public.meal_items
  add column protein_g numeric(4,1) check (protein_g is null or (protein_g >= 0 and protein_g <> 'NaN')),
  add column fiber_g   numeric(4,1) check (fiber_g   is null or (fiber_g   >= 0 and fiber_g   <> 'NaN'));

-- Lookup cache: per-100g values, mirroring calories_per_100g. Rows cached before
-- this migration have NULLs here; the API treats those USDA rows as cache misses
-- and refreshes them (see api/usda-lookup.ts).
alter table public.food_lookup
  add column protein_per_100g numeric(4,1),
  add column fiber_per_100g   numeric(4,1);

create or replace function public.meal_with_items_json(p_meal_id uuid)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', meal.id,
    'user_id', meal.user_id,
    'consumed_at', meal.consumed_at,
    'meal_type', meal.meal_type,
    'raw_input', meal.raw_input,
    'created_at', meal.created_at,
    'updated_at', meal.updated_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item.id,
            'meal_id', item.meal_id,
            'description', item.description,
            'position', item.position,
            'consumed_at', item.consumed_at,
            'created_at', item.created_at,
            'calories', item.calories,
            'protein_g', item.protein_g,
            'fiber_g', item.fiber_g
          )
          order by item.position
        )
        from public.meal_items item
        where item.meal_id = meal.id
      ),
      '[]'::jsonb
    )
  )
  from public.meals meal
  where meal.id = p_meal_id;
$$;

create or replace function public.create_meal_with_items(
  p_meal_type public.meal_type,
  p_consumed_at timestamptz,
  p_raw_input text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_meal public.meals%rowtype;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  insert into public.meals (meal_type, consumed_at, raw_input)
  values (
    coalesce(p_meal_type, 'snack'::public.meal_type),
    coalesce(p_consumed_at, now()),
    coalesce(p_raw_input, '')
  )
  returning * into created_meal;

  insert into public.meal_items (meal_id, description, position, consumed_at, calories, protein_g, fiber_g)
  select
    created_meal.id,
    item.description,
    item.position,
    coalesce(item.consumed_at, created_meal.consumed_at),
    item.calories,
    item.protein_g,
    item.fiber_g
  from jsonb_to_recordset(p_items) as item(
    description text,
    position integer,
    consumed_at timestamptz,
    calories smallint,
    protein_g numeric,
    fiber_g numeric
  );

  return public.meal_with_items_json(created_meal.id);
end;
$$;

create or replace function public.update_meal_with_items(
  p_meal_id uuid,
  p_meal_type public.meal_type,
  p_consumed_at timestamptz,
  p_raw_input text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_meal public.meals%rowtype;
  old_items jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  update public.meals
  set
    meal_type = coalesce(p_meal_type, meal_type),
    consumed_at = coalesce(p_consumed_at, consumed_at),
    raw_input = coalesce(p_raw_input, raw_input)
  where id = p_meal_id
  returning * into updated_meal;

  if not found then
    raise exception 'meal not found or access denied';
  end if;

  -- Remember the current values so clients that omit the keys don't wipe them.
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'position', old.position,
      'description', old.description,
      'protein_g', old.protein_g,
      'fiber_g', old.fiber_g
    )),
    '[]'::jsonb
  )
  into old_items
  from public.meal_items old
  where old.meal_id = updated_meal.id;

  delete from public.meal_items where meal_id = updated_meal.id;

  insert into public.meal_items (meal_id, description, position, consumed_at, calories, protein_g, fiber_g)
  select
    updated_meal.id,
    item.description,
    item.position,
    coalesce(item.consumed_at, updated_meal.consumed_at),
    item.calories,
    case
      when e.elem ? 'protein_g' then (e.elem ->> 'protein_g')::numeric
      else (
        select (o ->> 'protein_g')::numeric
        from jsonb_array_elements(old_items) o
        where (o ->> 'position')::integer = item.position
          and o ->> 'description' = item.description
        limit 1
      )
    end,
    case
      when e.elem ? 'fiber_g' then (e.elem ->> 'fiber_g')::numeric
      else (
        select (o ->> 'fiber_g')::numeric
        from jsonb_array_elements(old_items) o
        where (o ->> 'position')::integer = item.position
          and o ->> 'description' = item.description
        limit 1
      )
    end
  from jsonb_array_elements(p_items) as e(elem)
  cross join lateral jsonb_to_record(e.elem) as item(
    description text,
    position integer,
    consumed_at timestamptz,
    calories smallint
  );

  return public.meal_with_items_json(updated_meal.id);
end;
$$;

grant execute on function public.create_meal_with_items(public.meal_type, timestamptz, text, jsonb) to authenticated;
grant execute on function public.update_meal_with_items(uuid, public.meal_type, timestamptz, text, jsonb) to authenticated;

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
            'calories', item.calories,
            'protein_g', item.protein_g,
            'fiber_g', item.fiber_g
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
