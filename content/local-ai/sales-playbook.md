# EB28 Local AI — Sales & Delivery Playbook

Internal. Not published. The public offer lives at `https://eb28.co/local-ai/`;
package names and prices come from `src/localAiOffer.js` — change them there and
the homepage, `/local-ai/`, the site assistant, and SEO data all update together.

## The offer in one line

> "I set up simple AI for local businesses — it texts back missed calls, follows
> up with leads, asks for reviews, and chases invoices. Fixed price, I explain it
> in plain English, and I keep it running."

| Package | Setup | Monthly | Core promise |
|---|---|---|---|
| AI Front Desk | $1,500 | $250 | Never lose a customer to a missed call |
| Follow-Up Machine | $2,000 | $300 | Every lead, review, and invoice gets followed up |
| AI in Plain English (workshop) | $400 flat | — | 90 min on-site; credited toward a package within 30 days |

Founding offer (on the site): first 3 Brevard clients get 50% off setup in exchange
for honest feedback you can quote. Once 3 are signed, remove the line from
`LOCAL_AI_FOUNDING_OFFER` in `src/localAiOffer.js` and add their real quotes to
`public/testimonials-config.json` (with written permission — never invent one).

## 30-second pitch (say it out loud until it is boring)

"You know how when you're on a job and the phone rings and you can't pick up?
Most of those people just call the next business. I set up a simple system so
the second you miss a call, they get a text from your business — 'Sorry we missed
you, what can we help with?' — and it can even book them. You don't have to learn
anything. Flat price, and I'm local, so if it breaks you call me, not a call center.
Want me to show you what it looks like on your phone?"

Then show the text thread on `/local-ai/` on your phone. The demo sells it.

## The free 20-minute checkup (discovery)

Ask, write down the answers, and do not pitch until the end.

1. "Walk me through what happens when someone calls and you can't answer."
2. "Roughly how many calls or messages do you miss in a busy week?"
3. "What's one job worth to you, on average?" → *missed calls × job value = the number you quote back to them.*
4. "When someone asks for a quote, how long until they hear back?"
5. "How do you ask for Google reviews today?"
6. "How much is sitting in unpaid invoices right now?"
7. "What questions do customers ask you over and over?"
8. "What software do you already use?" (calendar, QuickBooks, Jobber, Housecall Pro, Square, etc.)
9. "What should a computer never say on your behalf?" (prices, promises, refunds)

Close: "Based on what you told me, the one thing that would save you the most is
___. That's the ___ package, $___ to set up and $___ a month. Want me to write it
up on one page so you can look it over?"

## Objections — plain answers

- **"I'm not a tech person."** — "Good, you don't need to be. If you can read a text, you can use this. I do the setup."
- **"Will it say something dumb to my customers?"** — "It only uses answers you approve. Anything it's unsure about goes to you. It never quotes a price or promises anything."
- **"That's expensive."** — Go back to their number: "You said you miss about __ calls a week and a job is worth about $__. If this saves one job a month, it's paid for." If price is still the issue, offer the $400 workshop (credited toward a package).
- **"I'll think about it."** — "Totally fair. Can I send you the one-pager and check back Thursday?" Put the date on your calendar.
- **"Can't I just do this myself with ChatGPT?"** — "Some of it, yes, and the workshop shows you how. The packages are for people who'd rather have it done and kept working."
- **"What if I want to stop?"** — "Month-to-month, 30 days notice. Every account is in your name, so nothing is held hostage."

## Where to find the first clients (Melbourne / Brevard)

Do these in person. Target: 15–20 real conversations in 30 days → 3 paid clients.

- **Chamber of Commerce events** in Melbourne/Palm Bay/Viera — check the current calendar and go to after-hours mixers.
- **BNI and other referral networking groups** in Brevard — visit as a guest; one seat per profession means AI/automation is often open.
- **Businesses you already know** — your barber, mechanic, contractors, restaurant owners. Ask: "Who do you know who misses a lot of calls?"
- **Walk-ins on slow mornings** at trades/salon/auto businesses with a one-page leave-behind. Call their number first: if it goes to voicemail, that's your opener.
- **Google Business Profile** for EB28 under "AI consultant" / "Marketing consultant" in Melbourne, FL, linking to `/local-ai/`.
- **Existing EB28 web clients** — offer AI Front Desk as an add-on.

Track every conversation in one place (name, business, date, next step, follow-up date).

## Delivery — how each package gets built

Keep it boring and repeatable. Same stack for every client; accounts in **the client's name**.

**AI Front Desk**
- Business texting number + missed-call text-back (e.g. Twilio or the client's existing phone/VoIP system if it supports it).
- **US texting registration (A2P 10DLC)** is required for business texting from a local number and can take several days to a few weeks to approve — start it the day they sign. Budget for it in the "within two weeks" promise.
- Website chat that answers only from an approved FAQ sheet; hands off to a person for anything else.
- Booking: their existing calendar/booking tool, or a simple booking link.
- Owner alert by text for every new conversation.

**Follow-Up Machine**
- Lead follow-up sequence (3–5 polite touches, stops when they reply or book).
- Review requests after each completed job. Ask everyone — do not filter to only happy customers (Google disallows "review gating").
- Invoice reminders through their existing invoicing tool where possible (QuickBooks, Square, Stripe, Jobber all have reminders — configuring what they already pay for is often the fastest win).
- Past-customer check-ins: **marketing texts need prior written consent** under US texting rules. Use email for past customers unless they opted in to texts.

**Workshop**
- 90 minutes on-site. Set up business-plan accounts (ChatGPT or Claude) in their name, cover what not to paste in (customer SSNs, card numbers, health info), and practice on their real tasks: quote replies, social posts, job notes, review responses.

**Not taking on (for now):** anything handling patient health records (HIPAA) or legal case files. Say so up front — it builds trust.

## What the monthly plan covers (and what to actually do each month)

- Weekly: glance at the logs; confirm texts are sending and the chat is answering correctly.
- Monthly: send a one-page plain-English report — calls caught, leads followed up, reviews requested, invoices reminded — and one small improvement.
- Same-day response to "it's not working" texts.
- Re-check third-party fees (texting, AI usage) so nothing surprises the client.

## One-page proposal template

```
[Business name] — AI setup plan                     Prepared by EB28, [date]

What's slowing you down
  • [their words from the checkup]

What we'll set up
  • [3–5 bullets, plain English]

What it will NOT do
  • Quote prices, promise dates, or issue refunds without you

Price
  Setup: $____ (one-time, fixed)
  Monthly care plan: $____ /month, month-to-month, 30 days notice to cancel
  Other tool fees (in your name): [list each, e.g. texting number ~$__/mo]

Timeline
  Live within ~2 weeks of signing (texting registration can add time)

You own every account. If you leave, everything stays with you.

Signature ____________________   Date ________
```

Collect payment by Stripe invoice (or a Payment Link) once the one-pager is signed.

## 30-day scorecard

| Week | Goal |
|---|---|
| 1 | GBP live, 5 conversations, 1 checkup booked |
| 2 | 5 more conversations, 3 checkups, 1 proposal out |
| 3 | 5 more conversations, first client signed and setup started |
| 4 | 3 paid clients total (founding offer), first testimonial requested |

If 3 people pay, double down. If not, the checkup notes will tell you why —
adjust the package or price, not the whole business.
