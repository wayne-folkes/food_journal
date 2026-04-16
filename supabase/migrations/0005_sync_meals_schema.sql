alter table public.meals
  add column if not exists raw_input text not null default '';

alter table public.meals
  add column if not exists updated_at timestamptz;

update public.meals
set updated_at = created_at
where updated_at is null;

alter table public.meals
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meals_set_updated_at on public.meals;

create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();
