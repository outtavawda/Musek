# MUSEK — Music licensing and iOS/Android launch readiness

Prepared: 2026-11-21
Scope: Canadian-first, artist-uploaded music marketplace with on-demand playback, fan/artist/label accounts, virtual coins/gifts, comments, social live rooms and future mobile apps.

> Planning document only. This is not legal advice, a licence, an application, or confirmation that any rights have been cleared. Do not launch public streaming of recordings until the relevant rights and agreements are confirmed in writing.

## 1. MUSEK's likely licensing profile

MUSEK's player lets a listener select and play specific tracks on demand. That is materially different from a non-interactive or semi-interactive web radio service.

### Composition rights (songwriting/publishing)
Contact:
- SOCAN — performing/communication rights and ask specifically about Tariff 22A / online music services.
- CMRRA and/or SOCAN Reproduction Rights — mechanical/reproduction rights for digital streaming and server-side copies, including a direct agreement for a service operated on its own website.
- Ask which repertoire each agreement covers, how co-writers/publishers outside the repertoire are cleared, what territories are covered, reporting format, minimum guarantees, advances, audit rights and royalty statements.

Official starting points:
- SOCAN licensing: https://www.socan.com/music-licensees/
- SOCAN reproduction rights FAQ: https://www.socan.com/faq-reproduction-rights/
- CMRRA online licensing FAQ: https://www.cmrra.org/faq/online-licensing-faq/
- CMRRA get licensed: https://cmrra.ca/get-licensed/

### Sound recording (master) rights
For fully interactive/on-demand streaming, obtain direct written licences from the owners/controllers of each master recording (usually the artist, label or distributor acting with authority). Do not assume a collective webcasting licence covers on-demand playback.

Contact:
- CONNECT Music Licensing: ask whether any repertoire/rights can be licensed for MUSEK's exact on-demand interactive model, and if not, confirm the direct label/artist route.
- SOPROQ: ask about Quebec repertoire and any applicable direct/collective arrangements.
- Re:Sound: ask whether any equitable-remuneration/public-performance obligations apply to MUSEK's exact service. Its published Tariff 8 covers non-interactive and semi-interactive webcasts and explicitly excludes fully interactive on-demand streaming/download services; do not treat Tariff 8 as MUSEK's on-demand licence.

Official starting points:
- CONNECT licensing: https://connectmusic.ca/licensing/
- CONNECT webcasting/microcasting scope: https://connectmusic.ca/licensing/webcasting-microcasting/
- CONNECT webcasting application (for a different, non/semi-interactive model): https://connectmusic.ca/licensing/webcasting-application-form/
- Re:Sound FAQ: https://www.resound.ca/faq/
- Re:Sound tariffs: https://www.resound.ca/tariffs-2-2/
- SOPROQ: https://www.soproq.org/

### User-uploaded music and artist/label contracts
Before a track can be published, require the uploader to confirm and warrant that they control or are authorized to license:
- The master recording and all performers' contributions.
- The underlying composition, including every co-writer and publisher share.
- Samples, interpolations, beats, leased instrumentals and producer agreements.
- Featured artists, session musicians and any required consents.
- Artwork, cover photos, logos, music videos and other supplied assets.
- The rights/territories/term they are granting MUSEK.

Artist terms should grant MUSEK only the limited, non-exclusive rights needed to host, encode, reproduce, transmit, stream, promote and make the track available through the website/apps in agreed territories and term. Include takedown, warranties, indemnity, royalty accounting, metadata accuracy, audit/records, termination and post-termination handling. Have Canadian music counsel draft/review the actual terms.

### Live rooms, clips and user-generated content
Live performances, user videos containing commercial music, clips, remixes and social posts can trigger separate performance, synchronization, master-use and post-synchronization permissions. A general upload checkbox is not a substitute for rights clearance. Require rights declarations, reporting, takedown/counter-notice procedures and moderation.

