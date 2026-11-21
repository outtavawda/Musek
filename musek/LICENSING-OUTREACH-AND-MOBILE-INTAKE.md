# MUSEK — Licensing outreach and mobile launch intake pack

Prepared: 2026-11-21
Status: working draft for planning and counsel review. Not a licence, legal opinion, artist contract or store submission.

## A. Product facts currently visible in the codebase

- Product: MUSEK music discovery/streaming and creator community.
- Web stack: Next.js 14, React 18, Supabase auth/data/storage, LiveKit video.
- Track upload: artist account; MP3/WAV/M4A; 50 MB upload limit; uploaded tracks are saved as drafts.
- Coin packs currently use Square web checkout. The current checkout endpoint creates Square payment links using the Square sandbox host.
- Current player lets a listener select individual tracks (interactive/on-demand model).
- Live rooms and user-generated content are part of the product.
- Current repository does not contain a native iOS or Android project or Capacitor dependency.
- No public privacy policy, terms page, account deletion page, PWA manifest or service worker was found in the inspected repository tree.
- Upload form currently asks for title, genre, description, artwork and audio; it does not yet collect writer/publisher splits, ISRC, sample declarations, master ownership evidence or rights-holder approval.

These observations are from the repository snapshot and must be rechecked as the product changes.

## B. Questions needed to obtain accurate Canadian licence quotes

Complete what is known. Do not guess. Unknown answers can be marked "TBD".

### Company and launch
- Legal company name:
- Is the company incorporated? If yes, jurisdiction and legal name:
- Business address:
- Primary contact name/title/email:
- Website/domain:
- Launch date target:
- First launch territory: Canada only / selected countries / worldwide:
- Is Quebec included at first launch?
- Other countries planned in the first 12 months:

### Music catalogue and playback
- Who may upload: independent artists / labels / distributors / all:
- Will MUSEK upload any music on behalf of artists?
- Can listeners select any specific track and play it immediately? Current code indicates yes.
- Can listeners pause, seek, replay and skip? Confirm actual production behaviour:
- Full track or preview only:
- Any offline listening/downloads:
- Any cached/offline copies on devices:
- Any user-created playlists or public mixes:
- Any music in live rooms, video, clips, comments or user posts:
- Will MUSEK itself commission, produce or own any recordings:
- Will MUSEK include major-label catalogue at launch:

### Monetization and reporting
- Free listening / paid subscription / advertising / mixed:
- Coin packs and current CAD prices:
- Can coins be purchased on web only, or also inside apps:
- Gifts: confirm creator share 70% / MUSEK share 30%:
- Any per-stream royalty paid to artists, separate from gifts:
- Forecast monthly active users for years 1, 2 and 3:
- Forecast monthly streams and listening hours for years 1, 2 and 3:
- Forecast annual gross revenue for years 1, 2 and 3:
- Do you have track-level play logs, ISRC metadata and monthly royalty reports:

## C. Rights evidence required for every track

Do not make a track publicly playable until rights are reviewed and approved for the relevant territory and use.

For each recording, collect and retain:
1. Track title, alternate title, version, duration, release date and explicit-content flag.
2. Main artist, featured artists, producer, label and distributor.
3. ISRC (if assigned), UPC (if released), ISWC (if available).
4. Master owner/controller and the person signing on its behalf.
5. Songwriters and percentage splits totaling 100%.
6. Publishers/administrators and percentage splits totaling 100%, or clear statement that no publisher is involved.
7. Beat/instrumental source and exact licence terms.
8. Samples/interpolations: identify each source and attach written clearance, or affirm none are used.
9. Performer/session-musician consents/releases where needed.
10. Artwork/photography/logo ownership or licence.
11. Territories, term, permitted uses, exclusivity/non-exclusivity, sublicensing to hosting/CDN/app providers, promotional use and takedown terms.
12. Signed agreement and supporting documents; date and reviewer; status (pending / approved / rejected / expired / takedown).

A statement by an uploader is useful evidence but does not replace permission from co-writers, publishers, labels, sample owners or other rights holders.

## D. Licensing outreach email drafts

Send these only after the company and product facts above are completed. Ask each organization to confirm scope and repertoire in writing.

### SOCAN
Subject: Canadian online music service licensing enquiry — MUSEK

Hello SOCAN Licensing Team,

We are preparing MUSEK, a Canada-based music streaming and creator platform. Listeners can select specific tracks for on-demand playback. The service is planned to launch in [territories] on [target date]. Our catalogue will initially consist of [independent artist/label catalogue description].

Could you please confirm the applicable SOCAN performing/communication licence and tariff for this interactive on-demand model, including any Tariff 22A requirements? Please advise what repertoire is covered, what information and usage reports you require, the application process, fees/minimums, and how we should handle works or shares outside SOCAN's represented repertoire.

We can provide a product description, forecast usage/revenue, sample metadata and draft artist terms.

Thank you,
[MUSEK legal entity / contact]

### CMRRA / SOCAN Reproduction Rights
Subject: Mechanical/reproduction rights for interactive streaming service — MUSEK

Hello Licensing Team,

MUSEK is preparing a Canadian-first service that allows listeners to select and stream individual tracks on demand. The initial catalogue is expected to be [catalogue description]. We would like to understand the reproduction/mechanical rights required for server copies, encoding, caching and interactive streams.

Please confirm whether your online music service licensing covers this use, which repertoire and territories are included, how non-represented shares must be cleared, and the required reporting, minimum fees/advances, application documents and timeline.

