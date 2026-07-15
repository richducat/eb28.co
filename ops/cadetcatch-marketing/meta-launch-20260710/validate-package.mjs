import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  assert.equal(quoted, false, 'CSV contains an unterminated quoted field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== '')) rows.push(row);
  }
  return rows;
}

async function readCsv(name) {
  const rows = parseCsv(await readFile(path.join(root, name), 'utf8'));
  assert.ok(rows.length >= 2, `${name} must contain a header and at least one data row`);
  const width = rows[0].length;
  rows.forEach((row, index) => {
    assert.equal(row.length, width, `${name} row ${index + 1} has ${row.length} columns; expected ${width}`);
  });
  const header = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));
}

const manifest = JSON.parse(await readFile(path.join(root, 'campaign-manifest.json'), 'utf8'));
const taskCapsule = JSON.parse(await readFile(path.join(root, 'task-capsule.json'), 'utf8'));
const adsCsv = await readCsv('ads.csv');
const creativeCsv = await readCsv('creative-specs.csv');
const groupCsv = await readCsv('group-admin-log.csv');
const canonicalAppleProviderToken = manifest.apple_campaign_links.provider_token;

assert.equal(manifest.package_state, 'DRAFT');
assert.equal(manifest.safety.external_mutations_permitted_by_package, false);
assert.equal(manifest.safety.default_meta_delivery_status, 'PAUSED');
assert.equal(manifest.safety.requested_hard_daily_spend_cap_cents, 2500);
assert.equal(manifest.safety.planning_reference_meta_daily_budget_setting_cents, 1428);
assert.equal(manifest.safety.planning_reference_pilot_duration_days, 7);
assert.equal(manifest.safety.planning_reference_lifetime_cap_cents, 9996);
assert.ok(
  manifest.safety.planning_reference_meta_daily_budget_setting_cents * 175 <=
    manifest.safety.requested_hard_daily_spend_cap_cents * 100,
  'Planning-reference Meta daily setting must remain inside the hard any-day cap after Meta 75% overdelivery'
);
assert.equal(
  manifest.safety.planning_reference_meta_daily_budget_setting_cents *
    manifest.safety.planning_reference_pilot_duration_days,
  manifest.safety.planning_reference_lifetime_cap_cents,
  'Planning-reference daily setting and duration must reconcile to the planning-reference lifetime cap'
);
assert.equal(manifest.owner.operating_owner, 'Karen Hallett');
assert.equal(manifest.business_assets.business_id, '2513115945804036');
assert.equal(manifest.business_assets.ad_account_id, '1014191354819822');
assert.equal(manifest.business_assets.page_id, '1252075751318222');
assert.equal(manifest.business_assets.instagram_user_id, null);
assert.equal(manifest.campaign.name, 'CC_US_iOS_Traffic_SwabSummer_2026-07');
assert.equal(manifest.campaign.status, 'PAUSED');
assert.equal(manifest.campaign.destination_link_type, 'APPLE_APP_STORE_CAMPAIGN_LINK');
assert.equal(manifest.campaign.destination_type, undefined, 'destination_type belongs on each ad set, not the campaign');

const financialAuthorizationPending =
  manifest.safety.financial_authorization_state === 'PENDING_EXACT_CURRENT_CONVERSATION_APPROVAL';
const financialAuthorizationSuspended =
  manifest.safety.financial_authorization_state === 'AUTHORIZED_TERMS_SUSPENDED_PAYMENT_METHOD_UNUSABLE';
const paymentMethodPending =
  manifest.safety.payment_method_state !== 'VERIFIED_ATTACHED_TO_CORRECT_CADETCATCH_AD_ACCOUNT';
const providerChargeCompositionPending =
  manifest.safety.provider_tax_and_fee_state === 'PENDING_PROVIDER_READBACK';
const providerSpendLimitPending =
  manifest.safety.provider_spend_limit_state === 'PENDING_PROVIDER_READBACK';
