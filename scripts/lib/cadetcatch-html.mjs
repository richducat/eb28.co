const CADETCATCH_APP_STORE_URL = 'https://apps.apple.com/us/app/cadetcatch/id6769565852';

export function injectCadetCatchAnalyticsLoader(html) {
  const eb28AnalyticsLoader = /\s*<script data-analytics-site="eb28">[\s\S]*?<\/script>/i;
  const cadetCatchLoader = `
    <script data-analytics-site="cadetcatch" src="/site-analytics.js?v=20260715-meta-launch"></script>`;

  if (!eb28AnalyticsLoader.test(html)) {
    throw new Error('Unable to locate the marked EB28 analytics loader in the route template');
  }

  return html.replace(eb28AnalyticsLoader, cadetCatchLoader);
}

export function injectCadetCatchNoscriptFallback(html, basePath = '') {
  const normalizedBase = basePath ? `/${String(basePath).replace(/^\/+|\/+$/g, '')}` : '';
  const href = (slug = '') => `${normalizedBase}/${slug}`.replace(/\/{2,}/g, '/');
  const fallback = `    <noscript>
      <main data-noscript-site="cadetcatch" style="padding: 32px; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a;">
        <h1>CadetCatch</h1>
        <p>Find Coast Guard Academy cadet photos faster and review possible matches yourself.</p>
        <nav aria-label="CadetCatch resources">
          <ul>
            <li><a href="${href()}">CadetCatch home</a></li>
            <li><a href="${href('swab-summer-photos/')}">Swab Summer photo guide</a></li>
            <li><a href="${href('support/')}">Support</a></li>
            <li><a href="${href('privacy/')}">Privacy</a></li>
            <li><a href="${CADETCATCH_APP_STORE_URL}">Download on the App Store</a></li>
          </ul>
        </nav>
        <p>CadetCatch is independent and is not affiliated with USCGA, USCG, or DHS.</p>
      </main>
    </noscript>`;
  const eb28Fallback = /\s*<noscript>\s*<main data-noscript-site="eb28"[\s\S]*?<\/main>\s*<\/noscript>/i;

  if (!eb28Fallback.test(html)) {
    throw new Error('Unable to locate the EB28 noscript fallback in the route template');
  }

  return html.replace(eb28Fallback, `\n${fallback}`);
}
