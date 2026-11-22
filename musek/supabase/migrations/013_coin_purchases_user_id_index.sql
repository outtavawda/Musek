-- Index coin purchase ownership lookups and user purchase history.
CREATE INDEX IF NOT EXISTS coin_purchases_user_id_idx
ON public.coin_purchases (user_id);
