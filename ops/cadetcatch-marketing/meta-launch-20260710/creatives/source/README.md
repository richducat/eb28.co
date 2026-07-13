# CadetCatch launch creative source package

State: **DRAFT / PAUSED**. These assets are not authorization to publish or activate spend.

## Source rules

- The three app UI source images come from the shipping CadetCatch storefront UI in `public/cc/img/`.
- `synthetic-demo-profile.png` and `synthetic-guide-reader.png` were generated specifically for this launch. They depict fictional civilian adults only.
- No Academy, USCG, or DHS marks, seals, uniforms, facilities, testimonials, ratings, or real cadets are used.
- No biometric, facial-scan, target-reticle, or “AI recon” visual language is used.
- The disclosure is burned into every paid static and every video frame: `Independent; not affiliated with USCGA, USCG, or DHS.`

## Re-render

From the repository root:

```bash
node ops/cadetcatch-marketing/meta-launch-20260710/creatives/source/render-creatives.mjs
```

Then render the videos from the numbered PNG frames with the commands documented in `storyboards.md`.

The final copy source of truth remains `../creative-specs.csv`.
