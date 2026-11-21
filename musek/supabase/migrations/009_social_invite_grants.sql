-- MUSEK SOCIAL: explicit grants for guest invitations.
-- Apply after 005_social_guest_invites.sql and 008_social_table_grants.sql.
-- Row-level security policies remain responsible for row-level access.

grant usage on schema public to authenticated;
revoke all on table public.social_live_invites from anon, authenticated;
grant select, insert on table public.social_live_invites to authenticated;
grant update (status, responded_at) on public.social_live_invites to authenticated;
