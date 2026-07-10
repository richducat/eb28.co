# App Store Launch Playbook

Reviewed against Apple documentation on June 16, 2026.

This is the repeatable path for shipping a new app or update to the App Store with the fewest avoidable review problems.

## Phase 0: Business readiness

Before product work, confirm the account can legally sell and ship the app.

- Apple Developer membership is active.
- Free app with no IAP → ship under the standard developer agreement.
- Paid app or any IAP/subscription → the Account Holder must have the **Paid Apps Agreement** in `Active` status, with banking and tax info complete.
- Available in the EU → trader status is reviewed and accurate (DSA requirement).

## Phase 1: App record setup

Lock in identifiers that cannot change later.

- App name: 2–30 characters. Subtitle: 30 max.
- Bundle ID: must match Xcode exactly.
- SKU: internal only, but cannot be changed later.
- Primary + secondary category: closest real fit.
- Copyright line.
- **Age rating questionnaire** — complete it honestly. The current questionnaire (bands 4+/9+/13+/16+/18+) asks about in-app controls, capabilities, medical/wellness content, violence, and **AI chatbot/assistant behavior**. Incomplete = submissions blocked.

## Phase 2: Product-page assets

Make public-facing surfaces real before the binary goes to review.

- Privacy policy URL: live.
- Support URL: live, with real contact info.
- Marketing URL: live if used.
- Terms / custom EULA: live if subscriptions exist or legal review requires it.
- App icon: final in the native asset catalog, not just web assets.
- Screenshots: show the app **in use**, not splash/title art.

Screenshot coverage (one source size per family; Apple auto-scales down):

- iPhone: **6.9" = 1320 × 2868** portrait. Required.
- iPad: **13" = 2064 × 2752** portrait. Required if the app runs on iPad.
- 1–10 per family. The first 1–3 carry the value — show core value, permissions context, and monetization states. Overlays must be truthful and specific to the screen shown.

## Phase 3: App privacy and permissions

Treat privacy/permission work as a submission blocker, not polish.

- Add a privacy policy link in App Store Connect metadata **and** make it easy to find inside the app.
- Complete App Privacy answers for the app and all third-party SDK behavior; keep them current when SDKs or tracking change.
- Every permission prompt string clearly explains the actual use.
- Accounts can be created → in-app **account deletion** is required (5.1.1(v)).
- Third-party/social login for the primary account → satisfy the Sign in with Apple equivalence rule when required.
- Review **privacy manifests** and **required-reason APIs** for the app and bundled SDKs (`PrivacyInfo.xcprivacy`).
- Any personal data sent to third parties — **including AI providers** — must be disclosed clearly in the UX and in App Privacy.

## Phase 4: Monetization rules

Pick the correct branch and satisfy the matching rules.

### Paid app or IAP
- Use StoreKit IAP for digital goods/features/unlocks.
- Paid Apps Agreement `Active` before testing or submitting paid flows.
- Create the IAP product records; keep metadata clean.
- Test sandbox purchase availability before submission.

### Subscriptions
- Explain exactly what the user gets for the price before the purchase ask.
- Show **Restore Purchases** inside the app.
- Keep Privacy Policy and Terms accessible in the subscription UI.
- Add subscription testing steps to review notes.
- If screenshots/description feature premium content, make it clear when purchase is required.

### Ads
- Update App Privacy answers to match the ad SDK's data collection.
- If the ad stack tracks users, implement the ATT consent flow.
- If the network requires a root-domain `app-ads.txt`, publish it before submission.
- Verify both the ad-supported and ad-free states on device.

## Phase 5: Build readiness

The binary must be review-ready, not just buildable.

- Build with **Xcode 26+ and an iOS/iPadOS 26 SDK** (mandatory for all uploads since April 28, 2026). Deployment target can still be lower to support older OS versions.
- Confirm export-compliance answers for encryption. If no docs are required, keep the Info.plist export-compliance key configured so you are not blocked each submission. If docs are required, upload early.
- Verify the native icon and launch assets from the **archive**, not just Xcode previews.

## Phase 6: QA matrix

Run submission QA on the families Apple is likely to use.

Minimum smoke matrix: current iPhone device/sim; current iPad if supported; fresh-install launch; settings open/close; permission flows; IAP/subscription flows if present; ad-supported and ad-free flows if present; offline/poor-network first-run; notification scheduling/delivery if used; camera/photos/contacts/location/mic/health/calendar access if used.

For every release, explicitly verify: no startup crash; no frozen settings/modal screens; no broken purchase restoration; no dead-end permission flows; no clipped layouts; screenshots match shipping UI closely enough to satisfy metadata accuracy.

## Phase 7: Review packet

Where many avoidable rejections happen. Prepare build-specific review notes every time:

- exact version and build
- what changed in this build
- whether login is required + stable demo credentials if so
- how to reach the premium/IAP flow if present
- how to test notifications, background behavior, or hardware features
- what permissions appear and why
- whether ads are present and how the ad-free state is reached
- any region-, entitlement-, or hardware-limited behavior

Rule: do not reuse stale notes. If the build number changes, the review notes change with it.

## Phase 8: Submission settings

Use the least risky release setting for the moment.

- First release of a brand-new app → `Manual release after approval`.
- Risky monetization update → `Manual release after approval`.
- Low-risk maintenance update → `Automatic` or phased release.

Before pressing submit: the attached build matches the notes; the right screenshots are attached for every required family; privacy/support/terms links are live; App Privacy answers match the shipping build; app-version notes and IAP notes are both filled if applicable.

## Phase 9: Post-submission monitoring

Watch build processing, export-compliance status, app-version state, and review-submission state. Save Apple rejection text verbatim in the repo. If rejected: fix the actual issue, re-verify on the cited device class, and update review notes with the exact fix and exact build.

## Rejection loop

1. Save the rejection text in the release folder.
2. Classify: metadata accuracy / completeness or performance / privacy / payments or subscriptions / design (4.3 spam or minimum functionality) / legal or regional.
3. Reproduce on the cited device family.
4. Fix in code or metadata.
5. Re-run the smoke matrix.
6. Rewrite review notes for the new build and exact fix.
7. Resubmit only when notes, build, and verification are aligned.

## Lessons encoded from real launches

- Reviewer notes are part of the product. Treat them like code.
- iPad is a first-class review device if the app runs there.
- Privacy/support/legal URLs must be live before the version is submitted.
- Subscription review fails fast when legal links, restore, or product availability are incomplete.
- Ads change privacy disclosures and need their own QA pass.
- 4.3 "minimum functionality"/spam rejections are beaten by a distinctive, useful first run and honest, specific metadata — not by adding more screens.
- Build-specific verification screenshots and notes shorten review loops; they are worth the time.
