# YASUH mobile release checklist

## Verified status — 2026-11-25

Latest native generation workflow: **successful** on `square-sandbox` at commit `be595c09adbbfb39aa9b6b01115a71e4e35a0a5c`.

- [x] Capacitor iOS and Android projects generated and synced.
- [x] iOS simulator build completed successfully. This is not a device-signed IPA and does not establish physical-iPhone readiness.
- [x] Android debug APK build completed successfully.
- [x] Android debug APK uploaded as workflow artifact `yasuh-android-debug-apk` (artifact ID `14999800353`; expires 2026-12-09).
- [x] Native playback configuration steps completed in CI.
- [ ] Install and verify either native app on physical hardware.
- [ ] Configure Apple Developer signing and TestFlight distribution.
- [ ] Configure and verify production APNs/FCM credentials and actual device notification delivery.
- [ ] Complete remaining responsive, security, payment, legal and store-release checks.

Legal/support pages were not found in the inspected `square-sandbox` repository tree. Tracking issue: https://github.com/outtavawda/Musek/issues/3. Do not treat this as legal advice or publish policy drafts until the operator details and actual data practices are confirmed and reviewed.

---

All application changes are being developed on `square-sandbox`. Do not merge to production until the checks below pass. The approved primary native-app URL is **https://yasuh.ca**; `www.yasuh.ca` should redirect to the primary domain.

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

1. In GitHub, open Actions → **Generate YASUH native projects** → Run workflow.
2. The approved URL `https://yasuh.ca` is prefilled and validated by the workflow.
3. The workflow creates the iOS and Android Capacitor projects, syncs plugins, applies the `musek://` URL scheme, configures iOS background audio and Android Media3 background playback, and commits generated projects to `square-sandbox`.

Local equivalent:

```bash
cd musek
npm install
CAPACITOR_SERVER_URL=https://yasuh.ca npx cap add ios
CAPACITOR_SERVER_URL=https://yasuh.ca npx cap add android
node scripts/configure-native-deep-links.mjs
node scripts/configure-native-playback.mjs
CAPACITOR_SERVER_URL=https://yasuh.ca npx cap sync
npx cap open ios
npx cap open android
```

The native projects load the deployed YASUH web application. The placeholder web shell is not the production app.

## Native push credentials still required

The app requests native notification permission only when the user enables notifications in Profile. It registers the iOS APNs or Android FCM device token with YASUH and stores it under the signed-in user.

Native APNs and FCM HTTP v1 delivery adapters are implemented in `musek/lib/native-push.ts` and are called by the artist-live notification endpoint alongside browser Web Push. Native token registration and invalid-token cleanup are already wired.

