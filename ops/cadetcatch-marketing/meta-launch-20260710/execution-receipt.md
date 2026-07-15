# CadetCatch launch execution receipt

**Owner:** TYFYS MANAGEMENT LLC
**Recorded:** updated 2026-07-15 EDT
**Activation:** BLOCKED — foundational Meta business assets exist, but no payment method, campaign, ad set, ad, or ad spend was created or enabled.

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
- Reconciled the measurement repair against current `origin/main` in an isolated worktree and committed the seven-file source patch as `989d8becbf92fa38f54344ac65268bc5a7c81a10` on `codex/cadetcatch-noscript-20260715`.
- An independent source/export audit returned SHIP with zero P0 and zero P1 findings. The dedicated export contained only the current CadetCatch asset graph; the unrelated generated `docs/` tree was not staged or deployed.
- Deployed the scoped export to the dedicated `cadetcatch.com` repository as production commit `f0208b7`. Live `/version.json` reports build `2026-07-15T17-50-00Z-989d8becbf`.
- Live HTTP verification passed for the homepage, guide, support, privacy, 404 document, a random 404, JSON configuration, analytics runtime, and every referenced JavaScript/CSS asset. The live homepage and both 404 paths contain only the CadetCatch noscript fallback.
- A fresh real-browser production check found no warnings or errors. All eight homepage App Store links resolved with provider token `118693782` and `ct=cc_meta_cold_2026`; the page recorded `pricing_view` and `app_store_click` with `campaign=cc_meta_cold_2026` and `creative=V1_ScrollSearch`. The guide recorded one `guide_view`, all seven guide links used `ct=cc_meta_groups_2026`, and its click event carried `campaign=cc_meta_groups_2026`, `creative=G1_FreeGuide`, and `link_location=swab-guide-header`.
- Direct GA4 DebugView/backend ingestion remains an activation gate; the browser proof above verifies the production event runtime and exact `dataLayer` payloads, not GA4 reporting arrival.

## App Store

- Live listing remains CadetCatch `1.0.1`; no App Store Connect submission was made.
- Prepared and committed local release candidate `1.0.2 (96)` on branch `codex/cadetcatch-1.0.2-build96`, commit `a9fea7e321f48fec59e87bcca2ccb4e73462a952`.
- Pushed that exact source commit to `origin/codex/cadetcatch-1.0.2-build96`; no archive or upload was performed.
- Verified bundle `co.eb28.cadetcatch`, one free preview search, `$1.99` one-time search, `$1.99` one-photo unlock, and `$12.99/month` Family Monthly.
- The app target built, installed, and launched on iPhone 17 Pro Max simulator. Storefront, privacy, and support URLs returned HTTP 200.
- Existing blocker: `CadetCatchUITests` lacks an Info.plist or generated Info.plist setting, so `xcodebuild test` exits 65 before UI tests execute.
- The conservative launch-manifest preflight remains failed on ten current-verification items: age rating, export compliance, in-app privacy link proof, current App Privacy answers, Paid Apps Agreement state, restore flow, terms link, exact-build screenshots, tested device, and tested flows. Historical build-95 evidence was not treated as current proof for build 96.
- App Store Connect redirected to Apple sign-in/passkey before CadetCatch could be inspected or build 96 uploaded.
- A later July 15 authenticated readback opened CadetCatch Analytics → Campaigns. App Store Connect generated provider token `118693782`; all four approved campaign links now use the canonical token with no placeholders.
- Campaign-link map:
  - Cold: `https://apps.apple.com/app/apple-store/id6769565852?pt=118693782&ct=cc_meta_cold_2026&mt=8`
  - Warm: `https://apps.apple.com/app/apple-store/id6769565852?pt=118693782&ct=cc_meta_warm_2026&mt=8`
  - Groups: `https://apps.apple.com/app/apple-store/id6769565852?pt=118693782&ct=cc_meta_groups_2026&mt=8`
  - Partner: `https://apps.apple.com/app/apple-store/id6769565852?pt=118693782&ct=cc_meta_partner_2026&mt=8`
- The live 90-day App Store Analytics baseline ending July 14 shows 7 first-time downloads, 2 redownloads, 267 impressions, 23 product-page views, 4.44% conversion, one in-app purchase, one active/paid subscription plan, `$9` displayed proceeds, and 11.1% Day-1 download-to-paid. Metrics labeled `Not Enough Data` remain unknown, not zero.

## Meta and campaign package — live provider update 2026-07-15

