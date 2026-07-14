#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pilotCampaigns from './data/32940-pilot-campaigns.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prospects = JSON.parse(await fs.readFile(path.join(repoRoot, 'scripts', 'data', '32940-premium-prospects.json'), 'utf8'));
const outRoot = path.join(repoRoot, 'public', '32940', 'proposals');
const sourceAssetRoot = path.join(repoRoot, 'scripts', 'assets', '32940-premium');

const creativeThemes = {
  martin: { paper: '#f3efe3', ink: '#17211b', dark: '#19231e', accent: '#f0b33d', secondary: '#527b50', soft: '#dbe4d2', accentInk: '#17211b' },
  suntree: { paper: '#fff6e9', ink: '#132a43', dark: '#122941', accent: '#ef806e', secondary: '#f3c87b', soft: '#f3dfd0', accentInk: '#132a43' },
  rubio: { paper: '#f4f6ee', ink: '#102b39', dark: '#0d2a38', accent: '#35b9ae', secondary: '#e5a65e', soft: '#d5e9df', accentInk: '#102b39' },
  pool365: { paper: '#edf8ff', ink: '#082b48', dark: '#043d71', accent: '#ff796c', secondary: '#22c4d0', soft: '#cfeefa', accentInk: '#082b48' },
  beachside: { paper: '#fff7e8', ink: '#242b29', dark: '#202725', accent: '#f17a35', secondary: '#23b5ad', soft: '#e9dfca', accentInk: '#202725' },
};

