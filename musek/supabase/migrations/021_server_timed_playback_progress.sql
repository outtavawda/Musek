-- Accumulate server-timed, monotonic playback progress before counting a play.
ALTER TABLE public.track_play_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_position_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credited_seconds integer NOT NULL DEFAULT 0;

UPDATE public.track_play_sessions
SET last_heartbeat_at = started_at
WHERE last_heartbeat_at IS NULL;

CREATE OR REPLACE FUNCTION public.heartbeat_track_play_session(
  p_session_id uuid,
  p_visitor_hash text,
  p_playback_position_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_session public.track_play_sessions%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_elapsed numeric;
  v_position_delta integer;
  v_add_seconds integer := 0;
BEGIN
  IF p_session_id IS NULL OR p_visitor_hash IS NULL
    OR p_visitor_hash !~ '^[0-9a-f]{64}$'
    OR p_playback_position_seconds IS NULL OR p_playback_position_seconds < 0 THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_session
  FROM public.track_play_sessions
  WHERE id = p_session_id AND identity_hash = p_visitor_hash
  FOR UPDATE;

  IF NOT FOUND OR v_session.counted OR v_session.completed_at IS NOT NULL
    OR v_session.started_at < v_now - interval '2 hours' THEN
    RETURN 0;
  END IF;

  v_elapsed := extract(epoch FROM (v_now - COALESCE(v_session.last_heartbeat_at, v_session.started_at)));
  v_position_delta := p_playback_position_seconds - v_session.last_position_seconds;

  IF v_elapsed BETWEEN 4 AND 15
    AND v_position_delta BETWEEN greatest(1, floor(v_elapsed * 0.5)::integer)
                              AND ceil(v_elapsed + 2)::integer THEN
    v_add_seconds := least(floor(v_elapsed)::integer, v_position_delta);
  END IF;

  UPDATE public.track_play_sessions
  SET last_heartbeat_at = v_now,
      last_position_seconds = p_playback_position_seconds,
      credited_seconds = credited_seconds + v_add_seconds
  WHERE id = p_session_id;

  RETURN v_session.credited_seconds + v_add_seconds;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_track_play_session(
  p_session_id uuid,
  p_visitor_hash text,
  p_playback_position_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_session public.track_play_sessions%ROWTYPE;
  v_artist_id uuid;
  v_now timestamptz := clock_timestamp();
  v_last_counted timestamptz;
BEGIN
  IF p_session_id IS NULL OR p_visitor_hash IS NULL
    OR p_visitor_hash !~ '^[0-9a-f]{64}$'
    OR p_playback_position_seconds IS NULL OR p_playback_position_seconds < 30 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_session
  FROM public.track_play_sessions
  WHERE id = p_session_id AND identity_hash = p_visitor_hash
  FOR UPDATE;

  IF NOT FOUND OR v_session.counted OR v_session.completed_at IS NOT NULL
    OR v_session.credited_seconds < 30
    OR v_session.started_at < v_now - interval '2 hours' THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'visitor:' || v_session.track_id::text || ':' || p_visitor_hash, 0
  ));

  SELECT last_counted_at INTO v_last_counted
  FROM public.track_play_guard
  WHERE track_id = v_session.track_id
    AND identity_type = 'visitor'
    AND identity_hash = p_visitor_hash;

  IF FOUND AND v_last_counted > v_now - interval '24 hours' THEN
    UPDATE public.track_play_sessions SET completed_at = v_now WHERE id = p_session_id;
    RETURN false;
  END IF;

  SELECT artist_id INTO v_artist_id
  FROM public.music_tracks
  WHERE id = v_session.track_id AND status = 'published'
  FOR SHARE;

  IF v_artist_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.track_play_events (track_id, artist_id)
  VALUES (v_session.track_id, v_artist_id);

  UPDATE public.music_tracks
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = v_session.track_id AND status = 'published';

  INSERT INTO public.track_play_guard (track_id, identity_type, identity_hash, last_counted_at)
  VALUES (v_session.track_id, 'visitor', p_visitor_hash, v_now)
  ON CONFLICT (track_id, identity_type, identity_hash)
  DO UPDATE SET last_counted_at = EXCLUDED.last_counted_at;

  UPDATE public.track_play_sessions
  SET counted = true, completed_at = v_now
  WHERE id = p_session_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.heartbeat_track_play_session(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_track_play_session(uuid, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.start_track_play_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_track_play_session(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_track_play_session(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_track_play_session(uuid, text, integer) TO service_role;
