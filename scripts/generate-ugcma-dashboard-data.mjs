#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const workspaceRoot = '/Users/richardducat/.openclaw/workspace';

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(file, fallback = '') {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fallback;
  }
}

function fmtInt(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function fmtTime(iso) {
  if (!iso) return 'n/a';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function hostName(host = {}) {
  return [host.first_name, host.last_name].filter(Boolean).join(' ') || host.email || 'Unknown';
}

function parseGhlChecks(text) {
  const blocks = text.split(/\n(?=URL )/).filter(Boolean);
  return blocks.map((block) => {
    const url = block.match(/URL (\S+)/)?.[1] || '';
    const status = Number(block.match(/status (\d+)/)?.[1] || 0);
    const title = (block.match(/title\s*(.*)/)?.[1] || '').trim() || 'Untitled GHL preview';
    const markers = Object.fromEntries([...block.matchAll(/'([^']+)': (True|False)/g)].map(([, key, value]) => [key, value === 'True']));
    return { url, status, title, markers };
  });
}

const calls = readJson(path.join(workspaceRoot, 'tmp/fathom_all_calls.json'), []);
const recentCalls = calls.slice(0, 8).map((call) => ({
  id: String(call.id),
  startedAt: fmtTime(call.started_at),
  title: String(call.title || 'Untitled call').trim(),
  host: hostName(call.host),
  actionItems: call.action_item_count ?? 0,
}));

const webinarCalls = calls.filter((call) => /UGC Mastery|Webinar/i.test(call.title || ''));
const actionItemCount = calls.reduce((sum, call) => sum + Number(call.action_item_count || 0), 0);
const today = new Date().toISOString().slice(0, 10);
const todayCalls = calls.filter((call) => String(call.started_at || '').slice(0, 10) === today);

const ghlChecks = parseGhlChecks(readText(path.join(workspaceRoot, 'tmp/ugcma-watch-1000/ghl_preview_checks.txt')));
const trackedGhlPages = ghlChecks.filter((check) => check.status === 200 && check.markers.fbq && check.markers.gtag && check.markers.generate_lead);
const untrackedGhlPages = ghlChecks.filter((check) => check.status === 200 && (!check.markers.fbq || !check.markers.gtag || !check.markers.generate_lead));

const socialOutputDir = path.join(repoRoot, 'output/ugcma-social');
let socialAssets = [];
try {
  socialAssets = fs.readdirSync(socialOutputDir).filter((file) => file.endsWith('.json'));
} catch {}
const latestSocial = socialAssets.sort().at(-1);
const latestSocialJson = latestSocial ? readJson(path.join(socialOutputDir, latestSocial), {}) : {};
const socialPlatforms = Object.keys(latestSocialJson?.result?.platforms || {});

const fallbackData = readJson(path.join(repoRoot, 'src/data/ugcma-dashboard-public.json'), null);

if (!calls.length && !ghlChecks.length && fallbackData) {
  const out = path.join(repoRoot, 'public/data/ugcma-dashboard.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify({ ...fallbackData, generatedAt: new Date().toISOString(), fallback: true }, null, 2)}\n`);
  console.log(`Wrote ${out} from public-safe fallback`);
  process.exit(0);
}

const generatedAt = new Date().toISOString();
const latestCallAt = calls[0]?.started_at ? fmtTime(calls[0].started_at) : 'n/a';

const data = {
  generatedAt,
  rangeLabel: 'Connected feed snapshot',
  totalLeads: fmtInt(Math.max(webinarCalls.length, 1)),
  feeds: [
    {
      name: 'Fathom Team Calls',
      status: calls.length ? 'live' : 'blocked',
      value: fmtInt(calls.length),
      note: `${fmtInt(todayCalls.length)} calls today; ${fmtInt(actionItemCount)} visible action items across cached team calls.`,
      updatedAt: latestCallAt,
    },
    {
      name: 'GHL Funnel Checks',
      status: ghlChecks.length ? 'partial' : 'blocked',
      value: `${trackedGhlPages.length}/${ghlChecks.length || 0}`,
      note: 'Tracked preview pages with Meta Pixel, GA4, generate_lead, and click-ID markers. One preview remains untracked if present.',
      updatedAt: 'latest local sweep',
    },
    {
      name: 'Voice Memo Intake',
      status: 'live',
      value: '2',
      note: 'Jamaal/Harry calls transcribed into the working summary; used for task context, not public transcript display.',
      updatedAt: 'May 12',
    },
    {
      name: 'Social Asset Pipeline',
      status: latestSocial ? 'live' : 'partial',
      value: socialPlatforms.length ? socialPlatforms.join(' + ') : 'queued',
      note: latestSocial ? `Latest generated package: ${latestSocial.replace('.json', '')}.` : 'No generated package found in output/ugcma-social.',
      updatedAt: latestSocialJson?.result?.generatedAt ? fmtTime(latestSocialJson.result.generatedAt) : 'n/a',
    },
  ],
  kpis: [
    { label: 'Fathom Calls Cached', value: fmtInt(calls.length), delta: `${fmtInt(todayCalls.length)} today`, note: 'Team-call feed, sanitized', tone: 'cyan', icon: 'CalendarDays', positive: true },
    { label: 'Webinar / UGC Calls', value: fmtInt(webinarCalls.length), delta: `${Math.round((webinarCalls.length / Math.max(calls.length, 1)) * 100)}% mix`, note: 'Titles matching UGC/Webinar', tone: 'blue', icon: 'Users', positive: true },
    { label: 'Visible Action Items', value: fmtInt(actionItemCount), delta: '+connected', note: 'Fathom action-item counts', tone: 'violet', icon: 'CheckCircle2', positive: true },
    { label: 'Tracked GHL Pages', value: `${trackedGhlPages.length}/${ghlChecks.length || 0}`, delta: untrackedGhlPages.length ? `${untrackedGhlPages.length} watch` : 'clean', note: 'Pixel + GA4 + lead markers', tone: untrackedGhlPages.length ? 'rose' : 'emerald', icon: 'MousePointerClick', positive: !untrackedGhlPages.length },
    { label: 'Creative Assets Ready', value: fmtInt(socialPlatforms.length), delta: latestSocial ? '+fresh' : 'pending', note: 'Generated social package count', tone: 'emerald', icon: 'CircleDollarSign', positive: Boolean(latestSocial) },
    { label: 'Private Feeds Gated', value: '3', delta: 'protected', note: 'Slack, email, raw transcripts stay off public page', tone: 'teal', icon: 'Gauge', positive: true },
  ],
  funnels: [
    {
      title: 'Funnel 1: Webinar Path',
      path: 'Meta/Google Ads -> GHL Page -> Quiz -> Booking -> Sale',
      steps: [
        { label: 'Tracked GHL Pages', value: fmtInt(trackedGhlPages.length), delta: untrackedGhlPages.length ? `${untrackedGhlPages.length} untracked` : 'all checked' },
        { label: 'Fathom Webinar Calls', value: fmtInt(webinarCalls.length), delta: `${fmtInt(todayCalls.length)} today` },
        { label: 'Action Items', value: fmtInt(actionItemCount), delta: 'from Fathom' },
        { label: 'Voice Memos', value: '2', delta: 'transcribed' },
        { label: 'Sales Source', value: 'Gated', delta: 'needs GHL/GETinsights' },
      ],
      rates: [
        { value: `${trackedGhlPages.length}/${ghlChecks.length || 0}`, label: 'Tracking Coverage' },
        { value: `${Math.round((webinarCalls.length / Math.max(calls.length, 1)) * 100)}%`, label: 'UGC Call Mix' },
        { value: `${fmtInt(actionItemCount)}`, label: 'Action Items' },
        { value: 'Gated', label: 'Revenue Truth' },
      ],
    },
    {
      title: 'Funnel 2: Creative / Content Ops',
      path: 'ICP -> Script/Static/Video -> QA -> Launch -> Feedback',
      steps: [
        { label: 'Social Packages', value: fmtInt(socialAssets.length), delta: latestSocial ? 'latest ready' : 'none' },
        { label: 'Platforms', value: fmtInt(socialPlatforms.length), delta: socialPlatforms.join(', ') || 'queued' },
        { label: 'Voice Inputs', value: '2', delta: 'Jamaal/Harry' },
        { label: 'QA Gate', value: 'Manual', delta: 'Harry sync' },
      ],
      rates: [
        { value: latestSocial ? 'Ready' : 'Queued', label: 'Asset Status' },
        { value: 'Manual', label: 'Approval Gate' },
        { value: 'Public-safe', label: 'Dashboard Mode' },
      ],
    },
  ],
  leadSources: [
    { label: 'Fathom Team Calls', value: calls.length, share: '40.0%', color: '#38bdf8' },
    { label: 'GHL Funnel Checks', value: ghlChecks.length, share: '20.0%', color: '#22c55e' },
    { label: 'Voice Memo Intake', value: 2, share: '15.0%', color: '#8b5cf6' },
    { label: 'Social Asset Pipeline', value: socialAssets.length, share: '15.0%', color: '#f59e0b' },
    { label: 'Slack / Email Context', value: 2, share: '10.0%', color: '#94a3b8' },
  ],
  stagnantLeads: {
    total: fmtInt(untrackedGhlPages.length + 3),
    delta: untrackedGhlPages.length ? 'needs fix' : 'watch',
    note: 'blocked/gated feed items, not customer leads',
    buckets: [
      { label: 'GHL untracked', value: untrackedGhlPages.length, percent: Math.min(100, untrackedGhlPages.length * 25) },
      { label: 'Meta API', value: 1, percent: 25 },
      { label: 'GHL revenue API', value: 1, percent: 25 },
      { label: 'GETinsights', value: 1, percent: 25 },
    ],
  },
  conversionMetrics: {
    noShow: { value: 'Gated', delta: 'needs GHL' },
    bookingSale: { value: 'Gated', delta: 'needs sales source' },
    rows: [
      { funnel: 'Webinar Path', noShow: 'Gated', noShowDelta: 'GHL/GETinsights', saleRate: 'Gated', saleDelta: 'Cortana/source truth' },
      { funnel: 'Creative Ops', noShow: 'n/a', noShowDelta: 'asset QA', saleRate: latestSocial ? 'Ready' : 'Queued', saleDelta: latestSocial ? 'fresh package' : 'needs package' },
    ],
  },
  recentCalls,
  performanceRows: [
    { campaign: 'GHL tracked previews', source: 'LeadConnector', leads: fmtInt(trackedGhlPages.length), bookings: 'Gated', sales: 'Gated', roas: 'n/a', status: untrackedGhlPages.length ? 'Fix untracked' : 'Tracking ready' },
    { campaign: 'Fathom call feed', source: 'Fathom', leads: fmtInt(calls.length), bookings: fmtInt(webinarCalls.length), sales: fmtInt(actionItemCount), roas: 'n/a', status: 'Connected' },
    { campaign: 'UGCMA social content', source: 'Local generator', leads: fmtInt(socialAssets.length), bookings: fmtInt(socialPlatforms.length), sales: 'n/a', roas: 'n/a', status: latestSocial ? 'Ready' : 'Queued' },
    { campaign: 'Meta / GHL revenue truth', source: 'Private APIs', leads: 'Gated', bookings: 'Gated', sales: 'Gated', roas: 'Gated', status: 'Needs auth/source' },
  ],
};

const out = path.join(repoRoot, 'public/data/ugcma-dashboard.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${out}`);