function xml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function html(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function words(value = '') {
  return String(value).match(/[\p{L}\p{N}’'-]+/gu) || [];
}

function countArticleWords(campaign) {
  return words([
    campaign.title,
    campaign.deck,
    ...campaign.intro,
    campaign.quickAnswer,
    ...campaign.takeaways,
    ...campaign.sections.flatMap((section) => [section.title, ...section.paragraphs, ...section.bullets]),
    ...campaign.faqs.flatMap((faq) => [faq.q, faq.a]),
  ].join(' ')).length;
}

function readingMinutes(campaign) {
  return Math.max(1, Math.ceil(countArticleWords(campaign) / 220));
}

function versionHash(prospect, campaign) {
  return crypto.createHash('sha256').update(JSON.stringify({ prospect, campaign })).digest('hex');
}

function wrap(text, max = 24, limit = 7) {
  const chunks = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const chunk of chunks) {
    const next = `${current} ${chunk}`.trim();
    if (current && next.length > max) {
      lines.push(current);
      current = chunk;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, limit);
}

function svgLines(lines, { x, y, size, lineHeight, fill, family = 'Georgia, serif', weight = 400, letterSpacing = 0, anchor = 'start' }) {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}">${xml(line)}</text>`).join('');
}

function gridTexture(width, height, color, opacity = 0.14) {
  const vertical = Array.from({ length: 9 }, (_, index) => `<line x1="${Math.round((index + 1) * width / 10)}" y1="0" x2="${Math.round((index + 1) * width / 10)}" y2="${height}"/>`).join('');
  const horizontal = Array.from({ length: 12 }, (_, index) => `<line x1="0" y1="${Math.round((index + 1) * height / 13)}" x2="${width}" y2="${Math.round((index + 1) * height / 13)}"/>`).join('');
  return `<g stroke="${color}" stroke-opacity="${opacity}" stroke-width="1">${vertical}${horizontal}</g>`;
}

function feedOverlay(prospect, campaign, theme) {
  const title = wrap(campaign.shortTitle, 22, 4);
  const hook = wrap(campaign.campaignSubhead, 36, 3);
  const topLabel = wrap(prospect.name.toUpperCase(), 34, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.dark}" stop-opacity=".16"/><stop offset="1" stop-color="${theme.dark}" stop-opacity=".82"/></linearGradient>
      <linearGradient id="noPhoto" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.dark}"/><stop offset="1" stop-color="${theme.secondary}"/></linearGradient>
    </defs>
    ${prospect.heroImage ? '<rect width="1080" height="720" fill="url(#shade)"/>' : `<rect width="1080" height="720" fill="url(#noPhoto)"/>${gridTexture(1080, 720, theme.paper, .16)}<path d="M92 572 L284 381 L480 468 L674 248 L988 479" fill="none" stroke="${theme.accent}" stroke-width="10"/><path d="M92 612 H988" stroke="${theme.paper}" stroke-opacity=".54" stroke-width="2"/>`}
    <path d="M0 720 H1080 V1350 H0 Z" fill="${theme.paper}"/>
    <rect x="70" y="70" width="14" height="118" fill="${theme.accent}"/>
    ${svgLines(topLabel, { x: 112, y: 104, size: 27, lineHeight: 35, fill: '#fff', family: 'Arial, sans-serif', weight: 800, letterSpacing: 4 })}
    <text x="70" y="790" font-family="Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="5" fill="${theme.ink}">FIELD GUIDE · 01</text>
    ${svgLines(title, { x: 70, y: 895, size: 74, lineHeight: 77, fill: theme.ink, weight: 400 })}
    ${svgLines(hook, { x: 70, y: 1210, size: 28, lineHeight: 38, fill: theme.ink, family: 'Arial, sans-serif', weight: 600 })}
    <line x1="70" y1="1280" x2="1010" y2="1280" stroke="${theme.ink}" stroke-opacity=".25" stroke-width="2"/>
    <text x="70" y="1320" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="3" fill="${theme.ink}">OWNER-REVIEW CAMPAIGN</text>
    <text x="1010" y="1320" text-anchor="end" font-family="Arial, sans-serif" font-size="19" font-weight="800" fill="${theme.ink}">EB28</text>
  </svg>`;
}

function motionOverlay(prospect, campaign, theme, frame) {
  if (frame === 1) {
    const title = wrap(campaign.shortTitle, 19, 5);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.dark}" stop-opacity=".28"/><stop offset=".55" stop-color="${theme.dark}" stop-opacity=".52"/><stop offset="1" stop-color="${theme.dark}" stop-opacity=".98"/></linearGradient><linearGradient id="plain" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.dark}"/><stop offset="1" stop-color="${theme.secondary}"/></linearGradient></defs>${prospect.heroImage ? '<rect width="1080" height="1920" fill="url(#shade)"/>' : `<rect width="1080" height="1920" fill="url(#plain)"/>${gridTexture(1080, 1920, theme.paper, .12)}<path d="M90 925 L314 688 L493 796 L734 514 L1000 742" fill="none" stroke="${theme.accent}" stroke-width="12"/>`}<rect x="72" y="90" width="13" height="118" fill="${theme.accent}"/>${svgLines(wrap(prospect.name.toUpperCase(), 29, 2), { x: 113, y: 122, size: 25, lineHeight: 34, fill: '#fff', family: 'Arial, sans-serif', weight: 800, letterSpacing: 4 })}<text x="72" y="1170" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="5" fill="${theme.accent}">NEW OWNER-REVIEW GUIDE</text>${svgLines(title, { x: 72, y: 1298, size: 91, lineHeight: 94, fill: theme.paper })}<text x="72" y="1772" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="${theme.paper}">One article. Two matched social pieces.</text><text x="72" y="1832" font-family="Arial, sans-serif" font-size="20" letter-spacing="3" fill="${theme.paper}" fill-opacity=".75">CONTENT FACTORY · EB28</text></svg>`;
  }
  if (frame === 2) {
    const items = campaign.creativeSteps.map((step, index) => {
      const y = 480 + index * 360;
      return `<text x="84" y="${y}" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="5" fill="${theme.accent}">0${index + 1}</text>${svgLines(wrap(step, 22, 2), { x: 84, y: y + 92, size: 66, lineHeight: 76, fill: theme.paper })}<line x1="84" y1="${y + 190}" x2="996" y2="${y + 190}" stroke="${theme.paper}" stroke-opacity=".22" stroke-width="2"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="${theme.dark}"/>${gridTexture(1080, 1920, theme.paper, .06)}<rect x="84" y="88" width="180" height="12" fill="${theme.accent}"/><text x="84" y="180" font-family="Arial, sans-serif" font-size="23" font-weight="800" letter-spacing="5" fill="${theme.paper}">THE PREPARATION PLAN</text>${items}<text x="84" y="1810" font-family="Arial, sans-serif" font-size="20" letter-spacing="3" fill="${theme.paper}" fill-opacity=".66">SOURCE-BOUND · APPROVAL REQUIRED</text></svg>`;
  }
  const title = wrap('Read the complete guide.', 18, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="${theme.paper}"/>${gridTexture(1080, 1920, theme.ink, .055)}<rect x="0" y="0" width="1080" height="36" fill="${theme.accent}"/><text x="84" y="174" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="5" fill="${theme.ink}">THE FULL ARTICLE IS READY</text>${svgLines(title, { x: 84, y: 405, size: 100, lineHeight: 105, fill: theme.ink })}<rect x="84" y="900" width="912" height="420" fill="${theme.dark}"/><text x="132" y="982" font-family="Arial, sans-serif" font-size="20" font-weight="800" letter-spacing="4" fill="${theme.accent}">INSIDE THE GUIDE</text>${campaign.creativeSteps.map((step, index) => `<text x="132" y="${1080 + index * 76}" font-family="Arial, sans-serif" font-size="31" font-weight="700" fill="${theme.paper}">${index + 1}. ${xml(step)}</text>`).join('')}<rect x="84" y="1445" width="912" height="116" fill="${theme.accent}"/><text x="540" y="1518" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="900" fill="${theme.accentInk}">OWNER REVIEW · OPEN THE ARTICLE</text><text x="84" y="1778" font-family="Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="4" fill="${theme.ink}">${xml(prospect.name.toUpperCase())}</text><text x="84" y="1830" font-family="Arial, sans-serif" font-size="20" fill="${theme.ink}" fill-opacity=".68">Unofficial concept · Nothing published or scheduled</text></svg>`;
}

async function renderGraphic(prospect, campaign, theme, outputPath) {
  const base = prospect.heroImage
    ? sharp(path.join(sourceAssetRoot, `${prospect.heroImage}-1440.jpg`)).resize(1080, 720, { fit: 'cover', position: 'attention' }).extend({ bottom: 630, background: theme.paper })
    : sharp({ create: { width: 1080, height: 1350, channels: 3, background: theme.dark } });
  await base.composite([{ input: Buffer.from(feedOverlay(prospect, campaign, theme)) }]).jpeg({ quality: 91, progressive: true, mozjpeg: true }).toFile(outputPath);
}

async function renderMotion(prospect, campaign, theme, packDir) {
  const frames = [];
  for (let frame = 1; frame <= 3; frame += 1) {
    const framePath = path.join(packDir, `.motion-frame-${frame}.jpg`);
    const base = frame === 1 && prospect.heroImage
      ? sharp(path.join(sourceAssetRoot, `${prospect.heroImage}-1440.jpg`)).resize(1080, 1240, { fit: 'cover', position: 'attention' }).extend({ bottom: 680, background: theme.dark })
      : sharp({ create: { width: 1080, height: 1920, channels: 3, background: frame === 3 ? theme.paper : theme.dark } });
    await base.composite([{ input: Buffer.from(motionOverlay(prospect, campaign, theme, frame)) }]).jpeg({ quality: 91, progressive: true, mozjpeg: true }).toFile(framePath);
    frames.push(framePath);
  }

  await fs.copyFile(frames[0], path.join(packDir, 'motion-poster.jpg'));
  const filter = [
    "[0:v]scale=1080:1920,zoompan=z='min(zoom+0.00018,1.027)':d=150:s=1080x1920:fps=30,fade=t=out:st=4.65:d=0.35[v0]",
    "[1:v]scale=1080:1920,zoompan=z='min(zoom+0.00010,1.015)':d=150:s=1080x1920:fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=4.65:d=0.35[v1]",
    "[2:v]scale=1080:1920,zoompan=z='min(zoom+0.00010,1.015)':d=150:s=1080x1920:fps=30,fade=t=in:st=0:d=0.35[v2]",
    '[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[v]',
  ].join(';');
  const ffmpeg = spawnSync('ffmpeg', [
    '-y', '-loop', '1', '-i', frames[0], '-loop', '1', '-i', frames[1], '-loop', '1', '-i', frames[2],
    '-filter_complex', filter, '-map', '[v]', '-t', '15', '-r', '30', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', '-an', path.join(packDir, 'motion-sample.mp4'),
  ], { stdio: 'pipe' });
  if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed for ${prospect.slug}: ${ffmpeg.stderr?.toString().slice(-2000)}`);
  await Promise.all(frames.map((frame) => fs.rm(frame, { force: true })));
}

async function renderWebPreviews(packDir) {
  await Promise.all([
    sharp(path.join(packDir, 'static-sample.jpg'))
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 76, effort: 6 })
      .toFile(path.join(packDir, 'static-preview.webp')),
    sharp(path.join(packDir, 'motion-poster.jpg'))
      .resize({ width: 540, withoutEnlargement: true })
      .webp({ quality: 74, effort: 6 })
      .toFile(path.join(packDir, 'motion-poster-preview.webp')),
  ]);
}

function citationLinks(sourceIds, campaign) {
  if (!sourceIds?.length) return '';
  const indexes = new Map(campaign.sources.map((source, index) => [source.id, index + 1]));
  return `<sup class="citations" aria-label="Sources">${sourceIds.map((id) => `<a href="#source-${html(id)}" aria-label="Source ${indexes.get(id)}">${indexes.get(id)}</a>`).join('')}</sup>`;
}

function articleMarkdown(prospect, campaign) {
  const toc = campaign.sections.map((section) => `- [${section.title}](#${section.id})`).join('\n');
  const sections = campaign.sections.map((section) => `## ${section.title}\n\n${section.paragraphs.join('\n\n')}\n\n${section.bullets.map((bullet) => `- ${bullet}`).join('\n')}\n\nSources: ${section.sourceIds.map((id) => campaign.sources.find((source) => source.id === id)?.url).filter(Boolean).join(', ')}`).join('\n\n');
  const faqs = campaign.faqs.map((faq) => `### ${faq.q}\n\n${faq.a}`).join('\n\n');
  const sources = campaign.sources.map((source, index) => `${index + 1}. [${source.label}](${source.url}) — ${source.type}`).join('\n');
  return `---\ntitle: "${campaign.title.replace(/"/g, '\\"')}"\nprimary_keyword: "${campaign.primaryKeyword}"\nstatus: owner_review_only\nupdated: 2026-07-14\nprepared_by: EB28 Content Factory\nowner_review: pending\n---\n\n# ${campaign.title}\n\n${campaign.deck}\n\n> Unofficial editorial concept prepared by EB28. Nothing has been approved, scheduled or published for ${prospect.name}.\n\n${campaign.intro.join('\n\n')}\n\n## Quick answer: how to prepare for ${campaign.primaryKeyword}\n\n${campaign.quickAnswer}\n\n${campaign.takeaways.map((item) => `- ${item}`).join('\n')}\n\n## Table of contents\n\n${toc}\n\n${sections}\n\n## Frequently asked questions\n\n${faqs}\n\n## Official and authoritative sources\n\n${sources}\n\n## Owner-review conclusion\n\nUse this ${campaign.primaryKeyword} preparation framework only after ${prospect.name} verifies the services, routing, source interpretation and exact article version.\n`;
}

function articlePage(prospect, campaign, theme) {
  const base = `/32940/proposals/${prospect.slug}/pilot/`;
  const wordCount = countArticleWords(campaign);
  const sourceIndexes = new Map(campaign.sources.map((source, index) => [source.id, index + 1]));
  const sections = campaign.sections.map((section, index) => `<section id="${html(section.id)}" class="article-section"><div class="section-number">${String(index + 1).padStart(2, '0')}</div><h2>${html(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${html(paragraph)}${citationLinks(section.sourceIds, campaign)}</p>`).join('')}<div class="action-list" aria-label="Section checklist"><span>Field checklist</span><ul>${section.bullets.map((bullet) => `<li>${html(bullet)}</li>`).join('')}</ul></div></section>`).join('');
  const faq = campaign.faqs.map((item) => `<details><summary>${html(item.q)}</summary><p>${html(item.a)}</p></details>`).join('');
  const sources = campaign.sources.map((source) => `<li id="source-${html(source.id)}"><span>${sourceIndexes.get(source.id)}</span><div><strong>${html(source.label)}</strong><small>${html(source.type)}</small><a href="${html(source.url)}" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">↗</span></a></div></li>`).join('');
  const toc = campaign.sections.map((section, index) => `<a href="#${html(section.id)}"><span>${String(index + 1).padStart(2, '0')}</span>${html(section.title)}</a>`).join('');
  const related = campaign.relatedPaths.map((item) => `<a href="/32940/proposals/${html(prospect.slug)}/${html(item.path)}">${html(item.label)} <span aria-hidden="true">↗</span></a>`).join('');
  const schema = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', headline: campaign.title, description: campaign.metaDescription, datePublished: '2026-07-14', dateModified: '2026-07-14', wordCount, author: { '@type': 'Organization', name: 'EB28 Content Factory', url: 'https://eb28.co/content-factory/' }, publisher: { '@type': 'Organization', name: 'EB28' }, about: campaign.primaryKeyword, isAccessibleForFree: true },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'EB28', item: 'https://eb28.co/' }, { '@type': 'ListItem', position: 2, name: `${prospect.name} concept`, item: `https://eb28.co/32940/proposals/${prospect.slug}/` }, { '@type': 'ListItem', position: 3, name: campaign.title, item: `https://eb28.co${base}article/` }] },
      { '@type': 'FAQPage', mainEntity: campaign.faqs.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) },
    ],
  };
  const heroMedia = prospect.heroImage
    ? `<picture><source type="image/avif" srcset="/32940/proposals/assets/${prospect.heroImage}-640.avif 640w, /32940/proposals/assets/${prospect.heroImage}-960.avif 960w, /32940/proposals/assets/${prospect.heroImage}-1440.avif 1440w"><source type="image/webp" srcset="/32940/proposals/assets/${prospect.heroImage}-640.webp 640w, /32940/proposals/assets/${prospect.heroImage}-960.webp 960w, /32940/proposals/assets/${prospect.heroImage}-1440.webp 1440w"><img src="/32940/proposals/assets/${prospect.heroImage}-960.jpg" alt="${html(prospect.heroImageAlt)}" width="960" height="700" fetchpriority="high"></picture><small>${html(prospect.heroCredit)}</small>`
    : `<div class="field-graphic" aria-hidden="true"><span>01</span><span>02</span><span>03</span><b></b></div><small>Original EB28 field-note illustration</small>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="${theme.dark}"><title>${html(campaign.title)}</title><meta name="description" content="${html(campaign.metaDescription)}"><meta property="og:type" content="article"><meta property="og:title" content="${html(campaign.title)}"><meta property="og:description" content="${html(campaign.metaDescription)}"><meta property="og:image" content="https://eb28.co${base}static-sample.jpg"><link rel="icon" href="/favicon.svg"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
<style>:root{--paper:${theme.paper};--ink:${theme.ink};--dark:${theme.dark};--accent:${theme.accent};--secondary:${theme.secondary};--soft:${theme.soft};--accent-ink:${theme.accentInk};--line:color-mix(in srgb,var(--ink) 18%,transparent)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.skip{position:fixed;left:12px;top:-80px;z-index:100;padding:12px 16px;color:var(--paper);background:var(--dark)}.skip:focus{top:12px}.review-banner{position:sticky;top:0;z-index:50;padding:10px 18px;color:#fff;background:var(--dark);border-bottom:1px solid rgba(255,255,255,.16);text-align:center;font-size:11px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.shell{width:min(calc(100% - 40px),1360px);margin-inline:auto}.masthead{display:flex;min-height:76px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.brand{color:var(--ink);font-size:13px;font-weight:900;letter-spacing:.15em;text-decoration:none;text-transform:uppercase}.brand span{display:block;margin-top:5px;color:color-mix(in srgb,var(--ink) 60%,transparent);font-size:9px;font-weight:750;letter-spacing:.1em}.nav-actions{display:flex;gap:8px}.nav-actions a,.button{min-height:46px;padding:0 17px;border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;color:var(--ink);font-size:11px;font-weight:850;text-decoration:none}.nav-actions a:last-child,.button.primary{color:var(--paper);background:var(--dark);border-color:var(--dark)}.hero{padding:76px 0 86px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:72px;align-items:end}.eyebrow{display:flex;align-items:center;gap:12px;color:var(--ink);font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.eyebrow:before{width:52px;height:5px;content:"";background:var(--accent)}h1{max-width:940px;margin:24px 0 0;font:400 clamp(52px,6.6vw,104px)/.91 Georgia,"Times New Roman",serif;letter-spacing:-.06em}.deck{max-width:740px;margin:30px 0 0;color:color-mix(in srgb,var(--ink) 72%,transparent);font-size:19px;line-height:1.65}.byline{margin-top:32px;padding-top:22px;border-top:1px solid var(--line);display:flex;gap:22px;flex-wrap:wrap;color:color-mix(in srgb,var(--ink) 68%,transparent);font-size:12px}.byline strong{color:var(--ink)}.hero-media{position:relative;min-height:520px;overflow:hidden;background:var(--dark)}.hero-media picture,.hero-media img{display:block;width:100%;height:100%}.hero-media img{position:absolute;inset:0;object-fit:cover}.hero-media:after{position:absolute;inset:0;content:"";background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,.6))}.hero-media small{position:absolute;z-index:2;right:18px;bottom:15px;color:#fff;font-size:10px}.field-graphic{position:absolute;inset:0;background:linear-gradient(145deg,var(--dark),var(--secondary));overflow:hidden}.field-graphic:before{position:absolute;inset:0;content:"";background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:60px 60px}.field-graphic span{position:absolute;color:var(--paper);font:700 13px Inter,sans-serif;letter-spacing:.16em}.field-graphic span:nth-child(1){left:14%;top:18%}.field-graphic span:nth-child(2){right:18%;top:36%}.field-graphic span:nth-child(3){left:36%;bottom:20%}.field-graphic b{position:absolute;left:12%;right:10%;top:56%;height:8px;background:var(--accent);transform:rotate(-24deg);transform-origin:left}.quick-band{color:var(--paper);background:var(--dark);padding:72px 0}.quick-grid{display:grid;grid-template-columns:.7fr 1.3fr;gap:70px}.quick-band h2{margin:0;font:400 clamp(36px,4.2vw,62px)/1 Georgia,serif;letter-spacing:-.04em}.quick-copy>p{margin:0;font-size:18px;line-height:1.75}.takeaways{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(255,255,255,.2)}.takeaways div{padding:22px 20px 20px 0;border-bottom:1px solid rgba(255,255,255,.2);font-size:13px;font-weight:750;line-height:1.45}.takeaways div:nth-child(odd){border-right:1px solid rgba(255,255,255,.2)}.takeaways div:nth-child(even){padding-left:20px}.article-layout{padding:90px 0 120px;display:grid;grid-template-columns:260px minmax(0,720px) minmax(220px,1fr);gap:58px;align-items:start}.toc{position:sticky;top:76px}.toc>span,.rail>span{display:block;margin-bottom:20px;color:color-mix(in srgb,var(--ink) 58%,transparent);font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.toc a{padding:13px 0;border-top:1px solid var(--line);display:grid;grid-template-columns:30px 1fr;gap:8px;color:color-mix(in srgb,var(--ink) 72%,transparent);font-size:11px;font-weight:700;line-height:1.35;text-decoration:none}.toc a:last-child{border-bottom:1px solid var(--line)}.toc a span{color:var(--secondary);font-size:9px}.article-content{max-width:68ch}.article-content>.lede{margin:0 0 28px;font:400 25px/1.5 Georgia,serif}.article-content>.lede+p{margin-top:0}.article-content>p,.article-section>p{font-size:17px;line-height:1.82}.article-section{padding:72px 0 0;scroll-margin-top:90px}.section-number{margin-bottom:12px;color:var(--secondary);font-size:11px;font-weight:900;letter-spacing:.16em}.article-section h2{margin:0 0 25px;font:400 clamp(35px,4vw,51px)/1.02 Georgia,serif;letter-spacing:-.045em}.citations{display:inline-flex;gap:3px;margin-left:5px;vertical-align:super}.citations a{min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--accent-ink);background:var(--accent);font:800 9px Inter,sans-serif;text-decoration:none}.action-list{margin:30px 0 0;padding:22px 24px;border-left:7px solid var(--accent);background:color-mix(in srgb,var(--soft) 52%,white)}.action-list>span{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.action-list ul{margin:14px 0 0;padding-left:20px;columns:2;column-gap:30px}.action-list li{margin:0 0 9px;break-inside:avoid;font-size:13px;font-weight:700;line-height:1.45}.rail{position:sticky;top:76px}.rail-card{padding:22px;background:var(--dark);color:var(--paper)}.rail-card img{display:block;width:100%;height:auto}.rail-card h3{margin:22px 0 0;font:400 25px/1.04 Georgia,serif}.rail-card p{color:color-mix(in srgb,var(--paper) 75%,transparent);font-size:12px;line-height:1.6}.rail-card a{width:100%;margin-top:14px;color:var(--accent-ink);background:var(--accent);border-color:var(--accent)}.framework{margin-top:16px;padding:20px;border:1px solid var(--line)}.framework b{display:block;margin-bottom:15px;font-size:10px;letter-spacing:.14em;text-transform:uppercase}.framework span{display:block;padding:10px 0;border-top:1px solid var(--line);font:700 11px/1.4 Inter,sans-serif}.conversion{margin-top:80px;padding:48px;color:var(--paper);background:var(--dark)}.conversion small{font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.conversion h2{margin:18px 0 0;font:400 clamp(38px,5vw,61px)/.98 Georgia,serif;letter-spacing:-.045em}.conversion p{max-width:650px;color:color-mix(in srgb,var(--paper) 74%,transparent);font-size:15px;line-height:1.7}.conversion .button{margin-top:12px;color:var(--accent-ink);background:var(--accent);border-color:var(--accent)}.faq-sources{padding:100px 0;background:#fff}.faq-source-grid{display:grid;grid-template-columns:1fr 1fr;gap:90px}.faq-sources h2{margin:0 0 30px;font:400 clamp(38px,4vw,56px)/1 Georgia,serif;letter-spacing:-.04em}details{border-top:1px solid var(--line)}details:last-of-type{border-bottom:1px solid var(--line)}summary{min-height:62px;padding:18px 36px 18px 0;display:flex;align-items:center;position:relative;cursor:pointer;font-size:14px;font-weight:800;line-height:1.4;list-style:none}summary:after{position:absolute;right:4px;content:"+";font-size:24px;font-weight:400}details[open] summary:after{content:"–"}details p{margin:0;padding:0 34px 24px 0;color:color-mix(in srgb,var(--ink) 72%,transparent);font-size:14px;line-height:1.7}.sources-list{margin:0;padding:0;list-style:none}.sources-list li{padding:18px 0;border-top:1px solid var(--line);display:grid;grid-template-columns:30px 1fr;gap:10px}.sources-list li:last-child{border-bottom:1px solid var(--line)}.sources-list li>span{color:var(--secondary);font-size:11px;font-weight:900}.sources-list strong,.sources-list small{display:block}.sources-list strong{font-size:13px;line-height:1.4}.sources-list small{margin-top:4px;color:color-mix(in srgb,var(--ink) 58%,transparent);font-size:10px}.sources-list a{min-height:44px;display:inline-flex;align-items:center;color:var(--ink);font-size:11px;font-weight:850}.related{margin-top:32px}.related h3{font:400 25px Georgia,serif}.related a{min-height:46px;padding:0;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;color:var(--ink);font-size:12px;font-weight:800;text-decoration:none}.article-footer{padding:58px 0;color:var(--paper);background:var(--dark)}.article-footer p{max-width:850px;margin:0;color:color-mix(in srgb,var(--paper) 70%,transparent);font-size:12px;line-height:1.75}.article-footer a{color:var(--paper)}a:focus-visible,summary:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:4px}@media(max-width:1080px){.hero{grid-template-columns:1fr;gap:42px}.hero-media{min-height:460px}.article-layout{grid-template-columns:210px minmax(0,1fr)}.rail{position:static;grid-column:2}.rail-card{display:grid;grid-template-columns:180px 1fr;gap:22px}.rail-card h3{margin-top:0}.faq-source-grid{gap:50px}}@media(max-width:760px){html{scroll-behavior:auto}.shell{width:min(calc(100% - 28px),1360px)}.review-banner{font-size:9px}.masthead{min-height:66px}.brand span,.nav-actions a:first-child{display:none}.nav-actions a{padding-inline:12px}.hero{padding:52px 0 62px}.hero-media{min-height:360px}h1{font-size:54px}.deck{font-size:16px}.quick-band{padding:56px 0}.quick-grid{grid-template-columns:1fr;gap:28px}.quick-copy>p{font-size:16px}.takeaways{grid-template-columns:1fr}.takeaways div:nth-child(odd){border-right:0}.takeaways div:nth-child(even){padding-left:0}.article-layout{padding:55px 0 80px;grid-template-columns:1fr;gap:44px}.toc{position:static;display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.article-content>.lede{font-size:22px}.article-content>p,.article-section>p{font-size:16px}.article-section{padding-top:58px}.action-list ul{columns:1}.rail{grid-column:auto}.rail-card{grid-template-columns:1fr}.rail-card img{max-height:560px;object-fit:cover}.conversion{margin-top:56px;padding:30px}.faq-sources{padding:70px 0}.faq-source-grid{grid-template-columns:1fr;gap:70px}}@media(max-width:460px){.toc{grid-template-columns:1fr}.byline{gap:10px;flex-direction:column}.hero-media{min-height:320px}h1{font-size:46px}.article-section h2{font-size:38px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}@media print{.review-banner,.masthead,.toc,.rail,.conversion,.article-footer{display:none}.article-layout{display:block;padding-top:20px}.article-section{break-inside:avoid}.faq-sources{padding-top:40px}}</style></head>
<body data-primary-keyword="${html(campaign.primaryKeyword)}"><a class="skip" href="#article">Skip to article</a><div class="review-banner">Unofficial owner-review editorial concept · Nothing approved, scheduled or published</div><header class="shell masthead"><a class="brand" href="${base}">${html(prospect.name)}<span>${html(campaign.campaignLabel)}</span></a><nav class="nav-actions" aria-label="Article actions"><a href="${base}">Campaign preview</a><a href="/content-factory/?prospect=${encodeURIComponent(prospect.slug)}#pilot">Review with EB28</a></nav></header>
<main><header class="shell hero"><div><div class="eyebrow">${html(prospect.category)}</div><h1>${html(campaign.title)}</h1><p class="deck">${html(campaign.deck)}</p><div class="byline"><span><strong>Prepared by</strong> EB28 Content Factory</span><span><strong>Owner review</strong> Pending</span><span><strong>Updated</strong> July 14, 2026</span><span><strong>Read</strong> ${readingMinutes(campaign)} minutes</span></div></div><figure class="hero-media">${heroMedia}</figure></header>
<section class="quick-band" aria-labelledby="quick-title"><div class="shell quick-grid"><h2 id="quick-title">Quick answer: how to prepare for ${html(campaign.primaryKeyword)}</h2><div class="quick-copy"><p>${html(campaign.quickAnswer)}</p><div class="takeaways">${campaign.takeaways.map((item) => `<div>${html(item)}</div>`).join('')}</div></div></div></section>
<div class="shell article-layout"><nav class="toc" aria-label="Table of contents"><span>On this page</span>${toc}</nav><article id="article" class="article-content" data-word-count="${wordCount}"><p class="lede">This guide to ${html(campaign.primaryKeyword)} turns a broad service question into a specific, source-backed preparation plan.</p>${campaign.intro.map((paragraph) => `<p>${html(paragraph)}</p>`).join('')}${sections}<section class="conversion"><small>Owner-review checkpoint</small><h2>One useful article. One clear next step.</h2><p>Use this ${html(campaign.primaryKeyword)} preparation framework only after ${html(prospect.name)} verifies the services, routing, source interpretation and exact article version.</p><a class="button" href="/content-factory/?prospect=${encodeURIComponent(prospect.slug)}#pilot">Review the complete founding pilot</a></section></article><aside class="rail"><span>Campaign system</span><div class="rail-card"><img src="${base}static-sample.jpg" alt="Editorial social graphic derived from the article ${html(campaign.title)}" width="1080" height="1350" loading="lazy"><div><h3>${html(campaign.shortTitle)}</h3><p>The matching feed creative and vertical motion piece use the article’s exact framework, headline and next step.</p><a class="button" href="${base}">See all three pieces</a></div></div><div class="framework"><b>The article-to-social map</b>${campaign.creativeSteps.map((item, index) => `<span>0${index + 1} · ${html(item)}</span>`).join('')}</div></aside></div>
<section class="faq-sources"><div class="shell faq-source-grid"><div><h2>Frequently asked questions</h2>${faq}</div><div><h2>Official sources used</h2><ol class="sources-list">${sources}</ol><div class="related"><h3>Continue through the concept</h3>${related}<a href="${base}article.md">Download the source article <span aria-hidden="true">↓</span></a></div></div></div></section></main><footer class="article-footer"><div class="shell"><p>This is an unofficial editorial and design concept prepared by EB28 for ${html(prospect.name)} owner review. It is not business, medical, legal, structural, pesticide, electrical or emergency advice. No customer form or business contact action is active here. Company-specific facts, operational instructions and publication rights require written owner approval.</p></div></footer></body></html>`;
}

