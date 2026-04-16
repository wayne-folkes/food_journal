create or replace function public.create_meals_with_items_batch(p_meals jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  meal_payload jsonb;
  local_id text;
  created_meal jsonb;
  results jsonb := '[]'::jsonb;
begin
  if p_meals is null then
    return '[]'::jsonb;
  end if;

  if jsonb_typeof(p_meals) <> 'array' then
    raise exception 'meals must be an array';
  end if;

  for meal_payload in
    select value
    from jsonb_array_elements(p_meals)
  loop
    local_id := meal_payload->>'local_id';

    begin
      created_meal := public.create_meal_with_items(
        (meal_payload->>'meal_type')::public.meal_type,
        (meal_payload->>'consumed_at')::timestamptz,
        coalesce(meal_payload->>'raw_input', ''),
        coalesce(meal_payload->'items', '[]'::jsonb)
      );

      results := results || jsonb_build_array(
        jsonb_build_object(
          'local_id', local_id,
          'meal', created_meal
        )
      );
    exception
      when others then
        results := results || jsonb_build_array(
          jsonb_build_object(
            'local_id', local_id,
            'error', sqlerrm
          )
        );
    end;
  end loop;

  return results;
end;
$$;

grant execute on function public.create_meals_with_items_batch(jsonb) to authenticated;