### CRTC threshold
The CRTC says online streaming services operating in Canada, offering broadcasting content and earning at least CAD $10 million in annual broadcasting revenues (alone or within a broadcasting ownership group) must register. The threshold and revenue aggregation need to be monitored as MUSEK grows; do not assume a small launch needs registration. Check current rules and obtain advice before approaching the threshold:
https://crtc.gc.ca/eng/industr/modern/registr.htm

## 2. Data to prepare before asking for licence quotes

Build a rights/usage pack containing:
- Legal entity name, incorporation jurisdiction, business address and ownership.
- Website and intended app names/URLs.
- Launch territories (initially Canada only unless cleared elsewhere).
- Catalogue model: independent artist/label uploads; no major-label catalogue unless separately licensed.
- Playback model: user-selected, on-demand, full-track streaming; pause/seek/skip; whether offline downloads are offered (currently should be treated as NO unless added and separately licensed).
- Monetization: free/ad-supported/subscription if applicable; coin sales; fan gifts; any artist/label revenue shares.
- Estimated monthly active users, subscribers, streams, total listening hours and projected revenues for years 1–3.
- Metadata captured: ISRC, ISWC where available, title, version, artist, label, writers, publishers, splits, territory, release date, duration.
- Reporting and anti-piracy controls: per-track play logs, stream validation, account/device abuse controls, tokenized audio URLs, rate limits, takedown process and audit logs.
- Delivery/security details: audio storage/CDN, encoding, signed URLs, caching policy, API architecture and whether users can download/copy files.
- Sample artist agreement and upload rights declaration (lawyer-reviewed).

## 3. Mobile strategy: iPhone and Android

### Current project assessment
The current repository is a Next.js 14 web application with Supabase authentication/data, LiveKit video and server-side API routes. It is not currently an iOS Xcode project or Android Gradle project, and package.json does not currently include Capacitor.

### Recommended path
Use the existing responsive Next.js product as the shared backend/product experience, then evaluate a Capacitor native shell for iOS and Android rather than rebuilding all screens from scratch. Capacitor supports adding native iOS/Android runtimes to an existing modern web project. However, MUSEK uses server-rendered Next.js pages and server routes, so a static-export-and-bundle approach is not a drop-in solution. A remote-hosted web app inside a native shell or a separate native frontend must be designed and tested deliberately.

Do not simply wrap the website and submit it. App Store review expects a quality app experience. Add real native value:
- Native audio background playback, lock-screen controls, audio focus and Bluetooth/headset controls.
- Push notifications and deep links to artist profiles, tracks, gifts and live rooms.
- Native share sheet and media upload/camera/microphone permissions.
- Reliable LiveKit audio/video permissions and lifecycle handling.
- Safe authentication/OAuth callback and session handling in WKWebView/Android WebView.
- Responsive touch navigation, keyboard handling, accessibility and tablet layouts.
- Store-compliant purchases, restore/refund flows and transaction verification.
- Account deletion, privacy controls, reporting, blocking and moderation.
- Crash reporting, analytics, release channels and staged testing.

### Proposed phases
1. Finish responsive mobile web UX and PWA basics first.
2. Decide whether Capacitor remote-hosted shell or a separate React Native/native app is the better fit after testing Supabase auth, audio, LiveKit and store purchases in a proof of concept.
3. Create iOS and Android projects, bundle identifiers, icons, splash screens, signing and environment configuration.
4. Implement native audio/background playback, push, deep links, uploads and camera/mic integration.
5. Implement StoreKit and Google Play Billing for purchases required to use digital features/content inside the apps.
6. Test on real iPhones and Android devices, including low bandwidth, backgrounding, incoming calls, Bluetooth, audio interruptions, camera/mic permissions and account deletion.
7. Prepare store listings, privacy disclosures, support contact, review notes, demo credentials and rights documentation.
8. Submit to TestFlight and Google Play internal/closed testing before public release.

## 4. App-store policy issues for MUSEK

### Virtual coins and gifts
MUSEK's 100 coins = CAD $1.00 and fan-to-creator gifts are digital value used inside the app. Plan on Apple In-App Purchase and Google Play Billing being required for coin packs purchased inside their respective apps, unless a specific applicable exception/entitlement is approved. Do not assume Square checkout can remain the in-app purchase path on iOS/Android. Keep web Square checkout separate until platform-specific legal and policy review confirms the permitted flow.

