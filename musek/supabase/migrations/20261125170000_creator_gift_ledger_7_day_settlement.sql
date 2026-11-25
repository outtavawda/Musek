-- YASUH creator gift earnings: append-only ledger with a seven-day settlement hold.
-- Gift completion and cash settlement are deliberately separate concepts.
-- This migration is committed for review; do not apply to production until reviewed.

CREATE TABLE IF NOT EXISTS public.creator_earning_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('earning','settlement','withdrawal','reversal','adjustment')),
  amount_cad numeric(12,2) NOT NULL CHECK (amount_cad <> 0),
  currency text NOT NULL DEFAULT 'CAD' CHECK (currency = 'CAD'),
  source_gift_transaction_id uuid REFERENCES public.gift_transactions(id) ON DELETE RESTRICT,
  source_withdrawal_id uuid REFERENCES public.creator_withdrawals(id) ON DELETE RESTRICT,
  related_ledger_id uuid REFERENCES public.creator_earning_ledger(id) ON DELETE RESTRICT,
  settlement_batch_id uuid,
  available_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT creator_earning_ledger_event_source_check CHECK (
    (event_type = 'earning' AND source_gift_transaction_id IS NOT NULL AND source_withdrawal_id IS NULL AND related_ledger_id IS NULL AND amount_cad > 0 AND available_at IS NOT NULL)
    OR (event_type = 'settlement' AND source_gift_transaction_id IS NULL AND source_withdrawal_id IS NULL AND related_ledger_id IS NOT NULL AND amount_cad > 0 AND available_at IS NULL AND settlement_batch_id IS NOT NULL)
    OR (event_type = 'withdrawal' AND source_gift_transaction_id IS NULL AND source_withdrawal_id IS NOT NULL AND related_ledger_id IS NULL AND amount_cad < 0 AND available_at IS NULL)
    OR (event_type IN ('reversal','adjustment') AND source_gift_transaction_id IS NULL AND source_withdrawal_id IS NULL AND related_ledger_id IS NOT NULL AND available_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS creator_earning_ledger_one_gift_earning
  ON public.creator_earning_ledger(source_gift_transaction_id)
  WHERE event_type = 'earning';
CREATE UNIQUE INDEX IF NOT EXISTS creator_earning_ledger_one_settlement_per_earning
  ON public.creator_earning_ledger(related_ledger_id)
  WHERE event_type = 'settlement';
CREATE UNIQUE INDEX IF NOT EXISTS creator_earning_ledger_one_paid_withdrawal
  ON public.creator_earning_ledger(source_withdrawal_id)
  WHERE event_type = 'withdrawal';
CREATE INDEX IF NOT EXISTS creator_earning_ledger_creator_created_idx
  ON public.creator_earning_ledger(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_earning_ledger_available_idx
  ON public.creator_earning_ledger(available_at, creator_id)
  WHERE event_type = 'earning';

CREATE TABLE IF NOT EXISTS public.creator_settlement_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key uuid NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_entry_count integer NOT NULL DEFAULT 0,
  settled_total_cad numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed'))
);

ALTER TABLE public.creator_earning_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_settlement_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_earning_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.creator_settlement_batches FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_creator_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Creator financial ledger rows are append-only.';
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_creator_ledger_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS creator_earning_ledger_immutable ON public.creator_earning_ledger;
CREATE TRIGGER creator_earning_ledger_immutable
BEFORE UPDATE OR DELETE ON public.creator_earning_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_ledger_mutation();

CREATE OR REPLACE FUNCTION public.record_creator_gift_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'settled' AND NEW.creator_share_cad > 0 THEN
    INSERT INTO public.creator_earning_ledger (
      creator_id, event_type, amount_cad, source_gift_transaction_id,
      available_at, metadata
    )
    VALUES (
      NEW.creator_id, 'earning', NEW.creator_share_cad,
      NEW.id, NEW.created_at + interval '7 days',
      jsonb_build_object('policy', '7_day_hold', 'gift_status', NEW.status)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_creator_gift_earning() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS gift_transactions_record_creator_earning ON public.gift_transactions;
CREATE TRIGGER gift_transactions_record_creator_earning
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.record_creator_gift_earning();

-- Idempotent historical backfill. This records earnings only; it does not
-- increase any withdrawable wallet balance.
INSERT INTO public.creator_earning_ledger (
  creator_id, event_type, amount_cad, source_gift_transaction_id,
  available_at, created_at, metadata
)
SELECT
  gt.creator_id, 'earning', gt.creator_share_cad, gt.id,
  gt.created_at + interval '7 days', gt.created_at,
  jsonb_build_object('policy', '7_day_hold', 'backfilled', true, 'gift_status', gt.status)
FROM public.gift_transactions gt
WHERE gt.status = 'settled' AND gt.creator_share_cad > 0
ON CONFLICT DO NOTHING;

-- Record cash leaving the settled wallet when an existing withdrawal becomes paid.
CREATE OR REPLACE FUNCTION public.record_creator_paid_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    INSERT INTO public.creator_earning_ledger (
      creator_id, event_type, amount_cad, source_withdrawal_id, metadata
    )
    VALUES (
      NEW.user_id, 'withdrawal', -NEW.amount_cad, NEW.id,
      jsonb_build_object('payout_reference', NEW.payout_reference)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_creator_paid_withdrawal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS creator_withdrawals_record_paid_ledger ON public.creator_withdrawals;
CREATE TRIGGER creator_withdrawals_record_paid_ledger
AFTER UPDATE OF status ON public.creator_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.record_creator_paid_withdrawal();

-- Admin-only, idempotent settlement. Matured earnings are settled only for
-- creators who are both payout-verified and payout-eligible.
CREATE OR REPLACE FUNCTION public.settle_creator_gift_earnings(p_batch_key uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_batch_id uuid;
  v_count integer := 0;
  v_total numeric(12,2) := 0;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.user_id = v_admin
  ) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;
  IF p_batch_key IS NULL THEN RAISE EXCEPTION 'Settlement batch key is required.'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('yasuh-creator-settlement', 0));

  SELECT id INTO v_batch_id
  FROM public.creator_settlement_batches
  WHERE batch_key = p_batch_key;

  IF FOUND THEN
    RETURN jsonb_build_object('batch_id', v_batch_id, 'status', 'already_processed');
  END IF;

  INSERT INTO public.creator_settlement_batches(batch_key, created_by)
  VALUES (p_batch_key, v_admin)
  RETURNING id INTO v_batch_id;

  -- Lock eligible creator wallet rows before crediting their settled balances.
  PERFORM cw.user_id
  FROM public.creator_wallets cw
  WHERE cw.payout_verified = true AND cw.payout_eligible = true
    AND EXISTS (
      SELECT 1 FROM public.creator_earning_ledger e
      WHERE e.creator_id = cw.user_id AND e.event_type = 'earning'
        AND e.available_at <= now()
        AND NOT EXISTS (
          SELECT 1 FROM public.creator_earning_ledger s
          WHERE s.event_type = 'settlement' AND s.related_ledger_id = e.id
        )
    )
  ORDER BY cw.user_id
  FOR UPDATE;

  INSERT INTO public.creator_earning_ledger (
    creator_id, event_type, amount_cad, related_ledger_id,
    settlement_batch_id, metadata
  )
  SELECT e.creator_id, 'settlement', e.amount_cad, e.id, v_batch_id,
         jsonb_build_object('policy', '7_day_hold', 'settled_by', v_admin)
  FROM public.creator_earning_ledger e
  JOIN public.creator_wallets cw ON cw.user_id = e.creator_id
  WHERE e.event_type = 'earning'
    AND e.available_at <= now()
    AND cw.payout_verified = true AND cw.payout_eligible = true
    AND NOT EXISTS (
      SELECT 1 FROM public.creator_earning_ledger s
      WHERE s.event_type = 'settlement' AND s.related_ledger_id = e.id
    )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  SELECT COALESCE(sum(amount_cad), 0)::numeric(12,2)
  INTO v_total
  FROM public.creator_earning_ledger
  WHERE event_type = 'settlement' AND settlement_batch_id = v_batch_id;

  UPDATE public.creator_wallets cw
  SET settled_balance_cad = cw.settled_balance_cad + x.amount,
      updated_at = now()
  FROM (
    SELECT creator_id, sum(amount_cad)::numeric(12,2) AS amount
    FROM public.creator_earning_ledger
    WHERE event_type = 'settlement' AND settlement_batch_id = v_batch_id
    GROUP BY creator_id
  ) x
  WHERE cw.user_id = x.creator_id;

  UPDATE public.creator_settlement_batches
  SET settled_entry_count = v_count, settled_total_cad = v_total
  WHERE id = v_batch_id;

  RETURN jsonb_build_object(
    'batch_id', v_batch_id, 'status', 'completed',
    'settled_entry_count', v_count, 'settled_total_cad', v_total
  );
END;
$$;
REVOKE ALL ON FUNCTION public.settle_creator_gift_earnings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_creator_gift_earnings(uuid) TO authenticated;

-- Admin-only read-only reconciliation. Expected settled balance is cumulative
-- settlements minus paid withdrawals plus signed adjustment entries.
CREATE OR REPLACE FUNCTION public.reconcile_creator_wallet_ledger()
RETURNS TABLE (
  creator_id uuid,
  wallet_total_earnings_cad numeric,
  ledger_earnings_cad numeric,
  wallet_settled_balance_cad numeric,
  ledger_expected_settled_cad numeric,
  pending_eligible_cad numeric,
  earnings_match boolean,
  settled_balance_match boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.user_id = v_admin
  ) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  RETURN QUERY
  SELECT
    cw.user_id,
    cw.total_earnings_cad,
    COALESCE(x.earned, 0)::numeric(12,2),
    cw.settled_balance_cad,
    COALESCE(x.settled, 0)::numeric(12,2),
    COALESCE(x.pending_eligible, 0)::numeric(12,2),
    cw.total_earnings_cad = COALESCE(x.earned, 0),
    cw.settled_balance_cad = COALESCE(x.expected_settled, 0)
  FROM public.creator_wallets cw
  LEFT JOIN (
    SELECT
      e.creator_id,
      sum(e.amount_cad) FILTER (WHERE e.event_type = 'earning')::numeric(12,2) AS earned,
      sum(e.amount_cad) FILTER (WHERE e.event_type = 'settlement')::numeric(12,2) AS settled,
      sum(e.amount_cad) FILTER (
        WHERE e.event_type = 'earning'
          AND e.available_at <= now()
          AND NOT EXISTS (
            SELECT 1 FROM public.creator_earning_ledger s
            WHERE s.event_type = 'settlement' AND s.related_ledger_id = e.id
          )
      )::numeric(12,2) AS pending_eligible,
      (
        COALESCE(sum(e.amount_cad) FILTER (WHERE e.event_type = 'settlement'), 0)
        + COALESCE(sum(e.amount_cad) FILTER (WHERE e.event_type IN ('withdrawal','adjustment')), 0)
      )::numeric(12,2) AS expected_settled
    FROM public.creator_earning_ledger e
    GROUP BY e.creator_id
  ) x ON x.creator_id = cw.user_id
  ORDER BY cw.user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_creator_wallet_ledger() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_creator_wallet_ledger() TO authenticated;

COMMENT ON TABLE public.creator_earning_ledger IS
  'Append-only CAD creator financial event ledger. Gift earnings mature after a seven-day hold; settlement is a separate event.';
COMMENT ON TABLE public.creator_settlement_batches IS
  'Idempotent administrative batches that transfer matured eligible gift earnings into creator withdrawable balances.';
COMMENT ON FUNCTION public.settle_creator_gift_earnings(uuid) IS
  'Admin-only idempotent settlement of gift earnings after the seven-day hold for payout-verified and payout-eligible creators.';
COMMENT ON FUNCTION public.reconcile_creator_wallet_ledger() IS
  'Admin-only read-only comparison of creator wallet earnings and settled balances against append-only ledger totals.';
