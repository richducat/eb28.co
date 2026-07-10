# App Review Notes — Draft Only

> **Do not paste into App Store Connect yet.** These notes target local candidate CadetCatch 1.0.2 (96), which has not been uploaded. Revalidate every step against the exact archive selected in App Store Connect.

## Build Identity

- App: CadetCatch
- Version: 1.0.2
- Build: 96

## Summary for App Review

CadetCatch is an iPhone app for Coast Guard Academy families to add a private cadet reference photo, search event photos, review possible matches themselves, save selected photos to the iPhone Photos library, and keep simple family notes.

CadetCatch presents possible matches for the user to review. It does not claim that a result is a confirmed identification. CadetCatch is independent and is not affiliated with, endorsed by, or connected to the U.S. Coast Guard Academy, the U.S. Coast Guard, or the Department of Homeland Security.

## Login

- Login required: No for the core iPhone photo-search flow
- Demo username: Not applicable
- Demo password: Not applicable
- Extra login steps: Not applicable

## How to Test the Core Flow

1. Launch the app and complete the introductory screen.
2. Open Roster and add a cadet using a clear, single-person reference photo selected from Photos.
3. Open Home. A fresh installation should show that one preview photo search is available.
4. Tap Search Photos. The selected reference photo is sent to CadetCatch only when this search is started.
5. Review the returned possible matches in Photos. The app must present them as suggestions for the reviewer to evaluate, not confirmed identifications.
6. After the free preview has been used, open Photo Access and verify these StoreKit options:
   - `co.eb28.cadetcatch.search.once.v1` — One-Time Photo Check, $1.99 for one additional search.
   - `co.eb28.cadetcatch.photo.unlock.v1` — Unlock One Photo, $1.99 to view, save, and share one matched photo.
   - `co.eb28.cadetcatch.family.monthly.v1` — Family Monthly, $12.99/month for continuous searches and unlocked matches while active.
7. Before starting Family Monthly, verify that the sheet shows its duration, live storefront price, auto-renewal disclosure, Privacy Policy, Terms of Use, and Restore Purchases.
8. For an unlocked possible match, test the in-app save control, create a family note, and use Save to Photos.
9. Verify that a reference photo with no usable face, multiple faces, no possible matches, or a service/connection problem produces a clear error or empty state rather than unrelated or sample results.

## Permissions and Data Flow

- Photo selection: Used to add the user-chosen private cadet reference photo.
- Server search: The selected reference photo is sent to CadetCatch only when the user starts a photo search.
- Add to Photos: Requested only when the user chooses Save to Photos for an unlocked result.
- Camera: Expected not to be used; verify against the exact build and archive permission strings.
- Location: Expected not to be used; verify against the exact build.
- Push and local notifications: Expected not to be used; verify against the exact build.
- Background behavior: **UNRESOLVED — document the exact behavior of the submitted build before using these notes.**

## Monetization

- Ads present: No
- In-app purchases present: Yes
- Subscription present: Yes
- Restore Purchases: Must be available in More and in Photo Access.
- Privacy Policy: Must link to https://cadetcatch.com/privacy/ inside the exact submitted build and in App Store metadata.
- Support: Must link to https://cadetcatch.com/support/ inside the exact submitted build and in App Store metadata.
- Terms: Apple Standard EULA must be linked before subscription purchase and in App Store metadata.

## Additional Reviewer Notes

- The app does not require access to private social accounts, private websites, or logged-in photo pages for the core flow described here.
- The free preview is one photo search, not a guarantee that a matching photo will be found.
- Prices shown above are the intended US storefront prices. Confirm that App Store Connect products are available and that the exact submitted build displays Apple's live localized prices.
- Privacy disclosures must reflect the server-side reference-photo search and the exact SDKs included in the archive.

## Required Rewrite Before Submission

- Confirm the archived and selected build is exactly 96.
- Remove this draft warning.
- Record the exact test device and OS.
- Confirm every step on a fresh installation of that build.
- Confirm purchase, cancellation/pending handling, restore, and Save to Photos behavior.
- Confirm exact background behavior and permission strings.
- Confirm the in-app cadetcatch.com Privacy and Support URLs.
- Confirm App Privacy, age rating, export compliance, Paid Apps Agreement, tax/banking, and all three product states in App Store Connect.
