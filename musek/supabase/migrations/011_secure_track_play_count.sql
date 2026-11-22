-- Secure play counting: only the trusted server route may award a play.
-- Anonymous listening remains supported through a server-issued visitor cookie.

CREATE TABLE IF NOT EXISTS public.track_play_guard (
  track_id uuid NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  identity_type text NOT NULL CHECK (identity_type = 'visitor'),
  identity_hash text NOT NULL CHECK (identity_hash ~ '^[0-9a-f]{64}$'),
  last_counted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (track_id, identity_type, identity_hash)
);

ALTER TABLE public.track_play_guard ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.track_play_guard FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS track_play_guard_last_counted_idx
  ON public.track_play_guard (last_counted_at);

-- Retire the browser-callable function. The replacement is service-role only.
REVOKE ALL ON FUNCTION public.increment_track_play(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_track_play(
  p_track_id uuid,
  p_visitor_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_artist_id uuid;
  v_now timestamptz := clock_timestamp();
  v_last_counted timestamptz;
BEGIN
  IF p_track_id IS NULL
    OR p_visitor_hash IS NULL
    OR p_visitor_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid play-count request.';
  END IF;

  -- Serialize concurrent requests for the same visitor and track.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('visitor:' || p_track_id::text || ':' || p_visitor_hash, 0)
  );

  SELECT last_counted_at
  INTO v_last_counted
  FROM public.track_play_guard
  WHERE track_id = p_track_id
    AND identity_type = 'visitor'
    AND identity_hash = p_visitor_hash;

  IF FOUND AND v_last_counted > v_now - interval '24 hours' THEN
    RETURN false;
  END IF;

  SELECT artist_id
  INTO v_artist_id
  FROM public.music_tracks
  WHERE id = p_track_id
    AND status = 'published'
  FOR SHARE;

  IF v_artist_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.track_play_events (track_id, artist_id)
  VALUES (p_track_id, v_artist_id);

  UPDATE public.music_tracks
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = p_track_id
    AND status = 'published';

  INSERT INTO public.track_play_guard (
    track_id, identity_type, identity_hash, last_counted_at
  )
  VALUES (p_track_id, 'visitor', p_visitor_hash, v_now)
  ON CONFLICT (track_id, identity_type, identity_hash)
  DO UPDATE SET last_counted_at = EXCLUDED.last_counted_at;

  RETURN true;
END;
$function$;

-- Remove any previous three-argument version if this migration is reapplied.
DROP FUNCTION IF EXISTS public.record_track_play(uuid, text, text);

REVOKE ALL ON FUNCTION public.record_track_play(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_track_play(uuid, text)
  TO service_role;
