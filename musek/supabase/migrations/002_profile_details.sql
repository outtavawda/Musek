
-- MUSEK: Extended profile information
-- Safely adds fields to existing user profiles.

alter table public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists artist_name text,
  add column if not exists genres text[] not null default '{}',
  add column if not exists label_name text,
  add column if not exists website_url text,
  add column if not exists location text,
  add column if not exists is_public boolean not null default false;

create index if not exists user_profiles_account_type_idx
  on public.user_profiles (account_type);

create index if not exists user_profiles_public_idx
  on public.user_profiles (is_public, account_type);
