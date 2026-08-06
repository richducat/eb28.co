# Bluechip / DayTradingBot — Build Plan (start to finish)

**Audience:** an autonomous coding agent with filesystem + code-edit access to
`~/GITHUB/eb28.co` and `~/.openclaw/workspace-dev/skills/`. This document is
self-contained — you should not need the originating conversation.

**Provenance:** synthesized from a 103-agent deep-research pass (Robinhood
Agentic docs, FINRA 2026 Annual Regulatory Oversight Report, AQR "Hold the Dip",
SEC adviser-line precedent) + a direct code audit of the desk, 2026-07-10.

---

## 1. The thesis (why we're building this)

Robinhood launched **Agentic Trading** in beta May 27 2026 (equities), added
**options** in June, is rolling out **crypto** now, with event contracts +
futures on the roadmap. The category is weeks old — we are early, which is the
whole opportunity.

But the research killed two of the product's three original selling points:

- **"Official API"** is a single paste-a-URL MCP endpoint
  (`https://agent.robinhood.com/mcp/trading`) — no registration, no keys, works
  with any MCP client. Not a moat.
- **"Isolated sub-account"** is platform-enforced for *everyone*. Not a moat.
  (And it is *trade*-isolation only — connected agents get **read access to all
  the user's accounts**. Never market it as data isolation.)

What Robinhood explicitly does **not** provide, and what FINRA's 2026 report
names as supervisory expectations for agentic AI: **automated risk guardrails**
(kill switch, drawdown limits, position limits, trade-frequency caps),
human-in-the-loop supervision tooling, and verifiable track records. Robinhood
states it "does not control, supervise, monitor, recommend, or audit these AI
agents." That gap is the product.

**Reframe the product from "a bot that buys dips" to "the guardrail + safety
cockpit for the agentic trading era."** The user brings any agent / any
strategy; we wrap it in the kill switch, automated risk limits, journal,
paper-mode, and public tape that Robinhood doesn't provide and regulators
expect. The dip-buyer becomes the *included demo strategy*, not the product.

This also fixes two problems at once: AQR tested 196 buy-the-dip variants over
60 years — **>60% underperform buy-and-hold** — so a fixed dip strategy is
indefensible as the core; and the **SEC treats "we supply the signal + auto-
execute" as investment advice** (In re Weiss Research; Coinbase registered its
AI agent as an RIA in June 2026). **User-owned strategy keeps us on the software
side of the adviser line.**

---

## 2. Hard constraints — do not cross (safety + legal)

1. **Never place a real-money trade, arm a desk live, flip `launch_control.json`
   gates, or add `--live` to a Robinhood invocation as part of building/testing.**
   All testing is SIM ($SIM virtual currency). Live arming is the operator's
   manual switch, always.
2. **Robinhood has no sim venue** — `--live` there places REAL orders in the
   operator's brokerage sub-account. Test the Robinhood desk in review-only mode
   (no `--live`), which builds + broker-reviews an order and places nothing.
3. **Structure the product so the USER supplies the strategy.** Do not ship a
   product that generates buy/sell signals AND auto-executes them as the default
   turnkey experience — that is the SEC adviser line. The demo strategy is fine
   as an inspectable, user-editable example the user opts into.
4. **Marketing/product copy:** zero income/return claims, no AI-washing, no
   cherry-picked performance. Keep the losses-included public tape. Never imply
   Robinhood endorsement, never imply data isolation.
5. **Kalshi live is blocked server-side at Simmer** (`DFlow route_not_found` on
   every quote, reproduced with the operator's verified wallet
   `6yAWv28JnXrSZncDkzjmAtZVdEFXbRdk2ZQqv9tSTJvL`). No code change here fixes it;
   it needs Simmer support. Leave it — the operator has an escalation drafted.

---

## 3. Current-state audit (what you're starting from)

Desk: `~/.openclaw/workspace-dev/skills/robinhood-equities/robinhood_desk.py`
(260 lines). Config `config.json`: watchlist + `{dip_pct:1.5, dollar_per_trade:5,
max_trades_per_cycle:2}`.

Blocking gaps found in code:
- **No OAuth flow.** Auth only reads a pre-existing token at
  `~/.hermes/mcp-tokens/robinhood.json` (fields: access_token, refresh_token,
  expires_at, …). A buyer has no such file → the desk runs for exactly one
  person. There is no way for a customer to connect their own Robinhood.
- **Buy-only. No exits.** No take-profit, stop-loss, or any sell logic. It
  dip-buys and holds forever. This is DCA, not trading.
- **No fill notifications** (no telegram/push/email in desk code).
- **No backtesting** anywhere in the fleet.
- **Personal-path coupling:** reads `~/.openclaw/workspace-dev/runtime/
  launch_control.json` for the kill switch — a customer won't have that tree.
- **No deliverable:** no installer, no packaged bundle. Fulfillment is a manual
  email.

Related fleet note (context, not required for the Robinhood product): three
Simmer desks had a **sim-venue-blindness** bug (rejected all markets because
`client.venue=="sim"` never matched a market's `import_source`, and gated on the
empty real wallet instead of `sim_balance`). `polymarket-ai-divergence` is
fixed (0→2 sim fills); `signal-sniper` and `copytrading` likely have the same
bug — a separate handoff covers those.

---

## 4. The task list (execute in order; each task ships independently)

### P0 — Make it a real, shippable product (nothing sells without these)

