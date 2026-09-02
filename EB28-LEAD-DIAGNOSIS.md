# EB28 lead diagnosis (2 September 2026)

Why eb28.co has produced no leads or clients, ranked by cause, with a 30-day plan.
Evidence: this repository at commit 7bfba4c, the committed production build rendered
in Playwright, curl against the live site, Gmail, HubSpot, Search Console notices and
the committed weekly SEO review, Google Calendar, Fathom and web search. Third-party
personal data is deliberately left out of this file because the repository is public.

## Short answer

Almost nobody reaches eb28.co, and the few who do have no way to reach a human.
Google sent 5 clicks in the 28 days to 9 August and zero clicks on every commercial
query in July. The social accounts have one post each and the bio link sells trading
software. The only outreach ever run was one 33-minute burst of 68 cold emails on
26 June with no follow-up to the 62 businesses that did not answer. The 22 home
inspectors imported into HubSpot on 23 July have never received an email.

A visitor who does arrive sees "$1,176 paid upfront" from a vendor with no name, no
phone, no booking link, no reviews and a portfolio of the owner's own trading and app
projects. Every button, including "Book a 15-minute fit call", opens a nine-screen
questionnaire that discards the name and phone typed on screen two if the visitor
gives up. The record matches: zero real form submissions ever, zero fit calls, zero
deals. Paid work (York Inspections, HomeTree Digital) came through the owner's own
network, which has never been asked for a review or referral.

## The funnel by the numbers

| Measure | Value | Source |
| --- | ---: | --- |
| Google clicks, 28 days to 9 Aug | 5 | Search Console notice |
| July query rows: clicks / impressions | 0 / 109 | output/seo-daily/latest.md |
| Cold emails sent 26 Jun -> replies | 68 -> 1 ("No thank") | Gmail sent mail |
| Follow-up touches since 27 Jun | 0 | Gmail sent mail |
| Real form submissions, ever | 0 (12 owner tests) | Gmail, FormSubmit |
| Fit calls, deals, invoices | 0 | Calendar, Fathom, HubSpot |
| Inspector contacts -> emails sent | 22 -> 0 | HubSpot |
| Screens before a lead is sent on /get-started/ | 9 (17 required inputs) | Playwright walk |
| Days since the content engine last ran | 31 | content/eb28/content-state.json |

Positions in July: "melbourne web studio" 41 impressions at 61.7, "melbourne website
builder" 22 at 59.6, "private ai for business" 15 at 81.9, "melbourne fl local seo"
5 at 41.2, brand query "eb28" 6 at position 8 behind the Binder EB28 sailplane.

## Root causes, ranked

1. **No distribution channel has ever run for more than a day, and the funnel has
   been idle since early August (critical).** Templated blog on pages 4 to 10; one
   post per social network with all 92 generated packages draft-only and the Buffer
   audit failing since 25 Aug; one morning of outbound; content engine stopped 2 Aug;
   commits 5 to 8 Aug went to other products; last agency-page edit 29 Jul. About
   13,000 lines of lead-ops tooling manage a pipeline whose state is gitignored.
   Evidence: `output/seo-daily/latest.md`, `social/eb28/README.md:69-76`,
   `scripts/publish-eb28-buffer.mjs:278-280,585-588`, `src/StartPage.jsx:14-24,60`,
   `content/eb28/content-state.json`, `scripts/reddit-watcher.py:24-31`, `.gitignore`.
2. **The two prospect lists were touched once or never, and the emails had no phone,
   booking link or full name (high).** 68 sends from a personal Gmail signed
   "Rich / EB28", CTA into the long intake, 5 bounces, franchise targets, and the
   day-2/5/10 follow-ups in `scripts/generate-32940-lead-ops.mjs:1280-1300` never
   sent. The 22 inspectors have zero emails although a live case study exists at
   `public/york/inspection-request.html`. The owner's normal email signature already
   carries a business cell and a Motion booking link.
3. **Every real client came through the owner's network and none was asked for a
   review or referral; the site sells to restaurants while the audience actually
   built for (home inspectors) has no path to EB28 (high).**
   `public/testimonials-config.json` is empty and nothing in `src/` reads it, so
   `GROWTH-PLAN.md:53-57` is wrong. `/york/` and `/HIP/` are live but unlinked,
   uncredited and absent from the sitemap; `/32940/` has 92 mockups and zero
   inspectors.
