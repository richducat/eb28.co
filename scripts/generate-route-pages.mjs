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

async function writeFile(relativePath, contents) {
    const fullPath = path.join(docsDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, contents);
}

async function main() {
    const htmlTemplate = await fs.readFile(templatePath, 'utf8');

    for (const { routeKey, outputPath } of STATIC_ROUTE_OUTPUTS) {
        await writeFile(outputPath, injectSeoMarkup(htmlTemplate, routeKey));
    }

    await writeFile('robots.txt', buildRobotsTxt());
    await writeFile('sitemap.xml', buildSitemapXml());

    console.log('Generated route-specific HTML, robots.txt, and sitemap.xml');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
