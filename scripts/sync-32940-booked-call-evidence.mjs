#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'output', 'lead-ops');
const trackerPath = path.join(outDir, '32940-booked-call-tracker.csv');
const pipelineJsonPath = path.join(outDir, '32940-prospect-pipeline.json');
const defaultStatePath = path.join(outDir, 'eb28-32940-outreach-state.json');
const auditJsonPath = path.join(outDir, '32940-booked-call-audit.json');
const auditMdPath = path.join(outDir, '32940-booked-call-audit.md');
const nextTouchCsvPath = path.join(outDir, '32940-next-touch-queue.csv');
const nextTouchMdPath = path.join(outDir, '32940-next-touch-queue.md');
const dueWorkbenchPath = path.join(outDir, '32940-due-now-workbench.html');
const stateTemplatePath = path.join(outDir, '32940-outreach-state-template.json');
const callFormSprintCsvPath = path.join(outDir, '32940-call-form-sprint.csv');
const callFormSprintMdPath = path.join(outDir, '32940-call-form-sprint.md');
const today = new Date().toISOString().slice(0, 10);

const allowedStatuses = new Set(['not_started', 'contacted', 'follow_up', 'booked', 'not_interested']);
const bookedEvidenceHints = /(calendar|calendly|google\.com\/calendar|meet\.google|zoom\.us|teams\.microsoft|\b\d{1,2}:\d{2}\b|\b(am|pm)\b|\bmon(day)?\b|\btue(sday)?\b|\bwed(nesday)?\b|\bthu(rsday)?\b|\bfri(day)?\b|\bsat(urday)?\b|\bsun(day)?\b|\bbook(ed|ing)?\b|\bscheduled\b|\bappointment\b|\bcall\b)/i;

