# App Store privacy corrections — 2026-09-07

These are prepared changes, not published App Store Connect answers. Retain accurate existing disclosures. App Privacy labels are separate from PrivacyInfo.xcprivacy. Do not mark this audit complete until the console and public listing have been verified.

| App | Prepared change | Remaining classification evidence |
|---|---|---|
| CadetCatch (6769565852) | Set Privacy Policy URL to https://eb28.co/cc/privacy/. Replace Data Not Collected with collection disclosure; Email Address used for App Functionality, linked to the recipient/account, not tracking. | Verify source/archive for live 1.0.1/build 95. Confirm retained account IDs, purchase/access records, photo and face-template retention. Select Photos or Videos, Sensitive Info (biometrics), User ID, Purchase History only according to actual retained data. Transient request processing alone is not proof of retention. |
| VA Doc Finder (6769866840) | Add Health, Sensitive Info (disability), Other User Content, Emails or Text Messages and User ID for optional customer record/message synchronization; App Functionality, linked to customer, not tracking. Retain existing contact and support categories. Updated description and medical-coordination copy are in the TYFYS remediation PR. | Confirm any uploaded image category in the configured file flow, retention and deletion using controlled records. |
| Snapgrid Remix (6763897067) | Reconcile AdMob collection with the existing Coarse Location label: Device ID, Product Interaction, Advertising Data, Crash Data, Performance Data and Other Diagnostic Data as applicable to the installed SDK. Third-Party Advertising and Analytics where used; security diagnostics can also serve App Functionality. | Google says the SDK automatically processes IP address, interactions, diagnostics and device/account identifiers. Inspect installed SDK configuration, partner processing and ID association before final linked-to-user/tracking choices. Having no app account does not establish unlinkability. Do not equate UMP consent with ATT permission. |

Sources: [Apple definitions and disclosure criteria](https://developer.apple.com/app-store/app-privacy-details/), [Google Mobile Ads SDK disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure), [CadetCatch policy](https://eb28.co/cc/privacy/), [Snapgrid policy](https://eb28.co/snapgrid/privacy/), [TYFYS policy](https://tyfys.net/privacy).

## Accessibility

All 12 listings lack declared accessibility support. This is missing release evidence, not proof that all 12 apps fail accessibility. Run VoiceOver navigation, Dynamic Type at accessibility sizes, contrast, reduced motion and non-color-only state checks on the actual release build, then declare only supported features in App Store Connect. Do not automatically set every capability to Yes.

## Release traceability

`releases.json` separates the observed live version from candidate source locations. Null release commit/build/archive fields are intentional: current source HEAD is not proof of the shipped artifact. For each release, record its exact commit, CFBundleVersion, marketing version, archive checksum and App Store Connect build ID before submission. CadetCatch is specifically blocked from source replacement until build 95 is located.
