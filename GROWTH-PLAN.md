# EB28 Zero-Budget Growth Plan

Goal stated: 100 customers/day with $0 spend. This plan is honest about what that
takes and sequences the free work that compounds toward it.

## The math (why "100/day" is a ladder, not a switch)

- 100 paying customers/day at a strong 2% visitor-to-customer rate requires
  **~5,000 high-intent visitors/day** (~150k/mo). That is top-tier SaaS traffic.
- Before this branch, the site had **no analytics and no working checkout** —
  baseline conversion was 0% because nobody could pay.
- The honest zero-budget ladder: **measure → convert → compound traffic**.
  Milestones: first self-serve sale → 1 sale/day → 1 sale/day per 100 visitors
  → scale the visitor side. Skipping steps just burns the traffic you do get.

## Stage 0 — Already automated (keep running)

- Blog engine: 2 posts/day (6 AM / 6 PM ET) across local-seo, melbourne-web-design,
  lead-automation, private-ai, conversion clusters. Sitemap + RSS/JSON feeds +
  social packages auto-generated. This is the traffic engine; do not touch it.

## Stage 1 — Convert (this branch)

- Self-serve checkout: paste Stripe Payment Links into `public/checkout-config.json`;
  every Buy button on the site activates automatically. Stripe Payment Links cost
  nothing to create — Stripe only takes its per-transaction cut.
- Autonomous onboarding: Stripe redirects buyers to `/welcome/?p=<product>`, which
  collects everything needed to fulfill, emailed + queued automatically.
- Analytics: every page (site + blog) loads GA4 when a measurement ID is pasted
  into `public/analytics-config.json`. Create the ID free at analytics.google.com.
  No rebuild needed; leave it empty and nothing loads. (The site is served by
  GitHub Pages from the committed `docs/` folder — no Vercel anywhere.)

## Stage 2 — Free distribution (each item is $0, ~30–60 min, compounding)

1. **Google Business Profile** for EB28 / Melbourne Web Studio — the blog already
   targets Melbourne FL keywords; a GBP listing is the single highest-leverage
   free local channel. Post the auto-generated social packages there weekly.
2. **Publish the social packages** sitting in `output/eb28-social/` (drafted by the
   content engine but never posted). One LinkedIn + one X/Twitter account, posting
   the 2 daily articles. The footer's social icons currently link nowhere — point
   them at the real profiles.
3. **Google Search Console**: verify eb28.co, submit the sitemap, and run the
   existing `npm run eb28:seo -- --submit-sitemap --inspect-urls` daily review with
   Search Console connected so the SEO loop gets real query data.
4. **Directories** (free, high-intent): Clutch, G2 (Recon Agent), Product Hunt
   launch for Recon Agent, BBB/Chamber for Melbourne FL, Apple App Store cross-links.
5. **Recon Agent communities**: the product solves a real Stripe-founder pain.
   Answer reconciliation questions in IndieHackers / r/stripe / founder Slack
   groups with the free blog guides (not the sales page) — link the guide, let the
   site convert.

## Stage 2.5 — Proof loop (testimonials, $0)

- The homepage has a testimonials section that activates the moment real quotes
  are added to `public/testimonials-config.json`. Never add invented quotes —
  fake testimonials violate FTC rules.
- The collection loop is built in: every paid onboarding ends with a check-in
  ask. After each delivered $10 / $1,000 / Recon Agent setup, email the customer
  one question ("did this work for you?") and paste good replies (with
  permission) into the config. Three real quotes beat thirty fake-sounding ones.
- The $1,000 White-Glove Onboarding is the natural upsell in every $10 build
  delivery email: "want us to set up the whole thing for you?"

## Stage 3 — Compound

- Watch analytics weekly: which blog cluster brings visitors that click Buy?
  Feed winners back into `content/eb28/topic-backlog.json` so the engine writes
  more of what converts.
- Add an email capture + weekly digest once traffic justifies it (free tiers:
  Buttondown/MailerLite). Revisit when the site clears ~100 visitors/day.
- When revenue exists, the fastest path past organic ceilings is paid traffic —
  fund it from sales, not savings.

## What no one can promise

No tool, agency, or AI can guarantee 100 customers/day — and anything promising
that for $0 is selling you something. What is guaranteed: before this work, the
conversion rate was structurally 0%. Now every visitor the blog engine earns has
a working path to becoming a paying customer without human involvement.

## 2026-07-09 — Full-auto growth systems (live)

Three self-publishing systems now run via launchd, all lint-gated by
`scripts/compliance_lint.py` (fail closed), all carrying the standard
software-not-advice / risk-of-loss disclaimer, all auto-committing only
their own generated paths and pushing to main:

1. **The Tape, Daily** (`ai.eb28.tape.daily`, Mon–Fri 5:30pm ET) —
   `scripts/generate-tape-daily.py` renders one shift-report page per market
   day from the Robinhood desk journal + fund snapshot to `docs/tape/`,
   with a 30-day backfilled archive. Fails closed on stale/missing snapshot.
2. **/answers hub** (`ai.eb28.answers.nightly`, daily 8:45pm ET) —
   `scripts/generate-answers-hub.py` + 20-question seed cluster in
   `content/eb28/answers.json`. Publishes 1 new page/night and refreshes 2
   old ones — capped per Google's March 2026 scaled-content enforcement;
   every page carries first-party tape data, FAQPage JSON-LD, visible
   last-updated dates, and CFTC/FINRA source links.
3. **Weekly tape recap** (`ai.eb28.tape.weekly`, Sunday 5pm ET) —
   `scripts/generate-tape-weekly-recap.py` aggregates the week's tape into
   a blog post through `scripts/generate-eb28-blog.mjs`.

Plists live in `ops/launchd/` and are installed to `~/Library/LaunchAgents`.
