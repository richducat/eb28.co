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
const adsCsv = await readCsv('ads.csv');
const creativeCsv = await readCsv('creative-specs.csv');
const groupCsv = await readCsv('group-admin-log.csv');

assert.equal(manifest.package_state, 'DRAFT');
assert.equal(manifest.safety.external_mutations_permitted_by_package, false);
assert.equal(manifest.safety.default_meta_delivery_status, 'PAUSED');
assert.equal(manifest.safety.maximum_lifetime_spend_cents, 60000);
assert.equal(manifest.campaign.name, 'CC_US_iOS_Traffic_SwabSummer_2026-07');
assert.equal(manifest.campaign.status, 'PAUSED');
assert.equal(manifest.campaign.destination_link_type, 'APPLE_APP_STORE_CAMPAIGN_LINK');
assert.equal(manifest.campaign.destination_type, undefined, 'destination_type belongs on each ad set, not the campaign');
assert.equal(manifest.campaign.maximum_lifetime_spend_cents, 60000);

for (const [scenarioName, scenario] of Object.entries(manifest.budget_scenarios)) {
  const computed = Object.values(scenario.ad_set_lifetime_budget_cents).reduce((sum, value) => sum + value, 0);
  assert.equal(computed, 60000, `${scenarioName} scenario must sum to 60000 cents`);
  assert.equal(scenario.total_lifetime_budget_cents, 60000, `${scenarioName} declared total must be 60000 cents`);
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
for (const ad of manifest.ads) {
  assert.equal(ad.status, 'PAUSED', `${ad.name} must be PAUSED`);
  assert.ok(manifestAdSetNames.has(ad.ad_set_name), `${ad.name} references unknown ad set ${ad.ad_set_name}`);
  assert.ok(creativeKeys.has(ad.creative_key), `${ad.name} references unknown creative ${ad.creative_key}`);
  assert.ok(!adNames.has(ad.name), `Duplicate ad name ${ad.name}`);
  adNames.add(ad.name);
}

assert.equal(adsCsv.length, manifest.ads.length, 'ads.csv and manifest ad counts differ');
for (const row of adsCsv) {
  assert.equal(row.status, 'PAUSED', `${row.ad_name} in ads.csv must be PAUSED`);
  assert.ok(adNames.has(row.ad_name), `${row.ad_name} in ads.csv is missing from manifest`);
  assert.ok(creativeKeys.has(row.creative_key), `${row.ad_name} references unknown creative ${row.creative_key}`);
  assert.ok(row.destination_url_template.includes('{{APPLE_PROVIDER_TOKEN}}'), `${row.ad_name} must retain the provider-token placeholder`);
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

const bannedTerms = ['facial recognition', 'face recognition', 'ai recon', 'biometric', 'guaranteed matches'];
const publicCopy = manifest.creatives
  .flatMap((creative) => [creative.primary_text, creative.headline, creative.description, creative.on_asset_copy, creative.script])
  .filter(Boolean)
  .join('\n')
  .toLowerCase();
for (const term of bannedTerms) assert.equal(publicCopy.includes(term), false, `Public creative copy contains banned term: ${term}`);

console.log(`PASS: ${manifest.package_id}`);
console.log(`Validated ${manifest.ads.length} paused ads, ${manifest.creatives.length} draft creatives, ${groupCsv.length} unsent outreach targets, and both $600 budget scenarios.`);
