-- Foreign-key lookup indexes missing from the MUSEK schema.
CREATE INDEX IF NOT EXISTS creator_withdrawals_user_id_idx ON public.creator_withdrawals (user_id);
CREATE INDEX IF NOT EXISTS favorite_tracks_track_id_idx ON public.favorite_tracks (track_id);
CREATE INDEX IF NOT EXISTS gift_transactions_creator_id_idx ON public.gift_transactions (creator_id);
CREATE INDEX IF NOT EXISTS gift_transactions_sender_id_idx ON public.gift_transactions (sender_id);
CREATE INDEX IF NOT EXISTS music_track_comments_user_id_idx ON public.music_track_comments (user_id);
CREATE INDEX IF NOT EXISTS music_tracks_artist_id_idx ON public.music_tracks (artist_id);
CREATE INDEX IF NOT EXISTS social_live_gifts_creator_id_idx ON public.social_live_gifts (creator_id);
CREATE INDEX IF NOT EXISTS social_live_gifts_sender_id_idx ON public.social_live_gifts (sender_id);
CREATE INDEX IF NOT EXISTS social_live_invites_inviter_id_idx ON public.social_live_invites (inviter_id);
CREATE INDEX IF NOT EXISTS social_live_messages_user_id_idx ON public.social_live_messages (user_id);
CREATE INDEX IF NOT EXISTS social_live_reactions_user_id_idx ON public.social_live_reactions (user_id);
CREATE INDEX IF NOT EXISTS social_live_rooms_host_id_idx ON public.social_live_rooms (host_id);
CREATE INDEX IF NOT EXISTS social_post_comments_user_id_idx ON public.social_post_comments (user_id);
CREATE INDEX IF NOT EXISTS social_post_likes_user_id_idx ON public.social_post_likes (user_id);
CREATE INDEX IF NOT EXISTS track_play_events_track_id_idx ON public.track_play_events (track_id);
DROP INDEX IF EXISTS public.artist_follows_artist_idx;

