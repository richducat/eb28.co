# EB28 Desk OS — X / Twitter

Two links to rotate: `eb28.co/deskos` (buy) and `eb28.co/fundmanager` (live tape). No income claims; real-risk-of-loss implied throughout.

## Profile bio (≤160 chars)
> Building EB28 Desk OS — a local-first fleet of trading agents behind one kill switch. I show the live tape, losses included. Software, not a fund. ↓

Alt:
> The hard part isn't writing a trading bot — it's writing the thing that stops one. EB28 Desk OS: 8 agents, 1 kill switch, on your Mac. Live tape ↓ (real risk)

---

## THREADS

### Thread A — The Kill-Switch Origin Story
1/ I once had 9 trading bots running live at the same time. Then one morning I shut the entire floor down with a single command. Not because they were losing. Because I realized I'd built the wrong thing first.

2/ Everyone who builds a trading bot obsesses over entries. Signals. Edge. Nobody builds the part that matters at 3am when a bug, an API glitch, or your own overconfidence is about to drain a wallet. The part that says: stop. Now. Everything.

3/ The hard part was never writing a trading bot. It's writing the thing that stops one. A global kill switch. Capital guard. Per-desk circuit breakers. A runner that won't even start a strategy if the guards aren't green.

4/ So I rebuilt the whole stack around that idea. The trading agents are downstream. The safety system is the product. The bots just plug into it. I called the safety layer the OS. The agents are tenants.

5/ None of this removes risk. These are live markets — real money, real losses, no promises. That's the point of having a kill switch at all. What it removes is the specific failure where software keeps trading after it shouldn't.

6/ 8 agents + the OS (kill switch, capital guard, circuit breakers, journal, live dashboard): $197. Single agent: $47. I'll install it on your machine for $497. Runs local-first on your own Mac. Your keys, your kill switch. eb28.co/deskos

### Thread B — Radical Transparency
1/ My sales page has a number on it that most founders would hide. The live test book is down ~$61 right now. I put it there on purpose. Let me explain why.

2/ Every trading-bot pitch online shows you green. Cherry-picked screenshots. "Backtested" curves that only go up and to the right. You know what that teaches you? Nothing. Except that the seller is good at hiding.

3/ So I did the opposite. I pointed a live page at the real fleet and left it on. Wins, losses, drawdown, the ugly minutes. In real time. Including the red. eb28.co/fundmanager — go look right now.

4/ I'm not selling you returns. I can't, and anyone who does is lying to you. These are live markets. You can lose money. The tape will sometimes be red. That's reality, not a disclaimer I'm hiding in 6pt font.

5/ What I'm actually selling is software. A safety system + 8 agents that run on your own machine. The differentiator isn't "it wins." It's "it stops, it logs everything, and I'll show you the real tape before you buy."

6/ Buy from people who show you the tape. If a trading product won't show you a losing day, that tells you everything. Watch mine trade live (red and all): eb28.co/fundmanager · Get the software: eb28.co/deskos

### Thread C — The Robinhood Connect Angle
1/ In May 2026 Robinhood quietly shipped something most people slept on: an official Agentic Trading MCP. It means you can now point an autonomous agent at your own Robinhood account. Legitimately. Through their own interface.

2/ Most people's reaction: "cool, so where do I get a safe one?" Because connecting an unsupervised bot to your brokerage account is exactly the scenario that should terrify you. That's the whole reason the kill switch exists.

3/ So the EB28 equities desk now connects to Robinhood Agentic Trading. Your account. Your keys. The agent runs locally on your Mac, behind the same gated runner and circuit breakers as everything else.

4/ Setup is minutes: connect the official Robinhood MCP → the desk runs behind the kill switch + capital guard → every action hits the trade journal → the live dashboard shows you what it's doing.

5/ To be painfully clear: this trades real equities with real money. You can lose it. No returns are promised, ever. This is software, not advice. The value is the guardrails around the agent — not a prediction about the agent's P&L.

