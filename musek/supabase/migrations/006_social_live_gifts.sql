-- MUSEK SOCIAL: secure live-room gifts.
-- Apply after 004_musek_social.sql and 005_social_guest_invites.sql.
-- Uses the existing send_musek_gift ledger and its 70/30 accounting.

create table if not exists public.social_live_gifts (
  gift_id uuid primary key references public.gift_transactions(id) on delete cascade,
  room_id uuid not null references public.social_live_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  coins bigint not null check (coins > 0),
  created_at timestamptz not null default now()
);

create index if not exists social_live_gifts_room_created_idx
  on public.social_live_gifts(room_id, created_at desc);

alter table public.social_live_gifts enable row level security;

drop policy if exists "Members can view gifts in live rooms" on public.social_live_gifts;
create policy "Members can view gifts in live rooms"
  on public.social_live_gifts for select to authenticated
  using (
    exists (
      select 1 from public.social_live_rooms r
      where r.id = room_id and r.status = 'live'
    )
  );

-- All inserts go through this function. Clients cannot fabricate gift events.
revoke insert, update, delete on public.social_live_gifts from anon, authenticated;
grant select on public.social_live_gifts to authenticated;

create or replace function public.send_social_live_gift(
  p_room_id uuid,
  p_coins bigint,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sender_id uuid;
  v_creator_id uuid;
  v_gift_id uuid;
begin
  v_sender_id := auth.uid();
  if v_sender_id is null then
    raise exception 'You must be logged in to send a live gift.';
  end if;

  if p_room_id is null or p_coins is null or p_coins not in (100, 500, 1000) then
    raise exception 'Choose a valid live gift.';
  end if;

  if p_idempotency_key is null then
    raise exception 'A transaction key is required.';
  end if;

  select host_id into v_creator_id
  from public.social_live_rooms
  where id = p_room_id and status = 'live'
  for update;

  if v_creator_id is null then
    raise exception 'This live room is no longer active.';
  end if;

  if v_creator_id = v_sender_id then
    raise exception 'You cannot send a gift to yourself.';
  end if;

  -- Existing function atomically checks fan/artist roles, debits coins,
  -- credits creator earnings, records the ledger and applies 70/30.
  v_gift_id := public.send_musek_gift(
    v_creator_id,
    p_coins,
    p_idempotency_key
  );

  insert into public.social_live_gifts (
    gift_id, room_id, sender_id, creator_id, coins
  )
  values (
    v_gift_id, p_room_id, v_sender_id, v_creator_id, p_coins
  )
  on conflict (gift_id) do nothing;

  return v_gift_id;
end;
$function$;

revoke all on function public.send_social_live_gift(uuid, bigint, uuid) from public, anon;
grant execute on function public.send_social_live_gift(uuid, bigint, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'social_live_gifts'
  ) then
    alter publication supabase_realtime add table public.social_live_gifts;
  end if;
end $$;
