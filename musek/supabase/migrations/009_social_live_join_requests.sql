-- MUSEK SOCIAL: viewer requests to join a live room as a guest.
create table if not exists public.social_live_join_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.social_live_rooms(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint social_live_join_requests_no_host check (requester_id is not null)
);
create index if not exists social_live_join_requests_room_status_idx
  on public.social_live_join_requests(room_id, status, created_at desc);
create unique index if not exists social_live_join_requests_one_pending_per_user
  on public.social_live_join_requests(room_id, requester_id) where status = 'pending';
alter table public.social_live_join_requests enable row level security;
revoke update on public.social_live_join_requests from authenticated;
grant update (status, responded_at) on public.social_live_join_requests to authenticated;
drop policy if exists "Hosts and requesters can view join requests" on public.social_live_join_requests;
create policy "Hosts and requesters can view join requests"
  on public.social_live_join_requests for select to authenticated
  using (
    auth.uid() = requester_id
    or exists (select 1 from public.social_live_rooms r where r.id = room_id and r.host_id = auth.uid())
  );
drop policy if exists "Viewers can request to join live rooms" on public.social_live_join_requests;
create policy "Viewers can request to join live rooms"
  on public.social_live_join_requests for insert to authenticated
  with check (
    auth.uid() = requester_id
    and exists (select 1 from public.social_live_rooms r where r.id = room_id and r.status = 'live' and r.host_id <> auth.uid())
  );
drop policy if exists "Hosts can respond to join requests" on public.social_live_join_requests;
create policy "Hosts can respond to join requests"
  on public.social_live_join_requests for update to authenticated
  using (
    status = 'pending'
    and exists (select 1 from public.social_live_rooms r where r.id = room_id and r.host_id = auth.uid())
  )
  with check (status in ('accepted', 'declined'));
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_live_join_requests'
  ) then
    alter publication supabase_realtime add table public.social_live_join_requests;
  end if;
end $$;
