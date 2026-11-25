# YASUH Wallet and Artist Payout Security Audit

**Date:** 2026-11-25  
**Branch reviewed:** `square-sandbox`  
**Supabase project:** `pragtvilfgyllabizlyw`  
**Scope:** live schema/RLS/grants and the withdrawal request client component plus live PostgreSQL function definitions. This is a code and configuration review, not a financial transaction test or independent compliance audit.

## Findings that passed review

### Withdrawal request controls
- The browser component validates a minimum of CAD $100, two decimal places, and the currently displayed available balance.
- The database RPC independently validates authentication, artist account type, minimum amount, two decimal places, wallet existence, creator verification and payout eligibility.
- The RPC locks the creator wallet row before calculating available funds.
- Pending, approved and processing withdrawals are reserved against the settled balance.
- A UUID idempotency key is protected by a transaction-scoped advisory lock and a unique partial index. Replays for the same user and amount return the original withdrawal; reuse for a different user or amount is rejected.
- The withdrawal table has no direct INSERT/UPDATE grants for `authenticated`; writes are routed through privileged RPCs.

### Admin payout controls
- Both admin RPCs check membership in `public.admin_users`.
- Payout eligibility cannot be enabled unless creator verification is true.
- Admin balance adjustments cannot reduce settled funds below already reserved pending/approved/processing withdrawals.
- Status transitions are constrained: pending → approved/rejected, approved → processing, processing → paid.
- Rejections require a reason; marking paid requires a payout reference.
- The paid transition locks the withdrawal and wallet rows, checks the remaining settled balance, and deducts the amount in the same transaction as the status update.

### Wallet and transaction access
- Live RLS is enabled on creator wallets, creator withdrawals, fan coin wallets, gift transactions and coin purchases.
- Authenticated users have SELECT only on these financial tables; no direct table write privileges were found for `anon` or `authenticated`.
- Wallet and withdrawal read policies scope users to their own records; admins can read all creator withdrawals.
- Gift transaction read policies scope access to the sender, recipient creator, and the creator's associated label as defined by policy.
- The reviewed gift RPC uses a transaction-scoped idempotency lock, debits the fan wallet only when sufficient coins exist, credits the creator share, and records the 70%/30% CAD split atomically.

## Items requiring follow-up

1. **Staging regression tests remain unexecuted.** Run the negative and positive matrix in isolated staging with disposable fan, artist and admin accounts, including concurrent duplicate requests and before/after wallet snapshots. Do not run destructive or financial negative tests against production.
2. **Settlement/reconciliation is operationally separate.** Gift earnings increase `total_earnings_cad`; withdrawable funds come from `settled_balance_cad`, which the admin eligibility RPC sets. Confirm the real settlement/reconciliation procedure and evidence before enabling live payouts. This review did not verify an external creator-payout processor.
3. **Admin RPC audit warnings remain.** Supabase advisors still flag callable SECURITY DEFINER functions. Their search paths are hardened and their bodies contain role/ownership checks, but the warnings are not cleared; retain the staging security tests and consider moving internal-only functions out of the exposed schema in a separately tested change.
4. **Client UX is not the security boundary.** The amount and balance checks in the browser are convenience checks; the database RPC is the authoritative validation layer.

## Verification boundary

- Read-only inspection of live schema, RLS policies, grants, indexes and function definitions was performed.
- No production gift, withdrawal, balance adjustment or payout was created or changed during this audit.
- No staging JWT/role regression tests, concurrency tests, or real payout-provider tests were run.
- This report does not mark wallet/payout launch readiness as complete.