-- Separate verified eligibility and settled payout funds from lifetime earnings.
ALTER TABLE public.creator_wallets
  ADD COLUMN IF NOT EXISTS payout_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_balance_cad numeric(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.creator_wallets'::regclass
      AND conname='creator_wallets_settled_balance_nonnegative') THEN
    ALTER TABLE public.creator_wallets
      ADD CONSTRAINT creator_wallets_settled_balance_nonnegative
      CHECK (settled_balance_cad >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_creator_payout_eligibility(
  p_creator_id uuid, p_verified boolean, p_eligible boolean, p_settled_balance_cad numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF p_creator_id IS NULL OR p_verified IS NULL OR p_eligible IS NULL
     OR p_settled_balance_cad IS NULL OR p_settled_balance_cad < 0
     OR p_settled_balance_cad <> round(p_settled_balance_cad,2) THEN
    RAISE EXCEPTION 'Invalid payout eligibility details';
  END IF;
  IF p_eligible AND NOT p_verified THEN
    RAISE EXCEPTION 'A creator must be verified before becoming payout eligible';
  END IF;
  UPDATE public.creator_wallets
  SET payout_verified=p_verified,payout_eligible=p_eligible,
      settled_balance_cad=p_settled_balance_cad,updated_at=now()
  WHERE user_id=p_creator_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Creator wallet not found'; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_creator_payout_eligibility(uuid,boolean,boolean,numeric)
FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_creator_payout_eligibility(uuid,boolean,boolean,numeric)
TO authenticated;

CREATE OR REPLACE FUNCTION public.request_artist_withdrawal(p_amount_cad numeric,p_idempotency_key uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid:=auth.uid(); v_account_type text; v_settled numeric(12,2);
  v_reserved numeric(12,2); v_available numeric(12,2); v_verified boolean;
  v_eligible boolean; v_withdrawal_id uuid; v_existing_user uuid;
  v_existing_amount numeric(12,2);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be logged in.'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'A request key is required.'; END IF;
  IF p_amount_cad IS NULL OR p_amount_cad<100 OR p_amount_cad<>round(p_amount_cad,2) THEN
    RAISE EXCEPTION 'Withdrawal must be at least $100 CAD and use two decimal places.';
  END IF;
  SELECT id,user_id,amount_cad INTO v_withdrawal_id,v_existing_user,v_existing_amount
  FROM public.creator_withdrawals WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing_user IS DISTINCT FROM v_user_id OR v_existing_amount IS DISTINCT FROM p_amount_cad THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different request.';
    END IF;
    RETURN v_withdrawal_id;
  END IF;
  SELECT account_type INTO v_account_type FROM public.user_profiles WHERE id=v_user_id;
  IF v_account_type IS DISTINCT FROM 'artist' THEN
    RAISE EXCEPTION 'Only artist accounts can request withdrawals.';
  END IF;
  SELECT settled_balance_cad,payout_verified,payout_eligible
  INTO v_settled,v_verified,v_eligible
  FROM public.creator_wallets WHERE user_id=v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artist wallet not found.'; END IF;
  IF NOT COALESCE(v_verified,false) OR NOT COALESCE(v_eligible,false) THEN
    RAISE EXCEPTION 'Payouts are unavailable until creator verification and payout eligibility are approved.';
  END IF;
  SELECT COALESCE(SUM(amount_cad),0) INTO v_reserved
  FROM public.creator_withdrawals
  WHERE user_id=v_user_id AND status IN ('pending','approved','processing');
  v_available:=v_settled-v_reserved;
  IF p_amount_cad>v_available THEN
    RAISE EXCEPTION 'Insufficient settled funds. Available balance: $%',v_available;
  END IF;
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
REVOKE ALL ON FUNCTION public.request_artist_withdrawal(numeric,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_artist_withdrawal(numeric,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(
  p_withdrawal_id uuid,p_new_status text,p_admin_note text DEFAULT NULL,p_payout_reference text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_current_status text; v_user_id uuid; v_amount numeric(12,2); v_settled numeric(12,2);
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF p_new_status NOT IN ('approved','rejected','processing','paid') THEN
    RAISE EXCEPTION 'Invalid withdrawal status';
  END IF;
  SELECT status,user_id,amount_cad INTO v_current_status,v_user_id,v_amount
  FROM public.creator_withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;
  IF NOT ((v_current_status='pending' AND p_new_status IN ('approved','rejected'))
    OR (v_current_status='approved' AND p_new_status='processing')
    OR (v_current_status='processing' AND p_new_status='paid')) THEN
    RAISE EXCEPTION 'This status change is not permitted';
  END IF;
  IF p_new_status='rejected' AND NULLIF(TRIM(p_admin_note),'') IS NULL THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;
  IF p_new_status='paid' AND NULLIF(TRIM(p_payout_reference),'') IS NULL THEN
    RAISE EXCEPTION 'A payout reference is required';
  END IF;
  IF p_new_status='paid' THEN
    SELECT settled_balance_cad INTO v_settled FROM public.creator_wallets
    WHERE user_id=v_user_id FOR UPDATE;
    IF NOT FOUND OR v_settled<v_amount THEN
      RAISE EXCEPTION 'Insufficient settled balance to complete this payout.';
    END IF;
    UPDATE public.creator_wallets SET settled_balance_cad=settled_balance_cad-v_amount,updated_at=now()
    WHERE user_id=v_user_id;
  END IF;
  UPDATE public.creator_withdrawals
  SET status=p_new_status,admin_note=COALESCE(p_admin_note,admin_note),
      payout_reference=COALESCE(p_payout_reference,payout_reference),
      reviewed_at=CASE WHEN p_new_status IN ('approved','rejected') THEN now() ELSE reviewed_at END,
      paid_at=CASE WHEN p_new_status='paid' THEN now() ELSE paid_at END,updated_at=now()
  WHERE id=p_withdrawal_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_update_withdrawal(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal(uuid,text,text,text) TO authenticated;

-- Gifts use a transaction-scoped advisory lock for idempotent concurrent retries.
CREATE OR REPLACE FUNCTION public.send_musek_gift(p_creator_id uuid,p_coins bigint,p_idempotency_key uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid:=auth.uid(); v_sender_type text; v_creator_type text;
  v_gift_id uuid; v_existing_sender uuid; v_existing_creator uuid; v_existing_coins bigint;
  v_creator_coins bigint; v_total_cad numeric(12,2); v_creator_share numeric(12,2); v_musek_share numeric(12,2);
BEGIN
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'You must be logged in to send gifts.'; END IF;
  IF p_coins IS NULL OR p_coins<=0 OR p_idempotency_key IS NULL
     OR p_creator_id IS NULL OR p_creator_id=v_sender_id THEN
    RAISE EXCEPTION 'Invalid gift request.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('musek-gift:'||p_idempotency_key::text,0));
  SELECT id,sender_id,creator_id,coins
  INTO v_gift_id,v_existing_sender,v_existing_creator,v_existing_coins
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
  UPDATE public.creator_wallets
  SET coin_balance=coin_balance+v_creator_coins,total_coins_received=total_coins_received+v_creator_coins,
      total_earnings_cad=total_earnings_cad+v_creator_share,updated_at=now()
  WHERE user_id=p_creator_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Artist wallet not found.'; END IF;
  INSERT INTO public.gift_transactions(sender_id,creator_id,coins,creator_share_cad,musek_share_cad,status,idempotency_key)
  VALUES(v_sender_id,p_creator_id,p_coins,v_creator_share,v_musek_share,'settled',p_idempotency_key)
  RETURNING id INTO v_gift_id;
  RETURN v_gift_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.send_musek_gift(uuid,bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_musek_gift(uuid,bigint,uuid) TO authenticated;
