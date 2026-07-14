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

This contract is intentionally scoped to `src/CadetCatch.jsx`, CadetCatch-prefixed rules in `src/index.css`, and the static pages under `public/cc/`. The repository contains unrelated brands; CadetCatch tokens and layout rules must not leak into those surfaces.

## Frontend direction

### Visual thesis

CadetCatch should feel like a quiet family field journal at night: deep ink, warm paper, editorial serif type, one signal-gold action, and a real app screen presented with confidence and no decorative noise.

### Content plan

1. **Hero:** lead with the familiar face a parent is waiting to see, define CadetCatch as an iPhone app in the next sentence, explain that one clear cadet photo starts the search, show one App Store action, and present one dominant real app screen.
2. **Emotional context:** validate the waiting, limited contact, repeated gallery checking, and relief of a “swab sighting” before discussing the technology.
3. **Mechanism:** explain exactly how facial-similarity search does the first pass through the available indexed collection and creates a focused set of likely matches.
4. **Detail:** show the Roster → Search Photos → review/save workflow, the human-review boundary, real app screens, and transparent pricing through rows and dividers rather than card grids.
5. **Final action:** return to the next chance to see a familiar face and offer one decisive App Store action.

### Interaction thesis

- The hero copy enters in one restrained sequence while the product image stays physically static.
- A soft opacity-only halo gives the app screen presence without moving, rotating, or clipping it.
- Links and actions use one fast underline or arrow shift; motion never competes with reading and is removed under `prefers-reduced-motion`.

## Product identity

CadetCatch is the calm, capable photo-search companion for Coast Guard Academy parents. Write to one parent who has said goodbye, has limited contact with a son or daughter, and is checking a large photo drop for one reassuring glimpse. The product is not facial-recognition technology by itself. The product is a faster path to the photos that help a family feel connected: one clear reference photo, facial-similarity search across the available indexed event-photo collection, likely matches for the parent to review, and recognized moments saved to the iPhone.

The shield icon identifies the product. It must not imply affiliation with the Academy, U.S. Coast Guard, or DHS.

## Buyer and job to be done

The acute buyer is a parent or guardian during the seven weeks of Swab Summer, when the separation is new, direct contact is limited, and posted photos can carry unusual emotional weight. The broader buyer is a family member of any current cadet who follows training, athletics, and Academy events through large photo collections.

The functional job is to avoid opening every image and get a shorter review list. The emotional job is to find a reassuring glimpse, feel connected to a week the parent cannot witness, and preserve the moment. The social job is to send that “swab sighting” to grandparents, siblings, and friends waiting at home.

## Conversion hierarchy

The only visually dominant action is downloading CadetCatch from the App Store. A photo-guide link may appear as plain text. Do not place two filled or bordered actions beside each other in the hero.

The first viewport must communicate, in order:

1. CadetCatch is an iPhone app for Coast Guard Academy parents.
2. It helps a parent find a son or daughter in large Academy photo drops.
3. One clear cadet photo starts a facial-similarity search across the available indexed collection.
4. CadetCatch returns likely matches so the parent can skip most photo-by-photo searching.
5. The parent reviews every possible match, saves recognized photos, and makes the final identity decision.
6. The iPhone app is free to download.

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

Sound like a calm parent who understands the pride, worry, and waiting, not a product engineer describing a search system. Use “your son or daughter,” “the face you know,” “the moment you recognize,” and “everyone waiting at home” when emotion is useful. Use plain, specific product language immediately afterward: one clear cadet photo, the available indexed photo collection, likely matches, and photos saved to the iPhone.

Validate the parent without dramatizing the cadet’s experience. The warmest copy should connect the search to seeing that a cadet is okay, finding a moment from a week the family could not witness, and sharing it with loved ones. Explain facial-recognition or facial-similarity search once in everyday language, then call it “the search.” Avoid generic family claims, unexplained software jargon, military jargon beyond familiar audience terms, invented testimonials, and repeated explanations.

## Trust rules

- Say “possible matches” or “likely finds,” never guaranteed identification.
- State that the parent reviews every suggestion.
- Never imply that CadetCatch scans every photo on the internet, every private gallery, or the user's entire iPhone photo library.
- Describe the searchable corpus as the available indexed Academy and event-photo collection unless a current, measured inventory supports a more specific claim.
- State that CadetCatch is independent and not affiliated with USCGA, USCG, or DHS.
- Never fabricate ratings, reviews, user counts, testimonials, corpus totals, search speed, or quantified time-saved claims.
- Present current App Store pricing plainly: free download, $1.99 one-time options, and $12.99 Family Monthly.
- Keep tap targets at least 44px and body text at least 16px on mobile.

## Responsive and motion rules

The header and hero must fit naturally at common desktop sizes. On mobile, the headline, body, and App Store action must appear before the product image. The mobile download bar may remain, but it must be visually quiet and must not obscure page content.

Respect `prefers-reduced-motion`. Never animate layout-critical transforms on product images. No parallax, autoplay video, marquee, scroll-jacking, or motion that delays the primary action.
