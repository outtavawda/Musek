-- MUSEK notifications: persist live alerts for fans who follow an artist.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text not null default '/social',
  related_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.user_notifications;
create policy "Users can read their own notifications"
  on public.user_notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can mark their own notifications read" on public.user_notifications;
create policy "Users can mark their own notifications read"
  on public.user_notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.user_notifications from anon, authenticated;
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;

create or replace function public.notify_artist_followers_when_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'live' then
    insert into public.user_notifications (user_id, type, title, message, link, related_id)
    select f.fan_id, 'artist_live', 'An artist you follow is LIVE',
      new.host_name || ' just started a live room: ' || new.title,
      '/social', new.id
    from public.artist_follows f
    join public.user_profiles p on p.id = new.host_id and p.account_type = 'artist'
    where f.artist_id = new.host_id
      and f.fan_id <> new.host_id;
  end if;
  return new;
end;
$$;

drop trigger if exists social_room_notify_artist_followers on public.social_live_rooms;
create trigger social_room_notify_artist_followers
  after insert on public.social_live_rooms
  for each row execute function public.notify_artist_followers_when_live();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;