const schedulePlaceholderPending =
  [manifest.campaign.start_time, manifest.campaign.end_time].some((value) => String(value).includes('{{'));
const appleProviderTokenPending =
  canonicalAppleProviderToken === '{{APPLE_PROVIDER_TOKEN}}';
const providerTwoFactorPending =
  manifest.business_assets.portfolio_two_factor_enrollment_state !== 'VERIFIED_COMPLETE';
const correctAdsManagerAccountPending =
  manifest.business_assets.ads_manager_verified_ad_account_id !== manifest.business_assets.ad_account_id;

assert.ok(
  ['PENDING_PROVIDER_READBACK', 'VERIFIED_ZERO'].includes(manifest.safety.provider_tax_and_fee_state),
  'Provider tax-and-fee state must use an explicitly validated state'
);
assert.ok(
  ['PENDING_PROVIDER_READBACK', 'VERIFIED_AT_OR_BELOW_AUTHORIZED_CAP'].includes(manifest.safety.provider_spend_limit_state),
  'Provider spend-limit state must use an explicitly validated state'
);
assert.ok(
  [
    'SELECTED_GOLD_AMEX_ATTACHMENT_FAILED_PENDING_REPLACEMENT_AND_FRESH_EXACT_AUTHORIZATION',
    'VERIFIED_ATTACHED_TO_CORRECT_CADETCATCH_AD_ACCOUNT'
  ].includes(manifest.safety.payment_method_state),
  'Payment-method state must use an explicitly validated state'
);

