import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const creativeDir = path.dirname(sourceDir);
const repoRoot = path.resolve(sourceDir, '../../../../..');

const uiPaths = {
  add: path.join(repoRoot, 'public/cc/img/start-with-one-photo.png'),
  results: path.join(sourceDir, 'shipping-ui/cadetcatch-synthetic-results.png'),
};

const generatedPaths = {
  profile: path.join(sourceDir, 'generated/synthetic-demo-profile.png'),
  guide: path.join(sourceDir, 'generated/synthetic-guide-reader.png'),
};

const COLORS = {
  navy: '#071827',
  navy2: '#0C2A45',
  blue: '#173F6B',
  orange: '#F2552C',
  orange2: '#FF7A45',
  cream: '#F7F3EB',
  paper: '#F7FAFC',
  ink: '#0B1A2B',
  slate: '#526176',
  white: '#FFFFFF',
  mint: '#DFF3EC',
};

await fs.mkdir(path.join(creativeDir, 'frames/v1'), { recursive: true });
await fs.mkdir(path.join(creativeDir, 'frames/g2'), { recursive: true });

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const pngDataUri = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

const cropUi = async (file) => sharp(file)
  .extract({ left: 35, top: 175, width: 330, height: 690 })
  .png()
  .toBuffer();

const [addUi, resultsSource, profileBuffer, guideBuffer] = await Promise.all([
  cropUi(uiPaths.add),
  fs.readFile(uiPaths.results),
  fs.readFile(generatedPaths.profile),
  fs.readFile(generatedPaths.guide),
]);

