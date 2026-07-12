import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const THEMES = {
  cobalt: { accent: '#60a5fa', accent2: '#22d3ee', glow: '#1d4ed8', ink: '#eff6ff' },
  violet: { accent: '#c084fc', accent2: '#818cf8', glow: '#6d28d9', ink: '#faf5ff' },
  amber: { accent: '#fbbf24', accent2: '#fb7185', glow: '#b45309', ink: '#fffbeb' },
  emerald: { accent: '#34d399', accent2: '#2dd4bf', glow: '#047857', ink: '#ecfdf5' },
  magenta: { accent: '#f472b6', accent2: '#a78bfa', glow: '#be185d', ink: '#fdf2f8' },
  cyan: { accent: '#22d3ee', accent2: '#38bdf8', glow: '#0e7490', ink: '#ecfeff' },
  orange: { accent: '#fb923c', accent2: '#facc15', glow: '#c2410c', ink: '#fff7ed' },
  bluechip: { accent: '#60a5fa', accent2: '#f8fafc', glow: '#1e40af', ink: '#eff6ff' },
  terminal: { accent: '#22d3ee', accent2: '#34d399', glow: '#0e7490', ink: '#ecfeff' },
  tape: { accent: '#f43f5e', accent2: '#f59e0b', glow: '#9f1239', ink: '#fff1f2' },
  slate: { accent: '#94a3b8', accent2: '#38bdf8', glow: '#334155', ink: '#f8fafc' },
};

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value, maxLength) {
  const text = compact(value);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, Math.max(0, maxLength - 1));
  const boundary = shortened.lastIndexOf(' ');
  return `${(boundary > maxLength * 0.55 ? shortened.slice(0, boundary) : shortened).replace(/[.,;:!?-]+$/, '')}…`;
}

function wrapText(value, maxChars, maxLines) {
  const words = compact(value)
    .split(' ')
    .flatMap((word) => {
      if (word.length <= maxChars) return [word];
      const chunks = [];
      for (let index = 0; index < word.length; index += maxChars) chunks.push(word.slice(index, index + maxChars));
      return chunks;
    })
    .filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);
  const clipped = lines.slice(0, maxLines);
  if (words.join(' ').length > clipped.join(' ').length && clipped.length) {
    clipped[clipped.length - 1] = `${clipped[clipped.length - 1].replace(/[.,;:!?-]+$/, '')}…`;
  }
  return clipped;
}

function textLines(lines, { x, y, size, weight = 700, fill = '#f8fafc', lineHeight = 1.16, family = 'Arial, sans-serif', anchor = 'start' }) {
  return lines
    .map((line, index) => {
      const lineY = y + index * size * lineHeight;
      return `<text x="${x}" y="${lineY}" text-anchor="${anchor}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`;
    })
    .join('\n');
}

function background({ width, height, theme, id }) {
  return `
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.58" stop-color="#0b1120"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx="0" cy="0" r="1" gradientTransform="translate(${Math.round(width * 0.86)} ${Math.round(height * 0.12)}) rotate(135) scale(${Math.round(width * 0.72)})">
      <stop offset="0" stop-color="${theme.glow}" stop-opacity="0.58"/>
      <stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid-${id}" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#334155" stroke-opacity="0.22" stroke-width="1"/>
    </pattern>
    <filter id="shadow-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="26" flood-color="#000814" flood-opacity="0.56"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg-${id})"/>
  <rect width="${width}" height="${height}" fill="url(#glow-${id})"/>
  <rect width="${width}" height="${height}" fill="url(#grid-${id})"/>
  <circle cx="${Math.round(width * 0.92)}" cy="${Math.round(height * 0.08)}" r="${Math.round(width * 0.15)}" fill="none" stroke="${theme.accent}" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="${Math.round(width * 0.92)}" cy="${Math.round(height * 0.08)}" r="${Math.round(width * 0.1)}" fill="none" stroke="${theme.accent2}" stroke-opacity="0.12" stroke-width="2"/>
  `;
}

