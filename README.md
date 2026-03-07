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