function csvEscape(value = '') {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      field = '';
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const [headers, ...bodyRows] = rows;
  return bodyRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function renderCsv(rows, fields) {
  return `${[
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(',')),
  ].join('\n')}\n`;
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function datePlusDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextTouchFor(row) {
  if (row.booked_call_status === 'booked' || row.status === 'not_interested') {
    return '';
  }
  if (!row.last_touch) {
    return today;
  }

  const parsed = new Date(`${row.last_touch}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return today;
  }

  const touchCount = Number.parseInt(row.touch_count || '0', 10);
  const delay = touchCount <= 1 ? 2 : touchCount === 2 ? 3 : 5;
  return datePlusDays(row.last_touch, delay);
}

function validBookedEvidence(evidence = '') {
  const text = String(evidence).trim();
  return text.length >= 12 && bookedEvidenceHints.test(text);
}

async function readTracker() {
  const csv = await fs.readFile(trackerPath, 'utf8');
  return parseCsv(csv);
}

async function readProspectDetails() {
  try {
    const raw = await fs.readFile(pipelineJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.prospects)) {
      return new Map();
    }
    return new Map(parsed.prospects.map((prospect) => [prospect.conceptUrl, prospect]));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return new Map();
    }
    throw error;
  }
}

async function readState(statePath) {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Expected object keyed by priority in ${statePath}`);
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function mergeState(rows, state) {
  const warnings = [];
  const rowByPriority = new Map(rows.map((row) => [String(row.priority), row]));

  for (const [priority, patch] of Object.entries(state)) {
    const row = rowByPriority.get(String(priority));
    if (!row) {
      warnings.push({ priority, warning: 'state priority not found in tracker' });
      continue;
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      warnings.push({ priority, warning: 'state patch is not an object' });
      continue;
    }

    const status = String(patch.status || row.status || 'not_started');
    if (!allowedStatuses.has(status)) {
      warnings.push({ priority, warning: `invalid status ${JSON.stringify(status)}` });
      continue;
    }

    const previousStatus = row.status;
    const evidence = String(patch.evidence || patch.booked_call_evidence || '').trim();
    let forceNextTouchToday = false;

    row.status = status;
    if (status !== 'not_started' && previousStatus === 'not_started') {
      row.last_touch = today;
      row.touch_count = String(Number.parseInt(row.touch_count || '0', 10) + 1);
    }
    if (evidence) {
      row.booked_call_evidence = evidence;
    }

    if (status === 'booked') {
      if (validBookedEvidence(row.booked_call_evidence)) {
        row.booked_call_status = 'booked';
        row.response_status = 'positive_reply';
        row.booked_call_source = patch.source || patch.booked_call_source || 'outreach_state_export';
        row.booked_call_datetime = patch.datetime || patch.booked_call_datetime || row.booked_call_datetime;
      } else {
        row.status = 'follow_up';
        row.booked_call_status = 'not_booked';
        forceNextTouchToday = true;
        warnings.push({ priority, warning: 'booked status ignored because booked-call evidence is missing or weak' });
      }
    } else if (status === 'not_interested') {
      row.response_status = 'not_interested';
      row.booked_call_status = 'not_booked';
    } else if ((status === 'contacted' || status === 'follow_up') && !row.response_status) {
      row.response_status = 'no_response';
    }

    row.next_touch = forceNextTouchToday ? today : nextTouchFor(row);
  }

  return warnings;
}

function makeOutreachMessage(row) {
  const contactLine = row.email ? 'I wanted to send it to the right person for review.' : 'I am looking for the right person to review it.';
  const claimUrl = `${row.concept_url}#claim`;
  return [
    `Hi ${row.business} team,`,
    '',
    `I built a free owner-review website concept for ${row.business}:`,
    row.concept_url,
    '',
    'It is not your official website and it is not public-indexed. It is a draft concept to show what a clearer mobile-first local site could look like.',
    '',
    'The build is free. If you want to use it, EB28 can host and improve it for $98/month, including managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    `${contactLine} If this is useful, reply with the best person to talk to or book a 10-minute review through: ${claimUrl}`,
    '',
    'If this is not useful, reply "no thanks" and I will not follow up.',
    '',
    'Rich',
    'EB28',
    'social@eb28.co',
  ].join('\n');
}

const corporateSignals = [
  'aerie', 'amc', 'american-eagle', 'att', 'bath-body-works', 'belk', 'books-a-million',
  'bonefish', 'burn-boot-camp', 'chicos', 'chilis', 'cold-stone', 'crumbl',
  'ethan-allen', 'european-wax', 'five-guys', 'good-feet', 'j-crew', 'j-mclaughlin',
  'kay-jewelers', 'kirklands',
  'kohls', 'lane-bryant', 'lilly-pulitzer', 'loft', 'longhorn', 'lululemon',
  'massage-envy', 'melting-pot', 'mens-wearhouse', 'moes', 'nordstrom',
  'nothing-bundt', 'office-depot', 'old-navy', 'panera', 'paper-store',
  'pearle-vision', 'playa-bowls', 'sally-beauty', 'sephora', 'skin-laundry',
  'sleep-number', 'sola-salons', 'soma', 'southern-tide', 'spectrum', 'sport-clips',
  'steak-n-shake', 'sunglass-hut', 'sur-la-table', 'talbots', 'tommy-bahama',
  'trader-joes', 'urban-air', 'verizon', 'warby-parker', 'world-market',
];

const highIntentCategoryHints = [
  'bakery', 'bar', 'cafe', 'cigar', 'chiropractic', 'coffee', 'cpa', 'dental', 'dentistry',
  'florist', 'food', 'hvac', 'kava', 'med spa', 'medical', 'nail', 'orthodontics',
  'pizza', 'plumbing', 'restaurant', 'salon', 'spa', 'title', 'veterinary',
];

function slugFromConceptUrl(conceptUrl = '') {
  return String(conceptUrl).split('/').pop()?.replace(/\.html$/, '') ?? '';
}

function sourceHost(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function hasCorporateSignal(row) {
  const slug = row.slug || slugFromConceptUrl(row.concept_url);
  const text = `${slug} ${row.business} ${row.website} ${row.source_urls}`.toLowerCase();
  return corporateSignals.some((signal) => text.includes(signal));
}

function hasHighIntentCategory(row) {
  const text = `${row.category || ''} ${row.business || ''}`.toLowerCase();
  return highIntentCategoryHints.some((hint) => text.includes(hint));
}

function callFormScore(row) {
  let score = 0;
  if (row.phone) score += 35;
  if (row.website) score += 20;
  if (sourceHost(row.website) && !sourceHost(row.website).includes('avenueviera.com')) score += 10;
  if (hasHighIntentCategory(row)) score += 25;
  if (/321|407/.test(row.phone)) score += 10;
  if (hasCorporateSignal(row)) score -= 35;
  if (/Wave 1 replacement prospect/i.test(row.notes)) score += 8;
  if (/Avenue tenant page is the first verified contact route/i.test(row.notes)) score -= 4;
  return score;
}

function callPriorityTier(row) {
  if (hasCorporateSignal(row)) {
    return 'C corporate or franchise route';
  }
  if (callFormScore(row) >= 70) {
    return 'A local owner likely';
  }
  return 'B reachable, verify owner';
}

function recommendedChannel(row) {
  if (row.phone) {
    return 'phone first';
  }
  if (row.website) {
    return 'contact form first';
  }
  return 'research first';
}

function makePhoneScript(row) {
  const claimUrl = `${row.concept_url}#claim`;
  return [
    `Hi, this is Rich with EB28. Is this the right number for ${row.business}?`,
    '',
    `I built a free owner-review website concept for ${row.business}: ${row.concept_url}`,
    '',
    'It is not public-indexed and it is not their official site. I wanted to get it to the owner or manager who handles the website.',
    '',
    'The build itself is free. If they want to use it, EB28 can host and improve it for $98/month with managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    `Who is the best person to send it to, or is there a better time for a quick review call? They can also use the review form here: ${claimUrl}`,
  ].join('\n');
}

function makeVoicemailScript(row) {
  const claimUrl = `${row.concept_url}#claim`;
  return [
    `Hi, this is Rich with EB28. I built a free website concept for ${row.business}.`,
    `The link is ${row.concept_url}.`,
    'It is a private owner-review concept, not your official website.',
    'If you want it tailored and hosted, EB28 Growth Hosting is $98/month.',
    `You can reach me at social@eb28.co or use the review form at ${claimUrl}.`,
  ].join(' ');
}

function makeContactFormMessage(row) {
  const claimUrl = `${row.concept_url}#claim`;
  return [
    `Hi ${row.business} team,`,
    '',
    `I built a free owner-review website concept for ${row.business}:`,
    row.concept_url,
    '',
    'It is not public-indexed and it is not your official website. It is a draft concept to show what a clearer mobile-first local site could look like.',
    '',
    'The build itself is free. If you want to use it, EB28 can host and improve it for $98/month, including managed hosting, technical SEO upkeep, and one weekly local blog or Google Business content prompt.',
    '',
    `Who is the best owner or manager to review it? They can reply here or book a 10-minute review through ${claimUrl}.`,
    '',
    'Rich',
    'EB28',
    'social@eb28.co',
  ].join('\n');
}

function makeContactedPatch(row, source = 'phone') {
  return JSON.stringify({
    [row.priority]: {
      status: 'contacted',
      evidence: `${source} outreach attempted; update with call note, form confirmation, or booked time.`,
      source,
      datetime: '',
    },
  });
}

function enrichRows(rows, prospectDetails) {
  return rows.map((row) => {
    const prospect = prospectDetails.get(row.concept_url) ?? {};
    const enriched = {
      ...row,
      slug: prospect.slug ?? slugFromConceptUrl(row.concept_url),
      category: prospect.category ?? '',
      address: prospect.address ?? '',
      source_type: prospect.sourceType ?? '',
    };
    enriched.call_score = String(callFormScore(enriched));
    enriched.call_priority_tier = callPriorityTier(enriched);
    enriched.recommended_channel = recommendedChannel(enriched);
    return enriched;
  });
}

function getDueRows(rows) {
  return rows.filter((row) => (
    row.booked_call_status !== 'booked'
    && row.status !== 'not_interested'
    && row.next_touch
    && row.next_touch <= today
  ));
}

async function writeTracker(rows) {
  const fields = Object.keys(rows[0]);
  await fs.writeFile(trackerPath, renderCsv(rows, fields), 'utf8');
}

async function writeNextTouch(dueRows) {
  const rows = dueRows.map((row) => ({
    priority: row.priority,
    business: row.business,
    category: row.category,
    stage: row.stage,
    status: row.status,
    next_touch: row.next_touch,
    touch_count: row.touch_count,
    recommended_channel: row.recommended_channel,
    call_priority_tier: row.call_priority_tier,
    call_score: row.call_score,
    email: row.email,
    phone: row.phone,
    website: row.website,
    source_urls: row.source_urls,
    concept_url: row.concept_url,
    notes: row.notes,
    mailto: row.mailto,
    outreach_message: makeOutreachMessage(row),
  }));

  const fields = [
    'priority',
    'business',
    'category',
    'stage',
    'status',
    'next_touch',
    'touch_count',
    'recommended_channel',
    'call_priority_tier',
    'call_score',
    'email',
    'phone',
    'website',
    'source_urls',
    'concept_url',
    'notes',
    'mailto',
    'outreach_message',
  ];
  await fs.writeFile(nextTouchCsvPath, renderCsv(rows, fields), 'utf8');

  const counts = dueRows.reduce((acc, row) => {
    acc[row.stage] = (acc[row.stage] || 0) + 1;
    return acc;
  }, {});
  const lines = [
    '# 32940 Next-Touch Queue',
    '',
    `Generated: ${today}`,
    `Due now: ${dueRows.length}`,
    `Draft-ready: ${counts.draft_ready || 0}`,
    `Call/contact-form: ${counts.call_or_contact_form || 0}`,
    '',
    '| # | Business | Stage | Status | Phone | Website | Concept | Notes |',
    '|---:|---|---|---|---|---|---|---|',
    ...dueRows.map((row) => (
      `| ${row.priority} | ${row.business} | ${row.stage} | ${row.status} | ${row.phone} | ${row.website} | ${row.concept_url} | ${row.notes || row.call_priority_tier || ''} |`
    )),
    '',
  ];
  await fs.writeFile(nextTouchMdPath, lines.join('\n'), 'utf8');
}

async function writeCallFormSprint(dueRows) {
  const callRows = dueRows
    .filter((row) => row.stage === 'call_or_contact_form')
    .map((row) => ({
      ...row,
      numericScore: Number.parseInt(row.call_score || '0', 10),
    }))
    .sort((a, b) => (
      b.numericScore - a.numericScore
      || a.call_priority_tier.localeCompare(b.call_priority_tier)
      || Number.parseInt(a.priority, 10) - Number.parseInt(b.priority, 10)
    ));

  const csvRows = callRows.map((row, index) => ({
    sprint_rank: index + 1,
    call_block: Math.floor(index / 15) + 1,
    priority: row.priority,
    business: row.business,
    category: row.category,
    tier: row.call_priority_tier,
    score: row.call_score,
    recommended_channel: row.recommended_channel,
    phone: row.phone,
    website: row.website,
    source_urls: row.source_urls,
    concept_url: row.concept_url,
    notes: row.notes,
    phone_script: makePhoneScript(row),
    voicemail_script: makeVoicemailScript(row),
    contact_form_message: makeContactFormMessage(row),
    state_patch_contacted: makeContactedPatch(row, row.phone ? 'phone' : 'contact_form'),
  }));

  const fields = [
    'sprint_rank',
    'call_block',
    'priority',
    'business',
    'category',
    'tier',
    'score',
    'recommended_channel',
    'phone',
    'website',
    'source_urls',
    'concept_url',
    'notes',
    'phone_script',
    'voicemail_script',
    'contact_form_message',
    'state_patch_contacted',
  ];
  await fs.writeFile(callFormSprintCsvPath, renderCsv(csvRows, fields), 'utf8');

  const counts = callRows.reduce((acc, row) => {
    acc[row.call_priority_tier] = (acc[row.call_priority_tier] || 0) + 1;
    return acc;
  }, {});
  const blocks = [];
  for (let index = 0; index < callRows.length; index += 15) {
    const blockRows = callRows.slice(index, index + 15);
    blocks.push(`## Call Block ${Math.floor(index / 15) + 1}`);
    blocks.push('');
    blocks.push('| Rank | Business | Tier | Channel | Phone | Contact path | Concept |');
    blocks.push('|---:|---|---|---|---|---|---|');
    for (let offset = 0; offset < blockRows.length; offset += 1) {
      const row = blockRows[offset];
      blocks.push(`| ${index + offset + 1} | ${row.business} | ${row.call_priority_tier} | ${row.recommended_channel} | ${row.phone || ''} | ${row.website || ''} | ${row.concept_url} |`);
    }
    blocks.push('');
  }

  const lines = [
    '# 32940 Call / Contact Form Sprint',
    '',
    `Generated: ${today}`,
    `Rows: ${callRows.length}`,
    `A local owner likely: ${counts['A local owner likely'] || 0}`,
    `B reachable, verify owner: ${counts['B reachable, verify owner'] || 0}`,
    `C corporate or franchise route: ${counts['C corporate or franchise route'] || 0}`,
    '',
    'Use this as the day-0 execution list while Gmail is unavailable. Count a lead only after a real booked call is logged with evidence in the state JSON.',
    '',
    '## Default Phone Script',
    '',
    '```text',
    'Hi, this is Rich with EB28. I built a free owner-review website concept for your business. It is not public-indexed and it is not your official website. I wanted to get it to the owner or manager who handles the website. The build is free; hosting and ongoing improvements are $98/month. Who is the best person to review it?',
    '```',
    '',
    ...blocks,
  ];
  await fs.writeFile(callFormSprintMdPath, `${lines.join('\n')}\n`, 'utf8');
}

async function writeStateTemplate(rows) {
  const template = Object.fromEntries(rows.map((row) => [
    row.priority,
    {
      status: 'not_started',
      evidence: '',
      source: '',
      datetime: '',
    },
  ]));
  await fs.writeFile(stateTemplatePath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
}

async function writeWorkbench(dueRows) {
  const counts = dueRows.reduce((acc, row) => {
    acc[row.stage] = (acc[row.stage] || 0) + 1;
    return acc;
  }, {});
  const cards = dueRows.map((row) => {
    const emailAction = row.mailto ? `<a class="btn primary" href="${escapeHtml(row.mailto)}">Email</a>` : '';
    const callAction = row.phone ? `<a class="btn" href="tel:${escapeHtml(row.phone)}">Call</a>` : '';
    const websiteAction = row.website ? `<a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.website)}">Contact Path</a>` : '';
    const sourceAction = row.source_urls ? `<a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.source_urls.split(' | ')[0])}">Source</a>` : '';
    return `
      <article class="card" data-priority="${escapeHtml(row.priority)}" data-stage="${escapeHtml(row.stage)}">
        <div class="topline"><span>#${escapeHtml(row.priority)}</span><span>${escapeHtml(row.stage)}</span></div>
        <h2>${escapeHtml(row.business)}</h2>
        <p class="meta">Status: ${escapeHtml(row.status)} · Touch count: ${escapeHtml(row.touch_count)} · Due: ${escapeHtml(row.next_touch)}</p>
        <div class="actions">
          <a class="btn" target="_blank" rel="noopener" href="${escapeHtml(row.concept_url)}">Concept</a>
          ${emailAction}
          ${callAction}
          ${websiteAction}
          ${sourceAction}
          <button type="button" data-copy="${escapeHtml(row.priority)}">Copy Script</button>
        </div>
        <label>Outreach script
          <textarea readonly data-message="${escapeHtml(row.priority)}">${escapeHtml(makeOutreachMessage(row))}</textarea>
        </label>
        <label>Status
          <select data-field="status">
            <option value="not_started">Not started</option>
            <option value="contacted">Contacted</option>
            <option value="follow_up">Follow up</option>
            <option value="booked">Booked</option>
            <option value="not_interested">Not interested</option>
          </select>
        </label>
        <label>Booked-call evidence or call note
          <textarea data-field="evidence" placeholder="Calendar link, reply with time, call note, form confirmation, or next action"></textarea>
        </label>
        <label>Source
          <input data-field="source" placeholder="phone, email, contact form, calendar">
        </label>
        <label>Booked datetime
          <input data-field="datetime" placeholder="YYYY-MM-DD HH:MM ET">
        </label>
        <p class="meta">Email: ${escapeHtml(row.email || 'not found')} · Phone: ${escapeHtml(row.phone || 'not found')}</p>
        <p class="meta">${escapeHtml(row.notes || 'No notes')}</p>
      </article>`;
  }).join('\n');

  const doc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EB28 32940 Due-Now Workbench</title>
  <style>
    :root { --ink:#182033; --muted:#5e6678; --line:#d8deea; --panel:#fff; --bg:#f6f7fa; --blue:#1957d2; --green:#137a45; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    header { position:sticky; top:0; z-index:2; padding:16px 20px; border-bottom:1px solid var(--line); background:rgba(255,255,255,.96); }
    h1 { margin:0; font-size:21px; letter-spacing:0; }
    .meta { color:var(--muted); font-size:13px; line-height:1.45; }
    .toolbar { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; align-items:center; }
    main { display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:14px; padding:16px; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .topline { display:flex; justify-content:space-between; color:var(--muted); font-size:12px; text-transform:uppercase; font-weight:750; }
    h2 { margin:0; font-size:18px; letter-spacing:0; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; }
    .btn, button { min-height:34px; padding:7px 10px; border:1px solid var(--line); border-radius:7px; background:#fff; color:var(--ink); text-decoration:none; font-weight:700; font:inherit; cursor:pointer; }
    .btn.primary, button.primary { background:var(--blue); border-color:var(--blue); color:#fff; }
    button.active { background:var(--green); border-color:var(--green); color:#fff; }
    label { display:flex; flex-direction:column; gap:5px; font-size:12px; color:var(--muted); font-weight:700; }
    input, textarea, select { width:100%; border:1px solid var(--line); border-radius:7px; padding:8px; color:var(--ink); background:#fbfcff; font:inherit; }
    textarea { min-height:88px; resize:vertical; font-size:12px; line-height:1.45; }
    textarea[readonly] { min-height:170px; color:#26324a; background:#fff; }
    .rule { max-width:900px; }
    .hidden { display:none; }
  </style>
</head>
<body>
  <header>
    <h1>EB28 32940 Due-Now Workbench</h1>
    <div class="meta rule">${dueRows.length} rows are due now: ${counts.draft_ready || 0} direct-email rows and ${counts.call_or_contact_form || 0} call/contact-form rows. Count a lead only after evidence includes a real booked call, calendar link, scheduled call time, or equivalent proof.</div>
    <div class="toolbar">
      <button class="primary" id="export">Export outreach state JSON</button>
      <button id="clear">Clear local workbench state</button>
      <button class="active" data-filter="all">All</button>
      <button data-filter="draft_ready">Email</button>
      <button data-filter="call_or_contact_form">Call/Form</button>
    </div>
  </header>
  <main>
    ${cards}
  </main>
  <script>
    const key = "eb28-32940-due-now-state-v2";
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const persist = () => localStorage.setItem(key, JSON.stringify(saved));
    for (const card of document.querySelectorAll(".card")) {
      const id = card.dataset.priority;
      const current = saved[id] || {};
      for (const input of card.querySelectorAll("[data-field]")) {
        const field = input.dataset.field;
        if (current[field]) input.value = current[field];
        input.addEventListener("input", () => {
          saved[id] = saved[id] || {};
          saved[id][field] = input.value;
          persist();
        });
      }
    }
    document.getElementById("export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(saved, null, 2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "eb28-32940-outreach-state.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    document.getElementById("clear").addEventListener("click", () => {
      localStorage.removeItem(key);
      window.location.reload();
    });
    for (const button of document.querySelectorAll("[data-filter]")) {
      button.addEventListener("click", () => {
        for (const other of document.querySelectorAll("[data-filter]")) other.classList.remove("active");
        button.classList.add("active");
        const filter = button.dataset.filter;
        for (const card of document.querySelectorAll(".card")) {
          card.classList.toggle("hidden", filter !== "all" && card.dataset.stage !== filter);
        }
      });
    }
    for (const button of document.querySelectorAll("[data-copy]")) {
      button.addEventListener("click", async () => {
        const id = button.dataset.copy;
        const message = document.querySelector('[data-message="' + id + '"]').value;
        await navigator.clipboard.writeText(message);
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy Script"; }, 1200);
      });
    }
  </script>
</body>
</html>
`;
  await fs.writeFile(dueWorkbenchPath, doc, 'utf8');
}

async function writeAudit(rows, warnings, statePath, stateLoaded, dueRows) {
  const booked = rows.filter((row) => row.booked_call_status === 'booked');
  const weakBookedClaims = rows.filter((row) => row.status === 'booked' && row.booked_call_status !== 'booked');
  const rejectedBookedClaims = warnings.filter((warning) => warning.warning.includes('booked status ignored')).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    statePath,
    stateLoaded,
    trackerRows: rows.length,
    confirmedBookedCalls: booked.length,
    weakBookedClaims: weakBookedClaims.length,
    rejectedBookedClaims,
    dueNow: dueRows.length,
    warnings: warnings.length,
  };

  await fs.writeFile(auditJsonPath, `${JSON.stringify({ summary, warnings, booked, weakBookedClaims }, null, 2)}\n`, 'utf8');

  const lines = [
    '# 32940 Booked-Call Audit',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Tracker rows: ${summary.trackerRows}`,
    `- Confirmed booked-call leads: ${summary.confirmedBookedCalls}`,
    `- Weak booked claims rejected: ${summary.rejectedBookedClaims}`,
    `- Follow-up rows due now: ${summary.dueNow}`,
    `- State file loaded: ${stateLoaded ? 'yes' : 'no'}`,
    '',
    '## Counting Rule',
    '',
    'A prospect counts only when `booked_call_status=booked` and there is concrete evidence such as a calendar link, scheduled call note, reply with a call time, or equivalent proof in `booked_call_evidence`.',
    '',
  ];

  if (warnings.length) {
    lines.push('## Warnings', '', '| Priority | Warning |', '|---:|---|');
    for (const warning of warnings) {
      lines.push(`| ${warning.priority} | ${warning.warning} |`);
    }
    lines.push('');
  }

  if (booked.length) {
    lines.push('## Confirmed Booked Calls', '', '| # | Business | Evidence |', '|---:|---|---|');
    for (const row of booked) {
      lines.push(`| ${row.priority} | ${row.business} | ${row.booked_call_evidence} |`);
    }
    lines.push('');
  } else {
    lines.push('## Confirmed Booked Calls', '', 'None yet.', '');
  }

  await fs.writeFile(auditMdPath, lines.join('\n'), 'utf8');
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const stateIndex = args.indexOf('--state-json');
  const statePath = stateIndex >= 0 && args[stateIndex + 1] ? path.resolve(args[stateIndex + 1]) : defaultStatePath;

  const rows = await readTracker();
  const prospectDetails = await readProspectDetails();
  const state = await readState(statePath);
  const stateLoaded = Object.keys(state).length > 0;
  const warnings = stateLoaded ? mergeState(rows, state) : [];
  const enrichedRows = enrichRows(rows, prospectDetails);
  const dueRows = getDueRows(enrichedRows);

  await writeNextTouch(dueRows);
  await writeCallFormSprint(dueRows);
  await writeWorkbench(dueRows);
  await writeStateTemplate(rows);
  const summary = await writeAudit(rows, warnings, statePath, stateLoaded, dueRows);

  if (write && stateLoaded) {
    await writeTracker(rows);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
