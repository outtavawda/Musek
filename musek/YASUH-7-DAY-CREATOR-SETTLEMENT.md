# YASUH Creator Gift Settlement — 7-Day Policy

## Policy

- Fan coin gifts are completed atomically by `send_musek_gift`.
- The creator's 70% CAD share is recorded as an earning at gift creation.
- The earning's maturity timestamp is `gift_transactions.created_at + interval '7 days'`.
- A matured earning is not withdrawable until an authorized settlement batch posts it to the creator's settled wallet balance.
- Settlement requires both `payout_verified = true` and `payout_eligible = true`.
- The 30% platform share and the coin debit/credit logic remain unchanged.
- `gift_transactions.status = 'settled'` means the coin gift completed; it does not mean the creator's cash share is settled.



## Gift finality, refunds, and creator responsibility

- A completed gift is final. YASUH does not offer voluntary refunds, cancellations, or charge reversals for completed gifts.
- Fans should send gifts only when they intend to make a final, voluntary contribution. A gift is not a purchase of a guaranteed result, service, response, or creator activity.
- Creators are responsible for their own content, statements, conduct, promises, and interactions with fans, and for resolving claims that arise from their own actions or omissions.
- YASUH does not insure creator activity, guarantee creator performance, or assume a creator's debts, promises, or other personal or business obligations. YASUH is not the guarantor of disputes between a fan and a creator.
- YASUH does not voluntarily reimburse a fan or absorb a creator-related loss, and does not automatically deduct alleged refund amounts from a creator's future earnings.
- This policy does not override applicable law, card-network rules, payment-provider requirements, or YASUH's responsibility for its own errors or misconduct. Where a payment dispute, fraud report, provider instruction, or legal requirement requires action, YASUH may investigate and take the specific action required. Such an exceptional compliance or payment-network reversal is not a voluntary gift refund.
- Any exceptional reversal must be documented separately, restricted to authorized personnel, and reconciled transparently. No automatic future-earnings deduction is authorized by this policy; any recovery or adjustment requires a separately reviewed legal and contractual basis and an auditable decision.

## Ledger model

`creator_earning_ledger` is append-only and stores signed CAD events:

| Event | Meaning | Amount |
|---|---|---:|
| earning | Creator's 70% share from one gift | Positive |
| settlement | Matured earning transferred to withdrawable wallet balance | Positive |
| withdrawal | Cash payout completed | Negative |
| reversal | A compensating event linked to an earlier ledger event | Signed |
| adjustment | An audited correction linked to an earlier ledger event | Signed |

Each gift can create only one earning row. Each earning can be settled only once. Each paid withdrawal can create only one withdrawal row. Corrections are new rows; historical ledger entries are never edited or deleted.

## Settlement operation

`settle_creator_gift_earnings(batch_key)` is an admin-only, idempotent operation. It serializes settlement batches, locks eligible creator wallet rows, selects matured un-settled earnings, writes settlement ledger events, updates settled wallet balances in the same database transaction, and records the batch totals. Reusing a batch key returns the original batch instead of crediting twice.

The existing payout-eligibility RPC retains its signature for compatibility, but the settled-balance argument must equal the current balance. Admins can still change verification/eligibility; they cannot manually mint or overwrite withdrawable funds.

## Reconciliation

`reconcile_creator_wallet_ledger()` is admin-only and read-only. It reports per creator:

- Wallet lifetime earnings versus ledger earning total.
- Wallet settled balance versus settlements less paid withdrawals plus signed adjustments.
- Matured but not-yet-settled earnings.
- Earnings still inside the seven-day hold.
- Match flags for lifetime earnings and settled balance.

Paid withdrawals are recorded by a trigger when a withdrawal transitions to `paid`; historical paid withdrawals are backfilled idempotently. Historical gift earnings are backfilled idempotently without changing wallet balances.

## Required test matrix before production activation

1. Gift of 100 coins creates exactly CAD $0.70 creator earning and CAD $0.30 platform share.
2. Gift earning is unavailable before seven full days and matures at/after `available_at`.
3. Retried gift idempotency key creates no second earning.
4. Duplicate settlement batch key does not credit twice.
5. A second batch cannot settle an already-settled earning.
6. Unverified or ineligible creators receive no settlement.
7. Concurrent settlement attempts cannot double-credit.
8. Paid withdrawal creates exactly one negative ledger event and wallet debit.
9. Existing pending/approved/processing withdrawals remain reserved by the existing withdrawal RPC.
10. Manual settled-balance changes through the eligibility RPC are rejected.
11. Historical gift and paid-withdrawal backfills are idempotent.
12. Reconciliation flags deliberate wallet/ledger mismatches and reports held versus matured pending earnings.

## Deployment status

The migration is committed on `square-sandbox` for review. It has **not** been applied to production. No wallet balances or financial rows have been changed by this design work. Run the complete test matrix in an isolated staging project before production migration.