if (financialAuthorizationPending) {
  assert.equal(taskCapsule.financial_authorization.state, 'unauthorized');
  assert.equal(taskCapsule.financial_authorization.authorization_kind, 'none');
  assert.equal(taskCapsule.financial_authorization.conversation_evidence, null);
  for (const field of ['action', 'platform_or_payee', 'payment_method_label', 'meta_daily_budget_setting_cents', 'currency', 'recurrence', 'maximum_total_cents', 'hard_daily_maximum_cents', 'lifetime_cap_cents']) {
    assert.equal(
      taskCapsule.financial_authorization[field],
      null,
      `Task capsule financial_authorization.${field} must remain unset before exact approval`
    );
  }
  assert.equal(manifest.safety.meta_daily_budget_setting_cents, null);
  assert.equal(manifest.safety.maximum_lifetime_spend_cents, null);
  assert.equal(manifest.safety.maximum_possible_total_charge_cents, null);
  assert.equal(manifest.campaign.maximum_lifetime_spend_cents, null);
  assert.equal(manifest.campaign.duration_days, null);
  for (const [scenarioName, scenario] of Object.entries(manifest.budget_scenarios)) {
    assert.ok(
      Object.values(scenario.ad_set_daily_budget_cents).every((value) => value === null),
      `${scenarioName} must not contain ad-set budgets before exact financial approval`
    );
    assert.equal(scenario.total_daily_budget_setting_cents, null, `${scenarioName} daily total must remain unset before approval`);
    assert.equal(scenario.maximum_scheduled_ad_delivery_cents, null, `${scenarioName} scheduled maximum must remain unset before approval`);
  }
} else {
  assert.ok(
    ['AUTHORIZED_EXACT_CURRENT_CONVERSATION', 'AUTHORIZED_TERMS_SUSPENDED_PAYMENT_METHOD_UNUSABLE'].includes(
      manifest.safety.financial_authorization_state
    ),
    'Recorded financial terms must use an explicitly validated authorized state'
  );
  const authorizedCap = manifest.safety.maximum_lifetime_spend_cents;
  const authorizedDailySetting = manifest.safety.meta_daily_budget_setting_cents;
  const authorizedDuration = manifest.campaign.duration_days;
  const capsuleAuthorization = taskCapsule.financial_authorization;
  assert.ok(Number.isInteger(authorizedCap) && authorizedCap > 0, 'Authorized lifetime cap must be a positive integer');
  assert.ok(Number.isInteger(authorizedDailySetting) && authorizedDailySetting > 0, 'Authorized Meta daily setting must be a positive integer');
  assert.ok(Number.isInteger(authorizedDuration) && authorizedDuration > 0, 'Authorized duration must be a positive integer');
  assert.ok(
    authorizedDailySetting * 175 <= manifest.safety.requested_hard_daily_spend_cap_cents * 100,
    'Authorized Meta daily setting could exceed the hard any-day cap after Meta 75% overdelivery'
  );
  assert.equal(
    authorizedCap,
    authorizedDailySetting * authorizedDuration,
    'Authorized lifetime cap must equal daily setting multiplied by the fixed duration'
  );
  assert.equal(manifest.safety.maximum_possible_total_charge_cents, authorizedCap);
  assert.equal(manifest.campaign.maximum_lifetime_spend_cents, authorizedCap);
  assert.equal(capsuleAuthorization.state, 'authorized');
  assert.equal(capsuleAuthorization.authorization_kind, 'exact_current_conversation');
  assert.ok(capsuleAuthorization.conversation_evidence, 'Task capsule must record current-conversation financial approval evidence');
  assert.ok(capsuleAuthorization.action, 'Task capsule must name the authorized financial action');
  assert.equal(capsuleAuthorization.platform_or_payee, 'Meta Platforms');
  assert.equal(capsuleAuthorization.payment_method_label, 'gold American Express');
  assert.equal(capsuleAuthorization.meta_daily_budget_setting_cents, authorizedDailySetting, 'Task capsule daily setting must equal the Meta daily setting in cents');
  assert.ok(taskCapsule.forbidden_surfaces.includes('Opening, saving, or attaching the unselected Delta American Express'));
  if (financialAuthorizationSuspended) {
    assert.equal(capsuleAuthorization.execution_state, 'suspended_selected_payment_method_unusable');
    assert.equal(taskCapsule.replacement_payment_method_authorization.state, 'unauthorized');
    assert.equal(taskCapsule.replacement_payment_method_authorization.payment_method_label, null);
    assert.ok(
      taskCapsule.forbidden_surfaces.some((surface) => surface.includes('replacement card before fresh exact current-conversation authorization')),
      'Task capsule must forbid replacement-card use before fresh exact authorization'
    );
  }
  assert.equal(capsuleAuthorization.currency, 'USD');
  assert.equal(capsuleAuthorization.recurrence, 'one-time');
  assert.equal(capsuleAuthorization.maximum_total_cents, authorizedCap, 'Task capsule maximum total must equal the manifest lifetime cap');
  assert.equal(capsuleAuthorization.lifetime_cap_cents, authorizedCap, 'Task capsule lifetime cap must equal the manifest lifetime cap');
  assert.ok(Number.isInteger(capsuleAuthorization.hard_daily_maximum_cents) && capsuleAuthorization.hard_daily_maximum_cents > 0);
  assert.ok(
    capsuleAuthorization.hard_daily_maximum_cents <= manifest.safety.requested_hard_daily_spend_cap_cents,
    'Task capsule daily cap cannot exceed the requested hard daily cap'
  );
  assert.ok(
    authorizedDailySetting * 175 <= capsuleAuthorization.hard_daily_maximum_cents * 100,
    'Task capsule daily cap must cover Meta 75% overdelivery for the authorized setting'
  );
  for (const [scenarioName, scenario] of Object.entries(manifest.budget_scenarios)) {
    assert.equal('ad_set_lifetime_budget_cents' in scenario, false, `${scenarioName} must not use a lifetime-budget delivery path`);
    const values = Object.values(scenario.ad_set_daily_budget_cents);
    assert.ok(values.every((value) => Number.isInteger(value) && value >= 0), `${scenarioName} must contain non-negative integer daily budgets`);
    const computedDaily = values.reduce((sum, value) => sum + value, 0);
    assert.equal(computedDaily, authorizedDailySetting, `${scenarioName} daily budgets must sum to the authorized Meta daily setting`);
    assert.equal(scenario.total_daily_budget_setting_cents, authorizedDailySetting, `${scenarioName} declared daily total must match the authorized daily setting`);
    assert.equal(scenario.duration_days, authorizedDuration, `${scenarioName} must use the authorized fixed duration`);
    assert.equal(
      scenario.maximum_scheduled_ad_delivery_cents,
      authorizedDailySetting * authorizedDuration,
      `${scenarioName} scheduled ad-delivery maximum must equal daily setting times duration`
    );
    assert.equal(scenario.maximum_total_card_charge_cents, authorizedCap, `${scenarioName} card-charge maximum must match the authorized maximum total`);
  }
}

