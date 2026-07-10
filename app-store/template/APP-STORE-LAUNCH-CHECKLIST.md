# App Store Launch Checklist

Use this only after the app is actually feature-complete.

## Account and business
- [ ] Apple Developer membership is active.
- [ ] If paid or uses IAP, Paid Apps Agreement is `Active`.
- [ ] Banking information complete if paid or uses IAP.
- [ ] Tax information complete if paid or uses IAP.
- [ ] EU trader status reviewed if available in the EU.

## App record
- [ ] App name is 2–30 characters and defensible under Apple metadata rules.
- [ ] Subtitle is 30 characters or fewer.
- [ ] Bundle ID matches Xcode exactly.
- [ ] Age rating questionnaire completed and current (4+/9+/13+/16+/18+ system).
- [ ] Age rating answers cover AI chatbot/assistant behavior if the app has any.
- [ ] Categories are accurate.

## Public URLs
- [ ] Marketing URL live if used.
- [ ] Support URL live with real contact info.
- [ ] Privacy policy URL live.
- [ ] User privacy choices URL live if offered.
- [ ] Terms/EULA link live if subscriptions exist.

## Privacy and legal
- [ ] App Privacy answers updated for the current build.
- [ ] Privacy policy accessible inside the app.
- [ ] Permission strings clearly explain why access is needed.
- [ ] If accounts can be created, in-app account deletion exists (5.1.1(v)).
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) and required-reason APIs reviewed for the app and third-party SDKs.
- [ ] Data sent to AI/third-party providers is disclosed in-app and in App Privacy.
- [ ] Export compliance questions answered.
- [ ] Export compliance plist key or approved documentation in place.

## Monetization
- [ ] Digital unlocks use StoreKit IAP.
- [ ] All IAP products configured and available.
- [ ] Subscriptions show clear value, restore, privacy, and terms.
- [ ] Ads, if present, reflected in App Privacy disclosures.
- [ ] Free, paid, and restored states all tested.

## Assets and metadata
- [ ] Screenshots show the app in use.
- [ ] iPhone 6.9" (1320 × 2868) screenshot set attached.
- [ ] iPad 13" (2064 × 2752) screenshot set attached if the app runs on iPad.
- [ ] Screenshots are pixel-exact to spec (off-by-one fails upload).
- [ ] Metadata does not over-promise or show non-shipping UI.
- [ ] What's New text matches the actual release.
- [ ] Review notes mention the exact build being submitted.

## Build
- [ ] Built with Xcode 26+ and an iOS/iPadOS 26 SDK.
- [ ] Native icon + launch assets verified from the archive.

## QA
- [ ] Fresh install launch passes.
- [ ] Settings screens do not freeze or dead-end.
- [ ] Core flow passes on iPhone.
- [ ] Core flow passes on iPad if supported.
- [ ] Notifications, background flows, and permissions tested if used.
- [ ] Purchase and restore flows tested if used.
- [ ] Ad flow tested if ads enabled.
- [ ] No clipping or layout overflow on supported devices.
- [ ] First-run proves distinctive, lasting utility (guards against 4.3 minimum-functionality).

## Submission
- [ ] Attached build is the build referenced in review notes.
- [ ] Required app-review contact info filled in.
- [ ] Demo credentials included if login is required.
- [ ] Release setting is intentional: manual, automatic, or scheduled.
- [ ] Preflight script passes with zero errors.
