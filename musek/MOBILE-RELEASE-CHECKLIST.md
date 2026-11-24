# MUSEK mobile release checklist

All application changes are being developed on `square-sandbox`. Do not merge to production until the checks below pass.

## Browser/PWA push setup

Generate VAPID keys from the `musek` directory:

```bash
npx web-push generate-vapid-keys
```

Configure these deployment environment variables:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — public VAPID key (safe to expose to the browser)
- `VAPID_PRIVATE_KEY` — private VAPID key (server only)
- `VAPID_SUBJECT` — a valid `mailto:` contact or HTTPS origin
- `MUSEK_PUSH_API_SECRET` — long random secret used by trusted server-side notification producers
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server only; never prefix with `NEXT_PUBLIC_`

The push subscription table is private: RLS is enabled, browser roles have no table access, and the server service role owns subscription operations.

The profile page contains an explicit opt-in control. The web push send endpoint is `POST /api/push/send`, authenticated with `Authorization: Bearer <MUSEK_PUSH_API_SECRET>` and a JSON body containing `userId`, `title`, `body`, and an internal path such as `/social`. Trusted server-side event producers still need to call this endpoint when they create events. Do not expose the API secret in browser code.

## Native project generation

1. Confirm the production HTTPS deployment URL.
2. In GitHub, open Actions → **Generate MUSEK native projects** → Run workflow.
3. Supply the deployed HTTPS URL as `capacitor_server_url`.
4. The workflow creates the iOS and Android Capacitor projects, syncs plugins, applies the `musek://` URL scheme, and commits generated projects to `square-sandbox`.

Local equivalent:

```bash
cd musek
npm install
CAPACITOR_SERVER_URL=https://YOUR-DEPLOYED-MUSEK-HOST npx cap add ios
CAPACITOR_SERVER_URL=https://YOUR-DEPLOYED-MUSEK-HOST npx cap add android
node scripts/configure-native-deep-links.mjs
CAPACITOR_SERVER_URL=https://YOUR-DEPLOYED-MUSEK-HOST npx cap sync
npx cap open ios
npx cap open android
```

The native projects load the deployed MUSEK web application. The placeholder web shell is not the production app.

## Native push credentials still required

The app requests native notification permission only when the user enables notifications in Profile. It registers the iOS APNs or Android FCM device token with MUSEK and stores it under the signed-in user.

Native delivery is not yet wired to APNs/FCM. Configure:
- Apple Developer account, APNs authentication key, Team ID, Key ID, and the app's push notification capability.
- Firebase project, Android package registration, and FCM service-account credentials.

The stored iOS APNs token and Android FCM token require platform-specific delivery adapters. Do not use the web-push endpoint to deliver native tokens.

## Lock-screen/background playback

The shared player uses one app-wide HTML audio element and the browser Media Session API for metadata, play/pause, previous/next and seek actions. This can expose lock-screen controls in browsers that support Media Session.

The native generation script enables iOS background audio mode and Android foreground-service permissions. Android still needs a native media playback service/notification integration before native background audio can be considered production-ready. iOS and Android behavior must be tested with the screen locked, app backgrounded, Bluetooth connected, an incoming call, and a network interruption.

## Responsive route audit

The app has 25 page routes. The global mobile safeguards now constrain horizontal overflow, media width, long text, tables, touch interactions and reduced-motion behavior. Each route still needs visual verification at:
- 320 × 568 (small phone)
- 375 × 812 (iPhone-sized viewport)
- 390 × 844
- 430 × 932
- 768 × 1024 (tablet)
- 1280 × 800 (desktop)

Priority routes: home, login/signup, Discover Music, feed, social/live rooms, artist profile, fan dashboard, artist dashboard, label dashboard, profile, wallet/buy coins, gift history, withdrawals, admin payouts, upload and favorites. Check safe areas, keyboard overlap, bottom navigation/player collisions, video orientation, gift panel scroll, modal height and horizontal scroll.

## Real-device sign-off

### iPhone
- Install from the generated Xcode project on a physical iPhone.
- Sign in, play a track, navigate to other pages, lock the phone, and verify playback and lock-screen controls.
- Verify AirPods/Bluetooth controls, interruption/resume, background/foreground transitions.
- Add MUSEK to the Home Screen and verify manifest/icon/standalone display.
- Enable notifications, receive a test notification, tap it, and verify deep-link routing.
- Test live camera/microphone permissions and room reconnect.

### Android
- Install from Android Studio on a physical Android device.
- Repeat playback, navigation, lock-screen, headset, interruption and reconnect tests.
- Verify PWA installation and notification opt-in.
- Verify FCM token registration and notification deep links.
- Test camera/microphone permission, rotation and low-connectivity recovery.

Record OS/device/browser versions and attach screenshots or screen recordings for each failed case. Do not mark device testing complete based on emulator or desktop browser tests alone.