const avatarMask = Buffer.from('<svg width="86" height="86"><circle cx="43" cy="43" r="42" fill="white"/></svg>');
const avatar = await sharp(profileBuffer)
  .resize(86, 86, { fit: 'cover' })
  .composite([{ input: avatarMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

const addFormOverlay = Buffer.from(`<svg width="330" height="690" xmlns="http://www.w3.org/2000/svg">
  <style>.ui{font-family:Arial,Helvetica,sans-serif}</style>
  <rect x="258" y="66" width="62" height="38" rx="19" fill="#FFFFFF"/>
  <text x="289" y="91" text-anchor="middle" class="ui" font-size="15" font-weight="700" fill="#F2552C">Save</text>
  <text x="43" y="389" class="ui" font-size="15" font-weight="600" fill="#344150">Sample Cadet</text>
  <text x="43" y="427" class="ui" font-size="15" font-weight="500" fill="#526176">Demo group</text>
  <text x="43" y="465" class="ui" font-size="15" font-weight="500" fill="#526176">Family</text>
</svg>`);

const addDemoUi = await sharp(addUi)
  .composite([
    { input: avatar, left: 122, top: 145 },
    { input: addFormOverlay, left: 0, top: 0 },
  ])
  .png()
  .toBuffer();

const resultsUi = await sharp(resultsSource)
  .extract({ left: 20, top: 260, width: 1280, height: 2500 })
  .png()
  .toBuffer();

const profileUri = pngDataUri(profileBuffer);
const guideUri = pngDataUri(guideBuffer);

const savedDemoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1250" viewBox="0 0 640 1250">
  <defs>
    <clipPath id="saved-photo-a"><rect x="20" y="202" width="288" height="230" rx="18"/></clipPath>
    <clipPath id="saved-photo-b"><rect x="332" y="202" width="288" height="230" rx="18"/></clipPath>
    <clipPath id="saved-photo-c"><rect x="20" y="600" width="288" height="230" rx="18"/></clipPath>
    <clipPath id="saved-photo-d"><rect x="332" y="600" width="288" height="230" rx="18"/></clipPath>
    <style>.ui{font-family:Arial,Helvetica,sans-serif}</style>
  </defs>
  <rect width="640" height="1250" fill="#EEF4FA"/>
  <text x="28" y="82" class="ui" font-size="54" font-weight="800" fill="#08182A">Photos</text>
  <rect x="20" y="116" width="600" height="54" rx="27" fill="#DCE3EA"/>
  <rect x="320" y="118" width="298" height="50" rx="25" fill="#FFFFFF"/>
  <text x="170" y="151" text-anchor="middle" class="ui" font-size="24" font-weight="600" fill="#111">New</text>
  <text x="470" y="151" text-anchor="middle" class="ui" font-size="24" font-weight="700" fill="#111">Saved</text>
  <image href="${profileUri}" x="20" y="202" width="288" height="230" preserveAspectRatio="xMidYMid slice" clip-path="url(#saved-photo-a)"/>
  <image href="${guideUri}" x="332" y="202" width="288" height="230" preserveAspectRatio="xMidYMid slice" clip-path="url(#saved-photo-b)"/>
  <image href="${guideUri}" x="20" y="600" width="288" height="230" preserveAspectRatio="xMinYMid slice" clip-path="url(#saved-photo-c)"/>
  <image href="${profileUri}" x="332" y="600" width="288" height="230" preserveAspectRatio="xMidYMid slice" clip-path="url(#saved-photo-d)"/>
  ${[[20, 432], [332, 432], [20, 830], [332, 830]].map(([x, y], i) => `<g>
    <rect x="${x}" y="${y}" width="288" height="148" rx="0" fill="#FFFFFF"/>
    <text x="${x + 18}" y="${y + 42}" class="ui" font-size="24" font-weight="800" fill="#08182A">Sample Cadet${i > 1 ? ` ${i + 1}` : ''}</text>
    <text x="${x + 18}" y="${y + 76}" class="ui" font-size="19" fill="#66758A">CadetCatch Photos</text>
    <text x="${x + 18}" y="${y + 112}" class="ui" font-size="19" font-weight="700" fill="#F2552C">● Saved</text>
  </g>`).join('')}
  <rect x="20" y="202" width="288" height="378" rx="18" fill="none" stroke="#CAD6E1"/>
  <rect x="332" y="202" width="288" height="378" rx="18" fill="none" stroke="#CAD6E1"/>
  <rect x="20" y="600" width="288" height="378" rx="18" fill="none" stroke="#CAD6E1"/>
  <rect x="332" y="600" width="288" height="378" rx="18" fill="none" stroke="#CAD6E1"/>
  <rect x="20" y="1080" width="600" height="126" rx="62" fill="#FFFFFF" fill-opacity=".94"/>
  ${['Home', 'Photos', 'Roster', 'Info', 'More'].map((label, i) => `<g transform="translate(${80 + i * 120} 1110)">
    <circle cx="0" cy="18" r="${label === 'Photos' ? 28 : 20}" fill="${label === 'Photos' ? '#E5EBEF' : '#0B1723'}"/>
    <text x="0" y="70" text-anchor="middle" class="ui" font-size="17" font-weight="${label === 'Photos' ? 800 : 600}" fill="${label === 'Photos' ? '#F2552C' : '#111'}">${label}</text>
  </g>`).join('')}
</svg>`;
const savedDemoUi = await sharp(Buffer.from(savedDemoSvg)).png().toBuffer();

const uiUris = {
  add: pngDataUri(addDemoUi),
  results: pngDataUri(resultsUi),
  saved: pngDataUri(savedDemoUi),
};

function commonDefs() {
  return `
    <linearGradient id="bgNavy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLORS.navy}"/>
      <stop offset="1" stop-color="${COLORS.navy2}"/>
    </linearGradient>
    <linearGradient id="bgPaper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EEF4F8"/>
    </linearGradient>
    <linearGradient id="photoShade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#071827" stop-opacity=".95"/>
      <stop offset=".58" stop-color="#071827" stop-opacity=".55"/>
      <stop offset="1" stop-color="#071827" stop-opacity=".12"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#071827" flood-opacity=".24"/>
    </filter>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#071827" flood-opacity=".17"/>
    </filter>
    <style>
      .sans { font-family: Arial, Helvetica, sans-serif; }
      .tight { letter-spacing: -2px; }
      .caps { letter-spacing: 3px; }
    </style>`;
}

function svgRoot(width, height, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>${commonDefs()}${defs}</defs>
    ${body}
  </svg>`;
}

function brand({ x = 68, y = 64, color = COLORS.ink, inverse = false, scale = 1 }) {
  const textColor = inverse ? COLORS.white : color;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect width="62" height="62" rx="18" fill="${COLORS.orange}"/>
    <text x="31" y="40" text-anchor="middle" class="sans" font-size="23" font-weight="800" fill="#fff">CC</text>
    <text x="80" y="42" class="sans tight" font-size="34" font-weight="760" fill="${textColor}">CadetCatch</text>
  </g>`;
}

function disclaimer({ y, inverse = false, centered = false, size = 24, width = 940 }) {
  const x = centered ? 540 : 70;
  const anchor = centered ? 'middle' : 'start';
  const color = inverse ? '#D7E1E9' : '#5A687A';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="sans" font-size="${size}" font-weight="500" fill="${color}">Independent; not affiliated with USCGA, USCG, or DHS.</text>`;
}

function image({ href, x, y, width, height, radius = 0, id, fit = 'slice', opacity = 1 }) {
  const clipId = `clip-${id}`;
  const preserve = fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
  return `<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>
    <image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${preserve}" clip-path="url(#${clipId})" opacity="${opacity}"/>`;
}

function phone({ href, x, y, width, height, id, fit = 'slice' }) {
  return `<g filter="url(#shadow)">
    <rect x="${x - 14}" y="${y - 14}" width="${width + 28}" height="${height + 28}" rx="60" fill="#071827" opacity=".1"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="48" fill="#EEF4FA"/>
    ${image({ href, x, y, width, height, radius: 48, id, fit })}
  </g>`;
}

function pill({ x, y, width, text, fill = COLORS.orange, color = COLORS.white }) {
  return `<g transform="translate(${x} ${y})">
    <rect width="${width}" height="54" rx="27" fill="${fill}"/>
    <text x="${width / 2}" y="35" text-anchor="middle" class="sans caps" font-size="20" font-weight="800" fill="${color}">${esc(text)}</text>
  </g>`;
}

async function writePng(relativePath, svg) {
  const out = path.join(creativeDir, relativePath);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  return out;
}

function s1Outcome() {
  const body = `
    <rect width="1080" height="1350" fill="url(#bgPaper)"/>
    <circle cx="985" cy="140" r="250" fill="#E4EDF5"/>
    <circle cx="110" cy="1120" r="270" fill="#FFF0E8"/>
    ${brand({})}
    <text x="70" y="270" class="sans tight" font-size="66" font-weight="800" fill="${COLORS.ink}">
      <tspan x="70" dy="0">Search. Review.</tspan>
      <tspan x="70" dy="80" fill="${COLORS.orange}">Save the finds</tspan>
      <tspan x="70" dy="80" fill="${COLORS.orange}">you choose.</tspan>
    </text>
    <text x="74" y="615" class="sans" font-size="31" font-weight="500" fill="${COLORS.slate}">
      <tspan x="74">Possible matches stay yours</tspan>
      <tspan x="74" dy="43">to review, one by one.</tspan>
    </text>
    <defs><clipPath id="portrait-s1"><circle cx="205" cy="856" r="126"/></clipPath></defs>
    <circle cx="205" cy="856" r="140" fill="#fff" filter="url(#softShadow)"/>
    <image href="${profileUri}" x="79" y="730" width="252" height="252" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait-s1)"/>
    ${pill({ x: 72, y: 1025, width: 272, text: 'FICTIONAL DEMO', fill: COLORS.navy })}
    ${phone({ href: uiUris.results, x: 635, y: 250, width: 355, height: 840, id: 's1-results', fit: 'contain' })}
    <rect x="526" y="1135" width="477" height="92" rx="46" fill="${COLORS.ink}"/>
    <text x="765" y="1194" text-anchor="middle" class="sans" font-size="30" font-weight="760" fill="#fff">Free iPhone download</text>
    ${disclaimer({ y: 1300, size: 23 })}`;
  return svgRoot(1080, 1350, body);
}

function t1Transparency() {
  const cards = [
    ['1', 'CadetCatch suggests'],
    ['2', 'You review every result'],
    ['3', 'You choose what to save'],
  ].map(([n, label], i) => {
    const y = 645 + i * 155;
    return `<g transform="translate(72 ${y})">
      <rect width="936" height="124" rx="30" fill="#FFFFFF" fill-opacity=".08" stroke="#FFFFFF" stroke-opacity=".14"/>
      <circle cx="65" cy="62" r="34" fill="${i === 1 ? COLORS.orange : '#234C70'}"/>
      <text x="65" y="73" text-anchor="middle" class="sans" font-size="30" font-weight="800" fill="#fff">${n}</text>
      <text x="126" y="75" class="sans" font-size="35" font-weight="680" fill="#fff">${esc(label)}</text>
    </g>`;
  }).join('');

  const body = `
    <rect width="1080" height="1350" fill="url(#bgNavy)"/>
    <circle cx="1010" cy="155" r="330" fill="#173F6B" opacity=".5"/>
    <circle cx="35" cy="1260" r="310" fill="#F2552C" opacity=".10"/>
    ${brand({ inverse: true })}
    ${pill({ x: 70, y: 177, width: 248, text: 'TRANSPARENCY', fill: '#234C70' })}
    <text x="70" y="355" class="sans tight" font-size="94" font-weight="830" fill="#fff">
      <tspan x="70">Possible matches.</tspan>
      <tspan x="70" dy="108" fill="${COLORS.orange2}">Your call.</tspan>
    </text>
    <text x="74" y="555" class="sans" font-size="31" font-weight="500" fill="#D7E1E9">No automatic saves. You make the final decision.</text>
    ${cards}
    ${disclaimer({ y: 1288, inverse: true, size: 24 })}`;
  return svgRoot(1080, 1350, body);
}

function w1Offer() {
  const body = `
    <rect width="1080" height="1350" fill="${COLORS.cream}"/>
    <rect x="0" y="0" width="1080" height="520" fill="url(#bgNavy)"/>
    <circle cx="970" cy="80" r="245" fill="#214B71" opacity=".55"/>
    ${brand({ inverse: true })}
    ${pill({ x: 70, y: 177, width: 260, text: 'START HERE', fill: COLORS.orange })}
    <text x="70" y="325" class="sans tight" font-size="76" font-weight="820" fill="#fff">
      <tspan x="70">One preview</tspan>
      <tspan x="70" dy="86">search free.</tspan>
    </text>
    <text x="70" y="618" class="sans" font-size="35" font-weight="760" fill="${COLORS.slate}">Then, if it helps your family:</text>
    <text x="70" y="733" class="sans tight" font-size="66" font-weight="840" fill="${COLORS.ink}">Family Monthly</text>
    <text x="70" y="825" class="sans tight" font-size="78" font-weight="850" fill="${COLORS.orange}">$12.99/month.</text>
    <text x="74" y="900" class="sans" font-size="27" font-weight="500" fill="${COLORS.slate}">Subscription renews monthly through Apple.</text>
    <defs><clipPath id="portrait-w1"><circle cx="826" cy="780" r="142"/></clipPath></defs>
    <circle cx="826" cy="780" r="158" fill="#fff" filter="url(#softShadow)"/>
    <image href="${profileUri}" x="684" y="638" width="284" height="284" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait-w1)"/>
    ${pill({ x: 686, y: 960, width: 282, text: 'SYNTHETIC DEMO', fill: COLORS.navy })}
    <rect x="68" y="1003" width="550" height="104" rx="52" fill="${COLORS.orange}"/>
    <text x="343" y="1069" text-anchor="middle" class="sans" font-size="32" font-weight="780" fill="#fff">Free iPhone download</text>
    ${disclaimer({ y: 1295, size: 23 })}`;
  return svgRoot(1080, 1350, body);
}

function g1Guide() {
  const body = `
    ${image({ href: guideUri, x: 0, y: 0, width: 1080, height: 1350, radius: 0, id: 'g1-guide-photo' })}
    <rect width="1080" height="1350" fill="url(#photoShade)"/>
    <rect x="0" y="1070" width="1080" height="280" fill="#071827" fill-opacity=".86"/>
    ${brand({ inverse: true })}
    ${pill({ x: 70, y: 182, width: 322, text: 'NO SIGNUP REQUIRED', fill: COLORS.orange })}
    <text x="70" y="370" class="sans tight" font-size="78" font-weight="840" fill="#fff">
      <tspan x="70">Free guide:</tspan>
      <tspan x="70" dy="88">Where Swab Summer</tspan>
      <tspan x="70" dy="88">photos get posted</tspan>
    </text>
    <rect x="70" y="1055" width="815" height="96" rx="48" fill="#fff"/>
    <text x="478" y="1115" text-anchor="middle" class="sans" font-size="30" font-weight="760" fill="${COLORS.ink}">cadetcatch.com/swab-summer-photos</text>
    <text x="70" y="1218" class="sans" font-size="28" font-weight="600" fill="#fff">A practical source list for Coast Guard Academy families.</text>
    ${disclaimer({ y: 1293, inverse: true, size: 23 })}`;
  return svgRoot(1080, 1350, body);
}

function carouselCard({ step, titleLines, ui, bg, inverse = false, accent = COLORS.orange, key }) {
  const ink = inverse ? COLORS.white : COLORS.ink;
  const tspans = titleLines.map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 76}">${esc(line)}</tspan>`).join('');
  const body = `
    <rect width="1080" height="1080" fill="${bg}"/>
    <circle cx="1010" cy="85" r="250" fill="${accent}" opacity=".13"/>
    ${brand({ inverse })}
    <text x="78" y="250" class="sans" font-size="24" font-weight="800" letter-spacing="3" fill="${accent}">HOW IT WORKS · ${step} OF 4</text>
    <text x="70" y="362" class="sans tight" font-size="67" font-weight="840" fill="${ink}">${tspans}</text>
    ${phone({ href: ui, x: 608, y: 238, width: 355, height: 756, id: `carousel-${key}` })}
    <circle cx="177" cy="750" r="102" fill="${accent}"/>
    <text x="177" y="795" text-anchor="middle" class="sans" font-size="126" font-weight="850" fill="#fff">${step}</text>
    <rect x="68" y="905" width="440" height="80" rx="40" fill="${inverse ? '#FFFFFF' : COLORS.ink}" fill-opacity="${inverse ? '.15' : '1'}"/>
    <text x="288" y="956" text-anchor="middle" class="sans" font-size="26" font-weight="760" fill="#fff">CadetCatch for iPhone</text>`;
  return svgRoot(1080, 1080, body);
}

function v1Frame1() {
  const body = `
    ${image({ href: guideUri, x: 0, y: 0, width: 1080, height: 1920, id: 'v1-f1-photo' })}
    <rect width="1080" height="1920" fill="url(#photoShade)"/>
    <rect y="1340" width="1080" height="580" fill="#071827" fill-opacity=".84"/>
    ${brand({ x: 70, y: 100, inverse: true, scale: 1.05 })}
    <text x="70" y="390" class="sans tight" font-size="98" font-weight="850" fill="#fff">
      <tspan x="70">Hours of</tspan>
      <tspan x="70" dy="110">scrolling?</tspan>
      <tspan x="70" dy="130" fill="${COLORS.orange2}">Review possible</tspan>
      <tspan x="70" dy="110" fill="${COLORS.orange2}">matches faster.</tspan>
    </text>
    <text x="70" y="1455" class="sans" font-size="35" font-weight="700" fill="#fff">CadetCatch for iPhone</text>
    <text x="70" y="1520" class="sans" font-size="29" font-weight="500" fill="#D7E1E9">Possible matches stay yours to review.</text>
    ${disclaimer({ y: 1645, inverse: true, size: 22 })}`;
  return svgRoot(1080, 1920, body);
}

function v1UiFrame({ step, headline, ui, bg, inverse = false, id }) {
  const ink = inverse ? '#fff' : COLORS.ink;
  const body = `
    <rect width="1080" height="1920" fill="${bg}"/>
    <circle cx="1000" cy="250" r="340" fill="${COLORS.orange}" opacity=".11"/>
    ${brand({ x: 70, y: 100, inverse })}
    ${pill({ x: 70, y: 228, width: 190, text: `STEP ${step}`, fill: COLORS.orange })}
    <text x="70" y="410" class="sans tight" font-size="90" font-weight="850" fill="${ink}">${esc(headline)}</text>
    ${phone({ href: ui, x: 280, y: 520, width: 520, height: 930, id })}
    <rect x="70" y="1505" width="940" height="104" rx="52" fill="${COLORS.orange}"/>
    <text x="540" y="1570" text-anchor="middle" class="sans" font-size="32" font-weight="780" fill="#fff">Possible matches. Your call.</text>
    ${disclaimer({ y: 1658, inverse, centered: true, size: 21 })}`;
  return svgRoot(1080, 1920, body);
}

function v1Final() {
  const body = `
    <rect width="1080" height="1920" fill="url(#bgNavy)"/>
    <circle cx="540" cy="840" r="430" fill="#173F6B" opacity=".52"/>
    ${brand({ x: 70, y: 100, inverse: true })}
    ${phone({ href: uiUris.results, x: 330, y: 270, width: 420, height: 840, id: 'v1-final-results' })}
    <text x="540" y="1238" text-anchor="middle" class="sans tight" font-size="70" font-weight="840" fill="#fff">
      <tspan x="540">Hours of scrolling?</tspan>
      <tspan x="540" dy="84" fill="${COLORS.orange2}">Review possible</tspan>
      <tspan x="540" dy="84" fill="${COLORS.orange2}">matches faster.</tspan>
    </text>
    <rect x="165" y="1505" width="750" height="104" rx="52" fill="${COLORS.orange}"/>
    <text x="540" y="1571" text-anchor="middle" class="sans" font-size="33" font-weight="780" fill="#fff">Free iPhone download</text>
    ${disclaimer({ y: 1658, inverse: true, centered: true, size: 21 })}`;
  return svgRoot(1080, 1920, body);
}

function guideVideoFrame({ index, eyebrow, titleLines, bodyLines = [], guideItems = [], ui, photo = false, final = false }) {
  const inverse = photo || final || index % 2 === 0;
  const bg = inverse ? 'url(#bgNavy)' : COLORS.paper;
  const ink = inverse ? '#fff' : COLORS.ink;
  const muted = inverse ? '#D7E1E9' : COLORS.slate;
  const title = titleLines.map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 98}">${esc(line)}</tspan>`).join('');
  const bodyText = bodyLines.map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 48}">${esc(line)}</tspan>`).join('');
  let visual = '';
  if (photo) {
    visual = `${image({ href: guideUri, x: 0, y: 0, width: 1080, height: 1920, id: `g2-photo-${index}` })}<rect width="1080" height="1920" fill="url(#photoShade)"/>`;
  } else if (ui) {
    visual = phone({ href: ui, x: 320, y: 790, width: 440, height: 680, id: `g2-ui-${index}` });
  } else if (guideItems.length) {
    visual = `<g>${guideItems.map((item, itemIndex) => {
      const y = 825 + itemIndex * 168;
      return `<g transform="translate(70 ${y})">
        <rect width="940" height="140" rx="34" fill="${inverse ? '#FFFFFF' : COLORS.navy}" fill-opacity="${inverse ? '.09' : '.06'}" stroke="${inverse ? '#FFFFFF' : COLORS.navy}" stroke-opacity=".14"/>
        <circle cx="68" cy="70" r="34" fill="${COLORS.orange}"/>
        <text x="68" y="81" text-anchor="middle" class="sans" font-size="30" font-weight="800" fill="#fff">${itemIndex + 1}</text>
        <text x="128" y="80" class="sans" font-size="31" font-weight="700" fill="${ink}">${esc(item)}</text>
      </g>`;
    }).join('')}</g>`;
  } else if (final) {
    visual = `<g transform="translate(70 820)">
      <rect width="940" height="470" rx="48" fill="#FFFFFF" fill-opacity=".08" stroke="#FFFFFF" stroke-opacity=".14"/>
      <text x="58" y="72" class="sans caps" font-size="23" font-weight="800" fill="${COLORS.orange2}">INSIDE THE GUIDE</text>
      ${['Where photo drops appear', 'How to organize source links', 'What to check before saving'].map((label, i) => `<g transform="translate(58 ${128 + i * 100})">
        <circle cx="28" cy="28" r="28" fill="${COLORS.orange}"/>
        <text x="28" y="38" text-anchor="middle" class="sans" font-size="28" font-weight="800" fill="#fff">${i + 1}</text>
        <text x="82" y="39" class="sans" font-size="31" font-weight="700" fill="#fff">${label}</text>
      </g>`).join('')}
    </g>`;
  }

  return svgRoot(1080, 1920, `
    <rect width="1080" height="1920" fill="${bg}"/>
    ${visual}
    ${brand({ x: 70, y: 100, inverse })}
    ${pill({ x: 70, y: 228, width: final ? 314 : 230, text: eyebrow, fill: COLORS.orange })}
    <text x="70" y="430" class="sans tight" font-size="${final ? 78 : 84}" font-weight="850" fill="${ink}">${title}</text>
    ${bodyLines.length ? `<text x="72" y="690" class="sans" font-size="31" font-weight="520" fill="${muted}">${bodyText}</text>` : ''}
    <rect x="70" y="1505" width="940" height="96" rx="48" fill="${final ? COLORS.orange : (inverse ? '#FFFFFF' : COLORS.ink)}"/>
    <text x="540" y="1565" text-anchor="middle" class="sans" font-size="29" font-weight="760" fill="${final || !inverse ? '#fff' : COLORS.ink}">cadetcatch.com/swab-summer-photos</text>
    ${disclaimer({ y: 1658, inverse, centered: true, size: 21 })}`);
}

