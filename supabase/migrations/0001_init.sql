-- Enable uuid generation
create extension if not exists "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────

create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade default auth.uid(),
  description  text not null,
  consumed_at  timestamptz not null,
  raw_input    text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index for fetching a user's entries by date range
create index entries_user_consumed_at on public.entries (user_id, consumed_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────

alter table public.entries enable row level security;

-- Signed-in users can only see their own entries
create policy "users can select own entries"
  on public.entries for select
  using (auth.uid() = user_id);

-- Signed-in users can insert entries for themselves
create policy "users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

-- Signed-in users can update their own entries
create policy "users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Signed-in users can delete their own entries
create policy "users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();
