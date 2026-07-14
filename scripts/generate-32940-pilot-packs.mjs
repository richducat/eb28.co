#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prospects = JSON.parse(await fs.readFile(path.join(repoRoot, 'scripts', 'data', '32940-premium-prospects.json'), 'utf8'));
const outRoot = path.join(repoRoot, 'public', '32940', 'proposals');

const creativeThemes = {
  martin: { ink: '#f4f1e7', background: '#202723', accent: '#e8a837', secondary: '#315f3b' },
  suntree: { ink: '#142a43', background: '#fbf4e8', accent: '#e87366', secondary: '#eebf75' },
  rubio: { ink: '#102b39', background: '#f4f5ee', accent: '#147d78', secondary: '#e2a15b' },
  pool365: { ink: '#ffffff', background: '#056dc3', accent: '#ff6f62', secondary: '#00b8c6' },
  beachside: { ink: '#fffaf0', background: '#252b2a', accent: '#eb6c2d', secondary: '#13a7a0' },
};

const contentByVertical = {
  veterinary: {
    posts: [
      ['Before the first visit', 'A useful new-client page can explain which records and medication notes the clinic wants before arrival—after the clinic approves the checklist.'],
      ['Appointment requests need a finish line', 'A website request is not a confirmed appointment. The clearest experience tells pet owners what happens after they submit and who confirms the visit.'],
      ['Clinical content stays human-reviewed', 'Veterinary services and urgent guidance should remain under item-level clinic approval. That boundary is part of the production system, not fine print.'],
    ],
    article: ['How to prepare for a new veterinary appointment without adding stress', ['Confirm what the clinic wants in advance', 'Gather records and medication information', 'Write down the reason for the visit', 'Understand the request-versus-confirmation boundary', 'Know where the clinic directs urgent needs']],
  },
  pool_service: {
    posts: [
      ['Start with the symptom', 'Cloudy water, unusual noise and weak circulation are different starting points. A clear estimate form helps the service team receive useful context before follow-up.'],
      ['A hero should never load blank', 'The service message and quick-estimate path should appear immediately, with a dependable image fallback before any optional background video.'],
      ['Separate cleaning from equipment requests', 'Weekly care, pumps, heaters, automation and inspections deserve distinct routes so a pool owner can find the right next step quickly.'],
    ],
    article: ['What to document before requesting pool repair or equipment service', ['Photograph the equipment area safely', 'Describe water and circulation symptoms', 'Note recent service or weather changes', 'Avoid making an unverified diagnosis', 'Share access and follow-up preferences']],
  },
  pest_control: {
    posts: [
      ['Document the signs, not a diagnosis', 'A few clear notes about what you saw, where and when can help a pest-control team prepare for the first conversation without promising a remote diagnosis.'],
      ['Termite and general pest paths are not the same', 'A useful service website keeps termite education and general pest requests separate so homeowners can reach the right conversation faster.'],
      ['Local coverage should be easy to verify', 'A focused service-area section can show where the business works without burying customers in dozens of repetitive location pages.'],
    ],
    article: ['What Brevard homeowners can document before a pest-control conversation', ['Record where activity was noticed', 'Photograph visible signs without disturbing them', 'Note timing and recent property changes', 'Keep termite and general pest questions separate', 'Prepare access and contact preferences']],
  },
};

