# EB28 Desk OS — LinkedIn

Put links in the FIRST COMMENT, not the post body (LinkedIn suppresses reach on posts with outbound links). Every money/offer post keeps the risk note. No income claims.

## Founder profile
**Headline:** Building EB28 Desk OS — a kill-switch-gated runner for autonomous trading agents on your own Mac | Local-first | I publish my live losses on purpose | Safety system > the bot

**About:**
> I build the boring part of autonomous trading: the off-switch.
>
> EB28 Desk OS is a local-first fleet of trading agents — prediction markets via the Simmer SDK, US equities via Robinhood's official Agentic Trading MCP — that run on your own Mac behind a kill switch, circuit breakers, a capital guard, and a journal. The agents are the easy part. The system that *stops* them is the product.
>
> I run a live test book in public at eb28.co/fundmanager. It's down right now, and I leave that number up on purpose. I'd rather you see the real tape than a cherry-picked screenshot.
>
> Nothing here is investment advice and nothing is guaranteed. Autonomous agents can and do lose money. What I sell is software and control — not outcomes.
>
> → eb28.co/deskos

---

## Post 1 — Kill-switch origin
Last spring I had 9 live trading bots running at once. Then I shut the entire floor down with one command. Not because anything blew up. Because I realized I *could*, and that one fact was worth more than all 9 strategies combined.

Here's what nobody tells you about autonomous agents that touch money:

The day you have one bot, you babysit it. The day you have nine, you can't. You're asleep. You're in a meeting. You're on a flight with no signal. And nine processes are making decisions with real capital the entire time.

The question stops being "is my strategy good?" It becomes "when this goes wrong — and it will — how fast can I stop everything?"

So I built the off-switch first. One global kill that halts every agent across the fleet, no matter what they're in the middle of. Then circuit breakers under each one. Then a capital guard. Then a journal that writes down every decision so I can read the wreckage afterward.

The bots came later. The bots are the easy part. The thing that lets me sleep is the thing that turns them all off. That safety layer is what I ended up productizing.

If you run anything autonomous near real money: do you have a single command that stops all of it right now? Or do you have nine browser tabs and a prayer?

#BuildInPublic #AlgorithmicTrading #RiskManagement

---

## Post 2 — Why I publish losses
My live trading book is down about $61 right now. You can see it. I put it on a public page on purpose: eb28.co/fundmanager.

People keep asking me why I'd show that. Isn't a launch supposed to look like a victory lap?

Every trading product on the internet shows you the green days. The cherry-picked screenshot. The one week that went up and to the right. You've seen a thousand of them and you believe exactly none of them anymore. Neither do I.

So I made a decision early: the dashboard shows the real tape. Up days, down days, the current drawdown, all of it. If the test book is red, the page is red.

I'm not proud of being down $61. But I'm proud that you can *check*. Because the entire pitch of what I build is safety and control — and you cannot trust someone's safety system if they're hiding their results.

To be clear: nothing about this is a promise of returns. Autonomous agents lose money. Mine is losing some right now. That's the whole reason the safety system exists.

Buy from people who show you the tape. Even when the tape is red.

#BuildInPublic #Transparency #FinTech

---

## Post 3 — The off-switch is harder than the bot
Writing a trading bot took me a weekend. Writing the thing that reliably stops it took me two months. That ratio surprised me, so let me explain why the off-switch is the hard part.

A bot has one job: see a condition, place an order. Happy path. You can demo it in an afternoon.

The kill switch has to work on the *worst* day. Mid-order. Network flaking. An agent stuck in a retry loop. Another one holding a position it's confused about. A process that's technically alive but mentally gone.

"Stop everything" sounds like one line of code. It isn't. What does it do to an in-flight order? A partial fill? How do you guarantee a hung agent actually dies instead of waking back up? How do you *know* it worked — not assume, know?

Every one of those only matters when things are already going wrong. Which is exactly when your code is least likely to be tested.

So I treated the safety system as the product and the agents as plugins. The lesson I keep relearning: in any system that can hurt you, the brakes deserve more engineering than the engine.

Engineers — what's a piece of "boring" safety code you're quietly proud of?

#SoftwareEngineering #BuildInPublic #SystemsDesign

---

## Post 4 — Productizing your internal tool
I almost didn't sell this. For months EB28 Desk OS was just my private rig — the thing I built so my own trading agents wouldn't hurt me. A tool of one.

Then a friend watched me kill 9 bots with one command and said: "wait, that's the product. Not the bots. *That.*"

Here's the trap I almost fell into: you assume that because it's simple *to you*, it's worthless *to others*. The opposite is usually true. You built it precisely because nothing on the market did the job. That gap doesn't disappear because you stopped looking.

What it took to turn a personal rig into something someone else could run: rip out every "I'll just remember that" assumption, make the dangerous defaults safe instead of clever, write the part of the docs that explains *why*, and accept that other people will run it on setups I've never seen.

