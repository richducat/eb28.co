# Recon Agent — founder beta engine

The product behind eb28.co/reconcile. A zero-dependency Node script that pulls
a Stripe account's last 24 hours, reconciles every payout against its balance
transactions, flags anomalies, and writes a plain-English morning briefing.

## What it produces (per customer, per run)

- `<label>-<date>.md` / `.html` — the plain-English morning briefing (the HTML
  is email-ready: paste into any mail client or send via SMTP)
- `<label>-<date>.csv` — every balance transaction, bookkeeper-ready
- `<label>-<date>.json` — structured report (totals, payouts, flags)

## What it checks

1. **Payout math** — each payout vs the net sum of its balance transactions;
   mismatches are flagged with the delta and the likely cause.
2. **Late refunds** — refunds against already-settled charges (the #1 cause of
   "why is my payout short?"). Flagged with the exact amount.
3. **Disputes** — flagged urgent with the evidence due date.
4. **Failed payments** — counted and totaled for retry follow-up.

## Running it

```bash
# Demo mode — bundled sample data, no key needed. Also powers the site demo.
node ops/recon-agent/recon-agent.mjs --demo

# One real account (READ-ONLY restricted key, never sk_)
node ops/recon-agent/recon-agent.mjs --key rk_live_...

# Founder-beta multi-customer run (daily cron)
node ops/recon-agent/recon-agent.mjs --customers ops/recon-agent/customers.json

# Refresh the marketing page's live demo report
node ops/recon-agent/recon-agent.mjs --demo --site
```

## Customer onboarding (founder beta runbook)

1. Customer pays via Stripe Payment Link → lands on /welcome/?p=recon-agent-beta
   and submits their Stripe email + finance inbox.
2. Ask them for a **restricted, read-only** API key (Dashboard → Developers →
   API keys → Create restricted key → read access to Balance transactions,
   Charges, Payouts, Refunds, Disputes only). The engine refuses sk_ keys.
3. Add them to `customers.json` (copy `customers.example.json`); store the key
   in an env var, not in the file, for anything beyond local testing.
4. Add a daily cron: `0 6 * * * node .../recon-agent.mjs --customers .../customers.json`
5. Send the generated HTML briefing each morning (manual at founder scale;
   SMTP automation is the first post-beta upgrade).
6. Receipt-inbox matching is a founder-beta concierge step — set up the
   forwarding alias with the customer during onboarding.

## Security stance

- Read-only restricted keys only; the engine exits if given a secret key.
- No data leaves the machine running it; reports are local files.
- Customers can revoke their restricted key at any time in Stripe.
