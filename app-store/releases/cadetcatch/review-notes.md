# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: CadetCatch
- Version: 1.0.1
- Build: 89

## Summary for App Review

CadetCatch is an iPhone app for cadet families to keep a private local roster, check the CadetCatch server photo index for possible face matches, view selected results, save likely finds, write family notes, and read common academy terms in plain English.

## Login

- Login required: No
- Demo username: Not applicable
- Demo password: Not applicable
- Extra login steps: Not applicable

## How to test the core flow

1. Launch the app and continue from the EAGLE welcome screen.
2. Open Roster and add a cadet profile with a clear single-face photo from Photos.
3. Open Sources and confirm that matching uses the CadetCatch Search API. Source discovery, face embeddings, indexing, and photo hosting are handled by the backend/admin pipeline, not by this phone.
4. Open Home and tap Check Photos. The app uploads the selected cadet photo to the secure search endpoint, shows loading state, and then displays possible matches returned by the backend.
5. Open Photos to review any possible matches. Previews stay hidden until single-photo or monthly access is active.
6. Use the Photo Access purchase sheet to test one-time photo checks, monthly access, and Restore Purchases. The monthly section shows Family Monthly, 1 month, the monthly price, auto-renewal text, Privacy Policy, and Terms of Use (EULA) before purchase.
7. Save a viewed match to the iPhone Photos library, save it in the app, and create a family note.
8. Open More and use the academy terms guide.

## Permissions and background behavior

- Photos used: Yes. Why: selected photos are used to create private local cadet profiles and are uploaded only when the user runs a server photo check.
- Camera used: No.
- Notifications used: No.
- Location used: No.
- Background scanning: Yes. When Daily Photo Checks is enabled in More, the app requests a once-daily Background App Refresh check and also runs a due check the next time the app opens if iOS has not run the background task.

## Monetization

- Ads present: No
- In-app purchases present: Yes
- Subscription present: Yes
- Purchase products:
  - `co.eb28.cadetcatch.search.once.v1` - consumable one-time server photo check.
  - `co.eb28.cadetcatch.photo.unlock.v1` - consumable single-photo access.
  - `co.eb28.cadetcatch.family.monthly.v1` - auto-renewable monthly subscription.
- Restore purchases: Available in More and in the purchase sheet.
- Subscription details in app: The Photo Access purchase sheet and locked-photo purchase panel show the Family Monthly subscription title, 1 month duration, price per month, auto-renewal disclosure, Privacy Policy link, Terms of Use (EULA) link, and Restore Purchases before monthly purchase.
- Privacy Policy: Linked in the purchase sheet, locked-photo purchase panel, More, and App Store metadata.
- Terms: Apple Standard EULA is linked as Terms of Use (EULA) in the purchase sheet, locked-photo purchase panel, More, and App Store description.

## Additional reviewer notes

- The app sends the selected cadet photo to the CadetCatch Search API only when the user starts a photo check.
- Source discovery, face embeddings, indexing, and photo hosting are handled by the CadetCatch backend/admin pipeline, not by this phone.
- The app does not access private social accounts, private photo libraries, private websites, or logged-in pages in this build.
- If the backend detects no face, multiple faces, no matches, or a server error, the app shows a clear state instead of showing unrelated results.
- In-app purchase products must be active in App Store Connect for TestFlight purchase testing.
- Build 89 moves photo matching through the CadetCatch server search API and uses the backend-provided photo_url directly, including the current public R2 development URLs. The app does not use R2 tokens or derive photos.cadetcatch.com URLs from r2_key. It hides match score/bounding-box/debug data from normal users and preserves Save to Photos for unlocked matched photos.
