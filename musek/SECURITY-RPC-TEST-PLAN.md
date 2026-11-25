# YASUH privileged RPC security test plan

Status: test plan prepared; these cases have **not** been executed against live user accounts or live balances.

## Scope

Run against an isolated Supabase staging project with disposable fan, artist, non-admin, and admin accounts. Do not use production balances or initiate real payouts for negative testing.

RPCs in scope:
- `admin_set_creator_payout_eligibility`
- `admin_update_withdrawal`
- `request_artist_withdrawal`
- `send_musek_gift`
- `send_social_live_gift`
- `follow_artist` / `unfollow_artist`
- `cancel_label_invitation` / `respond_to_label_invitation`
- `record_music_listen` / `record_music_skip`
- `update_my_music_preferences`
- `get_artist_follower_count`

## Required negative cases

| Area | Caller / input | Expected result |
|---|---|---|
| Admin payout eligibility | Anonymous caller | RPC execution denied |
| Admin payout eligibility | Authenticated non-admin | Rejected as unauthorized; no wallet change |
| Admin withdrawal update | Authenticated non-admin | Rejected as unauthorized; no withdrawal change |
| Withdrawal request | Anonymous caller | Rejected; no row created |
| Withdrawal request | Fan account | Rejected; no row created |
| Withdrawal request | Artist not verified/eligible | Rejected; no row created |
| Withdrawal request | Amount below CAD $100 or >2 decimals | Rejected |
| Withdrawal request | Amount exceeds settled balance less active reservations | Rejected; no reservation created |
| Withdrawal request | Same idempotency key + same user/amount | Same request returned; no duplicate |
| Withdrawal request | Reused key with different user or amount | Rejected |
| Gift | Anonymous caller | RPC execution denied |
| Gift | Artist sender / non-artist recipient | Rejected; balances unchanged |
| Gift | Insufficient fan coin balance | Rejected; both wallets unchanged |
| Gift | Self-gift, zero/negative amount, null key | Rejected |
| Gift | Same idempotency key + same payload | Same gift returned; one transaction only |
| Gift | Reused key with changed recipient or coins | Rejected |
| Follow/unfollow | Anonymous caller | RPC execution denied |
| Follow/unfollow | Artist account or wrong-owner attempt | Rejected; no unrelated follow row changed |
| Invitations | Wrong owner / invalid response | Rejected; invitation unchanged |
| Listen/skip/preferences | Anonymous caller | RPC execution denied |
| Listen/skip | Invalid or unpublished track | Rejected; no event recorded |
| Preferences | Authenticated user | Only caller's own preferences change |
| Follower count | Public artist | Returns count only |
| Follower count | Private/non-artist/missing profile | Does not disclose private profile data |

## Positive regression cases

- A fan can follow and unfollow a public artist.
- Public artist follower count remains available to anonymous visitors.
- A fan can send a valid gift and wallet accounting preserves the configured 70% creator / 30% platform split.
- A verified, eligible artist with at least CAD $100 in available settled funds can submit a withdrawal.
- An authorized admin can process a valid withdrawal state transition with required notes/reference.
- Listen, skip, and preference RPCs continue to work for the signed-in owner.

## Evidence to capture

For every case, record the staging project, account role, RPC name, input class (never store secrets), expected result, actual result, database row/balance before and after, and pass/fail. Confirm idempotency with concurrent duplicate requests as well as sequential retries.

## Current implementation notes

- The reviewed SECURITY DEFINER functions have an empty function `search_path`; application tables are referenced with explicit `public.` qualification.
- Anonymous execution is revoked for the 12 user/admin operations; public follower count remains intentionally callable.
- The Supabase security advisor still flags callable SECURITY DEFINER functions. These findings require authorization and behavior tests; they are not proof of exploitability by themselves.
- Do not change grants or SECURITY INVOKER modes simply to silence the advisor without proving the corresponding feature still works under RLS.
