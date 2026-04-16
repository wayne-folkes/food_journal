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
            'calories', item.calories
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

  insert into public.meal_items (meal_id, description, position, consumed_at, calories)
  select
    created_meal.id,
    item.description,
    item.position,
    coalesce(item.consumed_at, created_meal.consumed_at),
    item.calories
  from jsonb_to_recordset(p_items) as item(
    description text,
    position integer,
    consumed_at timestamptz,
    calories smallint
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

  delete from public.meal_items where meal_id = updated_meal.id;

  insert into public.meal_items (meal_id, description, position, consumed_at, calories)
  select
    updated_meal.id,
    item.description,
    item.position,
    coalesce(item.consumed_at, updated_meal.consumed_at),
    item.calories
  from jsonb_to_recordset(p_items) as item(
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
