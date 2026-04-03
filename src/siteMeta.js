export const SITE_NAME = 'EB28';
export const SITE_ORIGIN = 'https://eb28.co';
export const DEFAULT_THEME_COLOR = '#020617';
export const DEFAULT_COLOR_SCHEME = 'dark';
export const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const NOINDEX_ROBOTS = 'noindex, nofollow';

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const DEFAULT_IMAGE = `${SITE_ORIGIN}/assets/execution_grid.png`;
const FUNDMANAGER_IMAGE = `${SITE_ORIGIN}/assets/agents_grid.png`;

const ORGANIZATION_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/favicon.svg`,
};

const WEBSITE_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    publisher: {
        '@id': ORGANIZATION_ID,
    },
};

const BASE_ROUTE_META = {
    siteName: SITE_NAME,
    themeColor: DEFAULT_THEME_COLOR,
    colorScheme: DEFAULT_COLOR_SCHEME,
    ogType: 'website',
    robots: DEFAULT_ROBOTS,
};

const ROUTE_META = {
    home: {
        ...BASE_ROUTE_META,
        key: 'home',
        path: '/',
        title: 'Private AI Infrastructure & Revenue Automation | EB28',
        description:
            'EB28 builds private AI infrastructure, local LLM deployments, RAG systems, and revenue automation for businesses that need secure execution and measurable growth.',
        image: DEFAULT_IMAGE,
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            WEBSITE_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'ProfessionalService',
                name: SITE_NAME,
                url: SITE_ORIGIN,
                image: DEFAULT_IMAGE,
                description:
                    'Private AI infrastructure, local LLM deployment, secure RAG systems, and revenue automation services.',
                areaServed: ['Florida', 'United States'],
                provider: {
                    '@id': ORGANIZATION_ID,
                },
                serviceType: [
                    'Private AI infrastructure',
                    'Local LLM deployment',
                    'RAG implementation',
                    'Revenue automation',
                ],
            },
        ],
    },
    appbuilder: {
        ...BASE_ROUTE_META,
        key: 'appbuilder',
        path: '/appbuilder/',
        title: 'EB28 App Builder | AI App Concepts to Production Source',
        description:
            'Generate sharper product concepts, distinct visual systems, and production-ready source with the EB28 App Builder.',
        image: DEFAULT_IMAGE,
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'EB28 App Builder',
                applicationCategory: 'DeveloperApplication',
                operatingSystem: 'Web',
                isAccessibleForFree: true,
                url: `${SITE_ORIGIN}/appbuilder/`,
                image: DEFAULT_IMAGE,
                description:
                    'An AI-assisted web app builder that expands prompts into design systems, fundamentals checks, and production-ready source files.',
                provider: {
                    '@id': ORGANIZATION_ID,
                },
            },
        ],
    },
    fundmanager: {
        ...BASE_ROUTE_META,
        key: 'fundmanager',
        path: '/fundmanager/',
        title: 'Fund Manager Live Dashboard | EB28',
        description:
            'Monitor the EB28 fund manager orchestrator with live lane health, blocker counts, and execution telemetry.',
        image: FUNDMANAGER_IMAGE,
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'EB28 Fund Manager',
                applicationCategory: 'FinanceApplication',
                operatingSystem: 'Web',
                isAccessibleForFree: true,
                url: `${SITE_ORIGIN}/fundmanager/`,
                image: FUNDMANAGER_IMAGE,
                description:
                    'A live monitoring dashboard for the EB28 fund manager orchestrator, lane health, and execution telemetry.',
                provider: {
                    '@id': ORGANIZATION_ID,
                },
            },
        ],
    },
    reconcile: {
        ...BASE_ROUTE_META,
        key: 'reconcile',
        path: '/reconcile/',
        title: 'Recon Agent Founder Beta | Daily Stripe Reconciliation Copilot | EB28',
        description:
            'Recon Agent gives Stripe users a simple daily report showing what matched, what looks wrong, and what needs attention.',
        image: DEFAULT_IMAGE,
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'Recon Agent',
                applicationCategory: 'FinanceApplication',
                operatingSystem: 'Web',
                offers: {
                    '@type': 'Offer',
                    price: '17',
                    priceCurrency: 'USD',
                    url: `${SITE_ORIGIN}/reconcile/`,
                },
                url: `${SITE_ORIGIN}/reconcile/`,
                image: DEFAULT_IMAGE,
                description:
                    'A daily reconciliation copilot for Stripe activity, payout review, finance email context, and exception handling.',
                provider: {
                    '@id': ORGANIZATION_ID,
                },
            },
        ],
    },
    dash: {
        ...BASE_ROUTE_META,
        key: 'dash',
        path: '/dash/',
        title: 'Command Center Dashboard | EB28',
        description:
            'Internal command center for activity feeds, cron health, search, and TYFYS telemetry.',
        image: DEFAULT_IMAGE,
        robots: NOINDEX_ROBOTS,
        includeInSitemap: false,
        structuredData: [],
    },
    notfound: {
        ...BASE_ROUTE_META,
        key: 'notfound',
        path: '/',
        title: 'Page Not Found | EB28',
        description: 'The page you requested could not be found on EB28.',
        image: DEFAULT_IMAGE,
        robots: NOINDEX_ROBOTS,
        includeInSitemap: false,
        structuredData: [],
    },
};

export const STATIC_ROUTE_OUTPUTS = [
    { routeKey: 'home', outputPath: 'index.html' },
    { routeKey: 'appbuilder', outputPath: 'appbuilder/index.html' },
    { routeKey: 'fundmanager', outputPath: 'fundmanager/index.html' },
    { routeKey: 'reconcile', outputPath: 'reconcile/index.html' },
    { routeKey: 'dash', outputPath: 'dash/index.html' },
    { routeKey: 'notfound', outputPath: '404.html' },
];

function normalizePathname(pathname = '/') {
    const normalized = String(pathname).toLowerCase().replace(/\/+$/, '');
    return normalized || '/';
}

export function detectRouteKey({ pathname = '/', hostname = '' } = {}) {
    const normalizedPathname = normalizePathname(pathname);
    const normalizedHostname = String(hostname).toLowerCase();

    if (
        normalizedPathname === '/dash' ||
        normalizedHostname === 'dashboard.eb28.co' ||
        normalizedHostname === 'command-center.eb28.co'
    ) {
        return 'dash';
    }

    if (normalizedPathname === '/appbuilder') {
        return 'appbuilder';
    }

    if (normalizedPathname === '/fundmanager' || normalizedHostname === 'fundmanager.eb28.co') {
        return 'fundmanager';
    }

    if (normalizedPathname === '/reconcile' || normalizedHostname === 'reconcile.eb28.co') {
        return 'reconcile';
    }

    return 'home';
}

export function getRouteMeta(routeOrLocation = 'home') {
    const routeKey =
        typeof routeOrLocation === 'string' ? routeOrLocation : detectRouteKey(routeOrLocation);
    const baseMeta = ROUTE_META[routeKey] || ROUTE_META.home;

    return {
        ...baseMeta,
        canonicalUrl: `${SITE_ORIGIN}${baseMeta.path}`,
        routeKey,
    };
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeJsonForScript(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildSeoMarkup(routeOrLocation = 'home') {
    const meta = getRouteMeta(routeOrLocation);
    const lines = [
        `    <title>${escapeAttribute(meta.title)}</title>`,
        `    <meta name="description" content="${escapeAttribute(meta.description)}" />`,
        `    <meta name="theme-color" content="${escapeAttribute(meta.themeColor)}" />`,
        `    <meta name="color-scheme" content="${escapeAttribute(meta.colorScheme)}" />`,
        `    <meta name="robots" content="${escapeAttribute(meta.robots)}" />`,
        `    <link rel="canonical" href="${escapeAttribute(meta.canonicalUrl)}" />`,
        '    <meta property="og:locale" content="en_US" />',
        `    <meta property="og:site_name" content="${escapeAttribute(meta.siteName)}" />`,
        `    <meta property="og:type" content="${escapeAttribute(meta.ogType)}" />`,
        `    <meta property="og:title" content="${escapeAttribute(meta.title)}" />`,
        `    <meta property="og:description" content="${escapeAttribute(meta.description)}" />`,
        `    <meta property="og:url" content="${escapeAttribute(meta.canonicalUrl)}" />`,
        `    <meta property="og:image" content="${escapeAttribute(meta.image)}" />`,
        `    <meta property="og:image:alt" content="${escapeAttribute(meta.title)}" />`,
        '    <meta name="twitter:card" content="summary_large_image" />',
        `    <meta name="twitter:title" content="${escapeAttribute(meta.title)}" />`,
        `    <meta name="twitter:description" content="${escapeAttribute(meta.description)}" />`,
        `    <meta name="twitter:image" content="${escapeAttribute(meta.image)}" />`,
    ];

    if (meta.structuredData.length > 0) {
        lines.push(
            `    <script type="application/ld+json">${escapeJsonForScript(meta.structuredData)}</script>`,
        );
    }

    return `${lines.join('\n')}\n`;
}

export function buildRobotsTxt() {
    return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}

export function buildSitemapXml() {
    const urls = Object.values(ROUTE_META)
        .filter((meta) => meta.includeInSitemap)
        .map((meta) => `${SITE_ORIGIN}${meta.path}`);

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((url) => `  <url><loc>${escapeAttribute(url)}</loc></url>`),
        '</urlset>',
        '',
    ].join('\n');
}
