-- Harden the service-role-only Square coin-credit RPCs.
-- Both function bodies use schema-qualified public objects.
ALTER FUNCTION public.credit_coin_purchase(text,text,bigint) SET search_path = '';
ALTER FUNCTION public.credit_coin_purchase_v2(text,text,bigint) SET search_path = '';

-- These functions intentionally remain unavailable to anon/authenticated;
-- the Square webhook/server path invokes them with service_role.