Thank you,
[MUSEK legal entity / contact]

### CONNECT Music Licensing
Subject: Scope enquiry — master recording rights for interactive on-demand music service

Hello CONNECT Licensing Team,

MUSEK is a music streaming and creator platform with user-selected, fully interactive on-demand playback. We understand that some CONNECT webcasting licences are limited to non-interactive or semi-interactive services.

Could you confirm whether CONNECT can license any sound recording/master repertoire for our exact fully interactive on-demand model? If not, please confirm the appropriate direct licensing route and whether CONNECT can identify the relevant rights holders or provide guidance for a Canadian independent service.

Please also clarify whether any separate CONNECT rights are relevant to our live rooms, clips or promotional uses.

Thank you,
[MUSEK legal entity / contact]

### SOPROQ
Subject: Quebec repertoire and master rights enquiry — MUSEK

Hello SOPROQ Team,

MUSEK is assessing a Canada-first interactive on-demand music service and would like to include Quebec repertoire where properly cleared.

Please advise which rights and repertoire SOPROQ can license for this exact model, whether any direct label/artist permissions are still required, and the application, reporting, territory and fee requirements. Please also identify any separate considerations for live performances, clips or user-generated videos.

Thank you,
[MUSEK legal entity / contact]

### Re:Sound
Subject: Applicability enquiry — interactive on-demand music service — MUSEK

Hello Re:Sound Licensing Team,

MUSEK is planning a service where users select and play specific sound recordings on demand. We understand Tariff 8 addresses non-interactive and semi-interactive webcasting and excludes fully interactive on-demand streaming/download services.

Could you confirm in writing whether any Re:Sound tariff, neighbouring-rights obligation or other licence applies to our precise service model in Canada, including any separate live-room or user-generated-content features? If not, please confirm what is outside Tariff 8 and which rights we should clear directly with master owners.

Thank you,
[MUSEK legal entity / contact]

## E. Questions for Canadian music counsel

Ask counsel to:
- Map all rights for interactive streams, server copies, previews, caching, clips, live rooms, promotional posts and user-generated content.
- Review the exact SOCAN/CMRRA/SOCAN RR/CONNECT/SOPROQ/Re:Sound scope responses.
- Draft artist/label master licence and composition-rights warranties that do not overclaim rights an artist does not own.
- Draft uploader declarations, sample/beat clearance schedules and co-writer/publisher split schedules.
- Draft platform terms, acceptable-use policy, copyright notice/takedown and counter-notice process.
- Advise on Quebec law/language requirements if Quebec is in scope.
- Review privacy, retention, account deletion and child-safety/age policy.
- Confirm CRTC registration/exemption monitoring based on current revenue and corporate-group facts.
- Advise on coin/gift structure, stored value, consumer protection, tax, refunds, chargebacks and payout compliance.

## F. Mobile store launch intake

### Company / account
- App seller legal entity:
- Apple Developer Program account: individual / organization / not enrolled:
- D-U-N-S number (if organization enrolment requires it):
- Google Play Console account: personal / organization / not enrolled:
- Public support email:
- Public support website:
- Privacy policy URL:
- Terms URL:
- Account deletion URL:
- Copyright/takedown contact:

### App identity
- Final iOS app name:
- Final Android app name:
- Bundle identifier (iOS):
- Application ID / package name (Android):
- App icon and launch artwork:
- App category and age rating:
- Supported languages:
- Launch territories:

### Native experience decisions
- Background audio playback and lock-screen controls required? (recommended yes)
- Push notifications: new followers / gifts / comments / live invitations / live reminders:
- Deep links to tracks, artists, profiles, gifts and live rooms:
- Camera/microphone permissions for live rooms:
- LiveKit video rooms included at initial app launch?:
- Upload audio from device included at initial app launch?:
- Offline music downloads? (do not enable until separately rights-cleared):
- Will users buy coins in iOS/Android apps? (assume Apple/Google billing is required unless written platform guidance confirms an exception):
- How are gift purchases and creator payouts described in store listings:

### Store compliance gates
- In-app report content/user and block user controls.
- Moderation queue and response process for reports.
- Public support/contact information.
- In-app account deletion plus public web deletion route.
- Privacy disclosures matching actual SDKs, data collection, analytics and tracking.
- Apple StoreKit and Google Play Billing implementation, server-side transaction verification, restore/refund handling and fraud controls.
- Demo account and review notes for Apple/Google.
- TestFlight and Google Play internal/closed testing on real devices.
- Written evidence of music and artwork rights available for app review.

## G. Decisions we should not silently make

These require the owner to confirm before final implementation:
1. Launch territories: Canada-only first is the safer default, but not assumed as final.
2. Whether Quebec is included at launch.
3. Whether the app includes in-app coin purchases from day one.
4. Whether live video rooms are included in the first mobile release.
5. Whether MUSEK wants Capacitor proof-of-concept first or a separate React Native/native frontend.
6. Whether MUSEK will only host independent artist/label-uploaded tracks at launch or seek major-label repertoire.
7. The legal company/entity that will sign licences and app-store agreements.

## H. Current blockers that cannot be completed by code alone

- Rights-holder licences and repertoire coverage must be negotiated and signed.
- Artist/label agreements need accurate legal entity and commercial terms and lawyer review.
- Store developer accounts require the owner/company's identity, payment and verification.
- Apple/Google payment and music-app classification decisions require platform review and implementation.
- Real-device testing requires access to iPhone and Android devices and developer accounts.
- Privacy, deletion and terms policies need real company/contact/retention details and legal review.