function pilotPage(prospect, campaign, theme) {
  const base = `/32940/proposals/${prospect.slug}/pilot/`;
  const wordCount = countArticleWords(campaign);
  const sourceCount = campaign.sources.length;
  const captionOne = `A better ${campaign.primaryKeyword} starts with a better handoff. ${campaign.campaignSubhead} Read the full owner-review field guide before the next service request. #${prospect.areas[0].replace(/\s+/g, '')} #BrevardCounty`;
  const captionTwo = `${campaign.campaignHook} The complete article turns each point into a practical checklist with official sources and clear limitations. Owner-review concept; nothing is scheduled or published.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="${theme.dark}"><title>${html(prospect.name)} article-led campaign preview | EB28</title><meta name="description" content="One complete source-backed article and two cohesive social campaign previews prepared for ${html(prospect.name)} owner review."><link rel="icon" href="/favicon.svg"><style>:root{--paper:${theme.paper};--ink:${theme.ink};--dark:${theme.dark};--accent:${theme.accent};--secondary:${theme.secondary};--soft:${theme.soft};--accent-ink:${theme.accentInk};--line:color-mix(in srgb,var(--ink) 18%,transparent)}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}.review-banner{position:sticky;top:0;z-index:30;padding:10px 16px;color:#fff;background:var(--dark);text-align:center;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.shell{width:min(calc(100% - 40px),1360px);margin-inline:auto}.masthead{min-height:76px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.brand{color:var(--ink);font-size:13px;font-weight:900;letter-spacing:.14em;text-decoration:none;text-transform:uppercase}.back{min-height:46px;padding:0 16px;border:1px solid var(--line);display:inline-flex;align-items:center;color:var(--ink);font-size:11px;font-weight:850;text-decoration:none}.hero{padding:90px 0 88px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(340px,.8fr);gap:70px;align-items:end}.eyebrow{display:flex;align-items:center;gap:12px;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.eyebrow:before{width:52px;height:5px;content:"";background:var(--accent)}h1{max-width:940px;margin:25px 0 0;font:400 clamp(57px,7vw,108px)/.9 Georgia,serif;letter-spacing:-.065em}.hero-copy{max-width:740px;margin:30px 0 0;color:color-mix(in srgb,var(--ink) 72%,transparent);font-size:18px;line-height:1.65}.stats{border-top:1px solid var(--line)}.stats div{padding:20px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px}.stats strong{font:400 34px Georgia,serif}.stats span{max-width:170px;color:color-mix(in srgb,var(--ink) 65%,transparent);font-size:11px;font-weight:800;line-height:1.4;text-align:right}.story-map{padding:26px 0;color:var(--paper);background:var(--dark)}.story-map .shell{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0}.story-map div{min-height:92px;padding:15px 30px;border-left:1px solid rgba(255,255,255,.2);display:flex;align-items:center;gap:18px}.story-map div:first-child{border-left:0}.story-map b{color:var(--accent);font:800 12px Inter,sans-serif;letter-spacing:.12em}.story-map span{font:400 22px Georgia,serif}.article-feature{padding:100px 0;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:80px;align-items:center}.article-cover{padding:34px;background:var(--dark)}.article-cover img{display:block;width:100%;height:auto}.article-copy>small,.section-head small{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.article-copy h2{margin:18px 0 0;font:400 clamp(42px,5vw,68px)/.98 Georgia,serif;letter-spacing:-.045em}.article-copy p{max-width:700px;color:color-mix(in srgb,var(--ink) 72%,transparent);font-size:16px;line-height:1.75}.topic-list{margin-top:28px;border-top:1px solid var(--line)}.topic-list span{min-height:55px;padding:12px 0;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:16px;font-size:12px;font-weight:800}.topic-list b{color:var(--secondary);font-size:10px}.buttons{margin-top:30px;display:flex;gap:10px;flex-wrap:wrap}.button{min-height:50px;padding:0 19px;border:1px solid var(--dark);display:inline-flex;align-items:center;justify-content:center;color:var(--paper);background:var(--dark);font-size:11px;font-weight:900;text-decoration:none}.button.ghost{color:var(--ink);background:transparent;border-color:var(--line)}.social{padding:100px 0;background:#fff}.section-head{max-width:850px}.section-head h2{margin:18px 0 0;font:400 clamp(44px,5.5vw,74px)/.95 Georgia,serif;letter-spacing:-.05em}.section-head p{max-width:700px;color:color-mix(in srgb,var(--ink) 70%,transparent);font-size:16px;line-height:1.7}.social-grid{margin-top:55px;display:grid;grid-template-columns:1fr 1fr;gap:24px}.social-card{padding:22px;background:var(--paper);border:1px solid var(--line)}.media-frame{overflow:hidden;background:var(--dark)}.media-frame img,.media-frame video{display:block;width:100%;height:auto;max-height:690px;object-fit:contain}.social-meta{padding:28px 5px 6px}.social-meta small{font-size:9px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.social-meta h3{margin:12px 0 0;font:400 31px Georgia,serif}.social-meta p{color:color-mix(in srgb,var(--ink) 68%,transparent);font-size:13px;line-height:1.65}.caption{margin-top:20px;padding:18px;border-left:5px solid var(--accent);background:#fff;font-size:12px!important}.source{padding:90px 0;color:var(--paper);background:var(--dark)}.source-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:80px}.source h2{margin:0;font:400 clamp(42px,5vw,66px)/.98 Georgia,serif;letter-spacing:-.045em}.source p{color:color-mix(in srgb,var(--paper) 68%,transparent);font-size:14px;line-height:1.75}.files{display:grid;grid-template-columns:1fr 1fr}.files a{min-height:55px;padding:0 14px;border-top:1px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:space-between;color:var(--paper);font-size:11px;font-weight:800;text-decoration:none}.files a:nth-child(odd){border-right:1px solid rgba(255,255,255,.2)}a:focus-visible,video:focus-visible{outline:3px solid var(--accent);outline-offset:4px}@media(max-width:880px){.hero,.article-feature,.source-grid{grid-template-columns:1fr}.hero{gap:44px}.article-feature{gap:46px}.story-map .shell{grid-template-columns:1fr}.story-map div{border-left:0;border-top:1px solid rgba(255,255,255,.2)}.story-map div:first-child{border-top:0}.social-grid{grid-template-columns:1fr}.social-card{max-width:680px}.source-grid{gap:44px}}@media(max-width:560px){.shell{width:min(calc(100% - 28px),1360px)}.review-banner{font-size:9px}.hero{padding:58px 0 60px}h1{font-size:51px}.hero-copy{font-size:16px}.article-feature,.social,.source{padding:70px 0}.article-cover{padding:16px}.files{grid-template-columns:1fr}.files a:nth-child(odd){border-right:0}.buttons{flex-direction:column}.button{width:100%}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head><body><div class="review-banner">Unofficial owner-review campaign · Nothing approved, scheduled or published</div><header class="shell masthead"><a class="brand" href="/32940/proposals/${html(prospect.slug)}/">${html(prospect.name)}</a><a class="back" href="/32940/proposals/${html(prospect.slug)}/">Open five-page redesign</a></header><main><header class="shell hero"><div><div class="eyebrow">${html(campaign.campaignLabel)}</div><h1>${html(campaign.shortTitle)}</h1><p class="hero-copy">This is a complete campaign, not an outline: one ${wordCount.toLocaleString('en-US')}-word SEO and conversion article, one editorial feed creative and one 15-second vertical motion piece—all built from the same source-backed idea.</p></div><div class="stats"><div><strong>${wordCount.toLocaleString('en-US')}</strong><span>words in the finished owner-review article</span></div><div><strong>${sourceCount}</strong><span>official or authoritative sources mapped to claims</span></div><div><strong>2</strong><span>social outputs derived from the exact article framework</span></div></div></header><section class="story-map"><div class="shell"><div><b>01</b><span>Full search article</span></div><div><b>02</b><span>Matching feed story</span></div><div><b>03</b><span>Matching vertical reel</span></div></div></section><section class="shell article-feature"><div class="article-cover"><img src="static-sample.jpg" alt="Social campaign cover for ${html(campaign.title)}" width="1080" height="1350"></div><div class="article-copy"><small>Free long-form article · owner review</small><h2>${html(campaign.title)}</h2><p>${html(campaign.deck)}</p><div class="topic-list">${campaign.sections.slice(0, 5).map((section, index) => `<span><b>0${index + 1}</b>${html(section.title)}</span>`).join('')}</div><div class="buttons"><a class="button" href="article/">Read the finished article</a><a class="button ghost" href="article.md">Open the source draft</a></div></div></section><section class="social"><div class="shell"><header class="section-head"><small>Two supporting previews · one campaign system</small><h2>The social pieces now earn their place.</h2><p>Both assets use the article’s headline, preparation framework and owner-review conversion action. They are no longer disconnected generic posts.</p></header><div class="social-grid"><article class="social-card"><div class="media-frame"><img src="static-sample.jpg" alt="1080 by 1350 editorial feed creative based on the full article" width="1080" height="1350" loading="lazy"></div><div class="social-meta"><small>Preview 02 · 1080×1350 JPEG</small><h3>Editorial feed story</h3><p>The saveable cover introduces the same field guide users reach on the website.</p><p class="caption"><strong>Caption:</strong> ${html(captionOne)}</p></div></article><article class="social-card"><div class="media-frame"><video controls playsinline preload="metadata" poster="motion-poster.jpg" aria-label="15-second vertical campaign preview"><source src="motion-sample.mp4" type="video/mp4"></video></div><div class="social-meta"><small>Preview 03 · 1080×1920 H.264</small><h3>Three-frame vertical reel</h3><p>Hook, three-point preparation plan and full-article action—paced across 15 seconds.</p><p class="caption"><strong>Caption:</strong> ${html(captionTwo)}</p></div></article></div></div></section><section class="source"><div class="shell source-grid"><div><h2>Every claim has a place to come from.</h2><p>${html(prospect.sourceStatus)} The article separates sourced education from business-specific facts, keeps owner review pending and makes no rankings, traffic, lead, revenue, availability or outcome promise.</p><div class="buttons"><a class="button" href="/content-factory/?prospect=${encodeURIComponent(prospect.slug)}#pilot" style="background:var(--accent);border-color:var(--accent);color:var(--accent-ink)">Review the founding pilot</a></div></div><nav class="files" aria-label="Campaign source and handoff files"><a href="article/">Finished article <span>↗</span></a><a href="article.md">Article source <span>↓</span></a><a href="source-manifest.json">Source manifest <span>↓</span></a><a href="social-drafts.json">Two social drafts <span>↓</span></a><a href="business-brain.json">Business Brain <span>↓</span></a><a href="gap-summary.md">Gap summary <span>↓</span></a></nav></div></section></main></body></html>`;
}

