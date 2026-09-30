# SyncStep for Solana Mobile (Seeker) — Android shell

`com.richardducat.syncstep`, the Capacitor Android app that the Solana dApp Store
rejected six times between 2026-07-13 and 2026-08-19. This folder is a rebuild of that
app from the last submitted binary (v2.5, versionCode 18, recovered from the release
NFT `rj7nKC5HTPCvRxnnEWKEwbdrFVsAYs4cLZuRPiyHmtC`), with the two defects that caused
the rejections fixed.

The game itself (the web bundle in `www/`) is the shipped 2.5 build with two surgical
patches; the original TypeScript/Vite source was never pushed to GitHub. When that
source is available again, apply the same two changes there and rebuild `www/` with
`vite build` instead of editing the minified bundle.

## What was wrong

| Reviewer finding (all six rejections) | Cause found on 2026-09-30 |
| --- | --- |
| "Could not complete the wallet connection flow" (Jul 27, Jul 29, Aug 7, Aug 19) | Mobile Wallet Adapter ran **inside the WebView** (`@solana-mobile/mobile-wallet-adapter-protocol-web3js`): the page fired the `solana-wallet:` intent from a hidden iframe, waited for a synthetic `blur`, then opened `ws://localhost:<port>` from the page. That path depends on WebView networking rules, Chromium's Local Network Access policy and background-tab throttling, and never completed on the reviewer's Seeker. |
| "Brief message: unable to connect server" (Aug 19) | The API at `https://sync.chatbotbuilder.store` sits on Namecheap shared hosting behind **Imunify360 bot protection**. In a timed test on 2026-09-30, 2 of 6 `POST /auth/nonce` calls were answered `403 "Access denied by Imunify360 bot-protection"` and 2 of 6 CORS preflights got the HTML "One moment, please…" challenge page instead of `204`. From a WebView, that surfaces as "Couldn't reach the server", and sign-in cannot complete. |
| "Relies heavily on external experiences" | Side effect of the above: the wallet hand-off bounced the reviewer out of the app and back with nothing to show. |
| Earlier: unreadable pages / publisher site | Fixed on 2026-07-20 and 2026-08-08 (`docs/syncstep/*` on eb28.co). |

## What changed in this rebuild (2.6, versionCode 19)

1. **Native Mobile Wallet Adapter.** `MobileWalletAdapterPlugin.kt` wraps Solana Mobile's
   official Kotlin client (`com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.0.8`).
   The wallet is launched with an activity-result contract and the MWA session runs in the
   app process. `www/syncstep-native-mwa.js` exposes the same `transact(cb)` shape the game
   already uses. It calls the plugin through `Capacitor.nativePromise` and decides lazily at
   call time, because Capacitor core (`registerPlugin`, `Capacitor.Plugins`) is not loaded
   yet when that classic script runs. (The first version looked the plugin up at load time
   and would have silently done nothing; an independent review caught it.)
2. **Token handling.** One wallet session per action: sign-in and purchases reuse the
   wallet's auth token. If the wallet no longer knows the token, the shim forgets it and asks
   once from scratch. A user cancel is never retried.
3. **Account state and Disconnect.** Wallet tab shows `Connected · ABCD…WXYZ` and a
   **Disconnect wallet** button (clears wallet, token and saved session, no wallet launch).
   This answers the last review finding: "make the connection, account state, and disconnect
   behavior clear".
4. **Server resilience.** The HTTP client retries up to three times with back-off on network
   errors, 5xx gateways and the Imunify360 challenge, and reports a persistent challenge as a
   clear "security check" message. Real API errors and 401 are never retried.
5. **Connect flow polish.** The 15 s "abandoned" watchdog and the 6 s "close the wallet"
   toast no longer fire during a legitimate two-step approval; the button shows "Connecting…";
   failure toasts stay 5 s; if sign-in worked but the airdrop request failed, the UI shows the
   connected state. A guest tapping a paid action is sent to Connect first; the SYNC pack list
   is re-fetched if the launch-time request failed. Plugin errors ("no wallet installed",
   timeout) reach the user instead of "Connection cancelled".
6. **Manifest and dependencies.** `<queries>` for the `solana-wallet` scheme; the MWA library's
   transitive `androidx.test` dependency is excluded, which removes three exported launcher test
   activities and `REORDER_TASKS` from the APK. Location and notification permissions restored.
7. **Reproducible bundle.** The original TypeScript source is not in any repository, so
   `tools/patch-bundle.py` rebuilds `www/assets/index-DXPA_3cK.js` from the pristine 2.5 bundle
   (`tools/original/`, byte-identical to the shipped APK) with 20 exact-match patches.

`npm test` runs a contract test with real Ed25519 signatures, a real web3.js transaction and the
game's own signature verifier under document-start conditions, and executes the patched server
client against a fake flaky server. It fails against the first version of the shim.

## Server-side fix still required (owner action)

Imunify360 is a host-level control on Namecheap shared hosting; it cannot be disabled from
the app. Either:

- Open a Namecheap support ticket (text in `NAMECHEAP-TICKET.md`) asking them to **disable
  Imunify360 anti-bot / WebShield challenge for `sync.chatbotbuilder.store`** (an API host
  that only serves JSON to a mobile app), or to whitelist the paths `/auth/*`, `/api/*`,
  `/rpc`, `/buy-packs`, `/health`; **or**
- move the Express API to a host without a bot shield (Render, Fly.io, Cloudflare Workers)
  and change `VITE_API_BASE` / `VITE_RPC_URL` in the game build.

Until one of those is done, sign-in can still fail for reviewers (the client now retries three times, which helps, but does not remove the block).

## Build

Requirements: JDK 21, Android SDK (platform 35, build-tools 35), Node 20+.

```bash
cd apps/syncstep
npm install
./node_modules/.bin/cap sync android
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleDebug        # smoke build
./gradlew assembleRelease      # unsigned release APK
```

## Sign (same key as 2.5, mandatory)

The dApp Store only accepts an update signed with the **same key as the previous release**
(cert SHA-256 `2ad1ce68cc9ce6beaff01ef59b22180ad8188542b7556860b642111aa0e4a834`). That
keystore is on the Mac that built 1.7 through 2.5; it is not in any repository.

```bash
$ANDROID_HOME/build-tools/35.0.0/zipalign -p 4 app/build/outputs/apk/release/app-release-unsigned.apk syncstep-2.6-aligned.apk
$ANDROID_HOME/build-tools/35.0.0/apksigner sign --ks /path/to/syncstep-release.keystore --ks-key-alias <alias> --out syncstep-2.6.apk syncstep-2.6-aligned.apk
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --print-certs syncstep-2.6.apk   # must print 2ad1ce68…
```

## Submit

1. Install on a Seeker and run the full path once: open app → Wallet tab → Connect Solana
   Wallet → approve in Seed Vault → welcome airdrop credited → greet a Sync → Dig → buy the
   0.005 SOL pack → Disconnect. Confirm the server's bot shield is off first (`curl -X OPTIONS
   https://sync.chatbotbuilder.store/auth/nonce` must return 204 every time).
2. publish.solanamobile.com → SyncStep → **New Version** → upload `syncstep-2.6.apk`.
   What's new: see `RELEASE-NOTES.md`. Testing notes for the reviewer: same file.
3. Approve the Arweave upload and Release NFT signatures with the publisher wallet
   `9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn`.
4. Review takes 3 to 5 business days; escalate in the Solana Mobile Discord `#dev-answers`
   after five.
