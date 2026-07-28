import {
    THOMAS_COMPANY_NAME,
    THOMAS_OFFICE_ADDRESS,
    THOMAS_PRIMARY_ORIGIN,
    THOMAS_SEO_PAGES,
    getThomasCanonicalUrl,
    getThomasEb28Path,
    getThomasPageByRouteKey,
    getThomasPageForLocation,
    isThomasPrimaryHostname,
} from './thomasSeoPages.js';
import {
    GROWTH_HOSTING_UPFRONT_PRICE,
    WEBSITE_ONLY_PRICE,
} from './offerTerms.js';

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
const WEED_AUTHORITY_IMAGE = `${SITE_ORIGIN}/weedauthority/weedauthority-hero.png`;
export const THOMAS_CUSTOM_HOMES_SITE_ORIGIN = THOMAS_PRIMARY_ORIGIN;
const THOMAS_CUSTOM_HOMES_IMAGE = `${SITE_ORIGIN}/tch/og-image.png`;
const THOMAS_CUSTOM_HOMES_CUSTOM_DOMAIN_IMAGE = `${THOMAS_CUSTOM_HOMES_SITE_ORIGIN}/og-image.png`;
const MELBOURNE_WEB_STUDIO_CANONICAL_URL = `${SITE_ORIGIN}/melbournewebstudio/`;
const FREE_WEBSITE_BUILD_CANONICAL_URL = `${SITE_ORIGIN}/free-website-build/`;
const GET_STARTED_CANONICAL_URL = `${SITE_ORIGIN}/get-started/`;
const CADETCATCH_IMAGE = `${SITE_ORIGIN}/cc/img/find-cadet-photos.png`;
const CADETCATCH_SITE_ORIGIN = 'https://cadetcatch.com';

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

function buildThomasLocalBusinessSchema(imageUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: THOMAS_COMPANY_NAME,
        url: THOMAS_CUSTOM_HOMES_SITE_ORIGIN,
        image: imageUrl,
        areaServed: [
            'Viera, Florida',
            'Cocoa, Florida',
            'Melbourne, Florida',
            'Rockledge, Florida',
            'Suntree, Florida',
            'Brevard County, Florida',
        ],
        address: {
            '@type': 'PostalAddress',
            streetAddress: '550 S N. Cocoa Blvd.',
            addressLocality: 'Cocoa',
            addressRegion: 'FL',
            postalCode: '32922',
            addressCountry: 'US',
        },
        description:
            'Thomas Custom Homes builds custom homes in Viera, Cocoa, Melbourne, Rockledge, Suntree, and across Brevard County with build-on-your-lot, relocation, and personalized planning support.',
    };
}

function buildThomasStructuredData(page, imageUrl) {
    const canonicalUrl = getThomasCanonicalUrl(page, THOMAS_CUSTOM_HOMES_SITE_ORIGIN);
    const structuredData = [
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: THOMAS_COMPANY_NAME,
            url: THOMAS_CUSTOM_HOMES_SITE_ORIGIN,
        },
        buildThomasLocalBusinessSchema(imageUrl),
        {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: page.h1,
            url: canonicalUrl,
            description: page.metaDescription,
        },
    ];

    if (page.kind === 'service') {
        structuredData.push({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: page.serviceName || page.h1,
            serviceType: page.serviceName || page.h1,
            areaServed: 'Brevard County, Florida',
            provider: {
                '@type': 'LocalBusiness',
                name: THOMAS_COMPANY_NAME,
                address: THOMAS_OFFICE_ADDRESS,
            },
            url: canonicalUrl,
        });
    }

    if (Array.isArray(page.faqItems) && page.faqItems.length > 0) {
        structuredData.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faqItems.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                },
            })),
        });
    }

    return structuredData;
}

