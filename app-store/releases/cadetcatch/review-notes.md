# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: CadetCatch
- Version: 1.0.1
- Build: 95

## Summary for App Review

CadetCatch is an iPhone app for cadet families to keep a private local roster, search event photos for possible matches, review likely finds, save photos, write family notes, and read common academy terms in plain English.

## Login

- Login required: No for the core iPhone photo search flow
- Demo username: Not applicable
- Demo password: Not applicable
- Extra login steps: Not applicable

## How to test the core flow

1. Launch the app and continue from the EAGLE welcome screen.
2. Open Roster and add a cadet profile with a clear single-face photo from Photos.
3. Open Info to review the parent-facing photo matching guidance.
4. Open Home and tap Search Photos. The app sends the selected cadet photo for matching, shows loading state, and then displays possible matches returned by CadetCatch.
5. Open Photos to review any possible matches. Previews stay hidden until single-photo or monthly access is active.
6. Use the Photo Access purchase sheet to test one-time photo checks, monthly access, and Restore Purchases. The monthly section shows Family Monthly, 1 month, the monthly price, auto-renewal text, Privacy Policy, and Terms of Use (EULA) before purchase. If StoreKit has not loaded the live price yet, the fallback monthly price shown in the app is $12.99/month.
7. Save a viewed match to the iPhone Photos library, save it in the app, and create a family note.
8. Open More and use the academy terms guide.
9. Open More > Account & Desktop to see the account email field, desktop-access status, and spouse/family plus cadet invite slots. These controls require the CadetCatch access API before production use.

## Permissions and background behavior

- Photos used: Yes. Why: selected photos are used to create private local cadet profiles and are sent for matching only when the user starts a photo search.
- Camera used: No.
- Notifications used: No.
- Location used: No.
- Background scanning: Yes. When Daily Photo Checks is enabled in More, the app requests a once-daily Background App Refresh check and also runs a due check the next time the app opens if iOS has not run the background task.

## Monetization

- Ads present: No
- In-app purchases present: Yes
- Subscription present: Yes
- Purchase products:
  - `co.eb28.cadetcatch.search.once.v1` - consumable one-time photo search.
  - `co.eb28.cadetcatch.photo.unlock.v1` - consumable single-photo access.
  - `co.eb28.cadetcatch.family.monthly.v1` - auto-renewable monthly subscription.
- Restore purchases: Available in More and in the purchase sheet.
- Subscription details in app: The Photo Access purchase sheet and locked-photo purchase panel show the Family Monthly subscription title, 1 month duration, price per month, auto-renewal disclosure, Privacy Policy link, Terms of Use (EULA) link, and Restore Purchases before monthly purchase.
- Privacy Policy: Linked in the purchase sheet, locked-photo purchase panel, More, and App Store metadata.
- Terms: Apple Standard EULA is linked as Terms of Use (EULA) in the purchase sheet, locked-photo purchase panel, More, and App Store description.

## Additional reviewer notes

- The app sends the selected cadet photo to CadetCatch only when the user starts a photo search.
- Event photo collection and matching are handled by CadetCatch, not by private accounts on this phone.
- The app does not access private social accounts, private photo libraries, private websites, or logged-in pages in this build.
- If no face, multiple faces, no matches, or a connection problem occurs, the app shows a clear state instead of showing unrelated results.
- In-app purchase products must be active in App Store Connect for TestFlight purchase testing. Build 95 requests the approved `.v1` product IDs listed above.
- Build 95 keeps CadetCatch photo matching behavior from build 92, keeps the paid access gate from build 94, keeps the approved StoreKit product IDs and $12.99 Family Monthly fallback price, adds account email controls for future desktop and family sharing access, and keeps the stale remote photo cache bypass so repaired photo URLs can load fresh previews in the app.
- The desktop and family-sharing controls must not be submitted to App Review as production-ready until the CadetCatch access API endpoints are deployed, verified, and reflected in reviewer notes.
