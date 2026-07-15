# CadetCatch Meta launch package — 2026-07-10

This directory is the implementation package for the CadetCatch Meta pilot owned by **TYFYS MANAGEMENT LLC** and operated through Karen Hallett's authentic owner profile. It is deliberately fail-closed:

- Package state is `DRAFT`.
- Every Meta campaign, ad set, and ad is specified as `PAUSED`.
- No package file standing alone authorizes an external mutation; `task-capsule.json` records the exact current-conversation authority and mandatory provider gates.
- The prior `$600` plan is retired. The earlier gold American Express terms are retained only as audit history because that card could not be attached; there is currently no executable payment authorization. Any replacement card requires fresh exact current-conversation authorization naming that card, Meta Platforms, USD recurrence, daily and lifetime limits, taxes/fees, and maximum total.
- The user's requested hard ceiling is `$25.00` on any day. The suspended gold-card terms are retained only as a planning reference: because [Meta describes its daily budget as an average](https://www.facebook.com/business/ads/pricing) that can spend up to 75% more on a given day, a `$14.28` daily setting models at most `$24.99` on a day and reconciles to `$99.96` over seven days. These figures are not executable authority for a replacement card.
- Activation is blocked until every mandatory item in `launch-qa.md` is checked and an operator records the external IDs and previews.

Current provider assets:

- Business portfolio: `TYFYS Management LLC` (`2513115945804036`), legal details saved as `TYFYS MANAGEMENT LLC`.
- Primary Facebook Page: `CadetCatch` (asset ID `1252075751318222`; Page URL identity `61591738779360`).
- Ad account: `CadetCatch | US | USD | ET` (`1014191354819822`).
- Instagram: not created; Karen must personally complete the owner email/phone, birthday, and password fields.
- Payment: blocked. The gold American Express could not be attached, no replacement card is identified or authorized, and no supplied card image was opened.

## Files

| File | Purpose |
| --- | --- |
| `campaign-manifest.json` | Canonical machine-readable campaign architecture, controls, copy, tracking tokens, gates, and optimization rules. |
| `ads.csv` | Flat upload/handoff view of every planned ad. All rows are `PAUSED`. |
| `creative-specs.csv` | Production requirements and exact on-asset messaging for each asset. All rows are `DRAFT`. |
| `creatives/` | Synthetic/demo source material, reproducible renderer, final local PNG/MP4 drafts, frames, and render manifest. |
| `group-admin-outreach.md` | Permission-first administrator messages, approved group-post copy, and follow-up rules. Nothing has been sent. |
| `group-admin-log.csv` | Seeded permission ledger. Every row starts `DRAFT_NOT_SENT`. |
| `launch-qa.md` | Mandatory storefront, measurement, creative, account, budget, and activation checklist. |
| `dns-cutover.md` | Exact public DNS change set, current authoritative proof, and forwarding-preservation gate. |
| `execution-receipt.md` | Current completed work, IDs, test evidence, and exact remaining blockers. |
| `validate-package.mjs` | Local structural validator for JSON, CSV, names, statuses, budgets, references, and tokens. |

## Canonical campaign tree

```text
CC_US_iOS_Traffic_SwabSummer_2026-07 [PAUSED]
├── AS1_Cold_US_iOS_40plus [PAUSED, planning-reference daily setting 1428 cents]
│   ├── AD_V1_ScrollSearch_Cold_9x16 [PAUSED]
│   ├── AD_S1_Outcome_Cold_4x5 [PAUSED]
│   ├── AD_C1_HowItWorks_Cold_Carousel [PAUSED]
│   └── AD_T1_Transparency_Cold_4x5 [PAUSED]
├── AS2_Warm_MetaEngagers [PAUSED, daily setting 0 cents; audience gate]
│   └── AD_W1_FreePreviewPrice_Warm_4x5 [PAUSED]
└── AS3_PublicPartner [DRAFT/optional, no allocation; permission gate]
    └── AD_P1_PublicPartner_AuthorizedContent [DRAFT until permission and code]
```

For the tiny market and limited pilot budget, initial delivery uses only the cold ad set with V1 and S1. C1 is the first challenger, T1 is reserve, and the warm and partner ad sets remain paused. The partner ad set must not be created without written authorization, an eligible public partnership-ad asset/code, and a reallocation inside the separately approved lifetime cap.

Meta API mapping note: the Apple App Store campaign link is an external URL, so each ad set uses Meta's literal `destination_type` value `WEBSITE`. `APPLE_APP_STORE_CAMPAIGN_LINK` is only this package's human-readable destination label; it is not sent as a Meta API enum.

## Tracking links

App Store Connect generated and verified provider token `118693782` on July 15, 2026. The four operational links use that canonical token; do not replace or rename the approved campaign tokens:

- `cc_meta_cold_2026`
- `cc_meta_warm_2026`
- `cc_meta_groups_2026`
- `cc_meta_partner_2026`

Apple campaign reporting is aggregated for Facebook groups because a token must reach Apple's reporting threshold. Group membership must never be scraped or uploaded as an audience.

## Validation

Run from this directory:

```bash
node validate-package.mjs
```

The command intentionally reports `BLOCKED` while replacement-card authorization, Meta's tax and fee composition, provider-enforced spend limit, exact seven-day timestamps, payment attachment, correct-account access, or 2FA readback remain unresolved. It may report `PASS` only after those activation-critical values are proven. It does not access or prove external state by itself.