function polishArticleHtml(page) {
  return page
    .replace('</style>', '.toc>span,.rail>span,.toc a span,.section-number,.sources-list li>span,.sources-list small{color:var(--ink)}.citations{vertical-align:middle}.citations a{min-width:26px;height:26px;font-size:10px}</style>')
    .replace(/(<div class="rail-card"><img src="[^"]*)static-sample\.jpg("[^>]*?)width="1080" height="1350"/, '$1static-preview.webp$2width="720" height="900"');
}

function polishPilotHtml(page) {
  return page
    .replace('</style>', '.story-map b{color:var(--paper)}.topic-list b{color:var(--ink)}</style>')
    .replace('<div class="article-cover"><img src="static-sample.jpg"', '<div class="article-cover"><img src="static-preview.webp"')
    .replace('width="1080" height="1350"></div><div class="article-copy">', 'width="720" height="900" fetchpriority="high"></div><div class="article-copy">')
    .replace('<div class="media-frame"><img src="static-sample.jpg"', '<div class="media-frame"><img src="static-preview.webp"')
    .replace('width="1080" height="1350" loading="lazy">', 'width="720" height="900" loading="lazy">')
    .replace('poster="motion-poster.jpg"', 'poster="motion-poster-preview.webp"')
    .replace('<a href="gap-summary.md">Gap summary <span>↓</span></a>', '<a href="gap-summary.md">Gap summary <span>↓</span></a><a href="static-sample.jpg">Full feed JPEG <span>↓</span></a><a href="motion-sample.mp4">Full motion MP4 <span>↓</span></a>');
}

function gapSummary(prospect, campaign) {
  const launchBlocker = prospect.sourceStatus.includes('failure')
    ? 'The official HTTPS surface did not complete the July 14 fetch. Treat certificate, origin access and redirect behavior as a launch blocker until reverified.'
    : 'The official HTTPS source was reachable on July 14. Recheck it immediately before outreach and again before any migration.';
  return `# ${prospect.name}: personalized website and content gap summary\n\nChecked: July 14, 2026\n\n## Current technical truth\n\n${launchBlocker}\n\n## Premium website opportunity\n\n${prospect.hero.note}\n\n## Article-led campaign opportunity\n\n- Publish-ready owner-review article: **${campaign.title}**\n- ${countArticleWords(campaign).toLocaleString('en-US')} words with anchored sections, quick answer, FAQ, source list and conversion checkpoint.\n- One 1080×1350 editorial feed creative and one 1080×1920 H.264 motion piece derived from the article.\n- No disconnected filler posts, invented business proof or unattended publication.\n\n## Owner-review requirements\n\n- Confirm every service, credential, price, offer, testimonial, hour and location fact.\n- Confirm rights to logos, team photos, facility photos and customer proof.\n- Approve the exact article, website and campaign versions before staging or publication.\n`;
}

for (const prospect of prospects) {
  const campaign = pilotCampaigns[prospect.slug];
  if (!campaign) throw new Error(`Missing pilot campaign for ${prospect.slug}`);
  const theme = creativeThemes[prospect.siteKey];
  const packDir = path.join(outRoot, prospect.slug, 'pilot');
  const articleDir = path.join(packDir, 'article');
  await fs.mkdir(articleDir, { recursive: true });

  const contentHash = versionHash(prospect, campaign);
  const sourceClaims = [
    { field: 'business_name', value: prospect.name, status: 'supported', sourceType: 'official_site', sourceUrl: prospect.sourceUrls[0] },
    { field: 'category', value: prospect.category, status: 'owner_review_required', sourceType: 'official_or_public_business_source', sourceUrl: prospect.sourceUrls[0] },
    { field: 'phone', value: prospect.phone, status: 'supported_not_activated', sourceType: 'official_site', sourceUrl: prospect.sourceUrls[0] },
    ...prospect.services.map((service) => ({ field: 'service', value: service, status: 'owner_review_required', sourceType: 'official_site', sourceUrl: prospect.sourceUrls[0] })),
  ];
  const businessBrain = {
    version: 2,
    orgId: `pilot_${prospect.slug}`,
    businessName: prospect.name,
    website: prospect.officialUrl,
    category: prospect.category,
    services: prospect.services,
    serviceAreas: prospect.areas,
    audience: prospect.hero.copy,
    tone: prospect.artDirection,
    primaryAction: 'EB28 owner-review CTA only until verified contact routing is enabled',
    approvalPolicy: prospect.vertical === 'veterinary' ? 'item' : 'monthly_after_successful_month',
    campaign: { title: campaign.title, primaryKeyword: campaign.primaryKeyword, versionHash: contentHash },
    restrictedClaims: ['Prices', 'Offers', 'Availability', 'Credentials', 'Testimonials', 'Guaranteed outcomes', 'Diagnosis or treatment advice'],
    sourceClaims,
  };
  const manifest = {
    checkedAt: '2026-07-14T12:00:00-04:00',
    orgId: `pilot_${prospect.slug}`,
    status: prospect.sourceStatus,
    versionHash: contentHash,
    publicationStatus: 'owner_review_only',
    artifacts: [
      { path: 'article/index.html', role: 'full_seo_conversion_article', approvalRequired: true },
      { path: 'static-sample.jpg', role: 'article_derived_feed_creative', approvalRequired: true },
      { path: 'motion-sample.mp4', role: 'article_derived_vertical_motion', approvalRequired: true },
    ],
    sources: campaign.sources.map((source, index) => ({ id: source.id, order: index + 1, url: source.url, label: source.label, type: source.type, use: 'Claim support and reader reference; owner approval required before publication' })),
    businessSources: prospect.sourceUrls.map((url) => ({ url, type: 'official_or_public_business_source', use: 'Business-fact discovery only; owner approval required' })),
  };
  const socialDrafts = [
    {
      id: 'article_feed_story', orgId: `pilot_${prospect.slug}`, format: '1080x1350_jpeg', channels: ['instagram', 'facebook', 'linkedin'], title: campaign.shortTitle,
      hook: campaign.campaignHook, body: `A better ${campaign.primaryKeyword} starts with a better handoff. ${campaign.campaignSubhead} Read the complete owner-review guide.`, derivedFrom: 'article/index.html', versionHash: contentHash, approvalRequired: true, publicationStatus: 'owner_review_only',
    },
    {
      id: 'article_vertical_reel', orgId: `pilot_${prospect.slug}`, format: '1080x1920_h264_15s', channels: ['instagram_reels', 'facebook_reels', 'tiktok'], title: campaign.campaignHook,
      frames: ['Article hook', ...campaign.creativeSteps, 'Read the complete owner-review guide'], derivedFrom: 'article/index.html', versionHash: contentHash, approvalRequired: true, publicationStatus: 'owner_review_only',
    },
  ];

  await Promise.all([
    fs.writeFile(path.join(packDir, 'business-brain.json'), `${JSON.stringify(businessBrain, null, 2)}\n`, 'utf8'),
    fs.writeFile(path.join(packDir, 'source-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    fs.writeFile(path.join(packDir, 'social-drafts.json'), `${JSON.stringify(socialDrafts, null, 2)}\n`, 'utf8'),
    fs.writeFile(path.join(packDir, 'article.md'), articleMarkdown(prospect, campaign), 'utf8'),
    fs.writeFile(path.join(packDir, 'gap-summary.md'), gapSummary(prospect, campaign), 'utf8'),
    fs.writeFile(path.join(articleDir, 'index.html'), polishArticleHtml(articlePage(prospect, campaign, theme)), 'utf8'),
    fs.rm(path.join(packDir, 'article-outline.md'), { force: true }),
  ]);

  await renderGraphic(prospect, campaign, theme, path.join(packDir, 'static-sample.jpg'));
  await renderMotion(prospect, campaign, theme, packDir);
  await renderWebPreviews(packDir);
  await fs.writeFile(path.join(packDir, 'index.html'), polishPilotHtml(pilotPage(prospect, campaign, theme)), 'utf8');
}

console.log(`Generated ${prospects.length} article-led founding campaigns: five full articles and ten cohesive social previews.`);