assert.equal(manifest.campaign.budget_mode, 'DAILY_AT_AD_SET');
if (providerChargeCompositionPending) {
  assert.equal(manifest.safety.provider_confirmed_tax_and_fee_cents, null);
  assert.equal(manifest.safety.provider_tax_and_fee_evidence, null);
  assert.match(manifest.safety.activation_financial_gate, /^BLOCKED_/);
  for (const [scenarioName, scenario] of Object.entries(manifest.budget_scenarios)) {
    assert.match(scenario.activation_state, /^BLOCKED_/, `${scenarioName} must remain blocked while tax and fee composition is unknown`);
  }
} else {
  assert.equal(manifest.safety.provider_tax_and_fee_state, 'VERIFIED_ZERO');
  assert.equal(manifest.safety.provider_confirmed_tax_and_fee_cents, 0);
  assert.ok(manifest.safety.provider_tax_and_fee_evidence, 'Verified zero tax and fee state requires provider evidence');
}
if (providerSpendLimitPending) {
  assert.equal(manifest.safety.provider_enforced_account_spend_limit_cents, null);
  assert.equal(manifest.safety.provider_spend_limit_evidence, null);
} else {
  assert.equal(manifest.safety.provider_spend_limit_state, 'VERIFIED_AT_OR_BELOW_AUTHORIZED_CAP');
  assert.ok(
    Number.isInteger(manifest.safety.provider_enforced_account_spend_limit_cents) &&
      manifest.safety.provider_enforced_account_spend_limit_cents > 0 &&
      manifest.safety.provider_enforced_account_spend_limit_cents <= manifest.safety.maximum_possible_total_charge_cents,
    'Verified provider spend limit must be a positive integer no greater than the authorized maximum total'
  );
  assert.ok(manifest.safety.provider_spend_limit_evidence, 'Verified provider spend limit requires provider evidence');
}

const forbiddenBudgetPathKeys = [];
function collectForbiddenBudgetPathKeys(value, currentPath = 'manifest') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (key.includes('lifetime_budget')) forbiddenBudgetPathKeys.push(childPath);
    collectForbiddenBudgetPathKeys(child, childPath);
  }
}
collectForbiddenBudgetPathKeys(manifest);
assert.deepEqual(forbiddenBudgetPathKeys, [], 'No lifetime-budget delivery field is permitted anywhere in the manifest');
assert.equal(manifest.optional_partner_ad_set.daily_budget_cents, 0);

if (!schedulePlaceholderPending) {
  const startMs = Date.parse(manifest.campaign.start_time);
  const endMs = Date.parse(manifest.campaign.end_time);
  assert.ok(Number.isFinite(startMs) && Number.isFinite(endMs), 'Campaign start and end must be valid ISO-8601 timestamps');
  assert.equal(endMs - startMs, 7 * 24 * 60 * 60 * 1000, 'Campaign schedule must be exactly seven 24-hour days');
}

const requiredAdSetNames = new Set(['AS1_Cold_US_iOS_40plus', 'AS2_Warm_MetaEngagers']);
const manifestAdSetNames = new Set(manifest.ad_sets.map((adSet) => adSet.name));
for (const name of requiredAdSetNames) assert.ok(manifestAdSetNames.has(name), `Missing ad set ${name}`);
for (const adSet of manifest.ad_sets) {
  assert.equal(adSet.status, 'PAUSED', `${adSet.name} must be PAUSED`);
  assert.equal(adSet.destination_type, 'WEBSITE', `${adSet.name} must use Meta's WEBSITE destination type for its App Store URL`);
}
assert.equal(manifest.optional_partner_ad_set.destination_type, 'WEBSITE');

