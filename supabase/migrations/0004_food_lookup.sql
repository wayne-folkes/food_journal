create table public.food_lookup (
  description_key   text primary key,
  description       text not null,
  calories_per_100g smallint,
  source            text not null default 'usda',
  usda_fdc_id       integer,
  created_at        timestamptz not null default now()
);

alter table public.food_lookup enable row level security;

create policy "Anyone can read food_lookup"
  on public.food_lookup for select using (true);
create policy "Service role can insert food_lookup"
  on public.food_lookup for insert with check (true);