function buildThomasRouteMeta(page, { primaryHost }) {
    const image = primaryHost ? THOMAS_CUSTOM_HOMES_CUSTOM_DOMAIN_IMAGE : THOMAS_CUSTOM_HOMES_IMAGE;
    const shouldIndex = primaryHost && page.kind !== 'utility';

    return {
        ...BASE_ROUTE_META,
        key: page.routeKey,
        path: getThomasEb28Path(page),
        title: page.title,
        description: page.metaDescription,
        image,
        siteName: THOMAS_COMPANY_NAME,
        themeColor: '#1c1917',
        colorScheme: 'light',
        robots: shouldIndex ? DEFAULT_ROBOTS : NOINDEX_ROBOTS,
        includeInSitemap: false,
        canonicalUrlOverride: getThomasCanonicalUrl(page, THOMAS_CUSTOM_HOMES_SITE_ORIGIN),
        structuredData: buildThomasStructuredData(page, THOMAS_CUSTOM_HOMES_CUSTOM_DOMAIN_IMAGE),
    };
}

const THOMAS_ROUTE_META = Object.fromEntries(
    THOMAS_SEO_PAGES.map((page) => [
        page.routeKey,
        buildThomasRouteMeta(page, {
            primaryHost: false,
        }),
    ]),
);

