# Weed Authority Review Notes

Version 2.0.1 build 6 is a native SwiftUI iPhone and iPad update. It adds a user-directed, local import workflow for supported Florida and Arizona medical-cannabis portal screenshots while keeping state authentication outside the app.

No Weed Authority account or app login is required. State portal login occurs only in the system Safari view and requires the user's own authorized portal account.

Reviewer flow:

1. Open Explore to search Apple Maps for cannabis retailers by city, state, or ZIP. Retailer cards include regulator source links.
2. Open Rec to unlock the device-protected local REC vault, enter optional card details, open official state sources, and add private purchase-ledger entries.
3. For Florida or Arizona, open the official portal in Safari, sign in there, and navigate to the applicable allotment or order page. The user may then return to Weed Authority and select a screenshot from Photos.
4. Apple Vision text recognition runs on the device. The importer accepts only supported state labels with an explicit unit, presents candidate values for review, and requires the user to confirm the value, unit, and route or category before saving. The raw screenshot is not persisted by Weed Authority; the confirmed normalized snapshot is stored in the device-only Keychain.
5. For other supported states, Rec provides official source links and private manual tracking; it does not claim a live state balance.
6. Open Deals to filter and save informational product cards. There is no cart, ordering, reservation, delivery, checkout, or payment flow.
7. Open Learn for official state source links and compliance education. Open Account for privacy, terms, support, AdMob privacy choices, and local data deletion.

Compliance and privacy notes:

- Weed Authority does not sell, facilitate the purchase of, reserve, or deliver cannabis and does not collect payment.
- The app does not provide medical dosage guidance, diagnosis, treatment, or legal advice.
- Weed Authority never receives state portal usernames, passwords, MFA codes, session cookies, or Safari browsing data.
- The app does not automate portal navigation, inject scripts, read the portal DOM, or run background or live synchronization.
- A confirmed snapshot is marked stale after 24 hours and invalidated when the user records a new purchase. It is a convenience copy only; the state portal and licensed dispensary remain authoritative.
- REC profile fields, confirmed snapshots, and purchase-ledger values remain on the device. Confirmed snapshots are stored in the device-only Keychain.
- Google AdMob banners use Google User Messaging Platform consent and privacy choices and appear only on non-REC screens. The Rec tab is ad-free, and REC profile, screenshot-derived, allotment, and purchase-ledger values are not sent to Google.
- The app contains no fake synchronized state values or demo state account.

Build 6 was uploaded and submitted to App Review on July 14, 2026. The version is configured for manual release after approval.
