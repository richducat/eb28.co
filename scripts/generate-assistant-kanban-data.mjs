#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const workspaceRoot = process.env.ASSISTANT_WORKSPACE || path.join(os.homedir(), '.hermes', 'personal-assistant');
const openLoopsPath = process.env.OPEN_LOOPS_PATH || path.join(workspaceRoot, 'working-context', 'OPEN_LOOPS.md');

const LANES = [
  'Today / Firefighting',
  'Waiting on Richard',
  'Admin / Ops',
  'Life / Personal',
  'Backlog',
  'Done',
];

function redactPublic(text) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
    .replace(/\+\d[\d\s().-]{7,}\d/g, '[phone]')
    .replace(/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone]')
    .replace(/`([^`]{25,})`/g, '`local artifact`')
    .replace(/\$[\d,.]+/g, '$[amount]')
    .replace(/\b[A-Za-z0-9_]{18,}\b/g, '[id]')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyLane({ done, section, raw }) {
  const sl = String(section || '').toLowerCase();
  const rl = String(raw || '').toLowerCase();
  const early = rl.slice(0, 240);

  if (done) return 'Done';
  if (['urgent', 'today', 'security', 'offboarding', 'blocker', 'immediate'].some((word) => sl.includes(word) || early.includes(word))) {
    return 'Today / Firefighting';
  }
  if (['needs approval', 'do not reply', 'richard verify', 'decide whether', 'needs richard'].some((word) => early.includes(word))) {
    return 'Waiting on Richard';
  }
  if (sl.includes('business') || sl.includes('admin')) return 'Admin / Ops';
  if (['personal', 'kids', 'school', 'pickup', 'paypal', 'security'].some((word) => early.includes(word))) return 'Life / Personal';
  return 'Backlog';
}

function classifyArea(raw) {
  const rl = String(raw || '').toLowerCase();
  if (['ugcma', 'jamaal', 'nate', 'sydney', 'paid traffic'].some((word) => rl.includes(word))) return 'UGCMA';
  if (['tyfys', 'zoho', 'jenny', 'christina', 'karen', 'salesiq'].some((word) => rl.includes(word))) return 'TYFYS';
  if (['personal', 'kids', 'school', 'pickup'].some((word) => rl.includes(word))) return 'Personal';
  if (['gmail', 'calendar', 'drive', 'paypal', 'security'].some((word) => rl.includes(word))) return 'Admin';
  return 'Ops';
}

function extractNext(raw, rest) {
  const match = String(raw || '').match(/(Smallest next action(?: is)?|Remaining next actions?|Needs?)(.*?)(?:\.|;|$)/i);
  const candidate = match ? match[0] : rest;
  return redactPublic(candidate).slice(0, 220);
}

function classifyOwner(raw, lane) {
  const rl = String(raw || '').toLowerCase();
  if (lane === 'Waiting on Richard') return 'Richard decision';
  if (['do not send', 'do not reply', 'without richard approval', 'needs approval', 'richard verify', 'decide whether'].some((word) => rl.includes(word))) {
    return 'Richard decision';
  }
  return 'Hermes owns';
}

function classifyStatus(raw, lane, done, owner) {
  const rl = String(raw || '').toLowerCase();
  if (done) return 'Done';
  if (owner === 'Richard decision') return 'Waiting on you';
  if (lane === 'Waiting on Richard') return 'Waiting on you';
  if (['blocked', 'missing', 'needs approval', 'do not reply', 'without richard approval', 'verify whether', 'confirm whether'].some((word) => rl.includes(word))) return 'Blocked';
  if (['urgent', 'today', 'immediate', 'fire'].some((word) => rl.includes(word))) return 'In motion';
  return 'Queued';
}

function classifyEta(raw, lane, done) {
  const rl = String(raw || '').toLowerCase();
  if (done) return 'Closed';
  if (lane === 'Waiting on Richard') return 'After your approval';
  if (['urgent', 'today', 'immediate', 'security', 'offboarding'].some((word) => rl.includes(word))) return 'Today';
  if (lane === 'Admin / Ops') return 'Next sweep';
  if (lane === 'Life / Personal') return 'Before due time';
  return 'Queued by priority';
}

function extractBlocker(raw, lane, status) {
  const text = String(raw || '');
  const lower = text.toLowerCase();
  if (status !== 'Blocked' && lane !== 'Waiting on Richard') return '';
  if (lane === 'Waiting on Richard' || lower.includes('approval')) return 'Needs Richard approval/decision before I send, spend, or change live accounts.';
  const match = text.match(/(?:blocked|blocker|blocked by|because|until|needs|need|missing)(.*?)(?:\.|;|$)/i);
  return redactPublic(match ? match[0] : 'Blocked until the missing access, source, or decision is resolved.').slice(0, 180);
}

function extractUnblock(raw, lane, status, owner) {
  const lower = String(raw || '').toLowerCase();
  if (owner === 'Richard decision') return 'Richard gives the approval/decision; I execute immediately after.';
  if (lane === 'Waiting on Richard') return 'Richard approves the decision; then I execute the next step.';
  if (status !== 'Blocked') return 'I keep moving this without waiting on you.';
  if (lower.includes('oauth') || lower.includes('permission') || lower.includes('access')) return 'Grant/restore the named access once; I will retry and verify.';
  if (lower.includes('approval') || lower.includes('do not reply') || lower.includes('do not send')) return 'Approve the send/change; I will handle the execution.';
  return 'I will either fix it directly or come back with the exact one-step permission/access/decision needed.';
}

function parseOpenLoops(markdown) {
  const items = [];
  let section = 'Top Priority';

  for (const line of String(markdown || '').split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }

    const bullet = line.match(/^- \[( |x|X)\]\s+(.+)/);
    if (!bullet) continue;

    const done = bullet[1].toLowerCase() === 'x';
    const raw = bullet[2].trim();
    const splitIndex = raw.slice(0, 130).indexOf(':');
    const title = redactPublic(splitIndex >= 0 ? raw.slice(0, splitIndex) : raw.slice(0, 95)).replace(/[.。]+$/, '').slice(0, 95);
    const rest = splitIndex >= 0 ? raw.slice(splitIndex + 1) : raw.slice(95);
    const lane = classifyLane({ done, section, raw });
    const owner = classifyOwner(raw, lane);
    const status = classifyStatus(raw, lane, done, owner);

    items.push({
      id: `loop-${String(items.length + 1).padStart(3, '0')}`,
      title,
      area: classifyArea(raw),
      lane,
      sourceSection: section,
      done,
      owner,
      status,
      eta: classifyEta(raw, lane, done),
      blocker: extractBlocker(raw, lane, status),
      unblock: extractUnblock(raw, lane, status, owner),
      next: extractNext(raw, rest),
    });
  }

  const openItems = items.filter((item) => !item.done);
  const doneItems = items.filter((item) => item.done).slice(0, 6);
  return [...openItems, ...doneItems];
}

async function writeSnapshot(payload) {
  for (const relativeDir of ['public/data', 'docs/data']) {
    const targetDir = path.join(repoRoot, relativeDir);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'assistant-kanban.json'), `${JSON.stringify(payload, null, 2)}\n`);
  }
}

async function main() {
  let markdown = '';
  let sourceStatus = 'workspace';

  try {
    markdown = await fs.readFile(openLoopsPath, 'utf8');
  } catch (error) {
    sourceStatus = `fallback: ${error.message}`;
    try {
      markdown = await fs.readFile(path.join(repoRoot, 'public', 'data', 'assistant-kanban.json'), 'utf8');
      const existing = JSON.parse(markdown);
      await writeSnapshot({ ...existing, generatedAt: new Date().toISOString(), sourceStatus });
      console.log(`Assistant kanban snapshot reused existing data (${sourceStatus})`);
      return;
    } catch {
      markdown = '';
    }
  }

  const items = parseOpenLoops(markdown);
  const counts = items.reduce((acc, item) => {
    acc[item.lane] = (acc[item.lane] || 0) + 1;
    return acc;
  }, {});

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'working-context/OPEN_LOOPS.md',
    sourceStatus,
    privacy: 'Public-safe snapshot: detailed client names, emails, phones, exact artifacts, and money IDs are intentionally omitted or redacted.',
    lanes: LANES,
    counts,
    items,
  };

  await writeSnapshot(payload);
  console.log(`Assistant kanban snapshot generated: ${items.length} cards`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
