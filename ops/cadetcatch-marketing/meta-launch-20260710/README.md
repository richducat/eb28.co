# CadetCatch Meta launch package — 2026-07-10

This directory is the implementation package for the approved 30-day CadetCatch Meta pilot owned by **TYFYS MANAGEMENT LLC**. It is deliberately safe by default:

- Package state is `DRAFT`.
- Every Meta campaign, ad set, and ad is specified as `PAUSED`.
- No file in this package authorizes an external mutation, publication, message, or spend.
- The lifetime spend ceiling is **$600.00** (`60000` cents) in every allowed allocation scenario.
- Activation is blocked until every mandatory item in `launch-qa.md` is checked and an operator records the external IDs and previews.

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
├── AS1_Cold_US_iOS_40plus [PAUSED, $480 base / $380 partner scenario]
│   ├── AD_V1_ScrollSearch_Cold_9x16 [PAUSED]
│   ├── AD_S1_Outcome_Cold_4x5 [PAUSED]
│   ├── AD_C1_HowItWorks_Cold_Carousel [PAUSED]
│   └── AD_T1_Transparency_Cold_4x5 [PAUSED]
├── AS2_Warm_MetaEngagers [PAUSED, $120]
│   └── AD_W1_FreePreviewPrice_Warm_4x5 [PAUSED]
└── AS3_PublicPartner [DRAFT/optional, $100 reallocated from AS1 only]
    └── AD_P1_PublicPartner_AuthorizedContent [DRAFT until permission and code]
```

Base allocation is `$480 cold + $120 warm = $600`. The only approved partnership allocation is `$380 cold + $120 warm + $100 partner = $600`. The partner ad set must not be created without written authorization and an eligible public partnership-ad asset/code.

Meta API mapping note: the Apple App Store campaign link is an external URL, so each ad set uses Meta's literal `destination_type` value `WEBSITE`. `APPLE_APP_STORE_CAMPAIGN_LINK` is only this package's human-readable destination label; it is not sent as a Meta API enum.

## Tracking placeholders

Replace `{{APPLE_PROVIDER_TOKEN}}` only with the provider token shown in App Store Connect. Do not replace or rename the approved campaign tokens:

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

The command must report `PASS` before any operator uses this package. It does not access Meta, Apple, Namecheap, GA4, or any other external service.