6/ If you've got a Robinhood account and you want an agent on it that's wrapped in an actual safety system — eb28.co/deskos ($47 single desk / $197 full fleet). Or watch the fleet trade live first: eb28.co/fundmanager

### Thread D — Trading-Bot Scam Teardown
1/ 99% of "trading bots" sold online are the same scam wearing different logos. Here's the playbook, so you can spot it in 10 seconds and never get taken. 🧵

2/ Tell #1: only green screenshots. Real trading has red days. If every screenshot is a win, you're not looking at results — you're looking at a survivorship-bias highlight reel.

3/ Tell #2: backtests instead of a live tape. A backtest is a story told with hindsight. Anyone can curve-fit a chart that would've won. Ask for the live account. Watch them go quiet.

4/ Tell #3: they talk about returns, never about safety. No mention of what happens when the API hangs, the strategy goes haywire, or the market gaps. No kill switch. No circuit breaker. Just "trust the algo."

5/ Tell #4: income language. "Passive." "Money printer." "Set and forget." Run. Markets don't do passive. Anything that survives unattended needs guards that can shut it down — and they never have any.

6/ My counter-position: I show you the live tape, including losses. The product is the safety system, not a return. eb28.co/fundmanager is on right now — down ~$61 on the test book today, in plain sight.

7/ "Show me the tape" should be the bare minimum you demand from anyone selling you trading software. If they can't, you already have your answer. Mine's right here: eb28.co/fundmanager · The software: eb28.co/deskos

### Thread E — The Architecture (build-in-public)
1/ Architecture thread for the people who actually want to see how the safety system is built. Not "trust me." The actual layers that sit between an agent and your wallet. 🧵

2/ Layer 0: the gated runner. Strategies don't run as scripts you launch. They run behind a runner that refuses to start anything unless the kill switch is armed and the guards report green. Default state is OFF.

3/ Layer 1: the global kill switch. One command, one source of truth. Flip it and every desk in the fleet halts — not "sends a stop signal and hopes," but the runner stops handing them execution. Live blocked, sim still allowed.

4/ Layer 2: capital guard. Hard limits on how much any desk can deploy, per-desk and fleet-wide. The agent literally cannot size past the ceiling you set. Enforced below the strategy, not inside it.

5/ Layer 3: circuit breakers. Per-desk trip conditions — drawdown, error rate, weird fills. Trip one and that desk goes dark on its own while the rest keep running. Localized failure, not a blast radius.

6/ Layer 4: the trade journal. Every action, every decision, every guard event — logged. Not for marketing. So when something goes wrong you can actually reconstruct what happened instead of guessing.

7/ On top of all that: a live dashboard. The same one I point at the public page. What the fleet is doing, in real time, including the losing minutes. None of this guarantees a profit. Live markets, real losses, no promises. It guarantees you can stop and see.

8/ Local-first, runs on your Mac, your keys never leave. 8 agents + this OS: $197. Single desk: $47. Install: $497. eb28.co/deskos · Live tape: eb28.co/fundmanager

### Thread F — 8 Agents, One Obsession Each
1/ The fleet is 8 autonomous agents. Each one does exactly one thing and is wired into the same safety system. No "do everything" mega-bot. Eight specialists behind one kill switch. Quick roundup. 🧵

2/ The prediction-market desks run on Polymarket and Kalshi — event contracts, resolution-driven, each agent obsessed with its own slice rather than trading everything at once.

3/ The equities desk connects to Robinhood's official Agentic Trading MCP. Your account, your keys, the agent running locally behind the same guards as the rest of the fleet.

4/ Why split it into 8 instead of one brain? Blast radius. If one desk's logic goes sideways, its circuit breaker trips and it goes dark alone. The other 7 don't even notice. You can't get that from a monolith.

