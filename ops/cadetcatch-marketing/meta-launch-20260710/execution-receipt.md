# CadetCatch launch execution receipt

**Owner:** TYFYS MANAGEMENT LLC
**Recorded:** 2026-07-10 17:41 EDT
**Activation:** BLOCKED — no Meta object was created or activated and no ad spend was enabled.

## Email and DNS

- Created `richard@eb28.co` in cPanel with a random 43-character password stored in macOS Keychain under `EB28 cPanel Mailbox`. The password was not printed or committed.
- Set the default Roundcube identity to display name `Richard Ducat` and organization `TYFYS MANAGEMENT LLC`.
- Created cPanel forwarders `meta@`, `facebook@`, `cadetcatch@`, `social@`, and `dmarc@` to `richard@eb28.co`.
- Set cPanel Email Routing for `eb28.co` to `Local Mail Exchanger`.
- Local alias test `CC-ALIASES-C8A6C23A` was accepted for all five aliases and delivered to the mailbox as a single deduplicated message.
- Real outbound test `CC-MAIL-33A353D28F` to Richard's Gmail failed with Gmail `550 5.7.26`: DKIM did not pass and SPF for `eb28.co` / `162.213.253.62` did not pass.
- Authoritative DNS still uses Namecheap email forwarding MX and has no cPanel DKIM, DMARC, `mail`, or `webmail` record. No DNS change was attempted after Namecheap rejected the saved login.
- The exact staged record set and safety gate are in `dns-cutover.md`.

## Measurement and storefront

- Created Google Analytics property `CadetCatch` (`545114858`).
- Created enhanced-measurement web stream `CadetCatch Web` (`15236983054`) for `https://cadetcatch.com`.
- Public measurement ID: `G-CTFMM8B2L2`.
- Added `guide_view`, `pricing_view`, and `app_store_click` collection with campaign and creative parameters.
- Configured the deploy to serve `/analytics-config.json` as JSON and removed unverified invitation and desktop-access claims from the paid-traffic storefront.
- Pushed the implementation to `codex/cadetcatch-meta-launch-20260710` and opened draft PR `richducat/eb28.co#5`; no production deploy or merge was performed.
- A production deploy and live DebugView proof remain pending final source reconciliation and the launch gates below.

## App Store

- Live listing remains CadetCatch `1.0.1`; no App Store Connect submission was made.
- Prepared and committed local release candidate `1.0.2 (96)` on branch `codex/cadetcatch-1.0.2-build96`, commit `a9fea7e321f48fec59e87bcca2ccb4e73462a952`.
- Pushed that exact source commit to `origin/codex/cadetcatch-1.0.2-build96`; no archive or upload was performed.
- Verified bundle `co.eb28.cadetcatch`, one free preview search, `$1.99` one-time search, `$1.99` one-photo unlock, and `$12.99/month` Family Monthly.
- The app target built, installed, and launched on iPhone 17 Pro Max simulator. Storefront, privacy, and support URLs returned HTTP 200.
- Existing blocker: `CadetCatchUITests` lacks an Info.plist or generated Info.plist setting, so `xcodebuild test` exits 65 before UI tests execute.
- The conservative launch-manifest preflight remains failed on ten current-verification items: age rating, export compliance, in-app privacy link proof, current App Privacy answers, Paid Apps Agreement state, restore flow, terms link, exact-build screenshots, tested device, and tested flows. Historical build-95 evidence was not treated as current proof for build 96.
- App Store Connect redirected to Apple sign-in/passkey before CadetCatch could be inspected or build 96 uploaded.

## Meta and campaign package

- Package validator passes with five paid ads `PAUSED`, seven creatives `DRAFT`, all group outreach `DRAFT_NOT_SENT`, and both allowed allocation scenarios capped at exactly `$600`.
- Rendered the complete synthetic/demo creative set: four 4:5 statics, four 1:1 carousel cards, one 9-second 9:16 paid video, and one 36-second 9:16 organic guide video. Both videos are H.264, 1080x1920, 30 fps, and `yuv420p`.
- Final local visual review passed the corrected carousel CTA, paid-video CTA, guide-video URL, non-affiliation disclosures, pricing language, and use of shipping UI. Meta placement previews and asset IDs remain unavailable until authentication.
- Corrected Meta API mapping: App Store links use Meta ad-set `destination_type: WEBSITE`; the package retains a human label for the Apple App Store campaign-link destination.
- Facebook Business reached the saved-profile picker. Selecting the normal-photo `Richard Ducat` profile did not complete the native saved-password/verification step.
- No business portfolio, Page, Instagram account, ad account, developer app, system user, token, campaign, ad set, ad, payment method, group message, or partnership-ad request was created.
- `~/.codex/social-publisher/meta.env` remains unpopulated because no Meta IDs or tokens were verified.

## Remaining activation gates

1. Restore Namecheap authentication, inventory all current forwarding addresses, apply `dns-cutover.md`, and pass real inbound/outbound/SPF/DKIM/DMARC tests.
2. Complete Richard's Facebook login and two-factor flow, then create and verify the TYFYS-owned assets and payment method.
3. Complete Apple sign-in/passkey and inspect production StoreKit state. Before archive/upload, record exact approval for version `1.0.2`, build `96`, source commit `a9fea7e321f48fec59e87bcca2ccb4e73462a952`, and the named release action; then upload, fix/accept the UI-test blocker, submit, and verify `Ready for Sale`.
4. Retrieve Apple's provider token and generate the four operational campaign links without placeholders.
5. Complete live Meta placement previews and assign asset IDs; the locally reviewed files remain `DRAFT` until those account-side checks pass.
6. Verify GA4 DebugView on the deployed site and reconcile lifetime budgets to no more than `$600` immediately before activation.
