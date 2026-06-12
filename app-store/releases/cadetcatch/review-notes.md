# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: CadetCatch
- Version: 1.0.1
- Build: 87

## Summary for App Review

CadetCatch is an iPhone app for cadet families to keep a private local roster, check approved photo pages for possible face matches, view selected results, save likely finds, write family notes, and read common academy terms in plain English.

## Login

- Login required: No
- Demo username: Not applicable
- Demo password: Not applicable
- Extra login steps: Not applicable

## How to test the core flow

1. Launch the app and continue from the EAGLE welcome screen.
2. Open Roster and add a cadet profile with a clear face photo from Photos.
3. Open Sources and confirm Coast Guard Academy, DVIDS, and Pduddy Pics are enabled, or add another secure public photo page. Facebook photo or album links can also be added when the reviewer has permission to open the link in Safari.
4. Open Home and tap Check Photos. The app shows the current source, discovered image count, checked image count, and possible match count while scanning.
5. Open Photos to review any possible matches. Previews stay hidden until single-photo or monthly access is active.
6. Use the Photo Access purchase sheet to test one-time photo checks, monthly access, and Restore Purchases. The monthly section shows Family Monthly, 1 month, the monthly price, auto-renewal text, Privacy Policy, and Terms of Use (EULA) before purchase.
7. Save a viewed match to the iPhone Photos library, save it in the app, and create a family note.
8. Open More and use the academy terms guide.

## Permissions and background behavior

- Photos used: Yes. Why: selected photos are used only to create private local cadet profiles.
- Camera used: No.
- Notifications used: No.
- Location used: No.
- Background scanning: Yes. When Daily Photo Checks is enabled in More, the app requests a once-daily Background App Refresh check and also runs a due check the next time the app opens if iOS has not run the background task.

## Monetization

- Ads present: No
- In-app purchases present: Yes
- Subscription present: Yes
- Purchase products:
  - `co.eb28.cadetcatch.search.once.v1` - consumable one-time public photo check.
  - `co.eb28.cadetcatch.photo.unlock.v1` - consumable single-photo access.
  - `co.eb28.cadetcatch.family.monthly.v1` - auto-renewable monthly subscription.
- Restore purchases: Available in More and in the purchase sheet.
- Subscription details in app: The Photo Access purchase sheet and locked-photo purchase panel show the Family Monthly subscription title, 1 month duration, price per month, auto-renewal disclosure, Privacy Policy link, Terms of Use (EULA) link, and Restore Purchases before monthly purchase.
- Privacy Policy: Linked in the purchase sheet, locked-photo purchase panel, More, and App Store metadata.
- Terms: Apple Standard EULA is linked as Terms of Use (EULA) in the purchase sheet, locked-photo purchase panel, More, and App Store description.

## Additional reviewer notes

- The app checks only secure public pages that are built in or added by the user.
- Pduddy Pics is included as a selected Facebook source in Sources.
- The app does not access private social accounts, private photo libraries, private websites, or logged-in pages in this build. Facebook links must be accessible to the reviewer in Safari.
- If a page has no usable images, blocks image access, or has no likely match, the app shows that result instead of showing unrelated results.
- In-app purchase products must be active in App Store Connect for TestFlight purchase testing.
- Build 87 improves face matching with on-device face embeddings for better matching across different clothes, hairstyles, hats, and backgrounds; preserves Save to Photos for unlocked matched photos, stricter face-match filtering, simulator-tested search fallback behavior, and the supplied low-resolution USCGC EAGLE photo from the owner as the native iOS launch/splash image and welcome image, with the screenshot UI badge removed and no replacement EAGLE artwork.