4. **No Google Business Profile, no phone or address on the site or in its schema,
   and the brand name belongs to a German glider (high).** `src/siteMeta.js:39-46`
   Organization schema is name, url, logo; the client Thomas Custom Homes gets a full
   LocalBusiness schema at `:65-85`. `src/App.jsx:196-201` footer has no phone,
   address, person or entity. `GROWTH-PLAN.md:36-38` named GBP the highest-leverage
   free channel; never started.
5. **No way to reach a human: every CTA dead-ends in a nine-screen intake that
   discards contact details typed on screen two; the Motion page and business cell
   appear nowhere (high, hours to fix).** `src/App.jsx:82,188-191`,
   `src/components/ConversionAssistant.jsx:29-34,93-95`,
   `src/GetStartedPage.jsx:244-247,376,401-418,437-449,474,567-572,611-641,738-742`;
   no localStorage; live bundle has 0 tel:, usemotion, calendly or cal.com links;
   `src/FreeWebsiteBuildPage.jsx:31-49` fake slot buttons.
6. **Anonymous vendor with zero client proof asking strangers to prepay $1,176, plus
   invented proof on /melbournewebstudio/ (high).** No name, photo, entity, phone,
   privacy or terms page; `src/FreeWebsiteBuildPage.jsx:12` publishes a personal
   Gmail. `src/MelbourneWebStudioPage.tsx:3749-3862` renders "Successful Projects"
   with unverifiable metrics on Unsplash photos and a "Creative House" case study
   linking to `/tch/`; `:947-987` fake team and `:3997-4057` self-quoted testimonials
   exist unrendered; `:3627,3647,3653` alert "coming soon!" for privacy and terms.
7. **A lab of about 25 side projects speaking process language to five audiences
   (medium).** `src/App.jsx:73-79,101-108,114-116,147-148,199`; `docs/sitemap.xml`
   submits nine product URLs; www.eb28.co certificate mismatch; dead subdomains in
   `src/main.jsx:10-55`; padlock copy in `src/GetStartedPage.jsx:667-668,703,706-712`.
8. **A "$98/month" that is $1,176 upfront, labeled free, forced on every intake,
   never bought, no refund terms, inert checkout (medium).** `src/offerTerms.js:7-15`;
   `public/checkout-config.json` every checkoutUrl empty; upfront line introduced in
   c794f3f on 28 Jul (166c015 said "Built free. $98 a month if you keep it."); HubSpot
   0 deals, 0 invoices.

## What is working

- FormSubmit delivery works: a labelled diagnostic POST on 1 Sep returned HTTP 200 and
  arrived within a second. Do not rebuild it.
- Lighthouse: homepage 90, blog 100. The build deploys reliably; live equals repo.
- Assets already owned: a business phone line and Motion booking page (in the email
  signature), 92 mockups plus an unused follow-up sequence and phone script, the York
  Inspections case study, the 22-contact inspector list, and the "Melbourne Web
  Studio" name (the only term with search demand).

## 30-day plan

Week 1
- Point both fit-call CTAs and the assistant link at the Motion page; add a tel: link
  and an identity strip (EB28 LLC, Richard Ducat, Melbourne FL) to header, footer,
  intake success screen and /free-website-build/; replace the personal Gmail with a
  domain address; rebuild and deploy. (3 h)
- Create and start verifying a Google Business Profile for EB28 LLC as a service-area
  business with the same name, phone, services, photos and links. (2 h)
- Rebuild the June outbound state from Gmail into a private sheet or HubSpot; remove
  bounces, the opt-out and franchise locations. Keep it out of the repo. (2 h)
- Email touch one personally to the five nearest inspectors with the York request
  page and a Motion link; log as HubSpot notes. (2 h)
- Ask York and HomeTree for a written quote, a Google review once the profile is
  live, intros, and permission for a "Built by EB28" credit. (1 h)
- Add a GA4 ID to `public/analytics-config.json`; set up Gmail send-as for a domain
  address. (1 h)

Week 2
- Edit `makeBody()` and `followUpSteps` in `scripts/generate-32940-lead-ops.mjs`:
  full signature with phone and Motion link, call link first, drop the prepay line,
  ask one question. Never run a send script unattended. (1.5 h)
- Send the day-2 follow-up to the roughly 58 non-responders, 20 a day. (3 h)
- Call five local businesses per weekday from the /32940/ list with the existing
  phone script. (5 h)
- Inspector touch two (60-second screen recording) to the first five; touch one to
  the other 17. (2 h)
- Cut /get-started/ to a three-field short path that posts immediately; POST a
  partial lead when the contact step validates; persist to localStorage; make phone
  and investment optional; show the offer step only for website enquiries; replace
  the blocking consent checkbox with a disclosure; delete the padlock block. (4 h)
