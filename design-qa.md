# Design QA: Free Website Build

Source visual truth: `/var/folders/30/k7mjq62s6js2m01tck7py0380000gn/T/TemporaryItems/NSIRD_screencaptureui_r5GLmg/Screenshot 2026-07-23 at 10.07.10 PM.png`

Supporting source: `/Users/richardducat/Desktop/Design.pdf`

Implementation screenshot: `/Users/richardducat/GITHUB/eb28.co/output/playwright/free-build-reference-match-desktop.png`

Mobile implementation screenshot: `/Users/richardducat/GITHUB/eb28.co/output/playwright/free-build-reference-match-mobile.png`

Side-by-side comparison: `/Users/richardducat/GITHUB/eb28.co/output/playwright/free-build-design-comparison.png`

## Comparison setup

- Desktop viewport and source pixels: 1445 x 1051.
- Implementation CSS viewport and pixels: 1445 x 1051 at device scale factor 1.
- Mobile implementation viewport: 390 x 844 at device scale factor 1.
- State: initial page load with the assistant closed to follow-up content and the form untouched.
- Density normalization: none required. Source and desktop implementation use identical pixel dimensions.

## Full-view comparison evidence

The comparison image places the supplied screenshot and browser-rendered implementation side by side at identical dimensions. The implementation matches the 1320 px frame beginning at x=41, the 76 px navigation, the 731/589 px hero split, the 878 px hero height, the x=772 divider, the supplied headline wrapping, the dark assistant panel, the $98 checklist, and the operator strip.

## Focused comparison evidence

The headline, lead paragraph, CTA group, pricing checklist, assistant header, three initial chat bubbles, quick actions, booking action, and assistant input are readable at full comparison size. No additional crop was needed. The assistant implementation measures x=818, y=277, 497 x 474; the supplied target is approximately x=818, y=278, 500 x 474.

## Findings

- P3: Assistant card is approximately 3 px narrower than the supplied screenshot because the responsive right-panel padding resolves against the exact split width. This does not change hierarchy, wrapping, or usability.
- P3: Browser font rasterization produces small optical differences in some body copy. Font family, weight, scale, wrapping, and hierarchy remain faithful.

## Required fidelity surfaces

- Fonts and typography: passed. Sora and Space Grotesk match the existing EB28 brand and reproduce the reference hierarchy and wrapping.
- Spacing and layout rhythm: passed. Frame, split, hero height, major offsets, controls, borders, and strip align with the reference.
- Colors and visual tokens: passed. Warm white, near-black, EB28 green, violet action, and navy/green/violet stage match.
- Image quality and asset fidelity: passed. The target contains no photographic or illustrative hero assets. The EB28 mark and interface icons use existing brand text and the installed icon library.
- Copy and content: passed. All visible hero, pricing, assistant, navigation, and operator-strip copy is verbatim.
- Responsiveness: passed. The 390 px layout has no horizontal overflow; navigation, hero, assistant, form, and CTAs remain usable.
- Accessibility and behavior: passed. Semantic landmarks, labels, focusable controls, quick assistant response, form validation, and zero console errors were verified. No lead form was submitted.

## Comparison history

1. Initial browser capture matched the structure but the frame was centered 21.5 px too far right, the hero expanded 10 px beyond the target, the assistant was 26 px too tall, and the booking/send icons differed.
2. Fixed the frame origin, locked the desktop hero geometry, tightened assistant density, and matched the visible booking/send treatments.
3. Post-fix comparison confirms the reference geometry and copy with no actionable P0, P1, or P2 differences.

## Final result

final result: passed