**P0.1 — Self-contained Robinhood OAuth in the desk app.**
Goal: a customer connects their own Robinhood with no Hermes/openclaw
dependency. Implement the official Agentic OAuth (PKCE) flow the desk can run on
first launch:
- Authorize URL base `https://robinhood.com/oauth` with `response_type=code`,
  `code_challenge_method=S256`, `redirect_uri=http://localhost:<port>/callback`,
  `scope=internal`, `resource=https://agent.robinhood.com/mcp/trading`, and a
  per-install `client_id` (the operator must obtain/confirm the correct public
  client_id for a distributable — flag this as a dependency; do NOT hardcode the
  operator's personal `…-claude` client).
- Spin a localhost callback listener, exchange the code for tokens, and store
  them in an **app-local** path (e.g. `~/.daytradingbot/robinhood.json`), NOT
  the Hermes tree. Implement refresh using the stored `refresh_token` before
  expiry.
- Acceptance: on a clean machine with no `~/.hermes`, the desk completes auth
  end-to-end via browser and reads/refreshes its own token. Verify token refresh
  works (token currently ~daily/weekly expiry).

**P0.2 — Decouple the kill switch / config from the openclaw tree.**
Goal: the desk's safety state lives in the app's own dir. Move the
`launch_control.json` read to an app-local config (e.g.
`~/.daytradingbot/control.json`) with the same semantics (kill switch,
paper/live). Keep review-only as the default. Acceptance: desk runs with zero
`~/.openclaw` dependencies.

**P0.3 — Exit logic (this is a trading product; it must sell).**
Add configurable exits to `robinhood_desk.py`: take-profit %, stop-loss %,
optional time-based exit, all off `previous_close` / entry price. Respect the
kill switch and market-hours gates already present. Keep it review-only until
the operator flips live. Acceptance: in review mode the desk emits sell
*reviews* for held positions crossing a threshold; journal records them.

**P0.4 — Fill / decision notifications.**
Add opt-in notifications (email via a provided SMTP/API key, or a webhook the
user configures) on every review/fill and on kill-switch trips. No hardcoded
personal Telegram. Acceptance: a configured channel receives a message on a
simulated review event.

**P0.5 — Packaged deliverable + guided install.**
Produce what the $98 buyer actually receives: a versioned bundle (the desk,
config template, install guide) and a one-command or double-click installer for
macOS. Wire it to the existing `eb28.co/setup` wizard's "2-tap Robinhood
connect" promise (P0.1 makes that real). Acceptance: a non-technical user can
go from download → connected → desk running in paper mode by following the
wizard, on a machine that has never seen this codebase.

### P1 — The actual moat (guardrails + user-owned strategy)

**P1.1 — Guardrail engine (the verified differentiator).**
A supervision layer wrapping any strategy, user-configured: automated
**max-drawdown halt**, **max position size / concentration limit**, **daily
loss stop**, **trade-frequency cap** (generalize the existing 2/15-min), and the
global kill switch. On breach: stop trading, notify, journal the reason. This is
what Robinhood lacks and FINRA names. Acceptance: each limit demonstrably halts
a sim run when crossed, with a journaled reason.

**P1.2 — User-owned strategy interface.**
Let the user define the strategy (their rules and/or their own LLM/agent + API
key) that emits buy/sell intents; the harness enforces guardrails and executes.
Ship the dip-buyer as one inspectable, editable example — not the only path.
This is the SEC adviser-line firewall: the user owns the signal. Acceptance: a
user can swap in a different rule set without editing the harness; the harness
still enforces all P1.1 limits.

### P2 — Breadth + trust artifacts

**P2.1 — Options support now; crypto at rollout.** The platform already ships
options; single-asset looks stale within weeks. Add options order support
through the agentic MCP; stub crypto behind a flag for when it's enabled on the
account.

**P2.2 — Honest backtest / expectation tool.** A sim/historical evaluation that
models fees and shows the strategy's real distribution (including losses) —
explicitly to set expectations, not to sell returns. Feeds the AQR-aware honesty
posture.

**P2.3 — Performance attribution + exportable analytics** off the journal
(per-symbol, per-strategy P&L, win rate, holding periods, drawdown). Turns the
tape into a trader tool. Include a tax-lot / realized-gains export.

### P3 — Scale (lower priority while Robinhood's waitlist gates the market)

**P3.1** Windows support. **P3.2** Optional cloud-hosted runner. **P3.3**
Strategy marketplace/community. Research ranks these lower until Robinhood's
rollout widens the addressable base and because onboarding is desktop-gated now.

### Cross-cutting

**X.1 — Fleet QA gate.** Before any desk ships, it must pass a per-desk sim
smoke test proving it can authenticate, evaluate, and (where a signal exists)
fill — so the public tape never shows a desk that has never traded. (Reference
harness pattern exists; the divergence fix is the template for the sim-venue
bug class.)

**X.2 — Pricing.** The $98 one-time fit the beta. A recurring guardrail/ops
product wants a subscription — adjacent tools are ~$30–100/mo SaaS. Model this;
don't change live pricing without the operator.

---

## 5. Definition of done for "a genuinely valuable v1"

A non-technical buyer can purchase, connect their **own** Robinhood in ~2 taps,
run a desk in paper mode with real exits and notifications, define or accept a
strategy they own, and trust it because automated drawdown/position/frequency
limits + a kill switch + a public losses-included tape are all enforced — none
of which Robinhood provides. Live real-money trading remains a switch only the
buyer flips. No income claims, no implied endorsement, user owns the strategy.
