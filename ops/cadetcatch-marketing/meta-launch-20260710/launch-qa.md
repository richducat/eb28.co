# CadetCatch Meta launch QA — mandatory activation gates

**Current state:** `DRAFT` / `PAUSED` / no executable payment or spend authorization. The failed gold-card terms are audit history only; a replacement card requires fresh exact approval.

Do not activate any campaign, ad set, ad, group post, or partnership ad until every mandatory checkbox is complete. Add evidence links or IDs beside each item. A failed or unknown result is not a pass.

## 1. Package integrity and safety

- [ ] `node validate-package.mjs` reports `PASS`; it currently must return `BLOCKED` while replacement-card authorization, provider taxes, fees, spend-limit enforcement, schedule, payment attachment, correct-account access, or 2FA remain unresolved.
- [ ] Campaign name is exactly `CC_US_iOS_Traffic_SwabSummer_2026-07`.
- [ ] Cold ad set name is exactly `AS1_Cold_US_iOS_40plus`.
- [ ] Warm ad set name is exactly `AS2_Warm_MetaEngagers`.
- [ ] Every created campaign, ad set, and ad was created `PAUSED`.
- [ ] No customer list, group-member list, Meta Pixel audience, SDK audience, or scraped audience was introduced.
- [ ] No password, access token, EIN, payment data, administrator email, or private group data appears in this package or a repository.

## 2. Legal entity, ownership, and account access

- [x] Live Meta business-details readback shows the legal name exactly as `TYFYS MANAGEMENT LLC`, matching the private verification document.
- [ ] Meta business verification, if requested by Meta, is separately accepted; saving the legal-name field is not proof of verification approval.
- [x] Karen Hallett's authentic profile created and owns the portfolio; Meta's business history identifies Karen as creator and last updater.
- [ ] Karen completes Meta two-factor enrollment; the portfolio requirement is already set to `Everyone` and Meta reports `1 out of 1` still needs enrollment.
- [x] Richard Ducat's advertising-restricted profile was not added to the portfolio, Page, or ad account.
- [x] Full-control access is currently limited to Karen.
- [ ] Business contact is `meta@eb28.co`; Page contact is `cadetcatch@eb28.co`.
- [x] Facebook Page is `CadetCatch`; Page asset ID is `1252075751318222` and it is the portfolio's primary Page.
- [ ] Instagram professional account is linked to the correct Page and portfolio.
- [x] Ad account is `CadetCatch | US | USD | ET` (`1014191354819822`), currency USD, time zone America/New_York.
- [ ] Domain `cadetcatch.com` is verified to the correct portfolio.
- [x] The earlier gold American Express terms were recorded, but the user reports that card could not be attached; the authorization is suspended and retained only as audit history.
- [ ] A replacement card is freshly and exactly authorized, then entered only into TYFYS MANAGEMENT LLC's CadetCatch ad account `1014191354819822`.
- [ ] Ads Manager readback confirms account `1014191354819822`; do not use the observed wrong-account handoff `10152349167335880`.

Evidence / IDs:

```text
META_BUSINESS_ID=2513115945804036
META_AD_ACCOUNT_ID=1014191354819822
META_PAGE_ID=1252075751318222
META_INSTAGRAM_USER_ID=
DOMAIN_VERIFICATION_EVIDENCE=
PAYMENT_METHOD_LAST4_OR_REFERENCE=
```
## 3. EB28 email and DNS

- [ ] Existing Namecheap forwarding addresses were inventoried before changing MX records.
- [ ] `richard@eb28.co` mailbox exists and its password is stored in macOS Keychain, not a repository.
- [ ] `meta@eb28.co`, `facebook@eb28.co`, `cadetcatch@eb28.co`, `social@eb28.co`, and `dmarc@eb28.co` deliver to the intended mailbox.
- [ ] Authoritative MX records match the active cPanel route.
- [ ] `mail.eb28.co` and `webmail.eb28.co` resolve to the intended cPanel mail endpoint.
- [ ] cPanel Email Routing is `Local Mail Exchanger` for `eb28.co`.
- [ ] SPF passes for a real outbound message from `richard@eb28.co`.
- [ ] DKIM passes for that message.
- [ ] DMARC record is published with monitoring policy and reports to `dmarc@eb28.co`.
- [ ] A real FormSubmit test still reaches `social@eb28.co` without creating a fake production lead.

Evidence:

```text
MX_LOOKUP=
SPF_LOOKUP=
DKIM_LOOKUP=
DMARC_LOOKUP=
INBOUND_TEST_MESSAGE_IDS=
OUTBOUND_TEST_MESSAGE_ID_AND_AUTH_RESULTS=
SOCIAL_FORM_DELIVERY_EVIDENCE=
```

## 4. Storefront and purchase flow