const staticJobs = [
  ['s1-outcome-1080x1350.png', s1Outcome()],
  ['t1-transparency-1080x1350.png', t1Transparency()],
  ['w1-free-preview-price-1080x1350.png', w1Offer()],
  ['g1-free-guide-1080x1350.png', g1Guide()],
  ['c1-card-1-1080x1080.png', carouselCard({ step: 1, titleLines: ['Add one', 'clear photo'], ui: uiUris.add, bg: COLORS.paper, key: 'one' })],
  ['c1-card-2-1080x1080.png', carouselCard({ step: 2, titleLines: ['Search event', 'photos'], ui: uiUris.results, bg: COLORS.cream, key: 'two' })],
  ['c1-card-3-1080x1080.png', carouselCard({ step: 3, titleLines: ['Review possible', 'matches'], ui: uiUris.results, bg: COLORS.navy, inverse: true, accent: COLORS.orange2, key: 'three' })],
  ['c1-card-4-1080x1080.png', carouselCard({ step: 4, titleLines: ['Save the photos', 'you choose'], ui: uiUris.saved, bg: '#173F6B', inverse: true, accent: COLORS.orange2, key: 'four' })],
];

const v1Jobs = [
  ['frames/v1/v1-frame-01.png', v1Frame1()],
  ['frames/v1/v1-frame-02.png', v1UiFrame({ step: 1, headline: 'Add one clear photo', ui: uiUris.add, bg: COLORS.paper, id: 'v1-step1' })],
  ['frames/v1/v1-frame-03.png', v1UiFrame({ step: 2, headline: 'Search event photos', ui: uiUris.results, bg: COLORS.cream, id: 'v1-step2' })],
  ['frames/v1/v1-frame-04.png', v1Final()],
];