- Add Bing Places, Apple Business Connect and Yelp with identical NAP. (2 h)

Week 3
- Rewrite the homepage fold for one buyer; move the price below the fold; remove
  process language and the "Founders" and "Marketing teams" audiences. (4 h)
- Add a "Who you'll work with" block; wire `testimonials-config.json` into
  `src/App.jsx`; relabel VoltGuard and Thomas Custom Homes; move the owner's own
  products out of the agency portfolio and footer. (4 h)
- Delete the fabricated case-study numbers, fake team and self-quoted testimonials
  from `src/MelbourneWebStudioPage.tsx`; publish real /privacy/ and /terms/ pages
  with refund and cancellation terms. (3 h)
- Extend the schema to LocalBusiness; restrict the sitemap to agency pages and blog;
  noindex product pages; fix the www certificate; remove dead hostname routes; point
  the @eb28co bio at the homepage. (2 h)
- Make the offer true: a real monthly Stripe subscription or "from $800 plus $98/month
  hosting" quoted after a call; stop calling the build free; add a working payment
  link if a self-serve price stays. (3 h)
- Outbound continues: day-10 close-the-loop email, five calls a day, inspector touch
  three, and a review or intro ask in every conversation. (6 h)

Week 4
- Review indicators; build the next 20 to 30 prospects in the niche that replied best;
  regenerate mockups for it; post two profile updates from existing packages. (6 h)
- Blog triage: noindex or redirect zero-impression posts; retarget every blog CTA to
  /get-started/ plus phone and Motion; set the author to a named person; hand-write
  one "Web design in Melbourne, FL" service page. Do not restart the engine. (6 h)
- Commit a redacted weekly pipeline count and schedule a 30-minute weekly review. (1 h)

## Stop doing

- Content-engine refreshes and social package generation (0 clicks, 92 unpublished).
- Building lead-ops and automation tooling (about 13,000 lines, 21 npm commands, an
  empty gitignored pipeline, a Reddit watcher on trading subreddits).
- Routing "Book a fit call" into the intake; fake review-window slot buttons.
- Leading with "$1,176 paid upfront", calling the build free, re-pricing without a
  transaction.
- One-touch email blasts with no follow-up, no phone, no booking link, no full name;
  emailing franchise locations and unverified addresses.
- Publishing a personal Gmail as the business contact.
- Presenting Recon Agent, App Builder, Fund Manager Live, games and affiliate sites as
  agency work; product URLs in the sitemap; the @eb28co bio pointing at Desk OS.
- Hosting fabricated proof and "coming soon!" privacy and terms alerts.
- Measuring against "100 customers/day with $0 spend"; measure conversations per week
  and one signed client per month instead.
- Splitting the 30 days across other products.

## Leading indicators (weekly)

| Indicator | Baseline | Target |
| --- | --- | --- |
| Outbound touches logged, by touch number | 0 since 27 Jun | 40 to 60 per week from week 2 |
| Replies and positive replies, per list | 1 in 63 | 5 to 10 percent, 1 to 3 positive |
| Calls booked or held | 0 ever | 2 per week by week 3 |
| Real form submissions (full plus partial) | 0 ever | 1 or more per week by week 4 |
| GBP verified, views, calls, reviews | no profile | verified by week 3, 3 reviews in 30 days |
| Search Console clicks per 28 days | 5 | trend only |
| GA4 sessions, intake starts, contact completions, tel and Motion clicks | unmeasurable | data from week 2 |
| Review and referral asks sent | 0 ever | every conversation |
| Proposals sent, first paid client | 0 deals, 0 invoices | 1 signed client by day 30 |

## Considered and set aside

Confirmed as facts but not causes of the missing leads at today's traffic: unread lead
inbox (no real lead has ever arrived), analytics off, success-screen promises and no
auto-reply (FormSubmit auto-response does not fire for AJAX posts), unanchored bundle
claims, the trading-software bio link (no social audience yet), the fake homepage
assistant, blog CTAs to the legacy page and its duplicate cPanel host, the offline
content engine (it produced zero clicks while running), and dead Vercel API routes.
Fix these when the plan above starts sending people to the site.

## Method

Nine independent finders (lead plumbing, offer, messaging, trust, conversion UX, SEO,
distribution, operations, business focus) each reported up to four findings; overlaps
were merged; each finding went to a separate verifier instructed to refute it; a
completeness critic named five gaps that were investigated and verified the same way;
36 raised, 24 after merging, 23 confirmed, 10 set aside. One labelled diagnostic form
submission was sent to confirm delivery; no prospect was contacted and nothing on the
live site was changed.