The harder shift was mental: deciding my own boring infrastructure was allowed to be a product. It's live now at eb28.co/deskos.

Got an internal tool you've convinced yourself nobody would pay for? I'd bet against you.

#BuildInPublic #IndieHackers #Bootstrapping

---

## Post 5 — The Robinhood agentic moment
Robinhood shipped official agentic trading. An MCP that lets software agents place equity trades through a real broker. A lot of people will read that and feel a small chill. I felt the opposite.

For years, "AI that can trade your account" lived in a sketchy gray zone — screen-scraping, unofficial APIs, terms-of-service roulette. The capability was there. The *legitimacy* and the *guardrails* were not. An official agentic interface changes that.

But here's the part I keep saying loudly: an official pipe to place trades makes the off-switch matter *more*, not less. The easier it is to connect an autonomous agent to real money, the more you need a system whose entire job is to stop that agent.

So EB28 Desk OS now works with Robinhood's official Agentic Trading MCP — and every one of those equity agents sits behind the same kill switch, circuit breakers, and capital guard as everything else.

The industry is racing to make agents that can act. I'm interested in the quieter problem of making sure you can always make them stop. Nothing here is investment advice, and agents trading real equities carry real risk. That risk is the entire reason the safety layer exists.

Your read — is official agentic trading a step toward maturity, or are we handing the keys over too fast?

#AgenticAI #FinTech #Robinhood #RiskManagement

---

## Post 6 — Contrarian: AI trading bots
Unpopular opinion: most "AI trading bots" are solving the wrong problem, and the good ones will be boring.

The usual pitch is "our model is smart enough to win." I think that's the least interesting half of the problem. Because what actually takes people out isn't a bad prediction — it's a *good system with no brakes.*

An agent that's right 8 times and then, on the 9th, gets stuck in a loop, misreads a fill, or keeps sizing up while you're asleep — with nothing in place to stop it. The strategy didn't kill the account. The lack of control did.

The contrarian position I'll defend: the hard, valuable, durable problem in autonomous trading isn't the intelligence. It's the *containment.* Kill switches. Circuit breakers. Capital limits that can't be argued with. A journal that lets you reconstruct what happened.

I'd rather ship a mediocre agent inside an excellent safety system than a brilliant agent inside none. The first one you can survive. The second one survives *you*.

And even great containment doesn't promise profit. It promises control. Those are different things, and anyone selling the first as the second is lying.

Tell me I'm wrong. Where's the value — the signal, or the safety?

#AI #AlgorithmicTrading #BuildInPublic #RiskManagement

---

## Post 7 — Build-in-public metrics
Build-in-public check-in. The honest version, numbers included.

Where EB28 Desk OS is right now:
– 8 agents in the bundle, running behind one shared safety layer
– 1 global kill switch that halts the entire fleet on command
– Prediction markets live via the Simmer SDK (Polymarket / Kalshi)
– US equities now wired through Robinhood's official Agentic Trading MCP
– Live test book public at eb28.co/fundmanager — currently down ~$61

Yeah. That last number is red. I'm leaving it up. That's the deal I made with myself and with you.

Recently shipped: tightened the capital guard so an agent can't exceed its allotted risk; hardened the kill path so a hung agent actually dies; cleaned up the journal so every decision is reconstructable.

Still rough: operator-install onboarding is more manual than I want; docs need a real "first hour" walkthrough; I want the dashboard to show drawdown history, not just the current number.

The whole thing is local-first — your Mac, your keys, nothing routes through me. This is software and control, not a promise of profit. The test book being red is the honest reminder that autonomous agents carry real risk.

Building in the open at eb28.co/deskos. What would you most want to see next?

#BuildInPublic #IndieHackers #FinTech

---

## Post 8 — Why I'm selling it
"If your trading system is any good, why sell it instead of just running it?" Fair question. Here's the real answer.

Because I'm not selling a money machine. I'm selling a *control system* — and a control system gets better the more people run it, not worse.

The assumption baked into the question is that I have a secret edge and selling it dilutes it. But the product isn't a winning strategy I'm smuggling out the back door. It's the kill switch, the circuit breakers, the capital guard, the journal — the safety layer that sits *underneath* whatever strategy you run. There's no secret sauce to leak. There's infrastructure that more people stress-testing makes more robust.

The other honest reason: I think the safety problem matters more than my P&L. Agents that touch real money are about to be everywhere — Robinhood just made it official for equities. The number of people who can connect an agent to a broker is about to dwarf the number who've thought about how to stop one.

So no, this isn't "make money while you sleep." It's "if you're going to run autonomous agents near real money — and you are — run them behind something that can stop them." It's a license to software and control, not a promise of returns. The live book being down right now is me keeping that honest.

eb28.co/deskos if that's your kind of thing.

#BuildInPublic #Bootstrapping #FinTech #RiskManagement