function brandHeader({ width, theme, eyebrow = 'FIELD NOTE' }) {
  return `
    <rect x="76" y="68" width="${width - 152}" height="76" rx="22" fill="#020617" fill-opacity="0.74" stroke="#334155"/>
    <text x="108" y="118" fill="${theme.accent}" font-family="monospace" font-size="35" font-weight="900">&gt;_</text>
    <text x="183" y="116" fill="#f8fafc" font-family="Arial, sans-serif" font-size="29" font-weight="900">EB28</text>
    <text x="${width - 108}" y="115" text-anchor="end" fill="#94a3b8" font-family="Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2">${escapeXml(truncate(eyebrow, 30).toUpperCase())}</text>
  `;
}

function footer({ width, height, theme, label = 'eb28.co' }) {
  return `
    <line x1="76" y1="${height - 104}" x2="${width - 76}" y2="${height - 104}" stroke="#334155"/>
    <text x="76" y="${height - 58}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="22" font-weight="700">Clear promise. Visible proof. Measured handoff.</text>
    <text x="${width - 76}" y="${height - 58}" text-anchor="end" fill="${theme.accent}" font-family="monospace" font-size="22" font-weight="800">${escapeXml(truncate(label, 42))}</text>
  `;
}

function coverSvg(creative, theme) {
  const width = 1080;
  const height = 1350;
  const headline = wrapText(creative.headline, 26, 4);
  const subhead = wrapText(creative.subhead, 48, 3);
  const feature = truncate(creative.feature?.name || creative.featureBadge || 'Built for a measurable next step', 58);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${background({ width, height, theme, id: 'cover' })}
  ${brandHeader({ width, theme, eyebrow: creative.eyebrow })}
  <rect x="76" y="190" width="928" height="994" rx="40" fill="#020617" fill-opacity="0.74" stroke="#334155" filter="url(#shadow-cover)"/>
  <rect x="116" y="238" width="320" height="48" rx="24" fill="${theme.accent}" fill-opacity="0.14" stroke="${theme.accent}" stroke-opacity="0.58"/>
  <text x="276" y="270" text-anchor="middle" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="20" font-weight="900" letter-spacing="2">${escapeXml(truncate(creative.pillar || 'OPERATING SYSTEM', 28).toUpperCase())}</text>
  ${textLines(headline, { x: 116, y: 390, size: 67, weight: 900, fill: theme.ink, lineHeight: 1.08 })}
  ${textLines(subhead, { x: 116, y: 760, size: 31, weight: 600, fill: '#cbd5e1', lineHeight: 1.34 })}
  <rect x="116" y="955" width="848" height="142" rx="28" fill="#0f172a" stroke="#334155"/>
  <text x="150" y="1003" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20" font-weight="800" letter-spacing="2">FEATURE SPOTLIGHT</text>
  ${textLines(wrapText(feature, 42, 2), { x: 150, y: 1060, size: 31, weight: 850, fill: '#f8fafc', lineHeight: 1.15 })}
  ${footer({ width, height, theme, label: creative.cta?.url || 'eb28.co' })}
</svg>`;
}

function flowSvg(creative, theme) {
  const width = 1080;
  const height = 1350;
  const steps = (creative.steps || []).slice(0, 3);
  while (steps.length < 3) steps.push({ label: `STEP ${steps.length + 1}`, value: 'Make the next decision visible and measurable.' });
  const cardY = [310, 612, 914];
  const cards = steps
    .map((step, index) => {
      const y = cardY[index];
      const valueLines = wrapText(step.value, 48, 3);
      const connector = index < 2
        ? `<line x1="148" y1="${y + 230}" x2="148" y2="${y + 286}" stroke="${theme.accent}" stroke-width="5" stroke-linecap="round"/><path d="M132 ${y + 270} L148 ${y + 290} L164 ${y + 270}" fill="none" stroke="${theme.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
        : '';
      return `
        <rect x="92" y="${y}" width="896" height="236" rx="30" fill="#020617" fill-opacity="0.82" stroke="#334155"/>
        <circle cx="148" cy="${y + 66}" r="34" fill="${theme.accent}" fill-opacity="0.18" stroke="${theme.accent}"/>
        <text x="148" y="${y + 77}" text-anchor="middle" fill="${theme.accent}" font-family="monospace" font-size="29" font-weight="900">0${index + 1}</text>
        <text x="204" y="${y + 65}" fill="${theme.accent2}" font-family="Arial, sans-serif" font-size="23" font-weight="900" letter-spacing="2">${escapeXml(truncate(step.label, 34).toUpperCase())}</text>
        ${textLines(valueLines, { x: 204, y: y + 122, size: 30, weight: 650, fill: '#e2e8f0', lineHeight: 1.25 })}
        ${connector}
      `;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${background({ width, height, theme, id: 'flow' })}
  ${brandHeader({ width, theme, eyebrow: creative.eyebrow })}
  <text x="92" y="235" fill="#f8fafc" font-family="Arial, sans-serif" font-size="48" font-weight="900">Build the path, not the pile of tools.</text>
  ${cards}
  ${footer({ width, height, theme, label: creative.cta?.url || 'eb28.co' })}
</svg>`;
}

function featureSvg(creative, theme) {
  const width = 1080;
  const height = 1350;
  const feature = creative.feature || {};
  const featureName = wrapText(feature.name || 'Feature spotlight', 28, 3);
  const promise = wrapText(feature.promise || creative.subhead, 48, 4);
  const bullets = (feature.features || []).slice(0, 3);
  while (bullets.length < 3) bullets.push('One focused feature with a visible owner and a measurable next step.');
  const bulletRows = bullets
    .map((bullet, index) => {
      const y = 760 + index * 130;
      return `
        <circle cx="132" cy="${y - 10}" r="13" fill="${theme.accent}"/>
        ${textLines(wrapText(bullet, 47, 2), { x: 170, y, size: 29, weight: 650, fill: '#e2e8f0', lineHeight: 1.2 })}
      `;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${background({ width, height, theme, id: 'feature' })}
  ${brandHeader({ width, theme, eyebrow: 'FEATURE SPOTLIGHT' })}
  <rect x="76" y="190" width="928" height="994" rx="40" fill="#020617" fill-opacity="0.77" stroke="#334155" filter="url(#shadow-feature)"/>
  <text x="116" y="270" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="2">${escapeXml(String(feature.status || 'ACTIVE').replaceAll('_', ' ').toUpperCase())}</text>
  ${textLines(featureName, { x: 116, y: 370, size: 61, weight: 900, fill: theme.ink, lineHeight: 1.08 })}
  ${textLines(promise, { x: 116, y: 605, size: 30, weight: 600, fill: '#cbd5e1', lineHeight: 1.3 })}
  <line x1="116" y1="708" x2="964" y2="708" stroke="#334155"/>
  ${bulletRows}
  ${footer({ width, height, theme, label: creative.cta?.url || 'eb28.co' })}
</svg>`;
}

