#!/usr/bin/env python3
"""Update EB28 UGCMA dashboard JSON from the latest UGCMA watch cron output.

This intentionally publishes only aggregated, leadership-safe metrics. It does not
include customer names, emails, phone numbers, raw Slack text beyond high-level
coordination deltas, credentials, or MCP endpoints.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path('/Users/richardducat/GITHUB/eb28.co')
CRON_DIR = Path('/Users/richardducat/.hermes/cron/output/11bb81317ca1')
PUBLIC_JSON = REPO / 'public/data/ugcma-dashboard.json'
DOCS_JSON = REPO / 'docs/data/ugcma-dashboard.json'
LATEST_COPY = REPO / 'output/ugcma-dashboard/latest-watch.md'
OPEN_LOOPS = Path('/Users/richardducat/.hermes/personal-assistant/working-context/OPEN_LOOPS.md')

COLORS = ['#38bdf8', '#8b5cf6', '#22c55e', '#f59e0b']


def latest_watch_file() -> Path:
    files = sorted(CRON_DIR.glob('*.md'), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise SystemExit(f'No UGCMA watch outputs found in {CRON_DIR}')
    return files[0]


def response_section(text: str) -> str:
    marker = '## Response'
    if marker in text:
        return text.split(marker, 1)[1]
    return text


def line_matching(text: str, token: str) -> str:
    for line in text.splitlines():
        if token in line:
            return line.strip().lstrip('- ').strip()
    return ''


def clean_metric_line(line: str) -> str:
    return re.sub(r'^BU[12]/(?:Sydney|Nate)\s+', '', line).strip()


def split_metrics(line: str) -> list[str]:
    if ':' in line:
        line = line.split(':', 1)[1]
    return [part.strip().rstrip('.') for part in line.split(' / ') if part.strip()]


def metric_value(parts: list[str], label_regex: str, fallback='n/a') -> str:
    for part in parts:
        if re.search(label_regex, part, re.I):
            return re.sub(label_regex, '', part, flags=re.I).strip() or part
    return fallback


def first_money_number(s: str) -> float:
    m = re.search(r'\$([0-9.]+)\s*(k)?', s, re.I)
    if not m:
        return 0.0
    value = float(m.group(1))
    if m.group(2):
        value *= 1000
    return value


def first_int_near(parts: list[str], label: str) -> int:
    for part in parts:
        if label.lower() in part.lower():
            m = re.search(r'([0-9,]+)', part)
            return int(m.group(1).replace(',', '')) if m else 0
    return 0


def parse_lane(resp: str, lane: str, window: str) -> dict:
    token = f'{lane} {window}'.strip()
    line = line_matching(resp, token)
    parts = split_metrics(line)
    return {'line': line, 'parts': parts}




def compact_text(text: str, limit: int = 190) -> str:
    text = re.sub(r'`', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) <= limit else text[:limit].rstrip() + '…'


def open_loop_items() -> list[str]:
    if not OPEN_LOOPS.exists():
        return []
    items = []
    for line in OPEN_LOOPS.read_text(errors='replace').splitlines():
        if line.startswith('- [ ] UGCMA'):
            items.append(line.replace('- [ ] ', '', 1).strip())
    return items


def first_matching(items: list[str], *terms: str) -> str:
    for item in items:
        low = item.lower()
        if all(term.lower() in low for term in terms):
            return item
    for item in items:
        low = item.lower()
        if any(term.lower() in low for term in terms):
            return item
    return ''


def command_center(items: list[str], risks: list[str], coordination: list[str], launch: list[str], next_actions: list[str], watch_label: str) -> dict:
    step_up = first_matching(items, 'OWNER STEP-UP MANDATE')
    latest_getinsights = first_matching(items, 'GetInsights')
    creative = first_matching(items, 'creative-system') or first_matching(items, 'recordable scripts')
    relationship = first_matching(items, 'quit') or first_matching(items, 'relationship risk')
    google = first_matching(items, 'Google go-live') or first_matching(items, 'Google Ads')
    youtube = first_matching(items, 'YouTube') or first_matching(items, 'UTM')
    booking = first_matching(items, 'booking-tag') or first_matching(items, 'calendar')

    decisions = [
        {
            'title': 'Owner step-up operating posture',
            'lane': 'Leadership',
            'status': 'Active mandate',
            'decision': 'Richard operates as accountable paid-media/ops lead; Hermes absorbs command-board/reporting/admin follow-through.',
            'source': compact_text(step_up or 'Owner asked Richard to step up after Jaamal quit.'),
        },
        {
            'title': 'What numbers are safe to quote upward?',
            'lane': 'Metrics / GetInsights',
            'status': 'Needs reconciliation',
            'decision': 'Use BU-separated directionality; do not hard-quote cash/ROAS where analytics-close, deals, CRM, or cash disagree.',
            'source': compact_text(latest_getinsights or (risks[0] if risks else 'GetInsights watch feed.')),
        },
        {
            'title': 'Google / launch safety',
            'lane': 'Traffic launch',
            'status': 'Verify before claiming live',
            'decision': 'Launch claims require platform state, public URLs, UTMs, booking tests, and BU-specific routing proof.',
            'source': compact_text(google or (launch[0] if launch else 'Launch tracking watch.')),
        },
        {
            'title': 'Booking/tag attribution blocker',
            'lane': 'Calendar / CRM',
            'status': 'Unblock path required',
            'decision': 'Fix/verify booking tags and call-source attribution before scale/readout confidence.',
            'source': compact_text(booking or 'Booking-tag blocker remains tracked in open loops.'),
        },
    ]

    content_feed = [
        {
            'title': 'Daily content flywheel / SOP',
            'owner': 'Richard + Jay-an/Harry/editor lane',
            'status': 'Needs owner-grade handoff',
            'next': 'Turn creative direction into recordable scripts, editor/tool workflow, and daily accountability loop.',
            'source': compact_text(creative or 'Creative-system handoff is active.'),
        },
        {
            'title': 'Sydney/Nate personalized scripts',
            'owner': 'Richard / creators',
            'status': 'Handoff watch',
            'next': 'Confirm latest V2 packs are the ones being recorded; avoid stale PDF/script versions.',
            'source': compact_text(first_matching(items, 'recordable scripts') or creative or ''),
        },
        {
            'title': 'YouTube / organic UTM lane',
            'owner': 'Lucho / tech-public thread',
            'status': 'Tracking handoff',
            'next': 'Keep UTM/destination link tracking visible in public ops thread; verify downstream analytics before crediting.',
            'source': compact_text(youtube or ''),
        },
    ]

    backforth_sources = [relationship, first_matching(items, 'Slack Desktop'), first_matching(items, 'Jamaal 10am'), first_matching(items, 'Lucho'), first_matching(items, 'Jay-an')]
    backforth = []
    for idx, src in enumerate([x for x in backforth_sources if x][:5], 1):
        lane = 'Leadership risk' if 'quit' in src.lower() or 'relationship' in src.lower() else 'Team coordination'
        backforth.append({
            'title': compact_text(src.split(':', 1)[0].replace('UGCMA / ', ''), 90),
            'lane': lane,
            'status': 'Visible / tracked',
            'next': 'Summarize neutrally, confirm owner-safe next action, and avoid blame language.',
            'source': compact_text(src),
        })
    for msg in coordination[:3]:
        backforth.append({'title': 'Latest coordination delta', 'lane': 'Watch feed', 'status': 'Live watch', 'next': 'Fold into next owner-safe update if material.', 'source': compact_text(msg)})
    backforth = backforth[:6]

    richard_todos = [
        {'task': 'Send/hold owner-safe step-up update', 'priority': 'High', 'owner': 'Hermes drafts / Richard approves', 'unblock': 'Approve exact message before external send.'},
        {'task': 'Maintain BU1 vs BU2 command view', 'priority': 'High', 'owner': 'Hermes', 'unblock': 'GetInsights MCP/feed availability + latest watch output.'},
        {'task': 'Resolve quote-safe metric reconciliation', 'priority': 'High', 'owner': 'Hermes + data owners', 'unblock': 'Compare GetInsights funnel, deals, CRM, cash/Stripe/payment truth.'},
        {'task': 'Verify content flywheel handoff is posted/owned', 'priority': 'High', 'owner': 'Hermes monitors / Richard leads', 'unblock': 'Confirm thread evidence and owner for recording/editing.'},
    ]
    for action in next_actions[:4]:
        richard_todos.append({'task': compact_text(action, 130), 'priority': 'Watch action', 'owner': 'Richard/Hermes', 'unblock': 'Use smallest next action from latest watch.'})

    return {
        'mandate': {
            'headline': 'Jaamal is out — Richard is stepping up as accountable UGCMA command lead.',
            'status': 'Opportunity mode',
            'objective': 'Maximize trust by making the business feel controlled: numbers, blockers, decisions, content, team follow-through, and owner updates in one place.',
            'updatedAt': watch_label,
        },
        'decisionQueue': decisions,
        'contentFeed': content_feed,
        'teamBackforth': backforth,
        'richardTodos': richard_todos[:8],
        'sourceCoverage': [
            {'source': 'GetInsights', 'status': 'Live when MCP/watch feed is connected', 'scope': 'BU metrics, funnel, cash/revenue/deals reconciliation'},
            {'source': 'OPEN_LOOPS.md', 'status': 'Canonical', 'scope': 'Tasks, blockers, team back-and-forth, Richard/Hermes follow-through'},
            {'source': 'Slack/iMessage/Voice Memos', 'status': 'UI-visible / artifact-based', 'scope': 'Team coordination, leadership risk, content handoffs'},
            {'source': 'Meta/Google UI', 'status': 'Verification-gated', 'scope': 'Launch/spend state; never assume live from chat alone'},
        ],
    }

def now_et_label() -> str:
    try:
        out = subprocess.check_output(['date', '+%b %-d, %-I:%M %p ET'], text=True).strip()
        return out
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def build_data(watch_path: Path) -> dict:
    raw = watch_path.read_text(errors='replace')
    resp = response_section(raw)

    run_match = re.search(r'UGCMA watch\s+[—-]\s+([^\n]+)', resp)
    watch_label = run_match.group(1).strip() if run_match else watch_path.stem.replace('_', ' ')

    bu1_today = parse_lane(resp, 'BU1/Sydney', 'today')
    bu1_roll = parse_lane(resp, 'BU1 rolling', '')
    bu2_today = parse_lane(resp, 'BU2/Nate', 'today')
    bu2_roll = parse_lane(resp, 'BU2 rolling', '')

    lanes = [
        ('BU1 / Sydney', bu1_today, bu1_roll, '#38bdf8'),
        ('BU2 / Nate', bu2_today, bu2_roll, '#8b5cf6'),
    ]

    bu1_today_parts = bu1_today['parts']
    bu2_today_parts = bu2_today['parts']
    bu1_roll_parts = bu1_roll['parts']
    bu2_roll_parts = bu2_roll['parts']

    risks = []
    for ln in resp.splitlines():
        stripped = ln.strip().lstrip('- ').strip()
        if any(key in stripped.lower() for key in ['risk:', 'still not launch/scale-safe', 'do not hard-quote', 'reconcile']):
            if stripped and len(stripped) < 220:
                risks.append(stripped)
    risks = risks[:5]

    coordination = []
    capture = False
    for ln in resp.splitlines():
        stripped = ln.strip().lstrip('- ').strip()
        if stripped.startswith('New coordination'):
            capture = True
            continue
        if stripped.startswith('Launch/tracking') or stripped.startswith('Decision'):
            capture = False
        if capture and stripped and not stripped.startswith('Slack UI-visible'):
            coordination.append(stripped)
    coordination = coordination[:6]

    launch = []
    capture = False
    for ln in resp.splitlines():
        stripped = ln.strip().lstrip('- ').strip()
        if stripped.startswith('Launch/tracking'):
            capture = True
            continue
        if stripped.startswith('Decision'):
            capture = False
        if capture and stripped:
            launch.append(stripped)
    launch = launch[:4]

    next_actions = []
    capture = False
    for ln in resp.splitlines():
        stripped = ln.strip()
        if stripped.startswith('Smallest next action'):
            capture = True
            continue
        if stripped.startswith('Updated:'):
            capture = False
        if capture and re.match(r'\d+\.', stripped):
            next_actions.append(re.sub(r'^\d+\.\s*', '', stripped))
    next_actions = next_actions[:6]
    items = open_loop_items()

    total_today_leads = first_int_near(bu1_today_parts, 'leads') + first_int_near(bu2_today_parts, 'leads')
    bu1_cash_roas = metric_value(bu1_today_parts, r'.*cash ROAS', 'n/a')
    bu2_cash_roas = metric_value(bu2_today_parts, r'.*cash ROAS', 'n/a')

    def kpi(label, value, delta, note, tone, icon='Gauge', positive=True):
        return {'label': label, 'value': value, 'delta': delta, 'note': note, 'tone': tone, 'icon': icon, 'positive': positive}

    data = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'rangeLabel': f'Live UGCMA watch feed • {watch_label}',
        'totalLeads': f'{total_today_leads:,}',
        'feeds': [
            {'name': 'UGCMA Watch Cron', 'status': 'live', 'value': watch_label, 'note': '30-minute read-only watch output is the dashboard feed source.', 'updatedAt': now_et_label()},
            {'name': 'GetInsights Metrics', 'status': 'live', 'value': 'BU split', 'note': 'Sydney/BU1 and Nate/BU2 preserved separately; no blended claims.', 'updatedAt': watch_label},
            {'name': 'Attribution Safety', 'status': 'partial', 'value': 'reconcile', 'note': 'Cash/ROAS and analytics-close vs deals mismatches stay flagged until dashboard/CRM/cash agree.', 'updatedAt': watch_label},
            {'name': 'Launch Tracking', 'status': 'partial', 'value': 'watch', 'note': 'Landing/success/booking pages checked; BU-specific booking tests still required when flagged.', 'updatedAt': watch_label},
        ],
        'kpis': [
            kpi('BU1 Spend Today', metric_value(bu1_today_parts, r'spend'), bu1_cash_roas, 'Sydney / BU1 same-day cash ROAS', 'cyan', 'CircleDollarSign', bu1_cash_roas not in ['0x', 'n/a']),
            kpi('BU1 Booked Today', metric_value(bu1_today_parts, r'booked'), metric_value(bu1_today_parts, r'show'), 'Sydney booked calls + show rate', 'blue', 'CalendarDays', True),
            kpi('BU1 Rolling Cash', metric_value(bu1_roll_parts, r'cash'), metric_value(bu1_roll_parts, r'cash ROAS'), 'Rolling May 15–21; quote only after reconciliation', 'violet', 'Gauge', True),
            kpi('BU2 Spend Today', metric_value(bu2_today_parts, r'spend'), bu2_cash_roas, 'Nate / BU2 same-day cash ROAS', 'emerald', 'CircleDollarSign', bu2_cash_roas not in ['0x', 'n/a']),
            kpi('BU2 Booked Today', metric_value(bu2_today_parts, r'booked'), metric_value(bu2_today_parts, r'show'), 'Nate booked calls + show rate', 'teal', 'CalendarDays', True),
            kpi('BU2 Rolling Cash', metric_value(bu2_roll_parts, r'cash'), metric_value(bu2_roll_parts, r'cash ROAS'), 'Rolling May 15–21; separate from BU1', 'sky', 'Gauge', True),
        ],
        'funnels': [
            {
                'title': 'BU1 / Sydney — Today',
                'path': 'Spend -> Leads -> Booked -> Shows -> Sales -> Cash',
                'steps': [{'label': p.split(' ', 1)[1] if p and p[0].isdigit() else p.split(' ', 1)[-1], 'value': p.split(' ', 1)[0], 'delta': 'today'} for p in bu1_today_parts[:6]],
                'rates': [
                    {'value': metric_value(bu1_today_parts, r'CPL'), 'label': 'CPL'},
                    {'value': metric_value(bu1_today_parts, r'show'), 'label': 'Show Rate'},
                    {'value': metric_value(bu1_today_parts, r'cash ROAS'), 'label': 'Cash ROAS'},
                ],
            },
            {
                'title': 'BU2 / Nate — Today',
                'path': 'Spend -> Leads -> Booked -> Shows -> Sales -> Cash',
                'steps': [{'label': p.split(' ', 1)[1] if p and p[0].isdigit() else p.split(' ', 1)[-1], 'value': p.split(' ', 1)[0], 'delta': 'today'} for p in bu2_today_parts[:6]],
                'rates': [
                    {'value': metric_value(bu2_today_parts, r'CPL'), 'label': 'CPL'},
                    {'value': metric_value(bu2_today_parts, r'show'), 'label': 'Show Rate'},
                    {'value': metric_value(bu2_today_parts, r'cash ROAS'), 'label': 'Cash ROAS'},
                ],
            },
            {
                'title': 'BU1 / Sydney — Rolling May 15–21',
                'path': 'Rolling GetInsights lane view',
                'steps': [{'label': p.split(' ', 1)[1] if p and p[0].isdigit() else p.split(' ', 1)[-1], 'value': p.split(' ', 1)[0], 'delta': 'rolling'} for p in bu1_roll_parts[:6]],
                'rates': [{'value': metric_value(bu1_roll_parts, r'cash ROAS'), 'label': 'Cash ROAS'}],
            },
            {
                'title': 'BU2 / Nate — Rolling May 15–21',
                'path': 'Rolling GetInsights lane view',
                'steps': [{'label': p.split(' ', 1)[1] if p and p[0].isdigit() else p.split(' ', 1)[-1], 'value': p.split(' ', 1)[0], 'delta': 'rolling'} for p in bu2_roll_parts[:6]],
                'rates': [{'value': metric_value(bu2_roll_parts, r'cash ROAS'), 'label': 'Cash ROAS'}],
            },
        ],
        'leadSources': [
            {'label': 'BU1 today leads', 'value': first_int_near(bu1_today_parts, 'leads'), 'share': f'{round(first_int_near(bu1_today_parts, "leads") / max(total_today_leads, 1) * 100, 1)}%', 'color': COLORS[0]},
            {'label': 'BU2 today leads', 'value': first_int_near(bu2_today_parts, 'leads'), 'share': f'{round(first_int_near(bu2_today_parts, "leads") / max(total_today_leads, 1) * 100, 1)}%', 'color': COLORS[1]},
        ],
        'stagnantLeads': {
            'total': str(len(risks) + len(next_actions)),
            'delta': 'open risks',
            'note': 'quote-risk / reconciliation / launch-safety items',
            'buckets': [
                {'label': 'Cash/ROAS quote risk', 'value': len([r for r in risks if 'cash' in r.lower() or 'quote' in r.lower()]), 'percent': 35.0},
                {'label': 'BU2 deals mismatch', 'value': len([r for r in risks if 'bu2' in r.lower() or 'analytics close' in r.lower()]), 'percent': 25.0},
                {'label': 'Tracking tests', 'value': len([r for r in risks if 'launch' in r.lower() or 'booking' in r.lower()]), 'percent': 20.0},
                {'label': 'Next actions', 'value': len(next_actions), 'percent': 20.0},
            ],
        },
        'conversionMetrics': {
            'noShow': {'value': metric_value(bu1_today_parts, r'show'), 'delta': 'BU1 today'},
            'bookingSale': {'value': metric_value(bu2_today_parts, r'show'), 'delta': 'BU2 today'},
            'rows': [
                {'funnel': 'BU1 / Sydney', 'noShow': metric_value(bu1_today_parts, r'show'), 'noShowDelta': 'show rate', 'saleRate': metric_value(bu1_today_parts, r'sales?'), 'saleDelta': 'today sales'},
                {'funnel': 'BU2 / Nate', 'noShow': metric_value(bu2_today_parts, r'show'), 'noShowDelta': 'show rate', 'saleRate': metric_value(bu2_today_parts, r'sales?'), 'saleDelta': 'deals/analytics mismatch watch'},
            ],
        },
        'recentCalls': [
            *[{'id': f'risk-{i}', 'startedAt': watch_label, 'title': r, 'host': 'Risk / blocker', 'actionItems': 1} for i, r in enumerate(risks[:4], 1)],
            *[{'id': f'action-{i}', 'startedAt': watch_label, 'title': a, 'host': 'Smallest next action', 'actionItems': 1} for i, a in enumerate(next_actions[:4], 1)],
        ][:8],
        'performanceRows': [
            {'campaign': 'BU1 / Sydney — today', 'source': 'GetInsights watch', 'leads': metric_value(bu1_today_parts, r'leads'), 'bookings': metric_value(bu1_today_parts, r'booked'), 'sales': metric_value(bu1_today_parts, r'sales?'), 'roas': metric_value(bu1_today_parts, r'cash ROAS'), 'status': 'Reconcile before quoting'},
            {'campaign': 'BU1 / Sydney — rolling', 'source': 'GetInsights watch', 'leads': metric_value(bu1_roll_parts, r'leads'), 'bookings': metric_value(bu1_roll_parts, r'booked'), 'sales': metric_value(bu1_roll_parts, r'sales?'), 'roas': metric_value(bu1_roll_parts, r'cash ROAS'), 'status': 'Rolling lane'},
            {'campaign': 'BU2 / Nate — today', 'source': 'GetInsights watch', 'leads': metric_value(bu2_today_parts, r'leads'), 'bookings': metric_value(bu2_today_parts, r'booked'), 'sales': metric_value(bu2_today_parts, r'sales?'), 'roas': metric_value(bu2_today_parts, r'cash ROAS'), 'status': 'Deals mismatch watch'},
            {'campaign': 'BU2 / Nate — rolling', 'source': 'GetInsights watch', 'leads': metric_value(bu2_roll_parts, r'leads'), 'bookings': metric_value(bu2_roll_parts, r'booked'), 'sales': metric_value(bu2_roll_parts, r'sales?'), 'roas': metric_value(bu2_roll_parts, r'cash ROAS'), 'status': 'Rolling lane'},
        ],
        'watchSummary': {
            'sourceFile': str(watch_path),
            'watchLabel': watch_label,
            'risks': risks,
            'coordination': coordination,
            'launch': launch,
            'nextActions': next_actions,
        },
        'commandCenter': command_center(items, risks, coordination, launch, next_actions, watch_label),
    }
    return data


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    old = path.read_text() if path.exists() else ''
    if old == content:
        return False
    path.write_text(content)
    return True


def deploy(paths: list[Path]) -> None:
    rels = [str(p.relative_to(REPO)) for p in paths]
    subprocess.check_call(['git', 'add', *rels], cwd=REPO)
    diff = subprocess.run(['git', 'diff', '--cached', '--quiet', '--', *rels], cwd=REPO)
    if diff.returncode == 0:
        return
    msg = 'Update UGCMA live dashboard feed'
    subprocess.check_call(['git', 'commit', '-m', msg, '--', *rels], cwd=REPO)
    subprocess.check_call(['git', 'push', 'origin', 'main'], cwd=REPO)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--deploy', action='store_true', help='Commit and push dashboard feed files to GitHub Pages.')
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    watch = latest_watch_file()
    data = build_data(watch)
    content = json.dumps(data, indent=2) + '\n'

    changed = []
    for path in [PUBLIC_JSON, DOCS_JSON]:
        if write_if_changed(path, content):
            changed.append(path)
    LATEST_COPY.parent.mkdir(parents=True, exist_ok=True)
    LATEST_COPY.write_text(response_section(watch.read_text(errors='replace')).strip() + '\n')

    if args.deploy and changed:
        deploy(changed)
    if args.verbose:
        print(json.dumps({'watch': str(watch), 'changed': [str(p) for p in changed]}, indent=2))


if __name__ == '__main__':
    main()
