# SyncStep — Solana dApp Store rejection history and root cause

Store: **Solana dApp Store** (Solana Mobile publisher portal, publish.solanamobile.com), not Apple.
App: SyncStep (Android APK for Seeker / Saga). Publisher website: https://eb28.co/syncstep/
Compiled 2026-09-01 from the rejection emails in richducat@gmail.com.

## Timeline of every rejection

| Date (UTC) | Sender | Reason given by the reviewer |
| --- | --- | --- |
| 2026-07-13 | publishersupport@dappstore.solanamobile.com | One or more required pages (privacy / terms / website links) could not be opened or read. |
| 2026-07-22 | publishersupport@dappstore.solanamobile.com | Could not complete the account access / onboarding flow needed to review the app. |
| 2026-07-27 | publishersupport@dappstore.solanamobile.com | (a) Publisher website not publicly accessible / not a readable user-facing page. (b) Could not complete the wallet connection flow on a Solana Mobile device. |
| 2026-07-29 | publishersupport@dappstore.solanamobile.com | Could not complete the wallet connection flow. |
| 2026-08-07 | publishersupport@dappstore.solanamobile.com | Could not complete the wallet connection flow. |
| 2026-08-19 | noreply@solanamobile.com | Four findings (below) plus reviewer note: *"Unable to connect mobile wallet adapter. also a brief message displayed saying 'unable to connect server'"*. |

No email from Solana Mobile has arrived since 2026-08-19. Nothing is "waiting for review": the
last submission was **rejected**, and the store only re-reviews after a **new submission** is created.

### 2026-08-19 findings, verbatim

- Core functionality needs attention: We could not verify one or more core features described in the listing.
- In-app functionality needs attention: The submitted app appears to rely heavily on external experiences.
- Wallet connection needs attention: We could not complete the wallet connection flow during review.
- Wallet flow needs attention: The wallet flow was difficult to complete or understand during review.
  Please make the connection, account state, and disconnect behavior clear to users.

## Root cause

The same defect was rejected four times in a row (Jul 27, Jul 29, Aug 7, Aug 19): **Mobile Wallet
Adapter (MWA) never connects on the reviewer's Seeker.** Because wallet sign-in gates the account,
the airdrop, SYNC packs and the server-backed profile, every downstream feature then reads as
"could not verify core functionality".

SyncStep is a web game (Leaflet map, CARTO tiles, per the copyright page) shipped as a wrapped
Android app. That combination has three known failure modes that match the reviewer notes exactly:

1. **Local Network Access permission (silent MWA failure).** Chrome and Chromium WebViews now
   require the user to grant "local network" access before a page may open the localhost
   WebSocket MWA uses to reach the wallet app. Solana Mobile's own recipe says that without the
   mitigation, "MWA wallet signing requests will silently fail". The fix is
   `@solana-mobile/wallet-standard-mobile` **>= 0.5.0** (the prompt flow is built in). Older
   `@solana-mobile/wallet-adapter-mobile` 2.x builds, and any hand-rolled MWA client, fail exactly
   the way the reviewer describes.
2. **Wrapper type.** If the APK is a Trusted Web Activity (Bubblewrap) whose Digital Asset Links
   (`/.well-known/assetlinks.json` on the hosting domain) are missing or do not match the release
   signing key, Chrome opens it with a browser bar, which is what a reviewer calls "relies heavily on
   external experiences". If it is a Capacitor / WebView build, the WebView must forward the
   `solana-wallet:` association intent and the local-network permission request, or MWA cannot start.
   eb28.co has no `.well-known/assetlinks.json`, so if the TWA points at eb28.co the fullscreen
   verification cannot pass.
3. **Backend unreachable on cold start.** "Unable to connect server" is the app's own error string.
   The account server (holds balance, streak, steppers, airdrop state) was unreachable when the
   reviewer opened the app. A free-tier host that sleeps on idle (the account also runs Render free
   services, e.g. the snapgrid-rmx-staging database that expired 2026-08-13) reproduces this on every
   first launch after a quiet period.

Earlier rejections were metadata problems that are already fixed: the publisher site at
eb28.co/syncstep (privacy, terms, copyright) went live 2026-07-20 and was corrected on 2026-08-08
(SYNC is a game currency, cannot be cashed out; server-side data disclosure).

## What has to change before the next submission

App build (source is not in this repo; see "Blocker" below):

- Upgrade the wallet stack to `@solana-mobile/wallet-standard-mobile@^0.5` (wallet-standard) and
  register MWA with `appIdentity` `{ name: "SyncStep", uri: "https://eb28.co/syncstep/", icon }`.
  Remove any `window.solana` / Phantom-extension code path; it does not exist on a Seeker.
- Make the wallet flow reviewable: one "Connect wallet" button, a visible connected state with the
  short address, an explicit "Disconnect" that clears the cached authorization, and a guest mode
  so the map, hexes, Syncs and Dig can be exercised before a wallet is connected.
- If shipping as a TWA: host `assetlinks.json` with the release-key SHA-256 at the PWA origin and
  confirm Chrome opens fullscreen. If shipping with Capacitor: bundle the web app inside the APK
  (no remote `server.url`) and add the MWA intent handling.
- Keep the backend awake (paid instance or cron ping) and make the client degrade gracefully:
  never show "unable to connect server" as a blocking toast on launch; retry with backoff and let
  local play continue.
- Bump `versionCode`, sign with the same dApp Store release key, and re-test on a physical Seeker
  with Seed Vault before uploading.

Submission:

- Create a **new** release in publish.solanamobile.com (rejections do not re-queue).
- Fill the reviewer / testing notes: exactly how to connect (Seed Vault or Phantom on-device),
  that the app works without a wallet, where SYNC packs are and that they cost real SOL, and that
  the server may take a few seconds on first load.
- Expect 3 to 5 business days; escalate in the Solana Mobile Discord `#dev-answers` after 5.

## Blocker recorded 2026-09-01

The SyncStep APK source and its backend are not in any GitHub repository this account exposes
(checked all 63 accessible repos plus eb28-command, seeker-scan, snapgridgame, push-skate-to-earn).
The August 8 site commits were made from a local checkout. The fix above cannot be built or
uploaded until the app repository is pushed to GitHub (or its location shared) and the dApp Store
publisher wallet approves the new release.
