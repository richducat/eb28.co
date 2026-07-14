# Weed Authority state portal research

Research date: July 14, 2026

## Decision

The next build must not collect state-portal usernames, passwords, MFA codes, recovery answers, session cookies, or browser storage. No supported state was found to publish a documented patient-facing OAuth or balance API that Weed Authority can lawfully integrate as a general consumer client.

The supported implementation therefore keeps authentication in Safari, lets the user select a portal screenshot, performs Apple Vision text recognition on the device, accepts only exact state labels with explicit units, requires the user to review and confirm the result, discards the selected image, and stores only the confirmed normalized snapshot in the device-only Keychain. It does not automate login or navigation, inject JavaScript, scrape a DOM, use a headless browser, bypass MFA or CAPTCHA, or access Metrc/BioTrack industry systems.

## State findings

| State | Patient-facing finding | Build 6 behavior |
| --- | --- | --- |
| Florida | The official MMUR patient guides expose current `Smoking Amount Eligible to be Dispensed` and `Medical Marijuana Amount Eligible to be Dispensed` values. An order detail can separately show `Amount Remaining`; it is not interchangeable with current dispensable eligibility. | Exact-label screenshot import for those values. Florida route, context labels, value, and unit must agree or the import fails closed. |
| Arizona | The official patient portal guide shows `Remaining Allotment` on the `My ID Cards` page. | Exact-label screenshot import when `My ID Cards`, the value, and grams or ounces are present. |
| California | The state provides license verification and physician-recommendation rules, but no central patient remaining-balance surface was identified. | Official links and private manual ledger only; no live-balance claim. |
| New York | Patient access centers on certification/registration in MCDMS. No documented patient remaining-balance field suitable for import was identified. | Official patient links and private manual ledger only. |
| Pennsylvania | The patient registry documents profile, certification, card, caregiver, and payment functions. No documented patient remaining-balance field suitable for import was identified. | Official registry links and private manual ledger only. |
| Ohio | Effective March 24, 2026, current state guidance says there are no longer whole-day units and uses daily transaction limits; it does not provide one patient-facing remaining-days value suitable for import. | Current registry/regulator links and private manual ledger only; no calculated remaining-days claim. |
| Nevada | Patient-card administration and cannabis industry tracking are separate. No documented patient purchase-balance surface suitable for import was identified. | Official medical-program links and private manual ledger only. |

## Security and privacy constraints

- Florida law treats patient, caregiver, physician-certification, and dispensing identifying information in the MMUR as confidential.
- Arizona law treats qualifying-patient applications, registry-card identities, and related records as confidential and limits combining that data with other databases.
- The FTC states that its Health Breach Notification Rule applies to many health apps and similar technologies handling identifying health information.
- Apple treats health information and legal-cannabis services as sensitive/highly regulated, forbids hidden credential discovery, restricts advertising based on sensitive medical data, and requires clear privacy disclosures.
- REC screens are ad-free. REC profile, screenshot-derived text, confirmed allotment values, and purchase-ledger values are not sent to Google or used for advertising.
- A confirmed snapshot becomes stale after 24 hours and is invalidated immediately when the user records a purchase. The portal and licensed dispensary remain authoritative.

## Primary sources

- Florida OMMU, [Amount Available Calculations Page](https://knowthefactsmmj.com/wp-content/uploads/_documents/Instructional_Guides/PT/Amount-Available-Calculations-Page.pdf)
- Florida OMMU, [Understanding Your Orders](https://knowthefactsmmj.com/wp-content/uploads/_documents/Instructional_Guides/PT/Understand-Orders.pdf)
- Arizona Department of Health Services, [Medical Marijuana Licensing Management System patient portal guide](https://www.azdhs.gov/documents/licensing/medical-marijuana/mmlms/portal-overflow-for-mobile-phones.pdf)
- California Department of Cannabis Control, [official license search](https://search.cannabis.ca.gov/)
- New York Office of Cannabis Management, [patients](https://cannabis.ny.gov/patients)
- Pennsylvania Department of Health, [medical marijuana patients](https://www.pa.gov/agencies/health/programs/medical-marijuana/medical-marijuana-patients)
- Ohio Division of Cannabis Control, [medical marijuana products and daily limits](https://com.ohio.gov/divisions-and-programs/cannabis-control/patients-caregivers/product-supply)
- Nevada Cannabis Compliance Board, [Nevada cannabis program](https://ccb.nv.gov/nevada-cannabis-program/)
- Florida Legislature, [F.S. 381.987 confidentiality](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0300-0399%2F0381%2FSections%2F0381.987.html)
- Arizona Legislature, [A.R.S. 36-2810 confidentiality](https://www.azleg.gov/ars/36/02810.htm)
- Federal Trade Commission, [Health Breach Notification Rule basics](https://www.ftc.gov/business-guidance/resources/health-breach-notification-rule-basics-business)
- Apple, [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Revalidation trigger

Re-run this review before adding another state, when an official portal changes its labels or domain, when a state publishes an authorized patient API, or before changing REC data storage, analytics, advertising, or cloud synchronization.
