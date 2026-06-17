# EB28 Desk OS — Reddit + Hacker News

**Read this first.** Reddit removes promo. On strict subs: NO link in the body — drop the **live-tape** link (eb28.co/fundmanager, not the checkout) in a comment only if asked. Lead with story/engineering value. Reply to comments for the first 2 hours — the thread is the demo. Never DM links.

---

## 1. r/algotrading — STRICT, no link in body
**Title:** The hard part was never the trading bot — it was building the thing that *stops* one. Lessons from running a 9-bot floor.

**Body:**
I've spent the last several months running a small fleet of autonomous trading agents on my own machine — prediction markets (Polymarket/Kalshi via the Simmer SDK) and US equities through Robinhood's official agentic trading interface. Nine "desks" at peak, each one its own strategy in plain Python.

The trading logic is the easy 20%. You can write a mean-reversion or a news-driven desk in an afternoon. The part that consumed my time — and the part I now think is the real product — is everything built to *stop* a bot from hurting you:

- **A global kill switch.** One command halts every desk and blocks new orders process-wide. The runner refuses to place a trade if the switch is engaged. Nine live desks, one command, floor goes dark.
- **Per-desk circuit breakers.** Each desk trips independently on its own loss/drawdown threshold, so one misbehaving strategy can't take the others down.
- **A capital guard.** Hard per-desk and total ceilings the order layer physically can't exceed, regardless of what a strategy "wants."
- **A trade journal.** Every intent, fill, rejection, and breaker trip logged append-only. At 2am the journal is the difference between a lesson and a mystery.

Hard-won lessons: (1) Design the stop conditions before the entry conditions — if you can't describe how a desk should *die*, you don't understand it well enough to run it live. (2) The kill switch must be dead simple and process-level, not per-bot. (3) Make rejections first-class events, not silent no-ops. (4) Local-first matters for safety — the kill switch is a local process boundary, not an API call that might time out when you need it most.

Happy to go deeper on the runner architecture or the journal schema. Curious how others implement their stop layer — centralize the kill switch or push it into each strategy?

**Notes:** Flair "Strategy"/"Infrastructure." Weekday market hours ET. NO link, no product name in body. If someone asks "do you sell this / is it open source," reply with one line + link in a comment. Engage hard in comments for 2 hours.

---

## 2. r/PredictionMarkets
**Title:** I let autonomous agents trade Polymarket/Kalshi for me for a few months. Here's the boring infrastructure that made it survivable.

**Body:**
Most "I built a bot" posts focus on edge. I want to talk about the unglamorous half that kept the account alive.

Setup: a few autonomous desks running locally, hitting Polymarket and Kalshi through the Simmer SDK. Small, readable Python strategies.

What mattered: (1) **Resolution risk is a different animal than price risk.** A bad day isn't a drawdown — it's a market resolving against you to zero, instantly and permanently. So sizing is far more paranoid; the capital guard caps per-market exposure hard. (2) **Per-market circuit breakers**, so one contentious market can't bleed the desk while I sleep. (3) **A global kill switch I've actually pulled** — when a news event correlated several markets in a way I hadn't modeled, I halted everything and read the journal instead of trying to be clever. (4) **An append-only trade journal** to measure whether a desk was good or just lucky (mostly: too small a sample to know).

Honest disclosure: this is a live test book and it's currently *down a small amount*. That's the point of real money small — you find the failure modes paper trading hides. I'd rather show a slightly-red tape than a backtest.

What do you do about resolution/settlement risk — hard-cap per-market, or trust your edge and size up?

**Notes:** Flair "Discussion"/"Strategy." Mid-morning ET. No link in body; the honesty is the trust play. If asked, link the live tape in a comment.

---

## 3. r/Daytrading (or r/stocks) — Robinhood angle
**Title:** You can now connect an AI agent directly to Robinhood (official agentic trading). Here's what I built on top of it — and the guardrails I refused to skip.

**Body:**
Robinhood shipped an official agentic trading interface — you can let a program place trades through a sanctioned channel instead of scraping. Like everyone my first reaction was "okay, what could possibly go wrong," so I built around that question.

I run a few small equity desks locally that connect through that official interface. Plain Python, my own machine, real money kept deliberately small.

The part worth sharing is the guardrails, because handing order entry to an autonomous agent without them is how you wake up to a story you don't like: a **kill switch above the agent** (orders die in my process if the switch is on, before they reach Robinhood); a **capital guard** with hard caps the agent physically can't exceed; **per-desk circuit breakers**; a **full trade journal** of every order the agent wanted, placed, or had blocked.

