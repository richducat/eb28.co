# eb28.co

This repo is a Vite + React site configured for GitHub Pages.

## Rork-Style Builder Tool

- Route: `/rork`
- API endpoint: `/api/rork-build`
- Optional env var: `OPENAI_API_KEY` (used for model-backed generation)

If `OPENAI_API_KEY` is not set, the builder still works using a deterministic Expo project template mode.

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