const g2Jobs = [
  ['frames/g2/g2-frame-01.png', guideVideoFrame({ index: 1, eyebrow: 'FREE GUIDE', titleLines: ['Free Swab Summer', 'photo guide —', 'no signup required.'], photo: true })],
  ['frames/g2/g2-frame-02.png', guideVideoFrame({ index: 2, eyebrow: 'STEP 1', titleLines: ['Start with public', 'photo sources.'], bodyLines: ['Use event galleries and public updates', 'as your first stop.'], guideItems: ['Public event galleries', 'Academy news and photo posts', 'Public community publishers'] })],
  ['frames/g2/g2-frame-03.png', guideVideoFrame({ index: 3, eyebrow: 'STEP 2', titleLines: ['Save your', 'source list.'], bodyLines: ['Keep the links you trust in one place', 'so each new photo drop is easier to check.'], guideItems: ['Name the source', 'Save its public URL', 'Note when you last checked'] })],
  ['frames/g2/g2-frame-04.png', guideVideoFrame({ index: 4, eyebrow: 'STEP 3', titleLines: ['Use one', 'clear photo.'], bodyLines: ['A clear, single-face photo helps return', 'better possible matches.'], ui: uiUris.add })],
  ['frames/g2/g2-frame-05.png', guideVideoFrame({ index: 5, eyebrow: 'STEP 4', titleLines: ['Review every', 'possible match.'], bodyLines: ['You decide what looks right', 'and which photos to save.'], ui: uiUris.results })],
  ['frames/g2/g2-frame-06.png', guideVideoFrame({ index: 6, eyebrow: 'READ IT FREE', titleLines: ['Free Swab Summer', 'photo guide —', 'no signup required.'], final: true })],
];

for (const [name, svg] of [...staticJobs, ...v1Jobs, ...g2Jobs]) {
  await writePng(name, svg);
}

const manifest = {
  generated_at: new Date().toISOString(),
  state: 'DRAFT',
  paid_campaign_state: 'PAUSED',
  inputs: {
    app_ui: Object.values(uiPaths).map((p) => path.relative(repoRoot, p)),
    synthetic_images: Object.values(generatedPaths).map((p) => path.relative(repoRoot, p)),
  },
  outputs: [...staticJobs, ...v1Jobs, ...g2Jobs].map(([name]) => name),
};
await fs.writeFile(path.join(creativeDir, 'render-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Rendered ${manifest.outputs.length} draft creative files in ${creativeDir}`);