5/ Every desk shares the same spine: gated runner (won't start unless guards are green), capital guard (hard size ceilings), circuit breakers (per-desk auto-halt), trade journal (everything logged), one global kill switch over all of it.

6/ And to be clear: 8 agents trading live means 8 ways to lose money in real markets. No desk is promised to be profitable. The point is that all 8 are supervised by software designed to stop them.

7/ Run one desk ($47) or the whole fleet + the OS ($197). Want it set up for you? Operator install is $497. Local-first on your Mac. See all 8 trading live right now: eb28.co/fundmanager · Get the fleet: eb28.co/deskos

---

## 25 STANDALONE POSTS
1. The hard part was never writing a trading bot. It's writing the thing that stops one.
2. My sales page shows a live book that's down ~$61 today. I left the red on screen on purpose. Buy from people who show you the tape.
3. Every trading-bot pitch shows you green. Mine shows you the live account — losses included. Ask yourself why the others won't.
4. "Passive income." "Money printer." "Set and forget." Three phrases that mean: this person has never had to shut a live bot down at 3am.
5. I ran 9 live bots, then killed the whole floor with one command. That command is the product. The bots are just tenants.
6. A backtest is a story told with hindsight. A live tape is the truth. eb28.co/fundmanager
7. Default state of every desk in my fleet: OFF. The runner won't start a strategy unless the kill switch is armed and the guards are green.
8. Robinhood shipped an official Agentic Trading MCP. Now you can put an agent on your own account. The question isn't "can I" — it's "is it wrapped in a kill switch." Mine is.
9. Nobody brags about their circuit breaker. That's how you know nobody built one.
10. 8 agents. One obsession each. One kill switch over all of them. No mega-bot. Eight specialists you can stop individually or all at once.
11. If a trading product won't show you a losing day, that tells you everything you need to know.
12. Real markets don't do "passive." Anything that runs unattended needs a guard that can shut it down. Most bots have none. That's the whole problem.
13. Capital guard means the agent literally cannot size past the ceiling you set. Enforced below the strategy, not politely requested inside it.
14. I'm not selling returns. I can't, and neither can anyone honest. I'm selling a safety system + 8 agents that run on your own Mac.
15. Local-first. Your machine, your keys, your kill switch. Nothing about your account leaves your Mac.
16. One desk's logic goes sideways → its breaker trips → it goes dark alone. The other 7 keep running. That's why it's a fleet, not a monolith.
17. The trade journal isn't for marketing. It's so when something goes wrong, you can reconstruct exactly what happened instead of guessing.
18. Watch it trade live. Including the parts where it loses. eb28.co/fundmanager
19. "How much will it make me?" Wrong question. "What stops it when it shouldn't be trading?" Right question.
20. $47 for one desk. $197 for the full fleet + the OS. $497 if you want me to install it on your machine. It's software. Not a fund.
21. The flex isn't a green screenshot. The flex is a live page I never have to take down.
22. Connecting an unsupervised bot to your brokerage account should scare you. That fear is correct. It's also exactly the gap the kill switch fills.
23. Every action behind a gated runner. Every dollar behind a capital guard. Every desk behind a circuit breaker. Everything behind one kill switch. That's the OS.
24. I'd rather show you a red day and keep my credibility than show you a fake green one and lose it.
25. Trading software you can stop, see, and audit — running on your own Mac. Real markets, real risk, real tape. eb28.co/deskos

## Pinned tweet
1/ I ran 9 live trading bots, then shut the entire floor down with one command. That command — the global kill switch — is the actual product. The bots are just tenants. Here's why I built the safety system first. 🧵
2/ Every trading-bot seller shows you green screenshots and "backtests." I do the opposite. I point a live page at the real fleet and leave it on — wins, losses, drawdown. Right now the test book is down ~$61. It's on my sales page on purpose.
3/ I'm not selling returns. Live markets, real money, real losses, no promises — ever. I'm selling software: 8 agents (Polymarket, Kalshi + Robinhood's official Agentic Trading MCP) wrapped in a safety system — gated runner, capital guard, circuit breakers, journal, kill switch.
4/ Runs local-first on your own Mac. Your keys, your kill switch. $47 a desk · $197 the full fleet + OS · $497 operator install. Watch it trade live (red and all): eb28.co/fundmanager · Get it: eb28.co/deskos
