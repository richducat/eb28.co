# Design QA: EB28 Conversion Homepage and Client Intake

Source visual truth: `/var/folders/30/k7mjq62s6js2m01tck7py0380000gn/T/TemporaryItems/NSIRD_screencaptureui_r5GLmg/Screenshot 2026-07-23 at 10.07.10 PM.png`

Supporting source: `/Users/richardducat/Desktop/Design.pdf`

Homepage implementation: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-home-conversion-desktop-v4.png`

Homepage mobile: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-home-conversion-mobile.png`

Reference comparison: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-home-reference-comparison-v4.png`

Client intake desktop: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-get-started-desktop.png`

Client intake mobile: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-get-started-mobile.png`

Client intake final offer: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-get-started-offer-desktop.png`

Client intake final offer mobile: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-get-started-offer-mobile.jpg`

Free-build annual terms: `/Users/richardducat/GITHUB/eb28.co/output/playwright/eb28-free-build-annual-terms-desktop.png`

## Comparison setup

- Desktop source and implementation: 1445 x 1051 CSS pixels at device scale factor 1.
- Mobile implementation: 390 x 844 CSS pixels at device scale factor 1.
- Homepage state: initial load with the EB28 assistant ready for input.
- Intake states: initial service selection, mobile service selection, and final website-offer decision on both desktop and mobile.
- Density normalization: none. The supplied source and desktop implementation use identical pixel dimensions.

## Full-view comparison

The homepage follows the supplied split-screen direction: a 1320 px frame, 76 px navigation, conversion copy on the left, and the assistant on the right. The final pass aligns the main frame, split, vertical rhythm, assistant position, CTA hierarchy, annual website offer, and lower operator strip with the reference.

The content is intentionally adapted for the real EB28 offer. The prominent price is the $98 monthly equivalent, with the full $1,176 upfront requirement stated immediately beside it and the $800 one-time website-only alternative visible in the same decision area.

## Intake behavior

- Multi-service selection works for website, social/content, SEO, lead generation, automation/CRM, and app/software work.
- The question queue changes with the selected services.
- Contact, business context, service-specific questions, design direction, website offer, next step, and consent are included in one structured brief.
- Prospect links from the 32940 concept library preserve the local-business slug in the intake.
- The public design conversation exposes only high-level direction. Final copy, offer architecture, page maps, content calendars, production assets, implementation files, and automation logic stay in the EB28 production workflow.
- The final step presents the same website offer even when the client begins with a non-website service.
- The mobile final-offer capture uses a social/content-only intake and proves the annual website offer is still presented at 390 x 844.
- The intake discloses that FormSubmit processes form delivery to EB28 and limits the stated use to reviewing and replying to the project request.
- No payment is taken and no Stripe checkout link is activated on the intake form.

## Findings and iterations

1. The first homepage pass was structurally correct but the hero padding was too large, the frame too wide, and the assistant too low.
2. The second pass corrected the 1320 px frame, 76 px header, desktop hero geometry, assistant alignment, input treatment, and header CTA visibility.
3. The pricing QA found a static metadata replacement bug affecting text beginning with `$1`; the route generator now inserts metadata with literal-safe callbacks.
4. The 32940 verification found stale national-chain and duplicate concept files. The generator now removes stale generated HTML and publishes only the 91 current locally controlled concepts.
5. The final desktop and mobile review found no actionable P0, P1, or P2 visual defects.

## Verification

- Production build: passed.
- SEO/content/social validation: passed.
- Free-build offer gate: 13 of 13 checks passed.
- Local-concept capture gate: 91 public and 91 deploy copies checked, with zero failures.
- Generated metadata contains the literal `$1,176 total ($98/month)` copy and no embedded replacement markup.
- Homepage assistant, mobile navigation, multi-service intake, and final offer screen were exercised in a real browser.
- Browser console errors: none.
- No test lead or payment was submitted.

## Final result

final result: passed
