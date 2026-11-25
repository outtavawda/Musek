-- Harden exposed SECURITY DEFINER RPCs against search_path manipulation.
-- Function bodies use schema-qualified public objects, so an empty path is safe.
ALTER FUNCTION public.admin_set_creator_payout_eligibility(uuid,boolean,boolean,numeric) SET search_path = '';
ALTER FUNCTION public.admin_update_withdrawal(uuid,text,text,text) SET search_path = '';
ALTER FUNCTION public.cancel_label_invitation(uuid) SET search_path = '';
ALTER FUNCTION public.follow_artist(uuid) SET search_path = '';
ALTER FUNCTION public.get_artist_follower_count(uuid) SET search_path = '';
ALTER FUNCTION public.record_music_listen(uuid,integer) SET search_path = '';
ALTER FUNCTION public.record_music_skip(uuid) SET search_path = '';
ALTER FUNCTION public.request_artist_withdrawal(numeric,uuid) SET search_path = '';
ALTER FUNCTION public.respond_to_label_invitation(uuid,text) SET search_path = '';
ALTER FUNCTION public.send_musek_gift(uuid,bigint,uuid) SET search_path = '';
ALTER FUNCTION public.send_social_live_gift(uuid,bigint,uuid) SET search_path = '';
ALTER FUNCTION public.unfollow_artist(uuid) SET search_path = '';
ALTER FUNCTION public.update_my_music_preferences() SET search_path = '';

-- Preserve existing EXECUTE grants: these RPCs are intentionally used by
-- authenticated app flows; get_artist_follower_count is intentionally public.
-- Do not blanket-revoke privileges without replacing the corresponding flows.
