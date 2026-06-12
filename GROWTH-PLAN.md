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
