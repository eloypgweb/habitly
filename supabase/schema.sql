-- Habitly persistence table for Supabase
-- Run this SQL in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists profiles_username_lower_unique_idx on public.profiles ((lower(username)));

alter table public.user_states enable row level security;
alter table public.profiles enable row level security;

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

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
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

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
  fallback_username text;
  base_username text;
  suffix integer := 0;
begin
  base_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'habitly_user'));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');

  if length(base_username) < 3 then
    fallback_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 6);
    base_username := fallback_username;
  end if;

  desired_username := left(base_username, 24);

  while exists (select 1 from public.profiles p where lower(p.username) = lower(desired_username)) loop
    suffix := suffix + 1;
    desired_username := left(base_username, greatest(1, 24 - length(suffix::text) - 1)) || '_' || suffix::text;
  end loop;

  insert into public.profiles (user_id, username, email, display_name)
  values (
    new.id,
    desired_username,
    new.email,
    desired_username
  )
  on conflict (user_id) do update
  set
    username = excluded.username,
    email = excluded.email,
    display_name = excluded.display_name,
    updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(trim(p_username))
  );
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;

drop trigger if exists user_states_updated_at on public.user_states;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger user_states_updated_at
before update on public.user_states
for each row
execute procedure public.touch_user_states_updated_at();

create trigger profiles_updated_at
before update on public.profiles
for each row
execute procedure public.touch_profiles_updated_at();

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute procedure public.handle_new_user_profile();

do $$
declare
  auth_user record;
  base_username text;
  desired_username text;
  suffix integer;
begin
  for auth_user in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    where not exists (
      select 1
      from public.profiles p
      where p.user_id = u.id
    )
  loop
    base_username := lower(coalesce(auth_user.raw_user_meta_data ->> 'username', split_part(auth_user.email, '@', 1), 'habitly_user'));
    base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');

    if length(base_username) < 3 then
      base_username := 'user_' || substring(replace(auth_user.id::text, '-', '') from 1 for 6);
    end if;

    desired_username := left(base_username, 24);
    suffix := 0;

    while exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(desired_username)
    ) loop
      suffix := suffix + 1;
      desired_username := left(base_username, greatest(1, 24 - length(suffix::text) - 1)) || '_' || suffix::text;
    end loop;

    insert into public.profiles (user_id, username, email, display_name)
    values (auth_user.id, desired_username, auth_user.email, desired_username)
    on conflict (user_id) do nothing;
  end loop;
end;
$$;
