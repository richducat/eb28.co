# App Store Metadata

## App Information

- Name: CadetCatch
- Subtitle: Find cadet photos faster
- Bundle ID: co.eb28.cadetcatch
- SKU: cadetcatch-ios
- Version: 1.0.1
- Build: 95
- Primary category: Lifestyle
- Secondary category: Photo & Video
- Marketing URL: https://eb28.co/cc/
- Support URL: https://eb28.co/cc/support/
- Privacy Policy URL: https://eb28.co/cc/privacy/
- Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Promotional Text

Private cadet rosters, event photo search, clearer match ranges, reliable previews, saved finds, family notes, and a plain-English academy terms guide.

## Description

CadetCatch helps Coast Guard Academy families keep up with cadet photos without digging through every gallery by hand.

Create a private roster on your iPhone, add a clear cadet photo, search event photos for possible matches, review likely finds, save photos to your iPhone Photos library, and keep simple notes for family follow-up.

CadetCatch shows possible matches for you to review. For best results, use a clear photo where only your cadet is visible.

Privacy Policy: https://eb28.co/cc/privacy/
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Keywords

cadet, military, academy, photos, family, parents, coast

## What's New

CadetCatch build 95 keeps the paid access gate, adds account email controls for desktop and family sharing access, keeps the approved $12.99 Family Monthly subscription path, and preserves the server photo search and reliable matched-photo previews.

## Review Notes

No login is required for the core iPhone photo search flow. Add a cadet profile from Roster using a clear photo selected from Photos. Open Info to review the parent-facing photo matching guidance. Open Home and tap Search Photos; the app sends the selected cadet photo for matching, shows loading state, and displays possible matches returned by CadetCatch. Open Photos to review possible matches, view a photo, save it to the iPhone Photos library, save it in the app, and create a family note. Open Photo Access from More or from a locked photo to review Family Monthly title, 1 month duration, $12.99/month fallback price if StoreKit has not loaded the live price yet, auto-renewal disclosure, Restore Purchases, Privacy Policy, and Terms of Use (EULA). Open More > Account & Desktop to see the account email field, desktop status, and spouse/family plus cadet invite slots. Internal tester emails have server-backed full access configured; public invite email delivery remains fail-closed until production SMTP credentials are configured.

## Submission Snapshot

- Release type: Manual
- iPhone screenshots attached: Yes
- iPad screenshots attached: Not required; target is iPhone only
- Login required: No for the core iPhone photo search flow
- Subscriptions present: Yes
- Ads present: No
- App Privacy updated for this build: Yes
- Export compliance reviewed: Yes

## Internal Launch Notes

- App Store Connect version state: Build 95 selected for App Store version 1.0.1 and submitted; visible ASC state was Waiting for Review on 2026-06-29.
- Attached build ID or build number: Build 95 selected and visible in ASC.
- Review submission ID: 575c019e-da9a-404a-9074-a4e18168cc4a.
- Release after approval: Manual release; do not publicly release without a separate exact EB28 release approval.
- Representation remediation: 2026-06-29 audit found live promotional text, description, App Privacy, and screenshots need correction for the current build-95 server-search flow.
- Screenshot pack: Five 1320x2868 iPhone preview images rendered from live build-95 simulator captures with app-store-screenshot-studio guidance; raw captures are preserved in the build-95 release-artifact receipts.
- In-app purchases and subscription status: Approved
- Verification screenshots: app-store/releases/cadetcatch/app-store-connect-snapshots/
- Post-approval checks to run:
  - Confirm live support and privacy URLs after Pages deployment.
  - Re-run photo checks against the current CadetCatch photo service before external demo sessions.
