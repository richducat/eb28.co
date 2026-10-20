# Consent and account-deletion fixes

The SDK and banner now both require the current UMP canRequestAds decision. Banner creation is additionally gated in SwiftUI and a removed/revoked banner is detached. Premium still suppresses placement. The consent-error path only starts ads when UMP permits a request from the current/prior valid consent state.

Account and Pro screens share a password-confirmation sheet. Reauthentication precedes destructive operations. The sheet remains open on any failure and explicitly reports partial Firestore/Auth completion so the user can retry. The two Firebase services are not transactional; this patch does not claim atomic deletion.

Before shipping, use test ad units and disposable Firebase accounts in a non-production environment to verify: fresh install, denied consent, consent network error, privacy changes and Premium; wrong password, expired authentication, offline deletion, partial failure and successful retry. Confirm no ad request occurs while UMP canRequestAds is false. Confirm wrong credentials remove no profile. Confirm successful deletion removes both the profile and Auth identity. App Store subscriptions are managed separately by Apple.

The macOS CI job compiles the iOS Simulator target. A compile pass does not substitute for these device/service checks or a signed archive. Follow AGENTS.md production release requirements, and verify the exact source/version against App Store Connect before uploading.
