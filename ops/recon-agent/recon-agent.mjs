#!/usr/bin/env node
/**
 * Recon Agent — daily Stripe reconciliation engine (founder beta).
 *
 * Pulls the last 24h (configurable) of Stripe activity over the REST API,
 * reconciles payouts against their balance transactions, flags anomalies,
 * and writes a plain-English briefing (json/md/html) plus a CSV export.
 *
 * Zero dependencies. Node 18+ (built-in fetch).
 *
 * Usage:
 *   node recon-agent.mjs --demo                      # bundled sample data, no key needed
 *   node recon-agent.mjs --key rk_live_...           # one account (restricted READ-ONLY key)
 *   STRIPE_RESTRICTED_KEY=rk_... node recon-agent.mjs
 *   node recon-agent.mjs --customers customers.json  # multi-customer founder-beta run
 *   node recon-agent.mjs --demo --site               # also refresh the site demo report
 *
 * Restricted key scopes needed (all READ ONLY): Balance transactions,
 * Charges, Payouts, Refunds, Disputes. Never use a secret (sk_) key.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STRIPE_API = 'https://api.stripe.com/v1';

// ---------- CLI ----------

function parseArgs(argv) {
    const args = { window: 24 };
    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--demo') args.demo = true;
        else if (arg === '--site') args.site = true;
        else if (arg === '--key') args.key = argv[++i];
        else if (arg === '--customers') args.customers = argv[++i];
        else if (arg === '--window') args.window = Number(argv[++i]) || 24;
        else if (arg === '--out') args.out = argv[++i];
        else if (arg === '--help' || arg === '-h') args.help = true;
    }
    return args;
}

// ---------- Stripe REST (no SDK) ----------

async function stripeList(key, path, params = {}) {
    const items = [];
    let startingAfter = null;

    for (let page = 0; page < 50; page += 1) {
        const query = new URLSearchParams({ limit: '100', ...params });
        if (startingAfter) query.set('starting_after', startingAfter);

        const response = await fetch(`${STRIPE_API}/${path}?${query}`, {
            headers: { Authorization: `Bearer ${key}` },
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Stripe ${path} ${response.status}: ${body.slice(0, 300)}`);
        }

        const payload = await response.json();
        items.push(...payload.data);
        if (!payload.has_more || payload.data.length === 0) break;
        startingAfter = payload.data[payload.data.length - 1].id;
    }

    return items;
}

async function pullAccountData(key, sinceEpoch) {
    const created = { 'created[gte]': String(sinceEpoch) };
    const [balanceTxns, payouts, charges, refunds, disputes] = await Promise.all([
        stripeList(key, 'balance_transactions', created),
        stripeList(key, 'payouts', created),
        stripeList(key, 'charges', created),
        stripeList(key, 'refunds', created),
        stripeList(key, 'disputes', created),
    ]);

    // Balance transactions for paid-out payouts in the window, fetched per payout
    // so payout reconciliation is exact even when txns predate the window.
    const payoutTxns = {};
    for (const payout of payouts) {
        payoutTxns[payout.id] = await stripeList(key, 'balance_transactions', {
            payout: payout.id,
        });
    }

    return { balanceTxns, payouts, charges, refunds, disputes, payoutTxns };
}

// ---------- Reconciliation ----------

const money = (cents, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(
        cents / 100,
    );

function reconcile(data, meta) {
    const { balanceTxns, payouts, charges, refunds, disputes, payoutTxns } = data;
    const currency = balanceTxns[0]?.currency || 'usd';
    const fmt = (cents) => money(cents, currency);

    const succeeded = charges.filter((c) => c.status === 'succeeded');
    const failed = charges.filter((c) => c.status === 'failed');
    const gross = succeeded.reduce((sum, c) => sum + c.amount, 0);
    const fees = balanceTxns
        .filter((t) => ['charge', 'payment'].includes(t.type))
        .reduce((sum, t) => sum + t.fee, 0);
    const refundTotal = refunds.reduce((sum, r) => sum + r.amount, 0);

    // Payout reconciliation: each payout should equal the net sum of the
    // balance transactions Stripe assigned to it (excluding the payout row).
    const payoutResults = payouts.map((payout) => {
        const txns = (payoutTxns[payout.id] || []).filter((t) => t.type !== 'payout');
        const expected = txns.reduce((sum, t) => sum + t.net, 0);
        const delta = expected - payout.amount;
        return {
            id: payout.id,
            arrivalDate: payout.arrival_date,
            status: payout.status,
            amount: payout.amount,
            amountDisplay: fmt(payout.amount),
            expected,
            expectedDisplay: fmt(expected),
            delta,
            deltaDisplay: fmt(Math.abs(delta)),
            matched: delta === 0,
            txnCount: txns.length,
        };
    });

    // Late refunds: refund created in window whose charge already settled in a
    // prior payout — these quietly shrink a FUTURE payout.
    const settledChargeIds = new Set(
        Object.values(payoutTxns)
            .flat()
            .filter((t) => ['charge', 'payment'].includes(t.type))
            .map((t) => t.source),
    );
    const lateRefunds = refunds.filter((r) => settledChargeIds.has(r.charge));

    // Flags, ordered by severity.
    const flags = [];
    for (const payout of payoutResults) {
        if (!payout.matched) {
            flags.push({
                severity: 'review',
                title: `Payout ${payout.id} is ${payout.delta > 0 ? 'short' : 'over'} by ${payout.deltaDisplay}`,
                detail: `Stripe paid ${payout.amountDisplay} but its ${payout.txnCount} transactions net to ${payout.expectedDisplay}. Usually late refunds or fee timing — the transaction list in the CSV shows which.`,
            });
        }
    }
    for (const dispute of disputes) {
        flags.push({
            severity: 'urgent',
            title: `Dispute opened for ${fmt(dispute.amount)}`,
            detail: `Charge ${dispute.charge} is disputed (${dispute.reason || 'no reason given'}). Evidence due ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toDateString() : 'soon'} — respond in the Stripe dashboard.`,
        });
    }
    if (lateRefunds.length > 0) {
        flags.push({
            severity: 'review',
            title: `${lateRefunds.length} refund${lateRefunds.length === 1 ? '' : 's'} hit already-settled money`,
            detail: `${fmt(lateRefunds.reduce((s, r) => s + r.amount, 0))} was refunded on charges that already paid out. Your next payout will be smaller by that amount — this is the #1 cause of "why is my payout short?"`,
        });
    }
    if (failed.length > 0) {
        flags.push({
            severity: 'info',
            title: `${failed.length} payment${failed.length === 1 ? '' : 's'} failed`,
            detail: `${fmt(failed.reduce((s, c) => s + c.amount, 0))} in attempted charges did not go through. Worth a retry email if these are subscriptions.`,
        });
    }

    const matchedPayouts = payoutResults.filter((p) => p.matched).length;

    // Plain-English briefing.
    const paragraphs = [];
    paragraphs.push(
        `Stripe processed ${succeeded.length} payment${succeeded.length === 1 ? '' : 's'} for ${fmt(gross)} gross. Fees were ${fmt(fees)}, and ${refunds.length === 0 ? 'there were no refunds' : `refunds totaled ${fmt(refundTotal)}`}.`,
    );
    if (payouts.length === 0) {
        paragraphs.push('No payouts landed in this window, so there was nothing to reconcile against the bank.');
    } else if (matchedPayouts === payoutResults.length) {
        paragraphs.push(
            `All ${payoutResults.length} payout${payoutResults.length === 1 ? '' : 's'} matched their transactions exactly. Nothing is missing.`,
        );
    } else {
        paragraphs.push(
            `${matchedPayouts} of ${payoutResults.length} payouts matched exactly. The difference on the rest is explained in the flags below — nothing here looks scary, but it deserves a one-minute look.`,
        );
    }
    if (flags.length === 0) {
        paragraphs.push('Clean day. Read this, sip your coffee, get back to work.');
    } else {
        paragraphs.push(
            `${flags.length} item${flags.length === 1 ? ' needs' : 's need'} a quick look — listed in order of urgency. Each one says exactly what to check.`,
        );
    }

    return {
        engine: 'recon-agent',
        version: '0.1.0',
        generatedAt: meta.generatedAt,
        demo: Boolean(meta.demo),
        account: meta.label || 'stripe-account',
        windowHours: meta.windowHours,
        currency,
        totals: {
            payments: succeeded.length,
            paymentsFailed: failed.length,
            gross,
            grossDisplay: fmt(gross),
            fees,
            feesDisplay: fmt(fees),
            refunds: refunds.length,
            refundTotal,
            refundTotalDisplay: fmt(refundTotal),
            net: gross - fees - refundTotal,
            netDisplay: fmt(gross - fees - refundTotal),
        },
        payouts: payoutResults,
        flags,
        plainEnglish: paragraphs,
    };
}

// ---------- Renderers ----------

function renderMarkdown(report) {
    const lines = [
        `# Recon Agent morning briefing — ${report.account}`,
        '',
        `_${new Date(report.generatedAt).toUTCString()} · last ${report.windowHours}h${report.demo ? ' · DEMO DATA' : ''}_`,
        '',
        ...report.plainEnglish.map((p) => `${p}\n`),
        '## Numbers',
        '',
        `| | |`,
        `|---|---|`,
        `| Payments | ${report.totals.payments} (${report.totals.grossDisplay} gross) |`,
        `| Fees | ${report.totals.feesDisplay} |`,
        `| Refunds | ${report.totals.refunds} (${report.totals.refundTotalDisplay}) |`,
        `| Net | ${report.totals.netDisplay} |`,
        '',
        '## Payouts',
        '',
    ];
    if (report.payouts.length === 0) {
        lines.push('_No payouts in this window._');
    } else {
        lines.push('| Payout | Paid | Expected | Status |', '|---|---|---|---|');
        for (const p of report.payouts) {
            lines.push(
                `| ${p.id} | ${p.amountDisplay} | ${p.expectedDisplay} | ${p.matched ? '✅ matched' : `⚠️ off by ${p.deltaDisplay}`} |`,
            );
        }
    }
    lines.push('', '## Needs a look', '');
    if (report.flags.length === 0) {
        lines.push('_Nothing. Clean day._');
    } else {
        for (const flag of report.flags) {
            lines.push(`- **[${flag.severity}] ${flag.title}** — ${flag.detail}`);
        }
    }
    return lines.join('\n');
}

function renderHtml(report) {
    const flagColor = { urgent: '#f43f5e', review: '#f59e0b', info: '#22d3ee' };
    return `<!doctype html><html><head><meta charset="utf-8"><title>Recon Agent briefing</title></head>
<body style="margin:0;background:#020617;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e2e8f0;padding:32px;">
<div style="max-width:640px;margin:0 auto;">
<p style="text-transform:uppercase;letter-spacing:.2em;font-size:11px;color:#22d3ee;">Recon Agent · morning briefing${report.demo ? ' · demo data' : ''}</p>
<h1 style="font-size:24px;color:#fff;">${report.account} — last ${report.windowHours}h</h1>
${report.plainEnglish.map((p) => `<p style="line-height:1.7;color:#cbd5e1;">${p}</p>`).join('')}
<table style="width:100%;border-collapse:collapse;margin:24px 0;">
${[
        ['Payments', `${report.totals.payments} · ${report.totals.grossDisplay} gross`],
        ['Fees', report.totals.feesDisplay],
        ['Refunds', `${report.totals.refunds} · ${report.totals.refundTotalDisplay}`],
        ['Net', report.totals.netDisplay],
    ]
        .map(
            ([k, v]) =>
                `<tr><td style="padding:10px;border:1px solid #1e293b;color:#94a3b8;">${k}</td><td style="padding:10px;border:1px solid #1e293b;color:#fff;font-weight:700;">${v}</td></tr>`,
        )
        .join('')}
</table>
${report.flags
        .map(
            (f) =>
                `<div style="border-left:3px solid ${flagColor[f.severity] || '#64748b'};background:#0f172a;padding:14px 16px;margin:10px 0;border-radius:0 10px 10px 0;"><strong style="color:#fff;">${f.title}</strong><p style="margin:6px 0 0;color:#94a3b8;line-height:1.6;">${f.detail}</p></div>`,
        )
        .join('') || '<p style="color:#34d399;">Nothing needs a look. Clean day.</p>'}
<p style="margin-top:28px;font-size:12px;color:#475569;">Generated by Recon Agent v${report.version} · read-only access · eb28.co/reconcile</p>
</div></body></html>`;
}

function renderCsv(balanceTxns) {
    const rows = [['id', 'type', 'created_utc', 'amount', 'fee', 'net', 'currency', 'description', 'source']];
    for (const t of balanceTxns) {
        rows.push([
            t.id,
            t.type,
            new Date(t.created * 1000).toISOString(),
            (t.amount / 100).toFixed(2),
            (t.fee / 100).toFixed(2),
            (t.net / 100).toFixed(2),
            t.currency,
            (t.description || '').replaceAll('"', "'"),
            t.source || '',
        ]);
    }
    return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

// ---------- Demo fixtures ----------

function demoData() {
    const now = Math.floor(Date.now() / 1000);
    const hour = 3600;
    const charge = (i, amount, status = 'succeeded') => ({
        id: `ch_demo_${String(i).padStart(3, '0')}`,
        amount,
        status,
        created: now - (i % 24) * hour,
        currency: 'usd',
    });

    // 148 succeeded payments averaging ~$62, 3 failed, 2 late refunds that
    // explain a $31.42-short payout — the story the marketing page tells.
    const charges = [];
    let gross = 0;
    for (let i = 1; i <= 148; i += 1) {
        const amount = 1900 + ((i * 7919) % 9800);
        gross += amount;
        charges.push(charge(i, amount));
    }
    charges.push(charge(149, 4900, 'failed'), charge(150, 12900, 'failed'), charge(151, 1900, 'failed'));

    const feeFor = (amount) => Math.round(amount * 0.029) + 30;

    const settledTxns = charges
        .filter((c) => c.status === 'succeeded')
        .slice(0, 120)
        .map((c) => ({
            id: `txn_${c.id}`,
            type: 'charge',
            source: c.id,
            amount: c.amount,
            fee: feeFor(c.amount),
            net: c.amount - feeFor(c.amount),
            currency: 'usd',
            created: c.created - 26 * hour,
            description: 'Subscription payment',
        }));

    const refunds = [
        { id: 're_demo_001', charge: 'ch_demo_007', amount: 1893, created: now - 5 * hour, currency: 'usd' },
        { id: 're_demo_002', charge: 'ch_demo_019', amount: 1249, created: now - 3 * hour, currency: 'usd' },
    ];
    const refundTxns = refunds.map((r) => ({
        id: `txn_${r.id}`,
        type: 'refund',
        source: r.charge,
        amount: -r.amount,
        fee: 0,
        net: -r.amount,
        currency: 'usd',
        created: r.created,
        description: 'Refund',
    }));

    // The payout lands $31.42 short of what its settled transactions net to:
    // Stripe deducted the two late refunds above before paying out, but they
    // are not attached to this payout's transaction list — the exact mismatch
    // the engine exists to catch and explain.
    const payoutNet = settledTxns.reduce((sum, t) => sum + t.net, 0);
    const payout = {
        id: 'po_demo_001',
        amount: payoutNet - 3142,
        arrival_date: now - 2 * hour,
        status: 'paid',
        currency: 'usd',
    };

    const windowTxns = charges
        .filter((c) => c.status === 'succeeded')
        .map((c) => ({
            id: `txn_w_${c.id}`,
            type: 'charge',
            source: c.id,
            amount: c.amount,
            fee: feeFor(c.amount),
            net: c.amount - feeFor(c.amount),
            currency: 'usd',
            created: c.created,
            description: 'Payment',
        }))
        .concat(refundTxns);

    return {
        balanceTxns: windowTxns,
        payouts: [payout],
        charges,
        refunds,
        disputes: [],
        payoutTxns: { po_demo_001: settledTxns },
    };
}

// ---------- Main ----------

async function runAccount({ key, label, windowHours, demo, outDir }) {
    const generatedAt = new Date().toISOString();
    const sinceEpoch = Math.floor(Date.now() / 1000) - windowHours * 3600;
    const data = demo ? demoData() : await pullAccountData(key, sinceEpoch);
    const report = reconcile(data, { generatedAt, demo, label, windowHours });

    mkdirSync(outDir, { recursive: true });
    const stamp = generatedAt.slice(0, 10);
    const base = join(outDir, `${label}-${stamp}`);
    writeFileSync(`${base}.json`, JSON.stringify(report, null, 2));
    writeFileSync(`${base}.md`, renderMarkdown(report));
    writeFileSync(`${base}.html`, renderHtml(report));
    writeFileSync(`${base}.csv`, renderCsv(data.balanceTxns));

    console.log(`[recon-agent] ${label}: ${report.totals.payments} payments, ${report.payouts.length} payouts, ${report.flags.length} flags -> ${base}.{json,md,html,csv}`);
    return report;
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0] + '*/');
        return;
    }

    const outDir = resolve(args.out || join(HERE, 'output'));

    if (args.demo) {
        const report = await runAccount({ label: 'demo', windowHours: args.window, demo: true, outDir });
        if (args.site) {
            const sitePath = resolve(HERE, '../../public/recon-demo-report.json');
            writeFileSync(sitePath, JSON.stringify(report, null, 2));
            console.log(`[recon-agent] site demo report -> ${sitePath}`);
        }
        return;
    }

    if (args.customers) {
        const customers = JSON.parse(readFileSync(resolve(args.customers), 'utf8'));
        for (const customer of customers) {
            const key = customer.key || process.env[customer.keyEnv || ''];
            if (!key) {
                console.error(`[recon-agent] SKIP ${customer.label}: no key (set "key" or "keyEnv")`);
                continue;
            }
            await runAccount({ key, label: customer.label, windowHours: args.window, outDir });
        }
        return;
    }

    const key = args.key || process.env.STRIPE_RESTRICTED_KEY;
    if (!key) {
        console.error('No key. Use --demo, --key rk_..., STRIPE_RESTRICTED_KEY, or --customers file.json');
        process.exit(1);
    }
    if (key.startsWith('sk_')) {
        console.error('Refusing to run with a secret (sk_) key. Create a READ-ONLY restricted key (rk_...) instead.');
        process.exit(1);
    }
    await runAccount({ key, label: 'account', windowHours: args.window, outDir });
}

main().catch((error) => {
    console.error(`[recon-agent] FAILED: ${error.message}`);
    process.exit(1);
});
