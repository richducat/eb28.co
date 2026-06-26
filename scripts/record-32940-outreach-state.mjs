#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(repoRoot, 'output', 'lead-ops');
const trackerPath = path.join(outDir, '32940-booked-call-tracker.csv');
const defaultStatePath = path.join(outDir, 'eb28-32940-outreach-state.json');
const allowedStatuses = new Set(['not_started', 'contacted', 'follow_up', 'booked', 'not_interested']);
const bookedEvidenceHints = /(calendar|calendly|google\.com\/calendar|meet\.google|zoom\.us|teams\.microsoft|\b\d{1,2}:\d{2}\b|\b(am|pm)\b|\bmon(day)?\b|\btue(sday)?\b|\bwed(nesday)?\b|\bthu(rsday)?\b|\bfri(day)?\b|\bsat(urday)?\b|\bsun(day)?\b|\bbook(ed|ing)?\b|\bscheduled\b|\bappointment\b|\bcall\b)/i;
const placeholderEvidenceHints = /(yyyy-mm-dd|hh:mm|replace|placeholder|example|\btbd\b|<[^>]+>|\[[^\]]+\])/i;

function usage() {
  return `Usage:
  npm run leadops:record:32940 -- --priority 1 --status contacted --source email --evidence "Sent first email manually"
  npm run leadops:record:32940 -- --priority 1 --status booked --source email --datetime "2026-06-26 14:00 ET" --evidence "Reply booked a call Friday at 2:00 PM ET"

Options:
  --priority <number>       Required tracker priority number.
  --status <status>         Required: not_started, contacted, follow_up, booked, not_interested.
  --evidence <text>         Required for all non-not_started statuses. Booked evidence must include a scheduling signal.
  --source <text>           Source of the update, e.g. email, phone, contact_form, calendar.
  --datetime <text>         Booked call time or event time.
  --state-json <path>       Defaults to output/lead-ops/eb28-32940-outreach-state.json.
  --dry-run                 Validate and print the patch without writing.
`;
}

function parseArgs(argv) {
  const args = {
    source: 'manual',
    datetime: '',
    statePath: defaultStatePath,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--priority') {
      args.priority = argv[++index];
    } else if (arg === '--status') {
      args.status = argv[++index];
    } else if (arg === '--evidence') {
      args.evidence = argv[++index];
    } else if (arg === '--source') {
      args.source = argv[++index];
    } else if (arg === '--datetime') {
      args.datetime = argv[++index];
    } else if (arg === '--state-json') {
      args.statePath = path.resolve(argv[++index]);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function shellQuote(value = '') {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
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
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
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

  if (!rows.length) return [];
  const [headers, ...bodyRows] = rows;
  return bodyRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

async function readTrackerRows() {
  const csv = await fs.readFile(trackerPath, 'utf8');
  return parseCsv(csv);
}

async function readState(statePath) {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Expected ${statePath} to contain an object keyed by priority`);
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function validBookedEvidence(evidence = '', datetime = '') {
  const text = String(evidence).trim();
  const combined = `${text} ${String(datetime || '').trim()}`.trim();
  return text.length >= 12 && bookedEvidenceHints.test(combined) && !placeholderEvidenceHints.test(combined);
}

function validateArgs(args, trackerRows) {
  if (!args.priority) throw new Error('--priority is required');
  const row = trackerRows.find((candidate) => String(candidate.priority) === String(args.priority));
  if (!row) throw new Error(`No tracker row found for priority ${args.priority}`);

  if (!args.status) throw new Error('--status is required');
  if (!allowedStatuses.has(args.status)) {
    throw new Error(`Invalid status ${JSON.stringify(args.status)}. Use one of: ${[...allowedStatuses].join(', ')}`);
  }

  const evidence = String(args.evidence || '').trim();
  if (args.status !== 'not_started' && evidence.length < 6) {
    throw new Error('--evidence is required for non-not_started statuses');
  }

  if (args.status === 'booked' && !validBookedEvidence(evidence, args.datetime)) {
    throw new Error('Booked status requires concrete scheduling evidence, such as a calendar link, scheduled call time, or reply confirming the call. Replace any template placeholders before recording booked status.');
  }

  return row;
}

function buildPatch(args) {
  return {
    status: args.status,
    evidence: String(args.evidence || '').trim(),
    source: String(args.source || 'manual').trim() || 'manual',
    datetime: String(args.datetime || '').trim(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const trackerRows = await readTrackerRows();
  const row = validateArgs(args, trackerRows);
  const patch = buildPatch(args);
  const state = await readState(args.statePath);
  const previous = state[String(args.priority)] || null;
  const nextState = {
    ...state,
    [String(args.priority)]: patch,
  };

  if (!args.dryRun) {
    await fs.mkdir(path.dirname(args.statePath), { recursive: true });
    await fs.writeFile(args.statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    mode: args.dryRun ? 'dry-run' : 'write',
    statePath: args.statePath,
    priority: String(args.priority),
    business: row.business,
    conceptUrl: row.concept_url,
    previous,
    patch,
    nextCommand: `npm run leadops:audit:32940 -- --state-json ${shellQuote(args.statePath)} --write`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
