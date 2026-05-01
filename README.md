# eb28.co

This repo is a Vite + React site configured for GitHub Pages.

## Fundmanager Ops

- VPS install/runbook: `ops/systemd/README.md`
- Validation commands:
  - `python3 -m unittest ops.tests.test_fundmanager_runtime -v`
  - `python3 -m ops.scripts.validate_runtime`

## EB28 App Builder

- Route: `/appbuilder`
- API endpoint: `/api/appbuilder-build`
- Optional env var: `OPENAI_API_KEY` (used for model-backed generation)

Key behavior:
- Accepts short prompts and expands them into a richer internal build brief.
- Applies visual-direction + complexity controls for more distinct output styles.
- Enforces a fundamentals checklist (UX, conversion, accessibility, responsiveness, performance, and more).
- Exports runnable source as ZIP.

If `OPENAI_API_KEY` is not set, the builder still works using a deterministic template mode.

## Limitless Credit GPS

- Route: `/limitless/`
- Build type: mobile-first responsive React PWA shell inside the existing Vite app
- Core loop: goal selection -> credit profile quiz -> dashboard -> credit move simulator -> plain-English result -> action plan
- Local MVP storage: browser `localStorage`
- Supabase-ready tables: `users`, `credit_profiles`, `simulations`, `action_plans`, `action_items`, `lessons`, `offers`, `offer_clicks`, `consultation_requests`

Key files:

- `src/LimitlessCreditGPS.jsx` - app shell, screens, local state, route handling
- `src/creditgps/simulationEngine.ts` - rule-based directional simulator and score-drop explanations
- `src/creditgps/mockData.js` - goal, quiz, lesson, offer, and action-plan seed data
- `src/creditgps/components.jsx` - reusable app cards and badges
- `public/limitless/manifest.webmanifest` - PWA manifest

The simulator intentionally avoids exact score predictions, approval guarantees, pre-approved language, guaranteed removals, and legal advice. It uses educational language such as "likely direction," "estimated impact," "may affect your score," "actual results vary," and "approval is not guaranteed."

Next development steps:

- Connect Supabase Auth and persist the existing local state objects into the listed tables.
- Add event tracking for simulator runs, saved simulations, offer reviews, and consultation requests.
- Replace mock offer URLs with approved partner links and compliance-reviewed disclosures.
- Add AI coach only after the rule-based simulator and compliance copy are stable.

## Deploying to GitHub Pages

1. Build the static site:

   ```bash
   npm run build
   ```

   The production output is written to `docs/`.

2. Commit and push changes (including `docs/`).

3. In GitHub repository settings, enable **Pages** and set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/docs`

4. The custom domain is configured through `public/CNAME` (copied to `docs/CNAME` on build) with value `eb28.co`.
