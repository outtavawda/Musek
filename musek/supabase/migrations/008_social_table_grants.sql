-- MUSEK SOCIAL: grant table privileges to signed-in users.
-- RLS policies in migration 004 continue to control which rows users can access.

grant usage on schema public to authenticated;

grant select, insert, update on table public.social_live_rooms to authenticated;
grant select, insert on table public.social_live_messages to authenticated;
grant select, insert on table public.social_live_reactions to authenticated;