Two honest things: (1) This is **not** a money machine — my live test book is currently slightly red, and I post that on purpose. (2) Connecting an agent to a real brokerage raises the stakes of every bug. The discipline that keeps you safe manually has to be *encoded* when an agent is the one clicking.

If you're experimenting with the Robinhood agent interface, what's your stop-of-last-resort?

**Notes:** Pre-market or after close ET. No link in body; live-tape link in a comment if asked. If the sub's promo mood is hostile, post to r/stocks instead.

---

## 4. r/Python — "Show and Tell"
**Title:** I built a kill-switch-gated runner for autonomous trading agents — the design pattern that keeps "readable Python" from doing something catastrophic

**Body:**
A pattern from a project where the cost of a bug is real money: a fleet of autonomous agents that run locally, each a small readable Python module, all funneled through a single gated runner.

The interesting Python problem isn't the trading — it's: how do you let independent modules act on the real world while guaranteeing a process-wide stop and hard ceilings they can't circumvent?

The pattern: (1) **Strategies emit *intents*, not actions** ("buy X, size N") and never touch the broker SDK directly — keeps each desk readable and unable to bypass the safety layer. (2) **A single runner owns all side effects.** Every intent flows through one chokepoint that checks, in order: a process-wide kill-switch flag → the capital guard → the per-desk circuit breaker → then executes and writes to the journal. (3) **Rejections are objects, not exceptions** — `Placed`, `RejectedByKillSwitch`, `RejectedByCapitalGuard`, `BreakerTripped` — each logged append-only. No silent no-ops. (4) **The kill switch is process-level and boring** — a checked flag at the one chokepoint, no distributed consensus, no clever async cancellation. Boring is the feature.

Meta-lesson for any agentic Python that acts on the world: put all side effects behind one gate, make strategies emit intents, make "stop" a first-class, process-wide, dead-simple operation. The readability of the strategies is *enabled* by the strictness of the gate.

Anyone else structuring agent side-effects this way?

**Notes:** Flair "Show and Tell" (allows one understated link at the bottom or in a top comment — point at the live tape/writeup, not checkout). Weekday morning ET. Keep the body about the *pattern*.

---

## 5. r/SideProject — link OK, story first
**Title:** I shut down my own 9-bot trading floor with one command — and realized the kill switch was the actual product. Build-in-public update.

**Body:**
I set out to build autonomous trading agents and accidentally built a safety system instead.

