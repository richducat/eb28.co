#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leadOpsPath = path.join(repoRoot, 'scripts', 'generate-32940-lead-ops.mjs');
const outPath = path.join(repoRoot, 'scripts', 'data', '32940-avenue-contact-overrides.json');
const avenueBaseUrl = 'https://www.avenueviera.com/tenants/';

function decodeHtml(value = '') {
  return String(value)
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(value = '') {
  return decodeHtml(String(value)
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim());
}

function normalizePhone(value = '') {
  return decodeHtml(value)
    .replace(/^tel:/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s+/g, '-')
    .trim();
}

function extractStringArray(source, constName) {
  const pattern = new RegExp(`const ${constName} = new Set\\(\\[([\\s\\S]*?)\\]\\);`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${constName} in ${path.relative(repoRoot, leadOpsPath)}`);
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function extractObjectLiteralStringMap(source, constName) {
  const pattern = new RegExp(`const ${constName} = \\{([\\s\\S]*?)\\};`);
  const match = source.match(pattern);
  if (!match) {
    return {};
  }

  return Object.fromEntries(
    [...match[1].matchAll(/'([^']+)'\\s*:\\s*'([^']+)'/g)].map((entry) => [entry[1], entry[2]]),
  );
}

function sidebarBlock(html, title) {
  const pattern = new RegExp(`<h4 class="sidebarTitle">${title}</h4>([\\s\\S]*?)</div><!-- \\/\\.sidebar-item -->`, 'i');
  return html.match(pattern)?.[1] ?? '';
}

function extractHref(block = '') {
  return decodeHtml(block.match(/<a[^>]+href="([^"]+)"/i)?.[1] ?? '').trim();
}

function extractTenantContact(html) {
  const phoneBlock = sidebarBlock(html, 'Phone');
  const addressBlock = sidebarBlock(html, 'Address');
  const websiteBlock = sidebarBlock(html, 'Website');
  const phone = normalizePhone(extractHref(phoneBlock) || stripTags(phoneBlock));
  const address = stripTags(addressBlock.replace(/<a[\s\S]*?<\/a>/gi, ''));
  const website = extractHref(websiteBlock);

  return {
    phone,
    address,
    website,
  };
}

function validTenantWebsite(url = '') {
  return /^https?:\/\//i.test(url)
    && !url.includes('avenueviera.com')
    && !url.includes('google.com/maps')
    && !url.includes('maps.app.goo.gl')
    && !url.includes('cdnjs.cloudflare.com');
}

async function fetchTenant(slug) {
  const url = `${avenueBaseUrl}${slug}/`;
  const response = await fetch(url, {
    headers: {
      'user-agent': 'EB28LeadOpsContactEnricher/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return {
    url,
    html: await response.text(),
  };
}

async function main() {
  const leadOpsSource = await fs.readFile(leadOpsPath, 'utf8');
  const tenantSlugs = extractStringArray(leadOpsSource, 'avenueTenantSourceSlugs');
  const slugOverrides = extractObjectLiteralStringMap(leadOpsSource, 'avenueSourceSlugOverrides');
  const overrides = {};
  const failures = [];

  for (const prospectSlug of tenantSlugs) {
    const avenueSlug = slugOverrides[prospectSlug] ?? prospectSlug;
    try {
      const { url, html } = await fetchTenant(avenueSlug);
      const contact = extractTenantContact(html);
      const sourceUrls = [url];

      if (validTenantWebsite(contact.website)) {
        sourceUrls.push(contact.website);
      } else {
        contact.website = url;
      }

      overrides[prospectSlug] = {
        phone: contact.phone,
        address: contact.address,
        website: contact.website || url,
        sourceUrls,
        sourceType: validTenantWebsite(contact.website)
          ? 'Avenue Viera tenant page plus extracted tenant website'
          : 'Avenue Viera tenant page',
        notes: 'Extracted from Avenue Viera tenant page; confirm local decision maker before outreach.',
      };
    } catch (error) {
      failures.push({ prospectSlug, avenueSlug, error: error.message });
    }
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    output: path.relative(repoRoot, outPath),
    tenants: tenantSlugs.length,
    enriched: Object.keys(overrides).length,
    failures,
  }, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