function xml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function html(value = '') { return xml(value).replace(/'/g, '&#39;'); }

function wrap(text, max = 22) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > max && current) { lines.push(current); current = word; }
    else current = `${current} ${word}`.trim();
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

function creativeSvg(prospect, post, width, height) {
  const theme = creativeThemes[prospect.siteKey];
  const titleLines = wrap(post[0], height > 1500 ? 19 : 22);
  const lineHeight = height > 1500 ? 105 : 88;
  const titleY = Math.round(height * .37);
  const title = titleLines.map((line, index) => `<text x="88" y="${titleY + index * lineHeight}" font-family="Georgia,serif" font-size="${height > 1500 ? 91 : 76}" fill="${theme.ink}">${xml(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.background}"/><stop offset="1" stop-color="${theme.secondary}"/></linearGradient><radialGradient id="r"><stop stop-color="${theme.accent}" stop-opacity=".42"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${Math.round(width * .86)}" cy="${Math.round(height * .12)}" r="${Math.round(width * .46)}" fill="url(#r)"/><path d="M88 ${Math.round(height * .16)}h120" stroke="${theme.accent}" stroke-width="10"/><text x="88" y="${Math.round(height * .12)}" font-family="Arial,sans-serif" font-size="27" font-weight="700" letter-spacing="5" fill="${theme.ink}">${xml(prospect.name.toUpperCase())}</text>${title}<text x="88" y="${Math.round(height * .78)}" font-family="Arial,sans-serif" font-size="30" fill="${theme.ink}" opacity=".78">OWNER-REVIEW CONTENT SAMPLE</text><line x1="88" y1="${Math.round(height * .87)}" x2="${width - 88}" y2="${Math.round(height * .87)}" stroke="${theme.ink}" stroke-opacity=".28" stroke-width="2"/><text x="88" y="${Math.round(height * .93)}" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="${theme.ink}">Website + Content Factory pilot</text><text x="${width - 88}" y="${Math.round(height * .93)}" text-anchor="end" font-family="Arial,sans-serif" font-size="24" fill="${theme.ink}" opacity=".72">EB28</text></svg>`;
}

function gapSummary(prospect) {
  const launchBlocker = prospect.sourceStatus.includes('failure')
    ? `The official HTTPS surface did not complete the July 14 fetch. Treat certificate, origin access and redirect behavior as a launch blocker until reverified.`
    : `The official HTTPS source was reachable on July 14. Recheck it immediately before outreach and again before any migration.`;
  const special = prospect.siteKey === 'pool365'
    ? 'Preserve phone and quick-estimate intent while guaranteeing a nonblank poster before optional video.'
    : prospect.siteKey === 'beachside'
      ? 'Replace the fixed legacy layout; withhold published discounts and hours until the owner reconfirms them.'
      : prospect.siteKey === 'martin'
        ? 'Clarify pest, termite, rodent, bed bug and inspection routes while retaining published Brevard contact intent.'
        : 'Create a calm appointment and new-client path while keeping every clinical statement under item-level approval.';
  return `# ${prospect.name}: personalized website and content gap summary\n\nChecked: July 14, 2026\n\n## Current technical truth\n\n${launchBlocker}\n\n## Premium website opportunity\n\n${special}\n\n## Content system opportunity\n\n- Encode owner-confirmed services, locations, contact routing and restricted claims in one Business Brain.\n- Build a Monday, Wednesday and Friday social cadence from approved facts.\n- Publish useful articles only after claim provenance and exact-version approval pass.\n- Keep customer-facing account verification, 2FA and OAuth with the customer.\n\n## Owner-review requirements\n\n- Confirm every service, credential, price, offer, testimonial, hour and location fact.\n- Confirm rights to logos, team photos, facility photos and customer proof.\n- Approve the exact website and content versions before staging or publication.\n`;
}

function pilotPage(prospect, posts, article) {
  const postCards = posts.map((post, index) => `<article><small>Draft ${index + 1}</small><h2>${html(post[0])}</h2><p>${html(post[1])}</p><span>Source-bound · approval required</span></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${html(prospect.name)} Content Factory preview | EB28</title><style>:root{--ink:#15251f;--muted:#68766e;--accent:#176d50;--line:#d9dfda;--paper:#f4f2e9}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,system-ui,sans-serif}.shell{width:min(calc(100% - 32px),1180px);margin:auto}.banner{padding:11px;color:#fff;background:#16231e;text-align:center;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}.hero{padding:85px 0 60px}.hero small,.eyebrow{color:var(--accent);font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.13em}.hero h1{max-width:850px;margin:18px 0 0;font:400 clamp(48px,7vw,82px)/.97 Georgia,serif;letter-spacing:-.055em}.hero p{max-width:700px;margin:23px 0 0;color:var(--muted);line-height:1.7}.actions{margin-top:28px;display:flex;gap:10px;flex-wrap:wrap}.button{min-height:48px;padding:0 18px;border:1px solid var(--accent);border-radius:999px;display:inline-flex;align-items:center;color:#fff;background:var(--accent);font-size:10px;font-weight:850;text-decoration:none}.button.ghost{color:var(--ink);background:transparent;border-color:#bfc9c1}.grid{padding:60px 0 100px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.grid article,.video,.outline{padding:25px;border:1px solid var(--line);border-radius:17px;background:#fff}.grid article small{color:var(--accent);font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.12em}.grid article h2{margin:55px 0 0;font:400 24px Georgia,serif}.grid article p{margin:12px 0 0;color:var(--muted);font-size:11px;line-height:1.6}.grid article span{display:block;margin-top:22px;padding-top:14px;border-top:1px solid var(--line);color:#86918a;font-size:8px}.video{grid-row:span 2}.video video{width:100%;max-height:680px;border-radius:12px;background:#17251f}.video p,.outline p{margin:14px 0 0;color:var(--muted);font-size:11px;line-height:1.6}.outline h2{margin:10px 0 0;font:400 28px Georgia,serif}.outline ol{padding-left:20px;color:var(--muted);font-size:11px;line-height:1.8}.source{padding:70px 0;color:#dbe7e0;background:#14231d}.source h2{font:400 34px Georgia,serif}.source p{margin:15px 0 0;color:#9aaca2;font-size:11px;line-height:1.7}.source a{color:#fff}.files{margin-top:22px;display:flex;flex-wrap:wrap;gap:8px}.files a{min-height:42px;padding:0 13px;border:1px solid rgba(255,255,255,.18);border-radius:999px;display:flex;align-items:center;font-size:9px;text-decoration:none}@media(max-width:750px){.grid{grid-template-columns:1fr}.video{grid-row:auto}.hero{padding-top:60px}.hero h1{font-size:47px}}</style></head><body><div class="banner">Unofficial Content Factory preview · Owner review only · Nothing is scheduled or published</div><header class="hero"><div class="shell"><small>${html(prospect.category)}</small><h1>${html(prospect.name)}: the first month, before the accounts connect.</h1><p>Three approval-first social drafts, one vertical motion sample, an article outline and the five-page premium redesign—grounded in a source manifest and kept draft-only.</p><div class="actions"><a class="button" href="/content-factory/?prospect=${encodeURIComponent(prospect.slug)}#pilot">Review the founding pilot</a><a class="button ghost" href="/32940/proposals/${html(prospect.slug)}/">Open five-page redesign</a></div></div></header><main class="shell grid"><section class="video"><video controls playsinline preload="metadata" poster="static-sample.jpg"><source src="motion-sample.mp4" type="video/mp4"></video><p>15-second 1080×1920 H.264 motion sample. Final brand assets, music and service claims require owner approval.</p></section>${postCards}<section class="outline"><span class="eyebrow">Article outline</span><h2>${html(article[0])}</h2><ol>${article[1].map((item) => `<li>${html(item)}</li>`).join('')}</ol></section></main><section class="source"><div class="shell"><h2>Source pack and handoff files</h2><p>${html(prospect.sourceStatus)} Every service, credential, price, offer, testimonial and business claim remains subject to owner approval.</p><div class="files"><a href="business-brain.json">Business Brain JSON</a><a href="source-manifest.json">Source manifest</a><a href="social-drafts.json">Social drafts</a><a href="article-outline.md">Article outline</a><a href="gap-summary.md">Gap summary</a><a href="static-sample.jpg">1080×1350 creative</a></div></div></section></body></html>`;
}

for (const prospect of prospects) {
  const content = contentByVertical[prospect.vertical];
  const packDir = path.join(outRoot, prospect.slug, 'pilot');
  await fs.mkdir(packDir, { recursive: true });
  const sourceClaims = [
    { field: 'business_name', value: prospect.name, status: 'supported', sourceType: 'official_site', sourceUrl: prospect.sourceUrls[0] },
    { field: 'category', value: prospect.category, status: 'needs_review', sourceType: 'public_profile', sourceUrl: prospect.sourceUrls[0] },
    { field: 'phone', value: prospect.phone, status: 'supported', sourceType: 'official_site', sourceUrl: prospect.sourceUrls[0] },
    ...prospect.services.map((service) => ({ field: 'service', value: service, status: 'needs_review', sourceType: 'official_site', sourceUrl: prospect.sourceUrls[0] })),
  ];
  const businessBrain = {
    version: 2, orgId: `pilot_${prospect.slug}`, businessName: prospect.name, website: prospect.officialUrl, category: prospect.category,
    services: prospect.services, serviceAreas: prospect.areas, audience: prospect.hero.copy, tone: prospect.artDirection,
    primaryAction: 'Owner-review CTA only until verified contact routing is enabled', approvalPolicy: prospect.vertical === 'veterinary' ? 'item' : 'monthly_after_successful_month',
    restrictedClaims: ['Prices', 'Offers', 'Availability', 'Credentials', 'Testimonials', 'Guaranteed outcomes'], sourceClaims,
  };
  const manifest = { checkedAt: '2026-07-14T14:00:00-04:00', status: prospect.sourceStatus, sources: prospect.sourceUrls.map((url) => ({ url, type: 'official_or_public_business_source', use: 'Fact discovery only; owner approval required before publication' })), publicationStatus: 'draft_only' };
  const drafts = content.posts.map(([title, body], index) => ({ id: `draft_${index + 1}`, orgId: `pilot_${prospect.slug}`, title, body, channels: ['facebook', 'instagram', 'linkedin'], approvalRequired: true, publicationStatus: 'draft_only', sourceClaimFields: ['business_name', 'category'] }));
  await fs.writeFile(path.join(packDir, 'business-brain.json'), `${JSON.stringify(businessBrain, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(packDir, 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(packDir, 'social-drafts.json'), `${JSON.stringify(drafts, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(packDir, 'article-outline.md'), `# ${content.article[0]}\n\n${content.article[1].map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nDraft only. Owner approval and source review required.\n`, 'utf8');
  await fs.writeFile(path.join(packDir, 'gap-summary.md'), gapSummary(prospect), 'utf8');

  const feedSvg = creativeSvg(prospect, content.posts[0], 1080, 1350);
  const verticalSvg = creativeSvg(prospect, content.posts[0], 1080, 1920);
  await sharp(Buffer.from(feedSvg)).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toFile(path.join(packDir, 'static-sample.jpg'));
  const verticalPath = path.join(packDir, 'motion-poster.jpg');
  await sharp(Buffer.from(verticalSvg)).jpeg({ quality: 91, progressive: true, mozjpeg: true }).toFile(verticalPath);
  const ffmpeg = spawnSync('ffmpeg', ['-y', '-loop', '1', '-i', verticalPath, '-vf', "zoompan=z='min(zoom+0.00018,1.08)':d=450:s=1080x1920:fps=30,format=yuv420p", '-t', '15', '-r', '30', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', '-an', path.join(packDir, 'motion-sample.mp4')], { stdio: 'pipe' });
  if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed for ${prospect.slug}: ${ffmpeg.stderr?.toString().slice(-1000)}`);
  await fs.rm(verticalPath, { force: true });
  await fs.writeFile(path.join(packDir, 'index.html'), pilotPage(prospect, content.posts, content.article), 'utf8');
}

console.log(`Generated ${prospects.length} complete founding-business preview packs.`);
