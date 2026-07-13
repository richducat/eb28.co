# App Store Metadata

## App Information

- Name: CadetCatch
- Subtitle: Find cadet photos faster
- Bundle ID: co.eb28.cadetcatch
- SKU: cadetcatch-ios
- Version: 1.0.2
- Build: 97
- Primary category: Lifestyle
- Secondary category: Photo & Video
- Marketing URL: https://cadetcatch.com/
- Support URL: https://cadetcatch.com/support/
- Privacy Policy URL: https://cadetcatch.com/privacy/
- Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Promotional Text

Private cadet rosters, event photo search, clearer match ranges, reliable previews, saved finds, family notes, and a plain-English academy terms guide.

## Description

CadetCatch helps Coast Guard Academy families keep up with cadet photos without digging through every gallery by hand.

Create a private roster on your iPhone, add a clear cadet photo, search event photos for possible matches, review likely finds, save photos to your iPhone Photos library, and keep simple notes for family follow-up.

CadetCatch shows possible matches for you to review. For best results, use a clear photo where only your cadet is visible.

Privacy Policy: https://cadetcatch.com/privacy/
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Keywords

cadet, military, academy, photos, family, parents, coast

## What's New

CadetCatch build 97 adds privacy-protected app measurement for completed photo checks and verified StoreKit purchases while preserving the paid access gate, the approved $12.99 Family Monthly path, and reliable matched-photo previews.

## Review Notes

No login is required for the core iPhone photo search flow. Add a cadet profile from Roster using a clear photo selected from Photos. Open Info to review the parent-facing photo matching guidance. Open Home and tap Search Photos; the app sends the selected cadet photo for matching, shows loading state, and displays possible matches returned by CadetCatch. Open Photos to review possible matches, view a photo, save it to the iPhone Photos library, save it in the app, and create a family note. Open Photo Access from More or from a locked photo to review Family Monthly title, 1 month duration, $12.99/month fallback price if StoreKit has not loaded the live price yet, auto-renewal disclosure, Restore Purchases, Privacy Policy, and Terms of Use (EULA). Open More > Account & Desktop to see the account email field, desktop status, and spouse/family plus cadet invite slots. Internal tester emails have server-backed full access configured; public invite email delivery remains fail-closed until production SMTP credentials are configured.

## Submission Snapshot

- Release type: Manual
- Local iPhone screenshot package prepared: Yes; six 6.9-inch and six 6.5-inch images
- App Store Connect screenshot attachment verified: No; no App Store Connect mutation was performed
- iPad screenshots attached: Not required; target is iPhone only
- Login required: No for the core iPhone photo search flow
- Subscriptions present: Yes
- Ads present: No
- App Privacy updated for this build: No; Firebase Analytics disclosures require review before upload
- Export compliance reviewed: Yes

## Internal Launch Notes

- App Store Connect version state: 1.0.2 build 97 is local-only and has not been archived, uploaded, selected, or submitted.
- Attached build ID or build number: None for 1.0.2 build 97.
- Prior review receipt: 1.0.1 build 95 was visible in ASC as Waiting for Review with manual release selected on 2026-06-29.
- Release after approval: Manual release; do not publicly release without a separate exact EB28 release approval.
- Representation remediation: The 1.0.2 package uses cadetcatch.com privacy and support URLs; App Store Connect metadata, App Privacy, and screenshot state still require direct verification before submission.
- Conversion measurement: Build 97 adds `roster_created`, `photo_check_started`, `photo_check_completed`, and `paywall_view`, plus Firebase's verified StoreKit 2 transaction logger. No cadet names, photos, emails, units, image URLs, face data, or user IDs are sent. Firebase project `cadetcatch`, iOS app stream `15250018699`, and the production config file are now installed. DebugView proof, Ads-side approval of the GA4 link request, App Privacy disclosure, and privacy-manifest review remain launch blockers.
- Screenshot pack: Six premium 1320x2868 images and six matching 1284x2778 images were prepared on 2026-07-12 from live CadetCatch 1.0.2 build-96 Simulator states and verified backend search results. The package is local only and still requires a separately approved App Store Connect screenshot action.
- In-app purchases and subscription status: Approved
- Verification screenshots: app-store/releases/cadetcatch/app-store-connect-snapshots/
- Post-approval checks to run:
  - Confirm https://cadetcatch.com/support/ and https://cadetcatch.com/privacy/ are live.
  - Re-run photo checks against the current CadetCatch photo service before external demo sessions.
