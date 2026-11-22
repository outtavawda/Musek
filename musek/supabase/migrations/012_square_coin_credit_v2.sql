-- Square coin purchase crediting v2.
-- This migration records the SQL already applied to the MUSEK Supabase project.
-- It adds an explicit outcome for webhook reconciliation and preserves
-- service-role-only execution.

CREATE OR REPLACE FUNCTION public.credit_coin_purchase_v2(
  p_square_order_id text,
  p_square_payment_id text,
  p_amount_cents bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  purchase_record record;
  existing_status text;
  existing_payment_id text;
  expected_amount_cents numeric;
BEGIN
  UPDATE public.coin_purchases
  SET
    status = 'paid',
    square_payment_id = p_square_payment_id,
    paid_at = now()
  WHERE square_order_id = p_square_order_id
    AND status = 'pending'
    AND square_payment_id IS NULL
    AND ROUND(amount_cad * 100) = p_amount_cents
  RETURNING user_id, coins
  INTO purchase_record;

  IF FOUND THEN
    INSERT INTO public.fan_coin_wallets (
      user_id,
      coin_balance,
      total_coins_purchased
    )
    VALUES (
      purchase_record.user_id,
      purchase_record.coins,
      purchase_record.coins
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      coin_balance =
        public.fan_coin_wallets.coin_balance
        + EXCLUDED.coin_balance,
      total_coins_purchased =
        public.fan_coin_wallets.total_coins_purchased
        + EXCLUDED.total_coins_purchased,
      updated_at = now();

    RETURN 'credited';
  END IF;

  SELECT
    status,
    square_payment_id,
    ROUND(amount_cad * 100)
  INTO
    existing_status,
    existing_payment_id,
    expected_amount_cents
  FROM public.coin_purchases
  WHERE square_order_id = p_square_order_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF existing_status = 'paid'
     AND existing_payment_id = p_square_payment_id THEN
    RETURN 'already_processed';
  END IF;

  IF existing_status = 'pending'
     AND expected_amount_cents <> p_amount_cents THEN
    RETURN 'amount_mismatch';
  END IF;

  RETURN 'not_eligible';
END;
$function$;

REVOKE ALL ON FUNCTION public.credit_coin_purchase_v2(text, text, bigint)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_coin_purchase_v2(text, text, bigint)
TO service_role;

-- Supports account-level purchase history and FK lookups.
CREATE INDEX IF NOT EXISTS coin_purchases_user_id_idx
ON public.coin_purchases (user_id);
