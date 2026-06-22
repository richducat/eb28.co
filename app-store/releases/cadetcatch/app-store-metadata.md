# App Store Metadata

## App Information

- Name: CadetCatch
- Subtitle: Find cadet photos faster
- Bundle ID: co.eb28.cadetcatch
- SKU: cadetcatch-ios
- Version: 1.0.1
- Build: 90
- Primary category: Lifestyle
- Secondary category: Photo & Video
- Marketing URL: https://eb28.co/cc/
- Support URL: https://eb28.co/cc/support/
- Privacy Policy URL: https://eb28.co/cc/privacy/
- Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Promotional Text

Private cadet rosters, secure server photo search, hidden previews, saved finds, family notes, and a plain-English academy terms guide.

## Description

CadetCatch helps Coast Guard Academy families keep up with cadet photos without digging through every gallery by hand.

Create a private roster on your iPhone, add a clear cadet face photo, check the CadetCatch server photo index for possible matches, review match details, view selected results, save likely finds, and keep simple notes for family follow-up.

Photo indexing and source ingestion are handled by the CadetCatch backend. Private albums stay private unless you choose to use an accessible image source through the CadetCatch service.

Privacy Policy: https://eb28.co/cc/privacy/
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Keywords

cadet, military, academy, photos, family, parents, coast

## What's New

CadetCatch build 90 keeps the CadetCatch Search API photo_url flow from build 89 and clarifies the in-app cloud search status so users see that one reference photo is analyzed while the server searches the indexed photo database.

## Review Notes

No login is required. Add a cadet profile from Roster using a clear single-face photo selected from Photos. Open Sources to confirm that matching uses the CadetCatch Search API and that indexing is backend/admin work. Open Home and run Check Photos; the app uploads the selected cadet photo, shows loading state, and displays matched full-photo results returned by the backend. Previews stay hidden until single-photo or monthly access is active. Open Photo Access from More or from a locked photo to review Family Monthly title, 1 month duration, price per month, auto-renewal disclosure, Restore Purchases, Privacy Policy, and Terms of Use (EULA).

## Submission Snapshot

- Release type: Manual
- iPhone screenshots attached: Yes
- iPad screenshots attached: Not required; target is iPhone only
- Login required: No
- Subscriptions present: Yes
- Ads present: No
- App Privacy updated for this build: Yes
- Export compliance reviewed: Yes

## Internal Launch Notes

- App Store Connect version state: Build 90 local upload candidate; not uploaded.
- Attached build ID or build number: Build 90 candidate; ASC build ID not applicable until upload completes and is verified.
- Review submission ID: Not applicable to this TestFlight upload candidate
- Release after approval: After approval
- In-app purchases and subscription status: Approved
- Verification screenshots: app-store/releases/cadetcatch/app-store-connect-snapshots/
- Post-approval checks to run:
  - Confirm live support and privacy URLs after Pages deployment.
  - Re-run photo checks against the current CadetCatch server search endpoint before external demo sessions.
