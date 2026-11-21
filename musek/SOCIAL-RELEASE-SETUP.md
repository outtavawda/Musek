# MUSEK Social release setup

This release adds the Social live-room experience to the production-based application without merging the separate `square-sandbox` development branch.

## Included

- Authenticated `/social` page
- Live room creation and discovery
- Realtime room chat and reactions
- Host-issued artist guest invitations
- LiveKit video room UI and server-side access-token endpoint

Live-room gifts are intentionally not included in this isolated release because the production branch does not yet contain the wallet/gift ledger dependencies required by the live-gift RPC.

## Supabase migrations

Apply these files in order in the Supabase SQL Editor:

1. `supabase/migrations/003_public_profiles.sql`
2. `supabase/migrations/004_musek_social.sql`
3. `supabase/migrations/005_social_guest_invites.sql`
4. `supabase/migrations/008_social_table_grants.sql`
5. `supabase/migrations/009_social_invite_grants.sql`

The migration files are included in this release branch. Confirm they have not already been applied before running them; the SQL uses idempotent table/policy setup where appropriate, but should still be reviewed against the live database.

## LiveKit configuration

Chat and room creation can work without LiveKit. To enable multi-person video, configure these server-side environment variables in the deployment:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Use the LiveKit project credentials; never expose the API secret to client-side code.

## Notes

- Tailwind utilities are enabled for the Social UI while Tailwind preflight is disabled to avoid resetting the existing production site's styles.
- The existing global CSS and app layout are otherwise preserved.
- Private one-to-one calls, recordings, moderation tooling, and live-room gifts are outside this isolated release.