Configure these deployment environment variables (never commit credentials):
- `APNS_AUTH_KEY` — full contents of the Apple .p8 authentication key (server only).
- `APNS_KEY_ID` — Apple APNs key ID.
- `APNS_TEAM_ID` — Apple Developer Team ID.
- `APNS_BUNDLE_ID` — optional; defaults to `com.musek.app`.
- `APNS_HOST` — optional; defaults to `https://api.push.apple.com`. Use Apple's sandbox host only for development device tokens.
- `FCM_SERVICE_ACCOUNT_JSON` — full Firebase service-account JSON (server only; keep private).
- Existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` remain required for token lookup and cleanup.

The app's iOS bundle identifier must match the APNs topic, and the Firebase project must match the Android app registration. Enable Push Notifications for the iOS App ID and configure the generated Xcode project signing/capabilities. Verify both providers with real device tokens; a successful server build does not prove provider credentials or device delivery work. Do not use the web-push endpoint to deliver native tokens.

## Lock-screen/background playback

The shared player remains app-wide. On Android, the native playback bridge routes music through an AndroidX Media3 ExoPlayer hosted by a MediaSessionService, with a native media notification, lock-screen controls, queue metadata, and play/pause/seek synchronization to the YASUH player. The native generation workflow copies and registers the service and adds its Media3 dependencies.

On iOS, the native generation script enables the audio background mode and configures AVAudioSession for the playback category. The web player continues to publish Media Session metadata and transport actions. This configuration is implemented but is not yet certified on a physical iPhone. Both platforms must be tested with the screen locked, app backgrounded, Bluetooth connected, an incoming call, and a network interruption.

## Responsive route audit

The app has 25 page routes. The global mobile safeguards constrain horizontal overflow, media width, long text, tables, touch interactions and reduced-motion behavior. Each route still needs visual verification at:
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
- Add YASUH to the Home Screen and verify manifest/icon/standalone display.
- Enable notifications, receive a test notification, tap it, and verify deep-link routing.
- Test live camera/microphone permissions and room reconnect.

### Android
- Install from Android Studio on a physical Android device.
- Repeat playback, navigation, lock-screen, headset, interruption and reconnect tests.
- Verify PWA installation and notification opt-in.
- Verify FCM token registration and notification deep links.
- Test camera/microphone permission, rotation and low-connectivity recovery.

Record OS/device/browser versions and attach screenshots or screen recordings for each failed case. Do not mark device testing complete based on emulator or desktop browser tests alone.


## Supabase security audit — 2026-11-25

Live project checked: **Musek** (project ref pragtvilfgyllabizlyw, PostgreSQL 17; ACTIVE_HEALTHY).

### Verified protections

- [x] All inspected public tables have RLS enabled (zero public tables without RLS).
- [x] Internal push-token/subscription and playback guard/session tables have RLS enabled and grant table access only to server roles (service_role/postgres); browser roles have no table privileges. Their lack of user-facing RLS policies is intentional for this server-only access model.
- [x] creator_wallets, fan_coin_wallets, creator_withdrawals, and gift_transactions have RLS enabled and user-facing read policies scoped to the relevant user's own wallet/withdrawal or gift relationship.
- [x] Admin payout RPCs check membership in public.admin_users using the caller's auth.uid() before allowing changes.
- [x] Reviewed user-facing privileged RPCs require an authenticated caller and use auth.uid() to scope the operation; gift and withdrawal functions include balance/eligibility and idempotency checks.
- [x] Payment-credit RPCs and internal playback-session functions are not executable by anon or authenticated roles; they are reserved for trusted server execution.
- [x] public schema CREATE privilege is not granted to anon or authenticated, reducing risk from functions that pin search_path to public.
- [x] The public follower-count RPC is intentionally callable by anon and authenticated; its SQL returns a count only when the target profile is a public artist. Do not revoke anonymous access unless product requirements change.

### Remaining security work

- [ ] Enable Supabase Auth leaked-password protection in the Supabase Dashboard (Auth → settings/password security). The live security advisor currently reports it disabled; this is a dashboard-level setting, not changed by this database audit.
- [ ] Re-run and review the security advisor after enabling leaked-password protection.
- [ ] Complete code-level review and end-to-end negative tests for all admin and financial RPCs using non-admin, wrong-owner, insufficient-balance, replayed-idempotency-key and invalid-state cases.
- [ ] Review production environment variables and confirm SUPABASE_SERVICE_ROLE_KEY, payment secrets, push secrets, APNs and FCM credentials are server-only and absent from client bundles/logs.
- [ ] Confirm backup/PITR and recovery procedures in the production Supabase project.

### Advisor interpretation

The current security advisor reports four RLS-enabled/no-policy tables; these are the server-only tables above and have no browser-role table grants. It also reports SECURITY DEFINER RPC warnings: these include intended authenticated user operations and the public-profile follower-count RPC. The reviewed admin payout functions explicitly check admin_users; the warnings are not, by themselves, proof that these functions are exploitable. Do not blanket-revoke these grants because the app relies on authenticated RPCs. The leaked-password protection warning remains a genuine outstanding dashboard setting.

Security remediation reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
