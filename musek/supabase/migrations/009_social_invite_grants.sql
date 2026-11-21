-- MUSEK SOCIAL: explicit grants for guest invitations.
-- Apply after 005_social_guest_invites.sql and 008_social_table_grants.sql.
-- Row-level security policies remain responsible for who can access each row.

grant usage on schema public to authenticated;

revoke all on table public.social_live_invites from anon, authenticated;
grant select, insert on table public.social_live_invites to authenticated;
grant update (status, responded_at) on table public.social_live_invites to authenticated;

-- Live gifts are read-only to clients; sending must go through the secure RPC.
revoke insert, update, delete on table public.social_live_gifts from anon, authenticated;
grant select on table public.social_live_gifts to authenticated;