- [x] App Store listing resolves to app ID `6769565852`.
- [ ] Corrected version is `Ready for Sale`; upload alone is not accepted as completion.
- [ ] Listing states free download, one free preview search, Family Monthly at $12.99/month, and accurate $1.99 one-time options.
- [ ] Listing states that CadetCatch shows possible matches the user reviews.
- [ ] Listing does not claim desktop or invitation functionality that is not verified in production.
- [x] Privacy URL is `https://cadetcatch.com/privacy/` and returns the intended policy.
- [x] Support URL is `https://cadetcatch.com/support/` and returns the intended support page.
- [x] Guide URL is `https://cadetcatch.com/swab-summer-photos/` and returns the intended guide.
- [ ] One free preview search works in the production App Store build.
- [ ] `co.eb28.cadetcatch.family.monthly.v1` purchases at $12.99/month in the production flow.
- [ ] The approved $1.99 one-time products display and purchase accurately.
- [ ] Restore Purchases succeeds.
- [ ] Subscription renewal, cancellation, and Apple billing disclosures are accurate.

Evidence:

```text
APP_STORE_VERSION=
READY_FOR_SALE_AT=
PRODUCT_IDS_AND_PRICES=
PURCHASE_AND_RESTORE_EVIDENCE=
URL_CHECK_EVIDENCE=2026-07-15 live HTTP 200 for App Store listing, privacy, support, and guide; cadetcatch.com production commit f0208b7
```

## 5. Measurement

- [x] Dedicated CadetCatch GA4 property `545114858` and web stream `15236983054` exist.
- [x] Live `/analytics-config.json` returns HTTP 200 `application/json` with `G-CTFMM8B2L2` and Apple provider token `118693782`.
- [x] `guide_view` fires once on the intended guide view in a fresh production browser session.
- [x] `pricing_view` fires at the intended 25% pricing-section visibility threshold in a fresh production browser session.
- [x] `app_store_click` fires with campaign, creative, link placement, and tokenized App Store URL parameters in fresh production browser sessions.
- [x] App Store Connect generated provider token `118693782`; it replaces the placeholder in every operational link without changing the four approved campaign tokens.
- [x] Cold, warm, groups, and partner App Store links each resolve HTTP 200 and retain their distinct `ct` values after Apple's redirect.
- [x] Apple campaign-token reporting limitations are recorded; lack of data below Apple's five-install threshold is not reported as zero downloads.

Evidence:

```text
GA4_PROPERTY_ID=545114858
GA4_STREAM_ID=15236983054
GA4_DEBUGVIEW_EVIDENCE=PENDING backend DebugView confirmation. Production browser dataLayer proof passed 2026-07-15: homepage pricing_view and app_store_click used cc_meta_cold_2026/V1_ScrollSearch; guide_view and app_store_click used cc_meta_groups_2026/G1_FreeGuide. No browser warnings or errors.
APPLE_PROVIDER_TOKEN_REFERENCE=118693782 — App Store Connect CadetCatch Analytics Campaigns, 2026-07-15
APPLE_LINK_RESOLUTION_EVIDENCE=all four approved links HTTP 200 with ct retained, 2026-07-15
```

## 6. Creative and claims

- [ ] Every required paid asset in `creative-specs.csv` has a final file and asset ID.
- [ ] Demo media uses only consenting adults or synthetic/demo subjects.
- [ ] No real cadets, official Academy/Coast Guard/DVIDS photographs, marks, or seals appear.
- [ ] No asset says “facial recognition,” “face recognition,” “AI recon,” “biometric,” or guarantees a match.
- [ ] No fake testimonial, rating, review, user count, or endorsement appears.
- [ ] Reference-photo/server-side behavior is described transparently where relevant.
- [ ] Family Monthly is shown as exactly `$12.99/month`; “one preview search free” is not presented as a free subscription trial.
- [ ] Non-affiliation disclosure is visible wherever USCGA is prominent.
- [ ] Every captioned video is readable with sound off.
- [ ] Feed, Stories, Reels, and any optional Groups Feed preview are checked for crop, safe zones, legibility, destination, CTA, and disclosure.

Asset receipt:

```text
V1_ScrollSearch_ASSET_ID=
S1_Outcome_ASSET_ID=
C1_HowItWorks_ASSET_IDS=
T1_Transparency_ASSET_ID=
W1_FreePreviewPrice_ASSET_ID=
G1_FreeGuide_FILE=
G2_GuideVideo_FILE=
PLACEMENT_PREVIEW_FOLDER_OR_URL=
```

## 7. Audience and campaign controls

- [ ] Cold audience strict controls are US, English, all genders, age 40+, mobile, and iOS.
- [ ] Every interest suggestion was looked up live and only eligible suggestions were selected.
- [ ] If suggestions were unavailable or undersized, the cold audience was left broad; no Army, Navy, veteran, or military-history substitute was added.
- [ ] Warm audiences are a union of 365-day Page/Instagram engagers, 30-day 50% video viewers, and 30-day ad engagers.
- [ ] Warm ad set remains paused until its audience is ready and campaign reach is approximately 1,000 or greater.
- [ ] Named Facebook group membership is not represented as targetable.
- [ ] Publisher platforms are Facebook and Instagram only.
- [ ] Desktop right column, Messenger, Threads, Audience Network, in-stream video, and desktop are excluded.
- [ ] Optional Groups Feed inventory is enabled only if available and compatible; it is not described as named-group targeting.
- [ ] Performance goal is link clicks, bid strategy is lowest cost/highest volume without a bid cap, and CBO is off.