- Karen Hallett's authentic Facebook session is the operating owner. Meta business history shows the portfolio was created and last updated by Karen on July 15, 2026.
- Created business portfolio `TYFYS Management LLC`, business ID `2513115945804036`. Meta forced title case for the display name; its separate legal business name is saved exactly as `TYFYS MANAGEMENT LLC`.
- Saved the documented TYFYS address, established public TYFYS phone, and `https://cadetcatch.com/` in Business details. The EIN was not entered, printed, or stored in this package.
- Created Facebook Page `CadetCatch`, Page asset ID `1252075751318222`; Meta exposes Page URL identity `61591738779360`. CadetCatch is now the portfolio's primary Page.
- Created ad account `CadetCatch | US | USD | ET`, ad account ID `1014191354819822`, currency USD, time zone America/New_York.
- Karen is the only full-control person. Richard's advertising-restricted profile was not assigned to the portfolio, Page, or ad account.
- Set the portfolio two-factor requirement to `Everyone`. After the user reported 2FA complete, a fresh SessionLoom readback at 18:01 UTC still showed `Two-factor authentication required` and `Get started`; Ads Manager access therefore remains unverified and blocked.
- `meta@eb28.co` is pending confirmation. On July 15, no Meta/Facebook confirmation message was present in the `richard@eb28.co` cPanel Inbox or Junk folder; the connected Gmail recheck was rate-limited. Authoritative `eb28.co` MX still uses Namecheap forwarding.
- Instagram creation stopped at Karen-only identity fields (email or phone, birthday, and password). No values were invented and no credential was requested in chat.
- Expanded SessionLoom's existing Meta service only to the exact `https://adsmanager.facebook.com` origin. Ads Manager redirects to Karen's required personal 2FA setup before account access. On the 18:01 UTC recheck, SessionLoom correctly blocked the `Get started` transition because Meta routes it to personal `facebook.com`, which is outside the approved Meta Business origins; no generic-browser fallback or security bypass was used.
- No payment method was added. The user reports that Meta would not attach the selected gold American Express and will provide and authorize another card later. The prior card terms are suspended; no replacement card is identified or authorized, and neither supplied card image was opened.
- The open Facebook security handoff targets ad account `10152349167335880`, not CadetCatch ad account `1014191354819822`. Treat the former as a wrong-account blocker and never add payment or campaign objects there.
- No campaign, ad set, ad, audience, developer app, system user, token, group message, or partnership request was created. No spend occurred.
- The old `$600` campaign assumptions are retired. The earlier gold-card authorization is preserved only as audit history and is not executable. A replacement card requires fresh exact authorization before any payment or delivery action.

## Historical local package preparation — 2026-07-10

- The local package contains five paid-ad specifications, seven draft creatives, and permission-first group outreach. An independent audit caught that a lifetime-budget path could violate the recorded daily setting and that allocating all `9996` cents to delivery leaves no room for unknown taxes or fees. The package retains the suspended `1428`-cent daily-budget terms only as planning/audit history and intentionally validates as `BLOCKED` until a replacement card is freshly authorized and provider charge composition, spend-limit enforcement, schedule, correct-account access, payment attachment, and 2FA are proven.
- Independent re-audit reports zero P0 and zero P1 findings. Two provider-side P2 checks remain explicit: leave zero-budget warm/partner objects uncreated if Meta requires a positive minimum, and confirm the final exact seven-day schedule is interpreted in America/New_York before activation.
- Rendered the complete synthetic/demo creative set: four 4:5 statics, four 1:1 carousel cards, one 9-second 9:16 paid video, and one 36-second 9:16 organic guide video. Both videos are H.264, 1080x1920, 30 fps, and `yuv420p`.
- Local creative preview inventory is under `creatives/`: `v1-scroll-search-1080x1920.mp4`, `s1-outcome-1080x1350.png`, four `c1-card-*-1080x1080.png` cards, `t1-transparency-1080x1350.png`, `w1-free-preview-price-1080x1350.png`, `g1-free-guide-1080x1350.png`, and `g2-guide-video-1080x1920.mp4`. The corresponding specs remain `DRAFT` in `creative-specs.csv`.
- `group-admin-log.csv` contains eight researched targets. Every row remains `DRAFT_NOT_SENT`, every permission state remains `UNKNOWN`, no first-contact timestamp exists, and no partnership-ad code was claimed. No group or partner message was sent.
- Final local visual review passed the corrected carousel CTA, paid-video CTA, guide-video URL, non-affiliation disclosures, pricing language, and use of shipping UI. Meta placement previews and asset IDs remain unavailable until authentication.
- Corrected Meta API mapping: App Store links use Meta ad-set `destination_type: WEBSITE`; the package retains a human label for the Apple App Store campaign-link destination.
- The earlier Richard-profile login path is superseded by Karen's authentic owner session and the live assets listed above.
- `~/.codex/social-publisher/meta.env` remains unpopulated because no Meta developer app or Marketing/Page API tokens were created or verified. The verified business, Page, and ad-account IDs are recorded separately in this receipt and the manifest.

## Remaining activation gates

1. Restore Namecheap authentication, inventory all current forwarding addresses, apply `dns-cutover.md`, and pass real inbound/outbound/SPF/DKIM/DMARC tests.
2. Karen completes the still-visible Meta personal two-factor flow and returns to Business Settings until the provider no longer shows `Two-factor authentication required`. Then confirm `meta@eb28.co`, complete Instagram owner fields, and verify the new ad account in Ads Manager.
3. Complete Apple sign-in/passkey and inspect production StoreKit state. The exact archive/upload approval for version `1.0.2`, build `96`, source commit `a9fea7e321f48fec59e87bcca2ccb4e73462a952` was recorded earlier in this conversation, but no archive/upload occurred; resolve the release QA blockers, perform only the approved action when that lane resumes, then separately verify submission and `Ready for Sale` state.
4. Complete live Meta placement previews and assign asset IDs; the locally reviewed files remain `DRAFT` until those account-side checks pass.
5. Obtain fresh exact current-conversation authorization for the specific replacement card and transaction. Verify Ads Manager is on CadetCatch account `1014191354819822`, build every object `PAUSED`, reconcile every charge and cap again, and only then consider payment or activation.
6. Verify GA4 DebugView/backend receipt for the already-live production event payloads and reconcile every budget to the exact freshly approved lifetime cap immediately before activation.
