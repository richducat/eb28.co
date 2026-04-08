#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
    STATIC_ROUTE_OUTPUTS,
    buildRobotsTxt,
    buildSitemapXml,
} from '../src/siteMeta.js';
import { injectSeoMarkup } from '../src/seo.js';

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, 'docs');
const templatePath = path.join(docsDir, 'index.html');
const buildId = process.env.BUILD_ID || 'development';

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function injectBuildMarkup(html) {
    const buildMarkup = [
        `    <meta name="eb28-build-id" content="${escapeAttribute(buildId)}" />`,
        '    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />',
        '    <meta http-equiv="Pragma" content="no-cache" />',
        '    <meta http-equiv="Expires" content="0" />',
    ].join('\n');
    const viewportPattern = /(<meta\s+name="viewport"[^>]*>\s*)/i;

    if (viewportPattern.test(html)) {
        return html.replace(viewportPattern, `$1${buildMarkup}\n`);
    }

    return html.replace('</head>', `${buildMarkup}\n</head>`);
}

async function writeFile(relativePath, contents) {
    const fullPath = path.join(docsDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, contents);
}

async function main() {
    const htmlTemplate = await fs.readFile(templatePath, 'utf8');

    for (const { routeKey, outputPath } of STATIC_ROUTE_OUTPUTS) {
        await writeFile(outputPath, injectBuildMarkup(injectSeoMarkup(htmlTemplate, routeKey)));
    }

    await writeFile(
        'version.json',
        `${JSON.stringify(
            {
                buildId,
                generatedAt: new Date().toISOString(),
            },
            null,
            2,
        )}\n`,
    );
    await writeFile('robots.txt', buildRobotsTxt());
    await writeFile('sitemap.xml', buildSitemapXml());

    console.log(`Generated route pages and version manifest (${buildId})`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
