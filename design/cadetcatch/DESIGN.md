---
version: beta
name: CadetCatch Editorial Marketing System
description: A restrained, parent-first marketing system for CadetCatch and its family photo guides.
colors:
  primary: "#F4B942"
  night: "#0B0D0C"
  forest: "#141A16"
  ivory: "#F4EFE5"
  paper: "#FBFAF6"
  white: "#FFFFFF"
  ink: "#111512"
  muted: "#626862"
  line: "#D8D9D2"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.045em"
  heading:
    fontFamily: "Manrope, Avenir Next, Segoe UI, sans-serif"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, Avenir Next, Segoe UI, sans-serif"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0px"
  label:
    fontFamily: "Manrope, Avenir Next, Segoe UI, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  sm: 4px
  md: 10px
  lg: 18px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 88px
components:
  primary-action:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.night}"
    rounded: "{rounded.sm}"
    height: 56px
  dark-field:
    backgroundColor: "{colors.night}"
    textColor: "{colors.ivory}"
  editorial-section:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  product-frame:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.lg}"
  support-copy:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
  footer:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
---

# CadetCatch Editorial Marketing System

## Scope

This contract is intentionally scoped to `src/CadetCatch.jsx` and the static pages under `public/cc/`. The repository contains unrelated brands; CadetCatch tokens and layout rules must not leak into those surfaces.

## Frontend direction

### Visual thesis

CadetCatch should feel like a quiet family field journal at night: deep ink, warm paper, editorial serif type, one signal-gold action, and a real app screen presented with confidence and no decorative noise.

### Content plan

1. **Hero:** brand, one parent promise, one App Store action, and one dominant real app screen.
2. **Support:** name the exact gallery-search ritual and show why a shorter review matters.
3. **Detail:** explain the three-step workflow, privacy boundary, real app screens, and transparent pricing through rows and dividers rather than card grids.
4. **Final action:** return to the next-gallery moment and offer one decisive App Store action.

### Interaction thesis

- The hero copy enters in one restrained sequence while the product image stays physically static.
- A soft opacity-only halo gives the app screen presence without moving, rotating, or clipping it.
- Links and actions use one fast underline or arrow shift; motion never competes with reading and is removed under `prefers-reduced-motion`.

## Product identity

CadetCatch is the calm, capable photo-search companion for Coast Guard Academy parents. Write to one parent who has opened a new gallery, zoomed into several group photos, and reached the end wondering whether they missed their cadet. Lead with the face and memory that parent wants to find, then explain the mechanism.

The shield icon identifies the product. It must not imply affiliation with the Academy, U.S. Coast Guard, or DHS.

## Conversion hierarchy

The only visually dominant action is downloading CadetCatch from the App Store. A photo-guide link may appear as plain text. Do not place two filled or bordered actions beside each other in the hero.

The first viewport must communicate, in order:

1. This is for a parent searching Academy photo drops.
2. CadetCatch narrows the photos worth reviewing.
3. The parent reviews every possible match.
4. The iPhone app is free to download.

## Composition rules

- Treat the opening viewport as a poster, not a dashboard.
- Use a full-bleed dark field with one text column and one dominant product screen.
- No grid texture, gradient mesh, floating UI, hero card, pill cluster, stat strip, icon mosaic, or decorative dashboard.
- Use only night, warm paper, neutral ink, and signal gold as the dominant system. Do not reintroduce cyan and orange as competing marketing accents.
- Prefer editorial rows, rules, large numbers, and whitespace over cards.
- Keep major section copy left aligned and short enough to scan in seconds.
- Use Cormorant Garamond only for emotionally led display headlines; use Manrope for the brand, body, navigation, labels, and utility text.

## Imagery

Real CadetCatch screens are the product proof. In the hero, use one screen at a stable size with a simple device edge and an opacity-only halo. Never overlap, rotate, translate, or float screenshots. All product images must remain fully inside the viewport at every supported breakpoint.

Use multiple screens only when each advances the workflow. Do not put an app screen inside another decorative card or fabricate family, military, or Academy imagery.

## Parent voice

Use plain, specific language: a new gallery, group photos, one familiar face, and the doubt that the parent may have missed it. Avoid generic family claims, software jargon, military jargon, and repeated explanations.

## Trust rules

- Say “possible matches” or “likely finds,” never guaranteed identification.
- State that the parent reviews every suggestion.
- State that CadetCatch is independent and not affiliated with USCGA, USCG, or DHS.
- Never fabricate ratings, reviews, user counts, testimonials, or time-saved claims.
- Present current App Store pricing plainly: free download, $1.99 one-time options, and $12.99 Family Monthly.
- Keep tap targets at least 44px and body text at least 16px on mobile.

## Responsive and motion rules

The header and hero must fit naturally at common desktop sizes. On mobile, the headline, body, and App Store action must appear before the product image. The mobile download bar may remain, but it must be visually quiet and must not obscure page content.

Respect `prefers-reduced-motion`. Never animate layout-critical transforms on product images. No parallax, autoplay video, marquee, scroll-jacking, or motion that delays the primary action.