const creativeKeys = new Set(manifest.creatives.map((creative) => creative.key));
assert.equal(creativeKeys.size, manifest.creatives.length, 'Creative keys must be unique');
for (const creative of manifest.creatives) assert.equal(creative.status, 'DRAFT', `${creative.key} must be DRAFT`);

const adNames = new Set();
const manifestAdsByName = new Map();
for (const ad of manifest.ads) {
  assert.equal(ad.status, 'PAUSED', `${ad.name} must be PAUSED`);
  assert.ok(manifestAdSetNames.has(ad.ad_set_name), `${ad.name} references unknown ad set ${ad.ad_set_name}`);
  assert.ok(creativeKeys.has(ad.creative_key), `${ad.name} references unknown creative ${ad.creative_key}`);
  assert.ok(!adNames.has(ad.name), `Duplicate ad name ${ad.name}`);
  adNames.add(ad.name);
  manifestAdsByName.set(ad.name, ad);
}

assert.equal(adsCsv.length, manifest.ads.length, 'ads.csv and manifest ad counts differ');
for (const row of adsCsv) {
  assert.equal(row.status, 'PAUSED', `${row.ad_name} in ads.csv must be PAUSED`);
  assert.ok(adNames.has(row.ad_name), `${row.ad_name} in ads.csv is missing from manifest`);
  assert.ok(creativeKeys.has(row.creative_key), `${row.ad_name} references unknown creative ${row.creative_key}`);
  assert.equal(row.ad_set_name, manifestAdsByName.get(row.ad_name).ad_set_name, `${row.ad_name} ad-set mismatch`);
  assert.equal(row.creative_key, manifestAdsByName.get(row.ad_name).creative_key, `${row.ad_name} creative mismatch`);
  assert.equal(row.test_window, manifestAdsByName.get(row.ad_name).test_window, `${row.ad_name} test-window mismatch`);
  const destinationUrl = new URL(row.destination_url_template);
  assert.equal(destinationUrl.hostname, 'apps.apple.com', `${row.ad_name} must use apps.apple.com`);
  assert.equal(destinationUrl.pathname, '/app/apple-store/id6769565852', `${row.ad_name} must use the App Store Connect generated CadetCatch path`);
  assert.equal(destinationUrl.searchParams.get('ct'), row.apple_campaign_token, `${row.ad_name} campaign token mismatch`);
  assert.equal(destinationUrl.searchParams.get('mt'), '8', `${row.ad_name} must retain mt=8`);
  const providerToken = destinationUrl.searchParams.get('pt');
  assert.ok(
    providerToken === '{{APPLE_PROVIDER_TOKEN}}' || /^\d+$/.test(providerToken ?? ''),
    `${row.ad_name} provider token must be the explicit placeholder or a numeric App Store Connect token`
  );
  assert.equal(providerToken, canonicalAppleProviderToken, `${row.ad_name} provider token must equal the canonical manifest token`);
}

assert.equal(creativeCsv.length, manifest.creatives.length, 'creative-specs.csv and manifest creative counts differ');
for (const row of creativeCsv) {
  assert.equal(row.status, 'DRAFT', `${row.creative_key} in creative-specs.csv must be DRAFT`);
  assert.ok(creativeKeys.has(row.creative_key), `${row.creative_key} in creative-specs.csv is missing from manifest`);
}

for (const row of groupCsv) {
  assert.equal(row.action_state, 'DRAFT_NOT_SENT', `${row.target_id} must remain DRAFT_NOT_SENT`);
  assert.equal(row.first_contact_at, '', `${row.target_id} must not claim a contact timestamp`);
  assert.equal(row.permission_state, 'UNKNOWN', `${row.target_id} must not claim permission`);
  assert.equal(row.partnership_ad_code_received, 'false', `${row.target_id} must not claim a partnership code`);
}

