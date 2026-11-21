# MUSEK Social — Live video setup

MUSEK Social uses Supabase for accounts, live-room records and realtime chat, and LiveKit for real-time audio/video.

## 1. Configure LiveKit

Create a LiveKit Cloud project (or use your own LiveKit server). In the LiveKit project settings, copy the server URL, API key and API secret.

Add these server-side environment variables to the MUSEK Vercel project and its local `.env.local` file:

- `LIVEKIT_URL` — the LiveKit WebSocket server URL (usually starts with `wss://`)
- `LIVEKIT_API_KEY` — the LiveKit API key
- `LIVEKIT_API_SECRET` — the LiveKit API secret

Do not prefix the API key or secret with `NEXT_PUBLIC_`. Never place the API secret in browser code or commit real credentials to GitHub.

After adding the variables, redeploy the `square-sandbox` branch preview so the server token endpoint can read them.

## 2. Apply the Supabase migration

Before using rooms and chat, apply `supabase/migrations/004_musek_social.sql` and `supabase/migrations/005_social_guest_invites.sql` in order in the Supabase SQL Editor.

## 3. Test the video room

1. Sign in to MUSEK on the deployed preview.
2. Open `/social` and start a live room.
3. Open that same room from a second signed-in browser/device.
4. Allow camera and microphone access on both devices.
5. Confirm that both participants appear and can hear each other.

The app issues short-lived, room-scoped LiveKit access tokens from the authenticated server route. The browser never receives the LiveKit API secret.

## Current scope

The LiveKit conference provides participant video/audio, microphone and camera controls, screen sharing, and the conference interface. MUSEK room chat and reactions remain in the adjacent Supabase-powered panel.

Guest invitation workflows, private one-to-one call discovery, recording/replay storage, gifts inside live rooms, and production-grade moderation/rate limits remain separate follow-up work. Recording requires an explicit recording/consent flow and LiveKit egress/storage configuration.