const ROUTE_META = {
    home: {
        ...BASE_ROUTE_META,
        key: 'home',
        path: '/',
        title: 'EB28 | Websites, Marketing, Apps & Automation in Melbourne, FL',
        description:
            'Start an EB28 website, marketing, app, SEO, lead-generation, or automation project with a guided client brief. Website offer: $1,176 upfront for 12 months of Growth Hosting, or $800 website-only.',
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
                    'Expert local app development, high-converting web design, private AI infrastructure, local LLM deployment, secure RAG systems, and revenue automation services.',
                areaServed: ['Melbourne, Florida', 'Florida', 'United States'],
                provider: {
                    '@id': ORGANIZATION_ID,
                },
                serviceType: [
                    'App Development',
                    'Website Builder',
                    'Free website build',
                    'Growth Hosting',
                    'Weekly local blog posts',
                    'Private AI infrastructure',
                    'Local LLM deployment',
                    'RAG implementation',
                    'Revenue automation',
                    'Lead generation'
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
    bluechip: {
        ...BASE_ROUTE_META,
        key: 'bluechip',
        path: '/bluechip/',
        title: 'Bluechip by EB28 | Dumb Money Just Got a Desk',
        description:
            'They call it dumb money. Bluechip is a small, honest equities desk you run yourself: Robinhood’s official Agentic API, a public tape, a kill switch. Live beta.',
        image: FUNDMANAGER_IMAGE,
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'EB28 Bluechip — Founding Beta License',
                url: 'https://eb28.co/bluechip/',
                description:
                    'Bluechip is EB28’s flagship US-equities desk in live beta: licensed software the operator runs in an isolated Robinhood Agentic sub-account, behind a kill switch, with a public trade tape.',
                brand: { '@type': 'Brand', name: 'EB28' },
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'USD',
                    price: '98',
                    availability: 'https://schema.org/LimitedAvailability',
                    url: 'https://eb28.co/bluechip/',
                },
            },
        ],
    },
    daytradingbot: {
        ...BASE_ROUTE_META,
        key: 'daytradingbot',
        path: '/',
        title: 'DayTradingBot — The AI Stocks Desk on Robinhood’s Official Agentic API',
        description:
            'DayTradingBot is a small, honest AI equities desk you run yourself: built on Robinhood’s official Agentic Trading API, isolated sub-account, kill switch, and a public live tape. $98 founding beta.',
        image: FUNDMANAGER_IMAGE,
        includeInSitemap: false,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'DayTradingBot (EB28 Bluechip) — Founding Beta License',
                url: 'https://daytradingbot.net/',
                description:
                    'An AI equities desk the operator runs in an isolated Robinhood Agentic sub-account, behind a kill switch, with a public trade tape. Licensed software — not investment advice.',
                brand: { '@type': 'Brand', name: 'EB28' },
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'USD',
                    price: '98',
                    availability: 'https://schema.org/LimitedAvailability',
                    url: 'https://daytradingbot.net/',
                },
            },
        ],
    },
    setup: {
        ...BASE_ROUTE_META,
        key: 'setup',
        path: '/setup/',
        title: 'Desk Setup Portal | EB28',
        description:
            'Owner setup for your EB28 desk: connect your wallet in one click, fund your desk from your own wallet, and link Robinhood the safe way — on your machine.',
        image: FUNDMANAGER_IMAGE,
        robots: NOINDEX_ROBOTS,
        includeInSitemap: false,
        structuredData: [],
    },
    start: {
        ...BASE_ROUTE_META,
        key: 'start',
        path: '/start/',
        title: 'EB28 Desk OS — Start Here | Autonomous Trading Agents + Kill-Switch OS',
        description:
            'One link for everything EB28 Desk OS: get the software, watch the fleet trade live (losses included), and follow the build. Software license, not investment advice.',
        image: FUNDMANAGER_IMAGE,
        includeInSitemap: true,
        structuredData: [ORGANIZATION_SCHEMA],
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
    ...THOMAS_ROUTE_META,
    melbournewebstudio: {
        ...BASE_ROUTE_META,
        key: 'melbournewebstudio',
        path: '/melbournewebstudio/',
        canonicalUrlOverride: MELBOURNE_WEB_STUDIO_CANONICAL_URL,
        title: 'Melbourne Web Studio | Website Included + $98/mo Annual Hosting',
        description:
            'EB28 includes the custom website build with 12 months of Growth Hosting paid upfront at $1,176 total ($98/month). Website-only is $800 one-time.',
        image: DEFAULT_IMAGE,
        siteName: 'Melbourne Web Studio',
        themeColor: '#ffffff',
        colorScheme: 'light',
        includeInSitemap: true,
        structuredData: [
            {
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: 'Melbourne Web Studio',
                url: MELBOURNE_WEB_STUDIO_CANONICAL_URL,
                description:
                    'Melbourne Web Studio includes a custom website build with 12 months of Growth Hosting paid upfront at $1,176 total ($98/month), local SEO upkeep, weekly content, and lead capture.',
            },
            {
                '@context': 'https://schema.org',
                '@type': 'LocalBusiness',
                name: 'Melbourne Web Studio',
                url: MELBOURNE_WEB_STUDIO_CANONICAL_URL,
                image: DEFAULT_IMAGE,
                priceRange: '$$',
                areaServed: ['Melbourne, Florida', 'Brevard County, Florida', 'Space Coast'],
                description:
                    'Melbourne Web Studio helps local businesses launch owner-approved websites, managed hosting, local SEO foundations, weekly blog content, and lead capture.',
                provider: {
                    '@id': ORGANIZATION_ID,
                },
                serviceType: [
                    'Website design',
                    'Local SEO optimization',
                    'Managed website hosting',
                    'Weekly local blog posts',
                    'Growth Hosting',
                    'AI business automation',
                    'App development',
                    'Lead generation'
                ],
            },
        ],
    },
    freewebsitebuild: {
        ...BASE_ROUTE_META,
        key: 'freewebsitebuild',
        path: '/free-website-build/',
        canonicalUrlOverride: FREE_WEBSITE_BUILD_CANONICAL_URL,
        title: 'Free Website Build + Annual Growth Hosting | EB28',
        description:
            'EB28 includes the website build when 12 months of Growth Hosting are paid upfront at $1,176 total ($98/month). Website-only is $800 one-time.',
        image: DEFAULT_IMAGE,
        siteName: 'EB28 Growth Hosting',
        themeColor: '#fafaf9',
        colorScheme: 'light',
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'Service',
                name: 'Free Website Build + EB28 Growth Hosting',
                serviceType: 'Local business website design, hosting, SEO, and weekly content',
                url: FREE_WEBSITE_BUILD_CANONICAL_URL,
                areaServed: ['Melbourne, Florida', 'Brevard County, Florida', 'Florida', 'United States'],
                provider: {
                    '@id': ORGANIZATION_ID,
                },
                offers: [
                    {
                        '@type': 'Offer',
                        name: 'Free Website Build + 12 Months Growth Hosting',
                        price: String(GROWTH_HOSTING_UPFRONT_PRICE),
                        priceCurrency: 'USD',
                        description:
                            'The website build is included when 12 months of Growth Hosting are paid upfront at $1,176 total, equivalent to $98 per month.',
                        availability: 'https://schema.org/InStock',
                        url: FREE_WEBSITE_BUILD_CANONICAL_URL,
                    },
                    {
                        '@type': 'Offer',
                        name: 'Website Build Only',
                        price: String(WEBSITE_ONLY_PRICE),
                        priceCurrency: 'USD',
                        description:
                            'Website build only. Hosting, SEO upkeep, weekly content, and ongoing lead-routing support are not included.',
                        availability: 'https://schema.org/InStock',
                        url: FREE_WEBSITE_BUILD_CANONICAL_URL,
                    },
                ],
            },
            {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: 'Is the website build really free?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text:
                                'EB28 can prepare a limited first direction before payment. The full website build is included when the owner chooses and prepays the 12-month Growth Hosting plan.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'What is included in Growth Hosting?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text:
                                'Growth Hosting costs $1,176 upfront for the first 12 months, equivalent to $98 per month. It includes managed hosting, SSL, technical upkeep, local SEO structure, performance checks, and one weekly local blog post or Google Business content prompt.',
                        },
                    },
                ],
            },
        ],
    },
    getstarted: {
        ...BASE_ROUTE_META,
        key: 'getstarted',
        path: '/get-started/',
        canonicalUrlOverride: GET_STARTED_CANONICAL_URL,
        title: 'Start an EB28 Project | Client Intake',
        description:
            'Choose the EB28 services you need and complete a guided project brief for websites, content, SEO, lead generation, automation, apps, and custom software.',
        image: DEFAULT_IMAGE,
        themeColor: '#fbfbf9',
        colorScheme: 'light',
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: 'Start an EB28 Project',
                url: GET_STARTED_CANONICAL_URL,
                description:
                    'A guided client intake for EB28 website, marketing, content, SEO, lead-generation, automation, and software projects.',
            },
        ],
    },
    weedauthority: {
        ...BASE_ROUTE_META,
        key: 'weedauthority',
        path: '/weedauthority/',
        title: 'Weed Authority | Legal Cannabis and Medical Rec Check App',
        description:
            'Weed Authority is a premium iPhone app for finding legal cannabis retailers, checking official medical rec portals, tracking allotment privately, and shopping smarter before checkout.',
        image: WEED_AUTHORITY_IMAGE,
        siteName: 'Weed Authority',
        themeColor: '#050706',
        colorScheme: 'dark',
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'Weed Authority',
                applicationCategory: 'LifestyleApplication',
                operatingSystem: 'iOS',
                isAccessibleForFree: true,
                url: `${SITE_ORIGIN}/weedauthority/`,
                image: WEED_AUTHORITY_IMAGE,
                description:
                    'A native iPhone app for legal cannabis retailer discovery, official state medical cannabis portal access, private rec profile storage, and allotment planning.',
                provider: {
                    '@id': ORGANIZATION_ID,
                },
            },
        ],
    },
    cc: {
        ...BASE_ROUTE_META,
        key: 'cc',
        path: '/cc/',
        title: 'CadetCatch — Find the Cadet Photo You Have Been Waiting For',
        description:
            'CadetCatch helps Coast Guard Academy parents find a son or daughter in large event-photo collections using one clear reference photo, then review and save likely matches on iPhone.',
        image: CADETCATCH_IMAGE,
        siteName: 'CadetCatch',
        themeColor: '#061411',
        colorScheme: 'light',
        includeInSitemap: true,
        structuredData: [
            ORGANIZATION_SCHEMA,
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'CadetCatch',
                applicationCategory: 'LifestyleApplication',
                operatingSystem: 'iOS',
                offers: {
                    '@type': 'Offer',
                    name: 'Family Monthly',
                    price: '12.99',
                    priceCurrency: 'USD',
                    description: 'Auto-renewing monthly subscription. Free to download.',
                    url: 'https://apps.apple.com/us/app/cadetcatch/id6769565852',
                },
                url: 'https://apps.apple.com/us/app/cadetcatch/id6769565852',
                image: CADETCATCH_IMAGE,
                description:
                    'CadetCatch helps Coast Guard Academy parents search large event-photo collections with one clear cadet photo, review likely facial matches, and save the moments they recognize.',
                provider: {
                    '@id': ORGANIZATION_ID,
                },
            },
        ],
    },
    ccswabsummer: {
        ...BASE_ROUTE_META,
        key: 'ccswabsummer',
        path: '/cc/swab-summer-photos/',
        title: 'Find Your Cadet in Thousands of Swab Summer Photos | CadetCatch',
        description:
            'Find the Swab Summer sources families follow, then use one clear cadet photo to search the available indexed collection for likely matches to review and save.',
        image: CADETCATCH_IMAGE,
        siteName: 'CadetCatch',
        themeColor: '#f8fafc',
        colorScheme: 'light',
        includeInSitemap: true,
        structuredData: [],
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
    findmycustomers: {
        ...BASE_ROUTE_META,
        key: 'findmycustomers',
        path: '/findmycustomers/',
        title: 'AdMaster AI | EB28',
        description: 'Manage Apple, Google, Meta, TikTok, and X ads seamlessly with AI agents.',
        image: DEFAULT_IMAGE,
        includeInSitemap: true,
        structuredData: [],
    },
    welcome: {
        ...BASE_ROUTE_META,
        key: 'welcome',
        path: '/welcome/',
        title: 'Welcome Aboard | EB28',
        description: 'Payment received. Complete your two-minute onboarding and your EB28 setup starts immediately.',
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
    { routeKey: 'deskos', outputPath: 'deskos/index.html' },
    { routeKey: 'bluechip', outputPath: 'bluechip/index.html' },
    { routeKey: 'setup', outputPath: 'setup/index.html' },
    { routeKey: 'start', outputPath: 'start/index.html' },
    { routeKey: 'start', outputPath: 'links/index.html' },
    { routeKey: 'reconcile', outputPath: 'reconcile/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/onboarding/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/quiz/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/dashboard/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/simulator/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/simulator/input/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/simulator/result/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/score-drop/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/learn/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/offers/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/consultation/index.html' },
    { routeKey: 'creditgps', outputPath: 'limitless/plan/index.html' },
    ...THOMAS_SEO_PAGES.map((page) => ({
        routeKey: page.routeKey,
        outputPath: page.slug === '' ? 'tch/index.html' : `tch/${page.slug}/index.html`,
    })),
    { routeKey: 'melbournewebstudio', outputPath: 'melbournewebstudio/index.html' },
    { routeKey: 'freewebsitebuild', outputPath: 'free-website-build/index.html' },
    { routeKey: 'freewebsitebuild', outputPath: 'free-local-business-website/index.html' },
    { routeKey: 'getstarted', outputPath: 'get-started/index.html' },
    { routeKey: 'weedauthority', outputPath: 'weedauthority/index.html' },
    { routeKey: 'cc', outputPath: 'cc/index.html' },
    { routeKey: 'dash', outputPath: 'dash/index.html' },
    { routeKey: 'findmycustomers', outputPath: 'findmycustomers/index.html' },
    { routeKey: 'welcome', outputPath: 'welcome/index.html' },
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

    if (
        normalizedPathname === '/findmycustomers' ||
        normalizedHostname === 'findmycustomers.eb28.co'
    ) {
        return 'findmycustomers';
    }

    if (normalizedPathname === '/fundmanager' || normalizedHostname === 'fundmanager.eb28.co') {
        return 'fundmanager';
    }

    if (
        normalizedHostname === 'daytradingbot.net' ||
        normalizedHostname === 'www.daytradingbot.net'
    ) {
        if (normalizedPathname === '/') {
            return 'daytradingbot';
        }
    }

    if (normalizedPathname === '/bluechip' || normalizedPathname.startsWith('/bluechip/')) {
        return 'bluechip';
    }

    if (normalizedPathname === '/setup' || normalizedPathname.startsWith('/setup/')) {
        return 'setup';
    }

    if (normalizedPathname === '/start' || normalizedPathname === '/links') {
        return 'start';
    }

    if (normalizedPathname === '/reconcile' || normalizedHostname === 'reconcile.eb28.co') {
        return 'reconcile';
    }

    if (normalizedPathname === '/welcome' || normalizedPathname.startsWith('/welcome/')) {
        return 'welcome';
    }

    if (
        normalizedHostname === 'thomascustom.homes' ||
        normalizedHostname === 'www.thomascustom.homes' ||
        normalizedPathname === '/tch' ||
        normalizedPathname.startsWith('/tch/')
    ) {
        const thomasPage = getThomasPageForLocation({
            pathname: normalizedPathname,
            hostname: normalizedHostname,
        });

        if (thomasPage) {
            return thomasPage.routeKey;
        }
    }

    if (
        normalizedPathname === '/melbournewebstudio' ||
        normalizedHostname === 'melbournewebstudio.eb28.co'
    ) {
        return 'melbournewebstudio';
    }

    if (
        normalizedPathname === '/free-website-build' ||
        normalizedPathname === '/free-local-business-website'
    ) {
        return 'freewebsitebuild';
    }

    if (normalizedPathname === '/get-started') {
        return 'getstarted';
    }

    if (
        normalizedPathname === '/weedauthority' ||
        normalizedPathname.startsWith('/weedauthority/') ||
        normalizedHostname === 'weedauthority.eb28.co' ||
        normalizedHostname === 'weedauthority.ed28.co'
    ) {
        return 'weedauthority';
    }

    if (
        normalizedPathname === '/cc' ||
        normalizedHostname === 'cadetcatch.com' ||
        normalizedHostname === 'www.cadetcatch.com'
    ) {
        return 'cc';
    }

    return 'home';
}

export function getRouteMeta(routeOrLocation = 'home') {
    const routeKey =
        typeof routeOrLocation === 'string' ? routeOrLocation : detectRouteKey(routeOrLocation);
    const normalizedHostname =
        typeof routeOrLocation === 'string'
            ? ''
            : String(routeOrLocation.hostname || '').toLowerCase();
    let baseMeta = ROUTE_META[routeKey] || ROUTE_META.home;

    if (routeKey.startsWith('thomas-') && isThomasPrimaryHostname(normalizedHostname)) {
        baseMeta = buildThomasRouteMeta(getThomasPageByRouteKey(routeKey), {
            primaryHost: true,
        });
    }

    const isCadetCatchPrimaryHost =
        normalizedHostname === 'cadetcatch.com' || normalizedHostname === 'www.cadetcatch.com';

    if (routeKey === 'cc' && isCadetCatchPrimaryHost) {
        baseMeta = {
            ...baseMeta,
            canonicalUrlOverride: `${CADETCATCH_SITE_ORIGIN}/`,
            image: `${CADETCATCH_SITE_ORIGIN}/img/find-cadet-photos.png`,
        };
    }

    return {
        ...baseMeta,
        canonicalUrl: baseMeta.canonicalUrlOverride || `${SITE_ORIGIN}${baseMeta.path}`,
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
