-- MUSEK SOCIAL: guest invitations and speaker permissions.
-- Apply after 004_musek_social.sql.

create table if not exists public.social_live_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.social_live_rooms(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint social_live_invites_no_self_invite check (inviter_id <> invitee_id),
  constraint social_live_invites_unique_guest unique (room_id, invitee_id)
);

create index if not exists social_live_invites_invitee_status_idx
  on public.social_live_invites(invitee_id, status, created_at desc);

alter table public.social_live_invites enable row level security;

-- Guests may respond only by changing status and response time; invitation ownership and room are immutable.
revoke update on public.social_live_invites from authenticated;
grant update (status, responded_at) on public.social_live_invites to authenticated;

drop policy if exists "Participants can view their social invitations" on public.social_live_invites;
create policy "Participants can view their social invitations"
  on public.social_live_invites for select to authenticated
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

drop policy if exists "Room hosts can invite guests" on public.social_live_invites;
create policy "Room hosts can invite guests"
  on public.social_live_invites for insert to authenticated
  with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.social_live_rooms r
      where r.id = room_id and r.host_id = auth.uid() and r.status = 'live'
    )
  );

drop policy if exists "Invited guests can respond" on public.social_live_invites;
create policy "Invited guests can respond"
  on public.social_live_invites for update to authenticated
  using (auth.uid() = invitee_id and status = 'pending')
  with check (
    auth.uid() = invitee_id
    and status in ('accepted', 'declined')
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_live_invites'
  ) then
    alter publication supabase_realtime add table public.social_live_invites;
  end if;
end $$;