const requiredTokens = new Set([
  'cc_meta_cold_2026',
  'cc_meta_warm_2026',
  'cc_meta_groups_2026',
  'cc_meta_partner_2026'
]);
const actualTokens = new Set(manifest.apple_campaign_links.links.map((link) => link.campaign_token));
assert.deepEqual(actualTokens, requiredTokens, 'Apple campaign token set differs from the approved set');
for (const link of manifest.apple_campaign_links.links) {
  const url = new URL(link.url);
  assert.equal(url.hostname, 'apps.apple.com', `${link.key} must use apps.apple.com`);
  assert.equal(url.pathname, '/app/apple-store/id6769565852', `${link.key} must use the App Store Connect generated CadetCatch path`);
  assert.equal(url.searchParams.get('ct'), link.campaign_token, `${link.key} campaign token mismatch`);
  assert.equal(url.searchParams.get('mt'), '8', `${link.key} must retain mt=8`);
  const providerToken = url.searchParams.get('pt');
  assert.ok(
    providerToken === '{{APPLE_PROVIDER_TOKEN}}' || /^\d+$/.test(providerToken ?? ''),
    `${link.key} provider token must be the explicit placeholder or a numeric App Store Connect token`
  );
  assert.equal(providerToken, canonicalAppleProviderToken, `${link.key} provider token must equal the canonical manifest token`);
}

const bannedTerms = ['facial recognition', 'face recognition', 'ai recon', 'biometric', 'guaranteed matches'];
const publicCopy = manifest.creatives
  .flatMap((creative) => [creative.primary_text, creative.headline, creative.description, creative.on_asset_copy, creative.script])
  .filter(Boolean)
  .join('\n')
  .toLowerCase();
for (const term of bannedTerms) assert.equal(publicCopy.includes(term), false, `Public creative copy contains banned term: ${term}`);

const readinessBlockers = [];
if (financialAuthorizationSuspended) {
  readinessBlockers.push('previous gold-card authorization is suspended and no replacement card transaction is freshly authorized');
}
if (providerChargeCompositionPending) readinessBlockers.push('provider taxes and fees are unverified');
if (providerSpendLimitPending) readinessBlockers.push('provider-enforced aggregate spend limit is unverified');
if (schedulePlaceholderPending) readinessBlockers.push('exact seven-day start and end timestamps are unresolved');
if (appleProviderTokenPending) readinessBlockers.push('Apple provider-token campaign links are unresolved');
if (providerTwoFactorPending) readinessBlockers.push('Karen two-factor completion is not verified by Meta');
if (paymentMethodPending) readinessBlockers.push('no usable payment method is freshly authorized and verified on the CadetCatch ad account');
if (correctAdsManagerAccountPending) readinessBlockers.push('Ads Manager is not verified on CadetCatch ad account 1014191354819822');

if (financialAuthorizationPending) {
  console.error(`BLOCKED: ${manifest.package_id}`);
  console.error('Draft structure is valid, but exact Meta daily and lifetime financial authorization is missing.');
  process.exitCode = 2;
} else if (readinessBlockers.length > 0) {
  console.error(`BLOCKED: ${manifest.package_id}`);
  const authorizationStatus = financialAuthorizationSuspended
    ? 'Previous terms are recorded only as audit history and payment authorization is suspended'
    : 'Authorization is recorded';
  console.error(`${authorizationStatus}; activation remains blocked: ${readinessBlockers.join('; ')}.`);
  process.exitCode = 2;
} else {
  console.log(`PASS: ${manifest.package_id}`);
  console.log(`Validated ${manifest.ads.length} paused ads, ${manifest.creatives.length} draft creatives, ${groupCsv.length} unsent outreach targets, and the approved lifetime cap.`);
}
