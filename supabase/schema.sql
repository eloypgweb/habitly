-- Habitly persistence table for Supabase
-- Run this SQL in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.user_states enable row level security;

drop policy if exists "Users can read own state" on public.user_states;
create policy "Users can read own state"
on public.user_states
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own state" on public.user_states;
create policy "Users can insert own state"
on public.user_states
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own state" on public.user_states;
create policy "Users can update own state"
on public.user_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.touch_user_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists user_states_updated_at on public.user_states;

create trigger user_states_updated_at
before update on public.user_states
for each row
execute procedure public.touch_user_states_updated_at();
