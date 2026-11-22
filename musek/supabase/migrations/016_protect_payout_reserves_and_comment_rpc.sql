-- Make the bounded public comment-count RPC use caller RLS policies.
CREATE OR REPLACE FUNCTION public.get_track_comment_counts(p_track_ids uuid[])
RETURNS TABLE(track_id uuid, comment_count bigint)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_track_ids IS NULL OR cardinality(p_track_ids) > 100 THEN
    RAISE EXCEPTION 'Request at most 100 track IDs at a time.';
  END IF;
  RETURN QUERY
  SELECT requested.track_id,COUNT(c.id)::BIGINT
  FROM unnest(p_track_ids) AS requested(track_id)
  JOIN public.music_tracks mt ON mt.id=requested.track_id AND mt.status='published'
  LEFT JOIN public.music_track_comments c ON c.track_id=mt.id AND c.status='visible'
  GROUP BY requested.track_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_track_comment_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_track_comment_counts(uuid[]) TO anon,authenticated;

-- Prevent an admin reconciliation from reducing settled funds below active reservations.
CREATE OR REPLACE FUNCTION public.admin_set_creator_payout_eligibility(
  p_creator_id uuid,p_verified boolean,p_eligible boolean,p_settled_balance_cad numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_reserved numeric(12,2);
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF p_creator_id IS NULL OR p_verified IS NULL OR p_eligible IS NULL
     OR p_settled_balance_cad IS NULL OR p_settled_balance_cad<0
     OR p_settled_balance_cad<>round(p_settled_balance_cad,2) THEN
    RAISE EXCEPTION 'Invalid payout eligibility details';
  END IF;
  IF p_eligible AND NOT p_verified THEN
    RAISE EXCEPTION 'A creator must be verified before becoming payout eligible';
  END IF;
  PERFORM 1 FROM public.creator_wallets WHERE user_id=p_creator_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Creator wallet not found'; END IF;
  SELECT COALESCE(SUM(amount_cad),0) INTO v_reserved
  FROM public.creator_withdrawals
  WHERE user_id=p_creator_id AND status IN ('pending','approved','processing');
  IF p_settled_balance_cad<v_reserved THEN
    RAISE EXCEPTION 'Settled balance cannot be lower than existing reserved withdrawals ($%).',v_reserved;
  END IF;
  UPDATE public.creator_wallets
  SET payout_verified=p_verified,payout_eligible=p_eligible,
      settled_balance_cad=p_settled_balance_cad,updated_at=now()
  WHERE user_id=p_creator_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_creator_payout_eligibility(uuid,boolean,boolean,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_creator_payout_eligibility(uuid,boolean,boolean,numeric) TO authenticated;
