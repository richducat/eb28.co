# HCM Monthly Ads Report (HomeTree Digital / Howard Capital Management)

Reconstructed 2026-09-04 from the July 2026 deck and the Asana trail. Update this file
whenever Nick or Kyle changes the process.

## Where things live

- Asana task, recurring monthly: `HCM Monthly Ads Report -- <Month> <Year>` in project
  **Digital Support** (gid 1204787211134478). Nick duplicates last month's task. Due ~4th of the month.
  - July 2026: gid 1216774004952529 (complete). August 2026: gid 1217352762477589 (due 2026-09-04).
  - Subtask `Update Hotjar slides` is assigned to **Kyle**. He drops the Hotjar screenshots into the deck.
- Task description carries two SharePoint links (HomeTree tenant, needs HomeTree login):
  - Example template deck (HowardCM site).
  - **Instructional Guide** (HomeTreeDigital site) — the official how-to.
- Deliverable: `Howard CM - Ads Campaign Summary - <Month> <Year>.pptx` plus a PDF export.
  July flow: Richard posted a SharePoint link on the task ("Ready for review pending verified
  follower counts"), Nick reviewed, added the key-takeaway copy, attached the final PPTX + PDF,
  and marked complete.
- Hotjar: `insights.hotjar.com`, reachable via the **HomeTree Marketing** Chrome profile (per Kyle).
- Related weekly job: `Weekly Leads Report (M/D)` every Monday, Kyle sends the email; Richard's
  subtask is `Update HCM Weekly Leads Report in Teams`.

## Deck anatomy (21 slides) and what changes each month

Date subtitle on every slide: `<Month> 1st, 2026 – <Month> 31st, 2026`.
Benchmarks are static text and do not change month to month.

| Slide | Title | Source | Fields to replace |
|---|---|---|---|
| 1 | Cover | — | Month |
| 2 | Campaign Snapshot: LinkedIn Overview (HCM) | LinkedIn Campaign Manager + Page analytics, date range set explicitly | Number of Ads, Followers [+MoM%], Impressions, Link Clicks, Monthly Spend; big numbers + doughnuts for Avg. Impressions per ad, CPM, CTR, CPC (This Month vs Lifetime); Key Takeaways copy |
| 3 | Campaign Snapshot: X Overview (HCM & 401k) | X Ads Manager | Same set as slide 2 |
| 4 | Campaign Snapshot: Meta Overview (HCM & 401k) | Meta Ads Manager | Same stats block; doughnuts are Avg. Impressions, CPM, **Cost per Reported Lead**, **Avg. Leads per Ad**; takeaways name lead count split 401(k) vs HCM |
| 5 | Google Analytics Snapshot (HCM Landing Page) | GA4, page = `/hcm-proprietary-risk-management-strategies/` | Page Traffic (sessions), Engagement Rate, Avg. Engagement Time, Viewed Form; doughnut values Bounce Rate, Page Views, Form View Events, Avg. Engagement Time; Sitewide Traffic Source chart (active users by channel); takeaways: sitewide MoM %, unique visitors, paid-social visitors and share, form views → submissions → conversion % |
| 6 | Hotjar Heatmap Overview (HCM Landing Page) | Hotjar (Kyle supplies screenshots) | Two pictures + narrative (clicks, mouse movement, scroll depth %) |
| 7 | Hotjar Heatmap: User Stories (HCM Landing Page) | Hotjar | Two pictures + narrative (mobile share %, recordings observations) |
| 8 | Google Analytics Snapshot (401k Optimizer Landing Page) | GA4, page = `/maximize-your-401k-retirement-savings/` | Same as slide 5 minus the traffic-source chart |
| 9 | Hotjar Heatmap Overview (401k Optimizer Landing Page) | Hotjar | Pictures + narrative |
| 10 | Hotjar Heatmap: User Stories (401k Optimizer Landing Page) | Hotjar | Pictures + narrative |
| 11–13 | Campaign Performance: LinkedIn Detailed View (1/3–3/3) | Campaign Manager ad-level export | Table rows: Campaign, Ad, Type, Audience, Cost, Impressions, CPM, CTR, Clicks. `*` marks ads not currently running |
| 14–16 | Campaign Performance: X Detailed View (1/3–3/3) | X Ads Manager ad-level export | Same columns. `(Legacy)` campaigns carry `*` |
| 17–20 | Campaign Performance: Meta Detailed View (1/4–4/4) | Meta ad-level export | Same columns |
| 21 | Closing | — | nothing |

Row counts in July: LinkedIn 34 ads, X 37, Meta 55. If August counts differ, add or remove
table rows and renumber the `(n/3)` / `(n/4)` titles.

## Known template defects carried from July (fix when rebuilding)

- Slide 8 doughnut charts hold the same values as slide 5 (Bounce 77.87, Page Views 1382,
  Form Views 422, Engagement 5s). They were never updated for the 401k page.
- Slide 3 X doughnuts: the series named "CPC" holds 0.43 / 0.11 and the series named "CTR"
  holds 0.79 / 0.43. Values look swapped relative to the labels. Verify before reuse.
- Slide 7 narrative ends mid-sentence ("...showing curiosity about the product and").
- Slides 7 and 9 currently carry identical narrative text (94.5% mobile, 45.2% scroll).

## Monthly runbook

1. Open the new Asana task; confirm the due date and who owns the Hotjar subtask.
2. Export ad-level data for the calendar month from LinkedIn, X, and Meta with the date range
   set explicitly. Pull follower counts from each page's native analytics.
3. Pull GA4 for both landing pages plus sitewide channel breakdown for the month.
4. Fill the snapshot slides (2–5, 8), then the detail tables (11–20). Charts: edit the
   embedded chart data, not the number text only.
5. Wait for Kyle's Hotjar screenshots; write the narrative for slides 6, 7, 9, 10.
6. Draft Key Takeaways per channel. Nick edits these before sending.
7. Save as `Howard CM - Ads Campaign Summary - <Month> 2026.pptx`, export PDF, post the link
   on the Asana task with "Ready for review", flag anything unverified.
