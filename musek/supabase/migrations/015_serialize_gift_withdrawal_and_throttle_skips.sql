-- Serialize gift and withdrawal idempotency retries, and throttle skip analytics.
-- Mirrors the migration applied to the MUSEK Supabase project.

CREATE OR REPLACE FUNCTION public.request_artist_withdrawal(p_amount_cad numeric,p_idempotency_key uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid:=auth.uid(); v_account_type text; v_settled numeric(12,2);
  v_reserved numeric(12,2); v_available numeric(12,2); v_verified boolean;
  v_eligible boolean; v_withdrawal_id uuid; v_existing_user uuid; v_existing_amount numeric(12,2);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be logged in.'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'A request key is required.'; END IF;
  IF p_amount_cad IS NULL OR p_amount_cad<100 OR p_amount_cad<>round(p_amount_cad,2) THEN
    RAISE EXCEPTION 'Withdrawal must be at least $100 CAD and use two decimal places.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('musek-withdrawal:'||p_idempotency_key::text,0));
  SELECT id,user_id,amount_cad INTO v_withdrawal_id,v_existing_user,v_existing_amount
  FROM public.creator_withdrawals WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing_user IS DISTINCT FROM v_user_id OR v_existing_amount IS DISTINCT FROM p_amount_cad THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different request.';
    END IF;
    RETURN v_withdrawal_id;
  END IF;
  SELECT account_type INTO v_account_type FROM public.user_profiles WHERE id=v_user_id;
  IF v_account_type IS DISTINCT FROM 'artist' THEN RAISE EXCEPTION 'Only artist accounts can request withdrawals.'; END IF;
  SELECT settled_balance_cad,payout_verified,payout_eligible
  INTO v_settled,v_verified,v_eligible FROM public.creator_wallets WHERE user_id=v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artist wallet not found.'; END IF;
  IF NOT COALESCE(v_verified,false) OR NOT COALESCE(v_eligible,false) THEN
    RAISE EXCEPTION 'Payouts are unavailable until creator verification and payout eligibility are approved.';
  END IF;
  SELECT COALESCE(SUM(amount_cad),0) INTO v_reserved
  FROM public.creator_withdrawals WHERE user_id=v_user_id AND status IN ('pending','approved','processing');
  v_available:=v_settled-v_reserved;
  IF p_amount_cad>v_available THEN RAISE EXCEPTION 'Insufficient settled funds. Available balance: $%',v_available; END IF;
  INSERT INTO public.creator_withdrawals(user_id,amount_cad,status,idempotency_key)
  VALUES(v_user_id,p_amount_cad,'pending',p_idempotency_key)
  ON CONFLICT(idempotency_key) DO NOTHING RETURNING id INTO v_withdrawal_id;
  IF v_withdrawal_id IS NULL THEN
    SELECT id,user_id,amount_cad INTO v_withdrawal_id,v_existing_user,v_existing_amount
    FROM public.creator_withdrawals WHERE idempotency_key=p_idempotency_key;
    IF v_existing_user IS DISTINCT FROM v_user_id OR v_existing_amount IS DISTINCT FROM p_amount_cad THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different request.';
    END IF;
  END IF;
  RETURN v_withdrawal_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_musek_gift(p_creator_id uuid,p_coins bigint,p_idempotency_key uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid:=auth.uid(); v_sender_type text; v_creator_type text;
  v_gift_id uuid; v_existing_sender uuid; v_existing_creator uuid; v_existing_coins bigint;
  v_creator_coins bigint; v_total_cad numeric(12,2); v_creator_share numeric(12,2); v_musek_share numeric(12,2);
BEGIN
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'You must be logged in to send gifts.'; END IF;
  IF p_coins IS NULL OR p_coins<=0 OR p_idempotency_key IS NULL OR p_creator_id IS NULL OR p_creator_id=v_sender_id THEN
    RAISE EXCEPTION 'Invalid gift request.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('musek-gift:'||p_idempotency_key::text,0));
  SELECT id,sender_id,creator_id,coins INTO v_gift_id,v_existing_sender,v_existing_creator,v_existing_coins
  FROM public.gift_transactions WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing_sender IS DISTINCT FROM v_sender_id OR v_existing_creator IS DISTINCT FROM p_creator_id
       OR v_existing_coins IS DISTINCT FROM p_coins THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different gift.';
    END IF;
    RETURN v_gift_id;
  END IF;
  SELECT account_type INTO v_sender_type FROM public.user_profiles WHERE id=v_sender_id;
  IF v_sender_type IS DISTINCT FROM 'fan' THEN RAISE EXCEPTION 'Only fan accounts can send gifts.'; END IF;
  SELECT account_type INTO v_creator_type FROM public.user_profiles WHERE id=p_creator_id;
  IF v_creator_type IS DISTINCT FROM 'artist' THEN RAISE EXCEPTION 'Gifts can only be sent to artist accounts.'; END IF;
  v_creator_coins:=round(p_coins*0.70)::bigint;
  v_total_cad:=p_coins::numeric/100;
  v_creator_share:=round(v_total_cad*0.70,2);
  v_musek_share:=v_total_cad-v_creator_share;
  UPDATE public.fan_coin_wallets SET coin_balance=coin_balance-p_coins,updated_at=now()
  WHERE user_id=v_sender_id AND coin_balance>=p_coins;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient coin balance.'; END IF;
  UPDATE public.creator_wallets SET coin_balance=coin_balance+v_creator_coins,
    total_coins_received=total_coins_received+v_creator_coins,
    total_earnings_cad=total_earnings_cad+v_creator_share,updated_at=now()
  WHERE user_id=p_creator_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artist wallet not found.'; END IF;
  INSERT INTO public.gift_transactions(sender_id,creator_id,coins,creator_share_cad,musek_share_cad,status,idempotency_key)
  VALUES(v_sender_id,p_creator_id,p_coins,v_creator_share,v_musek_share,'settled',p_idempotency_key)
  RETURNING id INTO v_gift_id;
  RETURN v_gift_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_music_skip(p_track_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid:=auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be logged in to record a skip.'; END IF;
  IF p_track_id IS NULL THEN RAISE EXCEPTION 'Invalid track.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('musek-skip:'||v_user_id::text||':'||p_track_id::text,0));
  IF NOT EXISTS(SELECT 1 FROM public.music_tracks WHERE id=p_track_id AND status='published') THEN
    RAISE EXCEPTION 'Published song not found.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.music_skip_events
    WHERE user_id=v_user_id AND track_id=p_track_id
      AND skipped_at>now()-interval '30 minutes') THEN RETURN; END IF;
  INSERT INTO public.music_skip_events(user_id,track_id) VALUES(v_user_id,p_track_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.request_artist_withdrawal(numeric,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_artist_withdrawal(numeric,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.send_musek_gift(uuid,bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_musek_gift(uuid,bigint,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_music_skip(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_music_skip(uuid) TO authenticated;