Google Play expressly lists virtual currencies and digital content/services as examples requiring Play Billing. Apple's rules generally require IAP for digital goods and in-app functionality, with region- and entitlement-specific exceptions. Review current rules immediately before implementation:
- Apple: https://developer.apple.com/app-store/review/guidelines/
- Google: https://support.google.com/googleplay/android-developer/answer/9858738

### Music app classification and external payments
Apple's reader-app entitlement is not automatically available to MUSEK: Apple's published eligibility excludes social-network apps where music/video is not the primary functionality. MUSEK combines music streaming with social, creator monetization, gifts and live rooms, so obtain Apple's written guidance before designing an external-purchase flow. Do not assume a music-streaming entitlement is available in every storefront.
- Apple reader app eligibility: https://developer.apple.com/support/reader-apps/
- Apple current review guidelines: https://developer.apple.com/app-store/review/guidelines/

### User-generated content
Apple requires safeguards for user-generated-content/social apps, including filtering, reporting, blocking and published contact information, with timely responses to reports. MUSEK must implement and document moderation and takedown processes before submission. Google Play also requires policy compliance and accurate Data safety disclosures.
- Apple guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google user data policy: https://support.google.com/googleplay/android-developer/answer/10144311

### Account deletion and privacy
Provide a discoverable in-app account deletion route and a public web deletion request route. Google Play requires both an in-app path and an external web resource for apps that create accounts; Apple also requires a clear way to initiate deletion. Document retention exceptions, deletion of associated data and token revocation.
- Apple account management: https://developer.apple.com/design/human-interface-guidelines/managing-accounts
- Google account deletion: https://support.google.com/googleplay/android-developer/answer/10144311

### Developer accounts and indicative fees
- Apple Developer Program: USD $99 per year (local currency may be offered). Organization enrolment displays the legal entity as seller and requires verification; consider using the incorporated MUSEK entity if one exists and is ready.
- Google Play full distribution: USD $25 one-time registration fee. Organization account verification requirements include a D-U-N-S number.
- Fees and account requirements can change; confirm during enrollment.
  - Apple: https://developer.apple.com/programs/
  - Google: https://support.google.com/googleplay/android-developer/answer/6112435

## 5. Contacts / questions to send

### SOCAN / CMRRA
Subject: Canadian direct licensing inquiry — interactive on-demand music streaming service

Explain that MUSEK is a Canadian-operated independent-artist music streaming and creator platform. Listeners choose individual full tracks on demand. Ask for the required performing/communication and mechanical/reproduction licences, rates/minimums, reporting obligations, territory coverage, repertoire coverage and application process.

### CONNECT / SOPROQ / Re:Sound
Subject: Rights clearance inquiry — Canadian interactive on-demand streaming platform

Explain that MUSEK is not a radio-style non-interactive webcast: users choose tracks and control playback. Ask which master-recording and performer rights are licensed collectively for fully interactive on-demand services, which must be negotiated directly with each label/artist, and whether any public-performance/neighbouring-rights obligations apply. Ask whether the answer differs for live streams, music videos, clips or user-generated content.

Do not submit the CONNECT non-interactive/semi-interactive webcasting form as if it licensed MUSEK's on-demand player; its published scope has skip and programming restrictions and excludes fully interactive services.

## 6. Launch gates

Do not mark MUSEK ready for public streaming/app submission until:
- Written composition and master rights are secured for every track and territory.
- Artist/label agreements, contributor/sample clearances and rights metadata are in place.
- Usage reports and royalty accounting are validated.
- Copyright notice/takedown and counter-notice processes are operational.
- Privacy policy, terms, community standards, moderation and account deletion are live.
- Store-specific billing is implemented and verified for coin packs/gifts.
- Apple/Google developer accounts, signing and app review materials are ready.
- iOS and Android real-device tests pass, including audio background and LiveKit.
