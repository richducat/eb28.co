# CadetCatch Android Privacy Review

## URLs

Privacy Policy: https://eb28.co/cc/privacy/

Support: https://eb28.co/cc/support/

## Android Permissions

- `INTERNET`: required for access checks, photo search, image loading, and purchase-link requests.
- `POST_NOTIFICATIONS`: only if Android notifications are added. Not part of the initial Android scaffold.
- `WRITE_EXTERNAL_STORAGE` with `maxSdkVersion=28`: only for saving matched photos to Gallery on older Android versions.

The initial Android app uses Android Photo Picker for selecting a cadet photo, so broad photo-library read permission should not be required.

## Sensitive Behavior

- The app uploads one selected cadet image to `https://api.cadetcatch.com/search`.
- The backend performs face search and returns possible matches.
- The app displays `photo_url` returned by the backend.
- Search results are possible matches and must be reviewed by the parent.

## Release Blockers

- Google Play Billing purchase-token verification must be implemented and tested before paid Android production release.
- Play Console Data Safety answers must match the final app and backend behavior.
- Tester access must be verified before any production rollout.
