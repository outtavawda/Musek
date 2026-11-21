-- MUSEK SOCIAL: live rooms, realtime chat and reactions.
-- Apply this migration in the Supabase SQL editor before using /social.

create table if not exists public.social_live_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  description text check (description is null or char_length(description) <= 300),
  host_id uuid not null references auth.users(id) on delete cascade,
  host_name text not null check (char_length(host_name) between 1 and 100),
  status text not null default 'live' check (status in ('live', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists social_live_rooms_status_created_idx
  on public.social_live_rooms(status, created_at desc);

create table if not exists public.social_live_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.social_live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists social_live_messages_room_created_idx
  on public.social_live_messages(room_id, created_at);

create table if not exists public.social_live_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.social_live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '🔥', '👏', '🎶', '😂')),
  created_at timestamptz not null default now()
);

create index if not exists social_live_reactions_room_created_idx
  on public.social_live_reactions(room_id, created_at desc);

alter table public.social_live_rooms enable row level security;
alter table public.social_live_messages enable row level security;
alter table public.social_live_reactions enable row level security;

drop policy if exists "Authenticated users can view live social rooms" on public.social_live_rooms;
create policy "Authenticated users can view live social rooms"
  on public.social_live_rooms for select to authenticated using (true);

drop policy if exists "Users can create their own social rooms" on public.social_live_rooms;
create policy "Users can create their own social rooms"
  on public.social_live_rooms for insert to authenticated with check (auth.uid() = host_id);

drop policy if exists "Hosts can update their own social rooms" on public.social_live_rooms;
create policy "Hosts can update their own social rooms"
  on public.social_live_rooms for update to authenticated
  using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists "Authenticated users can read social chat" on public.social_live_messages;
create policy "Authenticated users can read social chat"
  on public.social_live_messages for select to authenticated using (
    exists (select 1 from public.social_live_rooms r where r.id = room_id and r.status = 'live')
  );

drop policy if exists "Authenticated users can post social chat" on public.social_live_messages;
create policy "Authenticated users can post social chat"
  on public.social_live_messages for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.social_live_rooms r where r.id = room_id and r.status = 'live'
    )
  );

drop policy if exists "Authenticated users can read social reactions" on public.social_live_reactions;
create policy "Authenticated users can read social reactions"
  on public.social_live_reactions for select to authenticated using (
    exists (select 1 from public.social_live_rooms r where r.id = room_id and r.status = 'live')
  );

drop policy if exists "Authenticated users can react in live rooms" on public.social_live_reactions;
create policy "Authenticated users can react in live rooms"
  on public.social_live_reactions for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.social_live_rooms r where r.id = room_id and r.status = 'live'
    )
  );

-- Enable Supabase Realtime for live room updates and chat messages.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_live_rooms'
  ) then
    alter publication supabase_realtime add table public.social_live_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_live_messages'
  ) then
    alter publication supabase_realtime add table public.social_live_messages;
  end if;
end $$;
