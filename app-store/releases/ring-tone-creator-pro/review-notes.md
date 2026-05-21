# Ring Tone Creator Pro Review Notes

## Build
- Version: 1.0.0
- Build: 2
- Bundle ID: `co.eb28.ringtonecreatorpro`

## Login
- Login required: Yes
- Demo username: `reviewer+ringtonepro@eb28.co`
- Demo password: `Review123!`
- Extra login steps: Create this Firebase Auth user before submission, or use the app signup screen to create it in the configured Firebase project.

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
- Public App Review submission still requires the real Firebase config, reviewer demo account, and production AdMob app ID/banner ID. Build 2 removes the blocking Firebase setup screen, but still must not be submitted as production-ready while the placeholder Firebase plist and Google AdMob test IDs remain.
