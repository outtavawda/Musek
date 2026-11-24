-- Server-validated playback sessions.
-- Only the trusted server route can create or complete sessions.
CREATE TABLE IF NOT EXISTS public.track_play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  identity_hash text NOT NULL CHECK (identity_hash ~ '^[0-9a-f]{64}$'),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  counted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS track_play_sessions_started_at_idx ON public.track_play_sessions (started_at);
ALTER TABLE public.track_play_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.track_play_sessions FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.start_track_play_session(p_track_id uuid, p_visitor_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_session_id uuid;
BEGIN
  IF p_track_id IS NULL OR p_visitor_hash IS NULL OR p_visitor_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid playback session request.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.music_tracks WHERE id = p_track_id AND status = 'published') THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.track_play_sessions (track_id, identity_hash)
  VALUES (p_track_id, p_visitor_hash) RETURNING id INTO v_session_id;
  RETURN v_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_track_play_session(
  p_session_id uuid, p_visitor_hash text, p_playback_position_seconds integer
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_session public.track_play_sessions%ROWTYPE;
  v_artist_id uuid;
  v_now timestamptz := clock_timestamp();
  v_last_counted timestamptz;
BEGIN
  IF p_session_id IS NULL OR p_visitor_hash IS NULL OR p_visitor_hash !~ '^[0-9a-f]{64}$'
    OR p_playback_position_seconds IS NULL OR p_playback_position_seconds < 30 THEN
    RETURN false;
  END IF;
  SELECT * INTO v_session FROM public.track_play_sessions
  WHERE id = p_session_id AND identity_hash = p_visitor_hash FOR UPDATE;
  IF NOT FOUND OR v_session.counted OR v_session.completed_at IS NOT NULL THEN RETURN false; END IF;
  IF v_session.started_at > v_now - interval '30 seconds'
    OR v_session.started_at < v_now - interval '2 hours' THEN RETURN false; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'visitor:' || v_session.track_id::text || ':' || p_visitor_hash, 0
  ));
  SELECT last_counted_at INTO v_last_counted FROM public.track_play_guard
  WHERE track_id = v_session.track_id AND identity_type = 'visitor' AND identity_hash = p_visitor_hash;
  IF FOUND AND v_last_counted > v_now - interval '24 hours' THEN
    UPDATE public.track_play_sessions SET completed_at = v_now WHERE id = p_session_id;
    RETURN false;
  END IF;

  SELECT artist_id INTO v_artist_id FROM public.music_tracks
  WHERE id = v_session.track_id AND status = 'published' FOR SHARE;
  IF v_artist_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.track_play_events (track_id, artist_id) VALUES (v_session.track_id, v_artist_id);
  UPDATE public.music_tracks SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = v_session.track_id AND status = 'published';
  INSERT INTO public.track_play_guard (track_id, identity_type, identity_hash, last_counted_at)
  VALUES (v_session.track_id, 'visitor', p_visitor_hash, v_now)
  ON CONFLICT (track_id, identity_type, identity_hash)
  DO UPDATE SET last_counted_at = EXCLUDED.last_counted_at;
  UPDATE public.track_play_sessions SET counted = true, completed_at = v_now WHERE id = p_session_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.start_track_play_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_track_play_session(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_track_play_session(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_track_play_session(uuid, text, integer) TO service_role;
