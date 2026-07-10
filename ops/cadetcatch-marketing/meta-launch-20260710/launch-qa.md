# CadetCatch Meta launch QA — mandatory activation gates

**Current state:** `DRAFT` / `PAUSED` / not authorized to spend.

Do not activate any campaign, ad set, ad, group post, or partnership ad until every mandatory checkbox is complete. Add evidence links or IDs beside each item. A failed or unknown result is not a pass.

## 1. Package integrity and safety

- [ ] `node validate-package.mjs` reports `PASS`.
- [ ] Campaign name is exactly `CC_US_iOS_Traffic_SwabSummer_2026-07`.
- [ ] Cold ad set name is exactly `AS1_Cold_US_iOS_40plus`.
- [ ] Warm ad set name is exactly `AS2_Warm_MetaEngagers`.
- [ ] Every created campaign, ad set, and ad was created `PAUSED`.
- [ ] No customer list, group-member list, Meta Pixel audience, SDK audience, or scraped audience was introduced.
- [ ] No password, access token, EIN, payment data, administrator email, or private group data appears in this package or a repository.

## 2. Legal entity, ownership, and account access

- [ ] Meta portfolio legal name exactly matches `TYFYS MANAGEMENT LLC` on the private verification document.
- [ ] Richard Ducat’s authentic profile has owner/full-control access and two-factor authentication enabled.
- [ ] Karen Hallett was invited only through her authentic profile and only after her identity/account was confirmed.
- [ ] Full-control access is limited to Richard and Karen.
- [ ] Business contact is `meta@eb28.co`; Page contact is `cadetcatch@eb28.co`.
- [ ] Facebook Page is `CadetCatch`; Page bio matches `campaign-manifest.json` exactly.
- [ ] Instagram professional account is linked to the correct Page and portfolio.
- [ ] Ad account name is `CadetCatch | US | USD | ET`, currency is USD, and time zone is America/New_York.
- [ ] Domain `cadetcatch.com` is verified to the correct portfolio.
- [ ] Payment method is authorized for TYFYS MANAGEMENT LLC and was entered by an authorized human.

Evidence / IDs:

```text
META_BUSINESS_ID=
META_AD_ACCOUNT_ID=
META_PAGE_ID=
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

- [ ] App Store listing resolves to app ID `6769565852`.
- [ ] Corrected version is `Ready for Sale`; upload alone is not accepted as completion.
- [ ] Listing states free download, one free preview search, Family Monthly at $12.99/month, and accurate $1.99 one-time options.
- [ ] Listing states that CadetCatch shows possible matches the user reviews.
- [ ] Listing does not claim desktop or invitation functionality that is not verified in production.
- [ ] Privacy URL is `https://cadetcatch.com/privacy/` and returns the intended policy.
- [ ] Support URL is `https://cadetcatch.com/support/` and returns the intended support page.
- [ ] Guide URL is `https://cadetcatch.com/swab-summer-photos/` and returns the intended guide.
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
URL_CHECK_EVIDENCE=
```

## 5. Measurement

- [ ] Dedicated CadetCatch GA4 web stream exists.
- [ ] `/analytics-config.json` returns JSON rather than the HTML application shell.
- [ ] `guide_view` fires once on the intended guide view.
- [ ] `pricing_view` fires on the intended pricing view.
- [ ] `app_store_click` fires with campaign and creative parameters.
- [ ] Provider token replaces `{{APPLE_PROVIDER_TOKEN}}` in operational links without changing the four approved campaign tokens.
- [ ] Cold, warm, groups, and partner App Store links each resolve and retain their `ct` values.
- [ ] Apple campaign-token reporting limitations are recorded; lack of data below Apple’s threshold is not reported as zero downloads.

Evidence:

```text
GA4_PROPERTY_ID=
GA4_STREAM_ID=
GA4_DEBUGVIEW_EVIDENCE=
APPLE_PROVIDER_TOKEN_REFERENCE=
APPLE_LINK_RESOLUTION_EVIDENCE=
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

Select exactly one scenario:

- [ ] Base: `AS1 $480 + AS2 $120 = $600`; no AS3 exists.
- [ ] Authorized partner: `AS1 $380 + AS2 $120 + AS3 $100 = $600`; written permission/code and cold-budget reduction are evidenced.

Then verify:

- [ ] Every budget is a lifetime budget across exactly 30 days.
- [ ] Campaign and account automation cannot spend more than 60000 cents during the pilot.
- [ ] The optional partner budget is a reallocation from cold, never an addition.
- [ ] No scaling rule automatically raises the approved $600 ceiling.

Evidence:

```text
BUDGET_SCENARIO=
AS1_LIFETIME_BUDGET_CENTS=
AS2_LIFETIME_BUDGET_CENTS=
AS3_LIFETIME_BUDGET_CENTS=
TOTAL_LIFETIME_BUDGET_CENTS=
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
- [ ] Every message came from Richard’s authentic profile and disclosed founder status.
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
- [ ] Final budget calculation is at or below `$600.00`.
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
