---
version: alpha
name: CadetCatch Marketing Design System
description: Conversion-focused brand system for the CadetCatch homepage and Coast Guard Academy family photo guides.
colors:
  primary: "#F9B21B"
  night: "#061411"
  evergreen: "#10241E"
  shieldBrown: "#3A270B"
  actionOrange: "#C43A10"
  searchCyan: "#08C7D8"
  cream: "#FFF8E8"
  mist: "#EAF5F3"
  white: "#FFFFFF"
  ink: "#0B1714"
  muted: "#5F6F6A"
  line: "#D8E6E1"
typography:
  display:
    fontFamily: "Sora, Avenir Next, Segoe UI, sans-serif"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.045em"
  heading:
    fontFamily: "Sora, Avenir Next, Segoe UI, sans-serif"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Space Grotesk, Helvetica Neue, sans-serif"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0px"
  label:
    fontFamily: "Space Grotesk, Helvetica Neue, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: 10px
  md: 16px
  lg: 24px
  xl: 32px
  pill: 999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
components:
  app-store-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    height: 52px
  shield-badge:
    backgroundColor: "{colors.shieldBrown}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
  search-status:
    backgroundColor: "{colors.searchCyan}"
    textColor: "{colors.night}"
    rounded: "{rounded.pill}"
  guide-kicker:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.actionOrange}"
    rounded: "{rounded.pill}"
  cream-section:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
  proof-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  support-copy:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  trust-panel:
    backgroundColor: "{colors.evergreen}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
  guide-source-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# CadetCatch Marketing Design System

## Scope

This contract is intentionally scoped to `src/CadetCatch.jsx` and the static pages under `public/cc/`. The repository contains unrelated brands; CadetCatch tokens must not leak into those surfaces.

## Product identity

CadetCatch is the calm, capable photo-search companion for Coast Guard Academy parents. The experience should feel like a trusted family field kit: focused, protective, practical, and warm enough for the emotional reason a parent is searching for one familiar face.

Write to one parent who has opened a new gallery, zoomed into several group photos, and reached the end wondering whether they missed their cadet. Name that moment plainly. Lead with the familiar face and the memory the parent wants to keep, then explain the product mechanism. Avoid generic “families save time” language when a more specific parent moment is available.

Use the real CadetCatch shield icon, dark field-grid texture, signal gold, search cyan, and the orange already present in the iPhone app. The visual system should be unmistakably CadetCatch without mimicking an official U.S. Coast Guard or Academy website.

## Conversion hierarchy

Every marketing page has one primary action: download CadetCatch from the App Store. The App Store action must appear in the header, above the fold, after meaningful product proof, at the final close, and in a persistent mobile bar. Secondary links may explain how the app works or open the Swab Summer guide, but they may not compete visually with the download action.

The first viewport must answer four questions in order:

1. Who is this for? The Coast Guard Academy parent checking each new photo drop for their cadet.
2. What outcome does it create? A shorter, calmer path to the photos that deserve a closer look.
3. How does it work? Add one clear reference photo, enable photo pages, and review suggested matches yourself.
4. What should I do? Download the iPhone app free from the App Store.

## Typography

Use Sora for display and headings and Space Grotesk for body copy. Headlines are compact, high-contrast, and parent-led. Body copy should sound like one parent talking to another: conversational, specific, and plainspoken. Avoid military jargon, generic SaaS phrasing, vague time-saving claims, and long centered paragraphs.

## Color and imagery

Dark `night` and `evergreen` fields establish the brand. `primary` gold owns App Store actions. `searchCyan` communicates search, scanning, and progress. `actionOrange` appears only where it connects the marketing site to controls already visible inside the app.

Use real app screens as product proof. In the hero, place one screen inside a stable, contained grid next to a parent outcome statement. Do not overlap or rotate screenshots, and do not animate a `transform` on any element whose layout also depends on `translate`, `rotate`, or absolute positioning. Do not use abstract dashboards, stock military imagery, official seals, uniforms as decoration, or fabricated family photos. The app shield is a brand identifier, not an implication of government affiliation.

## Trust rules

- Say “possible matches” or “likely finds,” never guaranteed identification.
- Make clear that the family reviews every suggested match.
- State that the app is independent and is not affiliated with USCGA, USCG, or DHS.
- Never fabricate user counts, testimonials, ratings, or savings claims.
- Present current App Store pricing plainly: free download, $1.99 one-time options, and $12.99 Family Monthly.
- Keep tap targets at least 44px and body text at least 16px on mobile.

## Layout and motion

Use a compact parent-outcome hero, a specific gallery-search empathy section, visible product proof, a short three-step flow, privacy/trust proof, transparent pricing, and a decisive final CTA. On guide pages, preserve the usefulness of the article while placing a branded download module above the fold and in a sticky sidebar or mobile bar.

Motion should be subtle and functional. Small hover lifts are acceptable. Hero product graphics must stay static so the screenshots remain crisp, aligned, and fully inside the viewport at every breakpoint. Respect `prefers-reduced-motion`. Avoid parallax, autoplay video, scrolling marquees, or animations that delay the CTA.