function proofSvg(creative, theme) {
  const width = 1080;
  const height = 1350;
  const metric = creative.metric || {};
  const metricValue = wrapText(metric.value || 'Qualified next steps, not activity for activity’s sake.', 36, 5);
  const ctaLabel = wrapText(creative.cta?.label || 'See the full operating guide', 34, 2);
  const disclaimer = wrapText(creative.disclaimer || 'Verify the live path and keep consequential decisions accountable to a person.', 58, 3);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${background({ width, height, theme, id: 'proof' })}
  ${brandHeader({ width, theme, eyebrow: 'PROOF BEFORE SCALE' })}
  <rect x="76" y="190" width="928" height="994" rx="40" fill="#020617" fill-opacity="0.77" stroke="#334155" filter="url(#shadow-proof)"/>
  <text x="116" y="288" fill="#94a3b8" font-family="Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="2">${escapeXml(truncate(metric.label || 'WHAT TO MEASURE', 32).toUpperCase())}</text>
  ${textLines(metricValue, { x: 116, y: 410, size: 56, weight: 900, fill: theme.ink, lineHeight: 1.08 })}
  <rect x="116" y="760" width="848" height="170" rx="30" fill="${theme.accent}" fill-opacity="0.12" stroke="${theme.accent}" stroke-opacity="0.6"/>
  ${textLines(ctaLabel, { x: 540, y: 830, size: 38, weight: 900, fill: '#f8fafc', lineHeight: 1.16, anchor: 'middle' })}
  <text x="540" y="900" text-anchor="middle" fill="${theme.accent}" font-family="monospace" font-size="24" font-weight="800">${escapeXml(truncate(creative.cta?.url || 'eb28.co', 55))}</text>
  ${textLines(disclaimer, { x: 116, y: 1015, size: 25, weight: 600, fill: '#94a3b8', lineHeight: 1.28 })}
  ${footer({ width, height, theme, label: 'Save this field note' })}
</svg>`;
}

function storySvg(creative, theme) {
  const width = 1080;
  const height = 1920;
  const headline = wrapText(creative.headline, 24, 5);
  const steps = (creative.steps || []).slice(0, 3);
  const rows = steps
    .map((step, index) => {
      const y = 1120 + index * 190;
      return `
        <rect x="90" y="${y}" width="900" height="155" rx="28" fill="#020617" fill-opacity="0.82" stroke="#334155"/>
        <text x="132" y="${y + 53}" fill="${theme.accent}" font-family="monospace" font-size="25" font-weight="900">0${index + 1}</text>
        <text x="190" y="${y + 52}" fill="${theme.accent2}" font-family="Arial, sans-serif" font-size="21" font-weight="900" letter-spacing="2">${escapeXml(truncate(step.label, 30).toUpperCase())}</text>
        ${textLines(wrapText(step.value, 46, 2), { x: 190, y: y + 99, size: 27, weight: 650, fill: '#e2e8f0', lineHeight: 1.18 })}
      `;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${background({ width, height, theme, id: 'story' })}
  ${brandHeader({ width, theme, eyebrow: creative.eyebrow })}
  <rect x="76" y="190" width="928" height="820" rx="44" fill="#020617" fill-opacity="0.77" stroke="#334155" filter="url(#shadow-story)"/>
  <rect x="116" y="248" width="330" height="50" rx="25" fill="${theme.accent}" fill-opacity="0.14" stroke="${theme.accent}" stroke-opacity="0.58"/>
  <text x="281" y="282" text-anchor="middle" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="21" font-weight="900" letter-spacing="2">${escapeXml(truncate(creative.pillar || 'FIELD NOTE', 30).toUpperCase())}</text>
  ${textLines(headline, { x: 116, y: 420, size: 70, weight: 900, fill: theme.ink, lineHeight: 1.06 })}
  ${textLines(wrapText(creative.subhead, 45, 4), { x: 116, y: 850, size: 30, weight: 600, fill: '#cbd5e1', lineHeight: 1.28 })}
  ${rows}
  ${footer({ width, height, theme, label: creative.cta?.url || 'eb28.co' })}
</svg>`;
}

