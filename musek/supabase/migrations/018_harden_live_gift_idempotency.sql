-- Make live-gift retries idempotent across room closure and reject key reuse
-- for a different room or gift payload.
CREATE OR REPLACE FUNCTION public.send_social_live_gift(
  p_room_id uuid,p_coins bigint,p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid:=auth.uid();
  v_creator_id uuid;
  v_gift_id uuid;
  v_existing_sender uuid;
  v_existing_coins bigint;
  v_existing_room uuid;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to send a live gift.';
  END IF;
  IF p_room_id IS NULL OR p_coins NOT IN (
    10,25,50,75,100,150,200,250,300,350,400,500,600,750,900,
    1000,1250,1500,1750,2000,2500,3000,3500,4000,5000,6000,
    7500,10000,12500,15000,20000,25000,30000,40000,50000,
    60000,75000,100000,120000,150000
  ) OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Choose a valid MUSEK live gift.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('musek-live-gift:'||p_idempotency_key::text,0));

  SELECT gt.id,slg.sender_id,slg.coins,slg.room_id
  INTO v_gift_id,v_existing_sender,v_existing_coins,v_existing_room
  FROM public.gift_transactions gt
  JOIN public.social_live_gifts slg ON slg.gift_id=gt.id
  WHERE gt.idempotency_key=p_idempotency_key;

  IF FOUND THEN
    IF v_existing_sender IS DISTINCT FROM v_sender_id
       OR v_existing_coins IS DISTINCT FROM p_coins
       OR v_existing_room IS DISTINCT FROM p_room_id THEN
      RAISE EXCEPTION 'This transaction key was already used for a different live gift.';
    END IF;
    RETURN v_gift_id;
  END IF;

  IF EXISTS(SELECT 1 FROM public.gift_transactions WHERE idempotency_key=p_idempotency_key) THEN
    RAISE EXCEPTION 'This transaction key was already used for a different gift.';
  END IF;

  SELECT host_id INTO v_creator_id
  FROM public.social_live_rooms
  WHERE id=p_room_id AND status='live'
  FOR UPDATE;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'This live room is no longer active.';
  END IF;
  IF v_creator_id=v_sender_id THEN
    RAISE EXCEPTION 'You cannot send a gift to yourself.';
  END IF;

  v_gift_id:=public.send_musek_gift(v_creator_id,p_coins,p_idempotency_key);

  INSERT INTO public.social_live_gifts(gift_id,room_id,sender_id,creator_id,coins)
  VALUES(v_gift_id,p_room_id,v_sender_id,v_creator_id,p_coins);

  RETURN v_gift_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.send_social_live_gift(uuid,bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_social_live_gift(uuid,bigint,uuid) TO authenticated;
