-- Give a host three minutes to return after leaving a LIVE room.
alter table public.social_live_rooms
  add column if not exists host_left_at timestamptz;

create index if not exists social_live_rooms_host_left_at_idx
  on public.social_live_rooms (host_left_at)
  where status = 'live' and host_left_at is not null;

create or replace function public.expire_absent_live_hosts()
returns void
language plpgsql
set search_path = public
as $$
begin
  with expired_rooms as (
    update public.social_live_rooms
       set status = 'ended',
           ended_at = now(),
           host_left_at = null
     where status = 'live'
       and host_left_at is not null
       and host_left_at <= now() - interval '3 minutes'
    returning id
  )
  update public.social_live_join_requests as requests
     set status = 'declined',
         responded_at = now()
   where requests.room_id in (select id from expired_rooms)
     and requests.status in ('pending', 'accepted');
end;
$$;

revoke all on function public.expire_absent_live_hosts() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
    from cron.job
   where jobname = 'musek-expire-absent-live-hosts'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'musek-expire-absent-live-hosts',
    '30 seconds',
    'select public.expire_absent_live_hosts();'
  );
end;
$$;
