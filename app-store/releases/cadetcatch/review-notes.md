# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: CadetCatch
- Version: 1.0.0
- Build: 1

## Summary for App Review

CadetCatch is a premium iPhone app for military parents to maintain a private cadet roster, run photo match sweeps, review confidence-scored sample intel, save matches, generate parent-ready sitrep drafts, and decode academy jargon in plain English.

## Login

- Login required: No
- Demo username: Not applicable
- Demo password: Not applicable
- Extra login steps: Not applicable

## How to test the core flow

1. Launch the app and tap Activate Pro on the paywall.
2. Open Roster, add a cadet, and optionally choose a base photo.
3. Open Radar, run a sweep, then review generated matches in Intel.
4. Open an Intel match, save it, and generate a sitrep draft.
5. Open Decoder and search common terms such as PT, Liberty, or Formation.

## Permissions and background behavior

- Notifications used: Not in the current test flow. Why: future priority match alerts.
- Calendar used: No. Why: not applicable.
- Photos used: Yes. Why: selected photos can be used as private cadet roster base photos.
- Camera used: Not in the current test flow. Why: reserved for capturing a base roster photo.
- Location used: No. Why: not applicable.

## Monetization

- Ads present: No
- In-app purchases present: Yes
- Subscription present: Yes
- How to reach the paywall or purchase screen:
  - Fresh install opens onboarding/paywall before the main app.
  - Tap Activate Pro to proceed if StoreKit products are not available in the review environment.
- Restore path:
  - Tap Restore on the paywall or Restore Purchases in Profile.

## Additional reviewer notes

- Verified devices:
  - iPhone 17 Pro Max simulator
- Known non-blocking limits:
  - TestFlight can use the local Pro preview while the App Store Connect subscription product is being configured.
- Anything Apple should not misinterpret:
  - Sample photo match data is included so reviewers can test the app flow without accessing real cadet imagery.