## 8. Budget reconciliation

Current state: no replacement-card transaction is authorized. The failed gold-card terms are retained only as a planning reference: `1428`-cent Meta daily setting, `2499`-cent modeled hard-day maximum, and `9996`-cent lifetime/max-total cap including taxes and fees, with cold at `1428` cents and warm/partner at zero. Fresh approval must restate the exact replacement card, payee, currency, recurrence, daily setting, hard-day maximum, lifetime cap, taxes/fees, and maximum total before these values can become executable.

Then verify after exact approval:

- [ ] Fresh replacement-card approval names Meta Platforms, the specific replacement card, USD recurrence, Meta daily setting, hard modeled daily maximum, lifetime cap, taxes/fees, and maximum possible total. The earlier gold-card terms are suspended.
- [x] The planning-reference Meta daily setting of `1428` cents models to `2499` cents after Meta's stated 75% possible daily overdelivery and remains under the user's `$25/day` hard ceiling; this calculation is not replacement-card authorization.
- [ ] Meta's billing screen proves zero added taxes and fees. If any nonzero amount appears, stop and obtain fresh exact user authorization for the revised daily setting, ad-delivery total, taxes/fees, and maximum total.
- [ ] The live ad set uses `DAILY` budget mode at `1428` cents with an exact seven-day end time; no `9996`-cent lifetime-budget delivery path is used.
- [ ] A provider-enforced aggregate spend limit is read back at no more than `9996` cents and its treatment of taxes and fees is verified.
- [ ] Every live ad-set daily setting sums exactly to `1428` cents and the exact seven-day schedule models to no more than `9996` cents before any separately authorized taxes or fees.
- [ ] Campaign and account automation cannot spend more than the approved lifetime cap.
- [ ] The optional partner budget is a reallocation from cold, never an addition.
- [ ] No scaling rule automatically raises the approved ceiling.

Evidence:

```text
BUDGET_SCENARIO=
AS1_DAILY_BUDGET_CENTS=1428
AS2_DAILY_BUDGET_CENTS=0
AS3_DAILY_BUDGET_CENTS=0
TOTAL_DAILY_BUDGET_CENTS=1428
START_AT_ET=
END_AT_ET=
```

## 9. Meta API and draft-object receipt

- [ ] Read-only verification succeeds before any create call.
- [ ] Automation app and system user are scoped only to the CadetCatch Page and ad account.
- [ ] Required permissions are verified; secrets remain only in the private mode-600 environment file.
- [ ] Campaign was created `PAUSED` and its objective matches the manifest.
- [ ] Each ad set was created `PAUSED` and its targeting/placement preview was captured.
- [ ] Each ad was created `PAUSED`, copy matches `ads.csv`, and the destination uses the correct Apple campaign token.
- [ ] Meta review warnings, policy flags, unavailable interests, and rejected placements are recorded exactly.

External object receipt:

```text
CAMPAIGN_ID=
AS1_ID=
AS2_ID=
AS3_ID_OR_NOT_CREATED=
AD_V1_ID=
AD_S1_ID=
AD_C1_ID=
AD_T1_ID=
AD_W1_ID=
READ_ONLY_API_EVIDENCE=
PAUSED_STATUS_EVIDENCE=
```

## 10. Facebook groups and partnership ads

- [ ] Every target was verified live before contact.
- [ ] Every message came from an authentic authorized TYFYS/CadetCatch representative, disclosed that person's truthful role, and did not use Richard's restricted profile to operate ad assets.
- [ ] Exact messages, timestamps, responses, and permissions are logged in `group-admin-log.csv`.
- [ ] No group post occurred without explicit administrator permission.
- [ ] No member data was scraped, uploaded, or used for an audience.
- [ ] One-follow-up maximum and final-no rules were respected.
- [ ] Every approved group post uses the aggregate `cc_meta_groups_2026` token policy.
- [ ] Any partnership-ad content is public and eligible; written permission, code, and preview approval are logged.
- [ ] Private group content was never used as a partnership-ad asset.
- [ ] Administrator removal or revocation requests are honored immediately.

## 11. Activation decision and handoff

- [ ] All preceding mandatory items are complete with current evidence.
- [ ] Meta previews show the correct live App Store destination and no unresolved warning.
- [ ] Final budget calculation is at or below the exact separately approved lifetime cap.
- [ ] Activation timestamp, activating operator, and exact objects activated are recorded.
- [ ] Monitoring owner has the stop-loss rules from `campaign-manifest.json` and can pause delivery immediately.

Final decision:

```text
READINESS=BLOCKED
ACTIVATION_AUTHORIZED_BY=
ACTIVATED_BY=
ACTIVATED_AT=
OBJECTS_ACTIVATED=
REMAINING_BLOCKERS=
```
