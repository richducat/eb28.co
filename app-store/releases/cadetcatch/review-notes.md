# App Review Notes

Use this file as the exact reviewer-facing source for the build being submitted.

## Build identity

- App: CadetCatch
- Version: 1.0.0
- Build: 3

## Summary for App Review

CadetCatch is an iPhone app for cadet families to keep a private local roster, check approved public photo sources for possible face matches, save likely finds, write review notes, and decode common academy terms in plain English.

## Login

- Login required: No
- Demo username: Not applicable
- Demo password: Not applicable
- Extra login steps: Not applicable

## How to test the core flow

1. Launch the app and continue from the EAGLE welcome screen.
2. Open Roster and add a cadet profile with a clear face photo from Photos.
3. Open Sources, confirm public HTTPS sources are enabled, or add another public HTTPS photo page.
4. Open Home and tap Check Public Sources.
5. Open Photos to review any possible matches, save a match, and create a review note.
6. Open More and use the academy terms decoder.

## Permissions and background behavior

- Photos used: Yes. Why: selected photos are used only to create private local cadet profiles.
- Camera used: No.
- Notifications used: No.
- Location used: No.
- Background scanning: No. Scans run only when the user taps Check Public Sources.

## Monetization

- Ads present: No
- In-app purchases present: No
- Subscription present: No

## Additional reviewer notes

- The app checks only public HTTPS pages that are built in or added by the user.
- The app does not scan private social accounts, private photo libraries, private websites, or logged-in pages in this build.
- If a source has no usable images, blocks automated image access, or has no match above the threshold, the app shows that result instead of generating sample matches.