function landscapeSvg(creative, theme) {
  const width = 1200;
  const height = 675;
  const headline = wrapText(creative.headline, 27, 3);
  const steps = (creative.steps || []).slice(0, 3);
  const stepCards = steps
    .map((step, index) => {
      const y = 150 + index * 150;
      return `
        <rect x="760" y="${y}" width="370" height="125" rx="24" fill="#020617" fill-opacity="0.82" stroke="#334155"/>
        <text x="790" y="${y + 42}" fill="${theme.accent}" font-family="monospace" font-size="22" font-weight="900">0${index + 1}</text>
        <text x="840" y="${y + 41}" fill="${theme.accent2}" font-family="Arial, sans-serif" font-size="17" font-weight="900" letter-spacing="1">${escapeXml(truncate(step.label, 22).toUpperCase())}</text>
        ${textLines(wrapText(step.value, 34, 2), { x: 790, y: y + 82, size: 20, weight: 650, fill: '#e2e8f0', lineHeight: 1.12 })}
      `;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${background({ width, height, theme, id: 'landscape' })}
  <text x="70" y="78" fill="${theme.accent}" font-family="monospace" font-size="30" font-weight="900">&gt;_ EB28</text>
  <text x="70" y="120" fill="#94a3b8" font-family="Arial, sans-serif" font-size="17" font-weight="900" letter-spacing="2">${escapeXml(truncate(creative.eyebrow || 'FIELD NOTE', 36).toUpperCase())}</text>
  ${textLines(headline, { x: 70, y: 220, size: 55, weight: 900, fill: theme.ink, lineHeight: 1.08 })}
  ${textLines(wrapText(creative.subhead, 48, 3), { x: 70, y: 455, size: 24, weight: 600, fill: '#cbd5e1', lineHeight: 1.25 })}
  ${stepCards}
  <text x="70" y="625" fill="${theme.accent}" font-family="monospace" font-size="20" font-weight="800">${escapeXml(truncate(creative.cta?.url || 'eb28.co', 60))}</text>
</svg>`;
}

async function renderJpeg(svg, filePath) {
  await sharp(Buffer.from(svg))
    .flatten({ background: '#020617' })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(filePath);
}

function assetRecord({ rootDir, absolutePath, publicUrl, width, height, alt }) {
  return {
    type: 'image',
    mimeType: 'image/jpeg',
    localPath: path.relative(rootDir, absolutePath).split(path.sep).join('/'),
    publicUrl,
    width,
    height,
    alt,
  };
}

export async function renderSocialAssetSet({
  creative,
  rootDir,
  outputDir,
  fileBase,
  publicBaseUrl = '',
}) {
  if (!creative?.headline || !creative?.subhead) {
    throw new Error('Social creative requires headline and subhead.');
  }
  const theme = THEMES[creative.theme] || THEMES.cobalt;
  const campaignDir = path.join(outputDir, fileBase);
  await fs.mkdir(campaignDir, { recursive: true });

  const specs = [
    { name: 'feed-01-cover.jpg', width: 1080, height: 1350, svg: coverSvg(creative, theme), alt: `${creative.headline} — EB28 social cover` },
    { name: 'feed-02-path.jpg', width: 1080, height: 1350, svg: flowSvg(creative, theme), alt: `${creative.headline} — three-step operating path` },
    { name: 'feed-03-feature.jpg', width: 1080, height: 1350, svg: featureSvg(creative, theme), alt: `${creative.feature?.name || 'EB28 feature'} — feature details` },
    { name: 'feed-04-proof.jpg', width: 1080, height: 1350, svg: proofSvg(creative, theme), alt: `${creative.headline} — measurement and next step` },
    { name: 'story-1080x1920.jpg', width: 1080, height: 1920, svg: storySvg(creative, theme), alt: `${creative.headline} — vertical story graphic` },
    { name: 'landscape-1200x675.jpg', width: 1200, height: 675, svg: landscapeSvg(creative, theme), alt: `${creative.headline} — landscape social graphic` },
  ];

  for (const spec of specs) await renderJpeg(spec.svg, path.join(campaignDir, spec.name));

  const baseUrl = compact(publicBaseUrl).replace(/\/+$/, '');
  const makeRecord = (spec) => {
    const absolutePath = path.join(campaignDir, spec.name);
    const publicUrl = baseUrl ? `${baseUrl}/${encodeURIComponent(fileBase)}/${spec.name}` : '';
    return assetRecord({ rootDir, absolutePath, publicUrl, width: spec.width, height: spec.height, alt: spec.alt });
  };
  const records = specs.map(makeRecord);

  return {
    version: '2026-07-social-v2',
    format: 'jpeg-no-alpha',
    instagramCarousel: records.slice(0, 4),
    vertical: records[4],
    landscape: records[5],
  };
}

export function getSocialVisualTheme(name) {
  return THEMES[name] || THEMES.cobalt;
}
