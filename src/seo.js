import { buildSeoMarkup, getRouteMeta } from './siteMeta.js';

const MANAGED_SELECTOR = '[data-eb28-seo]';
const STRUCTURED_DATA_SELECTOR = 'script[data-eb28-seo="structured-data"]';

const MANAGED_TAGS = [
    { selector: 'meta[name="description"]', tag: 'meta', key: 'description', attribute: 'name' },
    { selector: 'meta[name="theme-color"]', tag: 'meta', key: 'theme-color', attribute: 'name' },
    { selector: 'meta[name="color-scheme"]', tag: 'meta', key: 'color-scheme', attribute: 'name' },
    { selector: 'meta[name="robots"]', tag: 'meta', key: 'robots', attribute: 'name' },
    { selector: 'meta[name="twitter:card"]', tag: 'meta', key: 'twitter:card', attribute: 'name' },
    { selector: 'meta[name="twitter:title"]', tag: 'meta', key: 'twitter:title', attribute: 'name' },
    { selector: 'meta[name="twitter:description"]', tag: 'meta', key: 'twitter:description', attribute: 'name' },
    { selector: 'meta[name="twitter:image"]', tag: 'meta', key: 'twitter:image', attribute: 'name' },
    { selector: 'meta[property="og:locale"]', tag: 'meta', key: 'og:locale', attribute: 'property' },
    { selector: 'meta[property="og:site_name"]', tag: 'meta', key: 'og:site_name', attribute: 'property' },
    { selector: 'meta[property="og:type"]', tag: 'meta', key: 'og:type', attribute: 'property' },
    { selector: 'meta[property="og:title"]', tag: 'meta', key: 'og:title', attribute: 'property' },
    { selector: 'meta[property="og:description"]', tag: 'meta', key: 'og:description', attribute: 'property' },
    { selector: 'meta[property="og:url"]', tag: 'meta', key: 'og:url', attribute: 'property' },
    { selector: 'meta[property="og:image"]', tag: 'meta', key: 'og:image', attribute: 'property' },
    { selector: 'meta[property="og:image:alt"]', tag: 'meta', key: 'og:image:alt', attribute: 'property' },
    { selector: 'link[rel="canonical"]', tag: 'link', key: 'canonical', attribute: 'rel' },
];

function upsertManagedTag({ selector, tag, attribute, key, value }) {
    let element = document.head.querySelector(selector);

    if (!element) {
        element = document.createElement(tag);
        element.setAttribute(attribute, key);
        element.setAttribute('data-eb28-seo', key);
        document.head.appendChild(element);
    }

    if (tag === 'link') {
        element.setAttribute('href', value);
    } else {
        element.setAttribute('content', value);
    }
}

export function applyDocumentSeo(routeOrLocation) {
    const meta = getRouteMeta(routeOrLocation);

    document.title = meta.title;
    document.documentElement.lang = 'en';

    const valueMap = {
        description: meta.description,
        'theme-color': meta.themeColor,
        'color-scheme': meta.colorScheme,
        robots: meta.robots,
        'twitter:card': 'summary_large_image',
        'twitter:title': meta.title,
        'twitter:description': meta.description,
        'twitter:image': meta.image,
        'og:locale': 'en_US',
        'og:site_name': meta.siteName,
        'og:type': meta.ogType,
        'og:title': meta.title,
        'og:description': meta.description,
        'og:url': meta.canonicalUrl,
        'og:image': meta.image,
        'og:image:alt': meta.title,
        canonical: meta.canonicalUrl,
    };

    MANAGED_TAGS.forEach((descriptor) => {
        upsertManagedTag({
            ...descriptor,
            value: valueMap[descriptor.key],
        });
    });

    const existingStructuredData = document.head.querySelector(STRUCTURED_DATA_SELECTOR);
    if (meta.structuredData.length === 0) {
        existingStructuredData?.remove();
        return;
    }

    const structuredDataScript = existingStructuredData || document.createElement('script');
    structuredDataScript.type = 'application/ld+json';
    structuredDataScript.setAttribute('data-eb28-seo', 'structured-data');
    structuredDataScript.textContent = JSON.stringify(meta.structuredData).replace(/</g, '\\u003c');

    if (!existingStructuredData) {
        document.head.appendChild(structuredDataScript);
    }
}

export function stripManagedSeo(html) {
    return html
        .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
        .replace(/<meta[^>]+(?:name|property)="(?:description|theme-color|color-scheme|robots|twitter:card|twitter:title|twitter:description|twitter:image|og:locale|og:site_name|og:type|og:title|og:description|og:url|og:image|og:image:alt)"[^>]*>\s*/gi, '')
        .replace(/<link[^>]+rel="canonical"[^>]*>\s*/gi, '')
        .replace(/<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, '')
        .replace(new RegExp(`${MANAGED_SELECTOR.replace(/[[\]]/g, '\\$&')}="[^"]*"`, 'g'), '');
}

export function injectSeoMarkup(html, routeOrLocation) {
    const sanitizedHtml = stripManagedSeo(html);
    const seoMarkup = buildSeoMarkup(routeOrLocation);
    const viewportPattern = /(<meta\s+name="viewport"[^>]*>\s*)/i;

    if (viewportPattern.test(sanitizedHtml)) {
        return sanitizedHtml.replace(viewportPattern, `$1${seoMarkup}`);
    }

    return sanitizedHtml.replace('</head>', `${seoMarkup}</head>`);
}
