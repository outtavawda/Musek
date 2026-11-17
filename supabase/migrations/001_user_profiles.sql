-- Run this file in Supabase Dashboard > SQL Editor > New query.
-- Creates a private-by-default profile table and a trigger for new auth users.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  account_type text not null default 'fan'
    check (account_type in ('fan', 'artist', 'label')),
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_type text;
begin
  chosen_type := coalesce(new.raw_user_meta_data ->> 'account_type', 'fan');
  if chosen_type not in ('fan', 'artist', 'label') then
    chosen_type := 'fan';
  end if;

  insert into public.user_profiles (id, display_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    chosen_type
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

grant select, insert, update on public.user_profiles to authenticated;
