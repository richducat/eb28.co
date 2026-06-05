# Ring Tone Creator Pro Review Notes

## Build
- Version: 1.0.0
- Build: 5
- Bundle ID: `co.eb28.ringtonecreatorpro`

## Login
- Login required: Yes
- Demo username: `reviewer+ringtonepro@eb28.co`
- Demo password: `Review123!`
- Extra login steps: None. The Firebase Auth reviewer account has been created and verified against the production Firebase project `ring-tone-creator-pro`.

## Test Flow
1. Sign in with the demo account.
2. Open Browse and choose a starter tone, or open Create and import audio/video/recording.
3. In Editor, trim the clip, adjust fades, and export.
4. After export, open the install guide and Share File.
5. Open Library to favorite, duplicate, delete, and re-edit saved tone projects.
6. Open Pro to test Unlimited purchase and Restore Purchases.
7. Open Account to sign out or delete the account.

## Monetization
- Ads: Google AdMob banners for free users outside the editor.
- AdMob iOS app ID: `ca-app-pub-9665484869013517~5583873475`
- AdMob banner unit: `ca-app-pub-9665484869013517/3751917052`
- Subscription: `co.eb28.ringtonecreatorpro.unlimited.monthly`
- Subscription name: Ring Tone Creator Pro Unlimited
- Price: $0.99/month
- Restore: Available in Pro and paywall screens.
- Terms: Apple Standard EULA is linked in the app and metadata.

## Privacy Notes
- User audio files stay on-device.
- Firebase stores account and export-credit metadata only.
- StoreKit is the subscription source of truth; Firestore mirrors status for support.
- Account deletion is available in Account/Pro.

## Reviewer Notes
- The app exports ringtone-ready `.m4r` files and provides GarageBand installation guidance. It does not claim direct iOS Settings ringtone mutation.
- Protected or streaming-only music is rejected with user-facing copy.
- App Store Connect app record `6771739451` exists as `Ring Tone Creator Pro Studio`; the in-app display name is `Ring Tone Creator Pro`.
- Subscription `co.eb28.ringtonecreatorpro.unlimited.monthly` / Apple ID `6771748572` is created and ready to submit.
- Build 5 replaces build 4 for version 1.0.0. It preserves the same Firebase, reviewer account, StoreKit, AdMob, and screenshot/metadata setup while fixing the export crash in the live free-credit Firestore transaction path, keeping saved-project export/re-edit working, and retaining the top-bar export access and corrected remote credit display handling.
- The AdMob app was created before the App Store listing is publicly searchable, so it still needs App Store ID `6771739451` linked in AdMob after the public listing is live.
