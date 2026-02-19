# eb28.co

This repo is a Vite + React site configured for GitHub Pages.

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