What I started building: a fleet of small bots on my own Mac — prediction markets (Polymarket/Kalshi) and US equities (Robinhood's official agent interface). Readable Python, one file per desk. At peak, nine live.

The moment it clicked: one evening something felt off across several desks. I ran my global kill switch — one command — and the entire floor went dark instantly. Sitting there afterward I realized the thing I'd pay for isn't the bot. It's the command that stops the bot. Writing a strategy is a weekend; writing the system you trust enough to let strategies run with real money is the actual work.

So I repositioned around safety. It's sold as software you run on your own machine — not a fund, not a signal service. And my sales page shows the *real live book, including losses* — down about $61 right now, printed on the page on purpose. Everyone shows green. My whole brand is "buy from people who show you the tape," red days included.

Lessons: the unsexy safety/ops layer is often the real product; showing real imperfect numbers builds more trust than a polished claim (and keeps you out of legal trouble — I make zero income claims); repositioning from "the exciting thing" to "the thing that makes it safe" was the best decision I made.

**Notes:** Flair "Launch"/"Build in Public." Link OK at the end, point primarily at the live tape. Tue–Thu morning ET. Reply to all feedback. Never say "passive income."

---

## 6. r/Entrepreneur (alt r/SaaS) — NO link in body
**Title:** I'm selling the safety system, not the trading bot — and I put my real losses on the sales page. Here's the positioning bet.

**Body:**
A positioning case study for anyone selling in a low-trust, hype-saturated market.

I sell software: a local-first system of autonomous trading agents that runs on the buyer's own machine. Explicitly **not** a managed fund and **not** a signal service.

Two counterintuitive decisions: (1) **I sell the brakes, not the engine.** The category is full of "bots" promising returns. I positioned the product as the *safety system* — kill switch, circuit breakers, capital guard, journal. This attracts the customer who understands risk (better, less litigious, longer-retaining) and sidesteps the race-to-the-bottom of return-promising. You can't out-hype the hypers, so I went the opposite direction. (2) **I print my real losses on the sales page.** A live page shows the fleet trading in real time — currently *down* a small amount, on purpose. In a market where everyone fakes green, a real red number is a moat. Transparency about losses has made serious buyers *more* comfortable, not less.

Guardrails that are also good business: no income claims, no "passive income," no guarantees — partly compliance, partly trust. The moment you promise returns you attract refund-chasers and regulators and lose the people who'd respect the product. Sell it as a tool; position the user as the operator.

Has anyone else made the "sell the brakes, not the engine" move — where the unsexy control layer was the real willingness-to-pay?

**Notes:** Flair "Case Study"/"Lessons Learned." NO link in body; live-tape in a comment if asked. Avoid r/passive_income (its culture pressures income-claim language — a removal + liability trap).

---

## 7. Show HN
**Title:** Show HN: A kill-switch-gated runner for autonomous trading agents (local-first, shows real losses)

**Body:**
I built a local-first system that runs a small fleet of autonomous trading agents on your own machine — prediction markets (Polymarket/Kalshi via the Simmer SDK) and US equities (via Robinhood's official agentic trading interface). Each desk is a small, readable Python module.

I'm posting it as an engineering project because the interesting part is the safety architecture, not the strategies. The thesis after running nine desks live: the hard part was never writing a trading bot — it's writing the thing that reliably *stops* one.

How it's built: strategies emit *intents*, never actions; a single runner owns all side effects and gates every intent through a process-wide kill-switch flag → capital guard (hard ceilings) → per-desk circuit breaker, then executes and writes an append-only journal. The kill switch is deliberately boring — a locally-checked flag at the one chokepoint every action passes through. Local-first on purpose: the stop is a local process boundary, not a network call that could time out exactly when you need it.

On transparency: a live page shows the actual fleet trading, and right now the test book is **down ~$61** — printed on purpose. I'd rather show a real tape with real losses than a backtest. No income claims, no guarantees; it's software you run and you own the risk.

Happy to go deep on the intent/runner split, the journal design, or the decision to publish losses. Critique very welcome — especially on the safety model.

**Notes:** Title must start "Show HN:". URL field → the live-tape page, NOT checkout. Tue–Thu ~8–10am ET. Post a founder comment immediately inviting criticism of the safety model. Respond fast and non-defensively. No income/return talk at all.

---

## 8. Simmer community / prediction-market Discord
Post ONLY in the #showcase / #projects / #self-promo channel (check pinned rules — many Discords ban links elsewhere).

Hey all — built something on top of the Simmer SDK and wanted to share with people who'd get it.

I've been running a small fleet of autonomous desks through Simmer (Polymarket + Kalshi). The thing I care about isn't the strategies — it's the safety layer wrapped around them: a global **kill switch** (used it for real when correlated markets surprised me), **per-market/per-desk circuit breakers**, a **capital guard** with hard ceilings, and an append-only **trade journal** so I can tell skill from luck (spoiler: small samples, mostly luck so far).

Two things this group will appreciate: resolution risk drove the whole safety design (a bad resolution is instant and permanent, so the capital guard exists mostly because of that); and I'm running it live, small, currently down a bit — shown openly on a live page. I'd rather compare real tape with you all than trade screenshots of green days.

How are you handling settlement/resolution edge cases — centralize your stop logic or push it per-strategy? (Can post the live link if the channel's cool with it.)

**Notes:** Casual peer tone. Defer to channel rules before linking; share the live tape first. Build a little reputation in others' threads first if you're new.

---

## 9. "Does it make money?" — reusable honest reply
Use this every time someone asks about returns. It's your firewall against income-claim violations and your single most important trust moment.

> Honest answer: I won't give you a returns number, and you should be suspicious of anyone in this space who does.
>
> What I *can* tell you truthfully: it's real money, run live, kept deliberately small while I learn the failure modes. The live test book is currently **down a bit** — about $61 — and that number is on the public live page on purpose. I show red days because they're real. I make **no income claims and no guarantees**. It's software you run on your own machine; you own the trades and the risk.
>
> The reason I don't lead with profit is that profit was never the valuable part. The valuable part is the *control* layer — the kill switch, circuit breakers, capital guard, journal — the stuff that lets you run autonomous strategies without one quietly hurting you while you sleep. Anyone can write a bot that wins in a backtest. The hard part is the system that stops a live one cleanly.
>
> So: does it make money? Sometimes green, right now red, and I won't dress that up. The live tape (losses included) is public if you want to judge for yourself. Buy the safety system because you want real brakes — not because I promised a number. I can't and won't.

---

## Cheat sheet
- **Never say:** passive income, get rich, guaranteed, returns of X%, risk-free, "make money while you sleep."
- **Always imply real risk** and use the live losses as a feature.
- **Link discipline:** strict subs = no link in body, comment-only if asked, live tape (eb28.co/fundmanager) before sales page. Permissive surfaces (SideProject, Python Show-and-Tell, Show HN, Discord showcase) = one understated link, still tape-first.
- **Engage after posting.** Every post lives or dies in the comments.
