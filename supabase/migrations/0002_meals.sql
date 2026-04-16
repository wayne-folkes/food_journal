-- Meal type enum
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink');

-- Meals table
create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade default auth.uid(),
  meal_type    public.meal_type not null default 'snack',
  consumed_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index meals_user_consumed_at on public.meals (user_id, consumed_at desc);

alter table public.meals enable row level security;

create policy "users can select own meals"
  on public.meals for select using (auth.uid() = user_id);
create policy "users can insert own meals"
  on public.meals for insert with check (auth.uid() = user_id);
create policy "users can update own meals"
  on public.meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own meals"
  on public.meals for delete using (auth.uid() = user_id);

-- Meal items table
create table public.meal_items (
  id           uuid primary key default gen_random_uuid(),
  meal_id      uuid references public.meals(id) on delete cascade not null,
  description  text not null,
  position     integer not null default 0,
  consumed_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index meal_items_meal_id on public.meal_items (meal_id);

alter table public.meal_items enable row level security;

create policy "users can select own meal items"
  on public.meal_items for select
  using (auth.uid() = (select user_id from public.meals where id = meal_id));
create policy "users can insert own meal items"
  on public.meal_items for insert
  with check (auth.uid() = (select user_id from public.meals where id = meal_id));
create policy "users can update own meal items"
  on public.meal_items for update
  using (auth.uid() = (select user_id from public.meals where id = meal_id));
create policy "users can delete own meal items"
  on public.meal_items for delete
  using (auth.uid() = (select user_id from public.meals where id = meal_id));
