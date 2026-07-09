# Reddit — 2 build-in-public posts (NOT ads)

## Post 1

**Title:** Built a tiny US-equities autotrader on Robinhood's official Agentic Trading API. Every decision streams to a public dashboard, losses included. Happy to answer anything about the setup.

**Where/how:** Best fit: r/algotrading. Read the sidebar first; they allow technical build posts but ban promotion, so keep it exactly as framed: disclosure up front, no pricing, no mailto, no 'DM me'. The only link is the live dashboard, which is the evidence, not a store. Answer every technical comment for the first 48 hours. If mods flag the link, offer to remove it and post screenshots of the journal instead. Do not crosspost the same text; rewrite for each sub.

**Body:**

Builder here, so full disclosure up front: this is part of a paid product (EB28 Desk OS), and I'm deliberately not linking a sales page. I'm posting because the engineering choices might be useful to people here, and because I'd like this crowd to poke holes in them.

What it does: watches AAPL, NVDA, TSLA, MSFT, GOOGL, AMD, SPY, QQQ. Buys $5 fractional dips, max 2 buys per 15-minute cycle. That's the whole strategy surface right now. Deliberately tiny while it's in beta.

Why the official API instead of scraping: Robinhood has an Agentic Trading API (agent.robinhood.com). Orders go through a broker-side review step on their end, and the agent is confined to a dedicated sub-account the user creates, isolated from the main account. It's slower and more constrained than the reverse-engineered libraries people usually reach for, and that's exactly why I wanted it. No stored passwords, no TOS gray zone, and a hard boundary around what the bot can touch. Obvious disclaimer: Robinhood doesn't endorse any of this. It's just their public agent API.

The safety stack is where most of my time went: a gated runner (nothing executes outside the rule set), paper/review-first mode before any real order, one switch to go live and one switch back, a global kill switch, and a full journal of every decision.

The part I'm most attached to: everything streams to a public dashboard at eb28.co/fundmanager, including losses. There's a negative test PnL printed on the public page right now, on purpose. I decided early that if I'm not comfortable publishing the losing tape, I shouldn't be running the thing at all.

To be clear, I'm not claiming this makes money. It trades $5 clips, it can and does lose on trades, and the sample is tiny. The part I find interesting is operational: constraints, auditability, and whether the agentic-API model is actually the safer pattern for retail automation compared to credential-based bots.

Would genuinely like critique on: the 15-minute cycle cadence, dip detection on fractional orders, and whether anyone else has worked with the agentic API and hit limits I haven't yet.

---

## Post 2

**Title:** We put our trading bot's losses on our own homepage, on purpose. Notes on why.

**Where/how:** r/SideProject (also fits r/buildinpublic-style subs). Frame it as a product-decision story, not a launch post. Lead with the counterintuitive choice, link only the live dashboard, don't paste pricing unless someone asks in comments, and stay active in the thread for the first few hours.

**Body:**

Quick backstory. We build a thing called Desk OS: software trading desks that retail traders run themselves. The flagship desk, Bluechip, is in live beta trading $5 fractional clips on big-name US equities through Robinhood's official agentic API (no scraping, every order passes their broker-side review step, and we're not affiliated with Robinhood in any way).

The design decision I want to talk about: our public dashboard at eb28.co/fundmanager streams every decision the desk makes as it makes them, and the Desk OS page displays its own negative test PnL. Red numbers, on the marketing page, on purpose.

Why we did it:

1. The industry term for our customers is 'dumb money.' That term does a lot of quiet work: it justifies selling retail traders hype instead of tools. We wanted the opposite posture. A contractor shows you references, including the job that ran long. A desk should show you its tape.

2. Green-screenshot marketing creates a customer who churns the first red week. Showing losses up front filters for people who actually understand that trading involves losing sometimes. Those are the users who file good bug reports.

3. It keeps us honest internally. When your test PnL lives on your homepage, you stop being tempted to quietly tune the demo.

What happened: the page converts slower, but the early-access emails ask real questions about the kill switch and the journal instead of 'how much will I make.' For a beta, that trade is worth it.

Happy to answer anything about the build, the safety stack (gated runner, global kill switch, paper-first mode, isolated sub-account), or what it's like marketing a product whose own numbers can embarrass you on any given day.

Obligatory: not financial advice, it's licensed software the user operates, you can lose money trading, and the beta clips are $5 on purpose.

---

