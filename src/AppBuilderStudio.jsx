import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  Bot,
  CheckCircle2,
  Clipboard,
  Download,
  FileCode2,
  FileSearch,
  Layers3,
  RefreshCw,
  Rocket,
  SendHorizontal,
  Smartphone,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

const STORAGE_KEY = 'eb28-appbuilder-studio-v2';
const MAX_REFERENCE_IMAGE_DATA_URL_CHARS = 1_600_000;
const VARIANT_LABELS = ['Variant A', 'Variant B', 'Variant C'];

const VARIANT_DIRECTION_PLANS = {
  'editorial-bold': ['editorial-bold', 'conversion-luxe', 'minimal-architectural'],
  'bento-tech': ['bento-tech', 'playful-futurist', 'minimal-architectural'],
  'neo-brutalist': ['neo-brutalist', 'editorial-bold', 'playful-futurist'],
  'conversion-luxe': ['conversion-luxe', 'minimal-architectural', 'editorial-bold'],
  'playful-futurist': ['playful-futurist', 'neo-brutalist', 'bento-tech'],
  'minimal-architectural': ['minimal-architectural', 'editorial-bold', 'bento-tech'],
};

const QUICK_STARTS = [
  {
    title: 'Premium Coaching Hub',
    prompt: 'Build a premium coaching website with onboarding quiz, progress dashboard, and member chat.',
    template: 'community',
    audience: 'members',
    visualDirection: 'editorial-bold',
    complexity: 3,
  },
  {
    title: 'High-Ticket Service Funnel',
    prompt: 'Create a service business site with instant quote flow, trust proof, and booking checkout.',
    template: 'commerce',
    audience: 'consumers',
    visualDirection: 'conversion-luxe',
    complexity: 4,
  },
  {
    title: 'Operations Command UI',
    prompt: 'Design an internal operations app with ticket queue, KPI cards, and escalation workflows.',
    template: 'operations',
    audience: 'internal-team',
    visualDirection: 'bento-tech',
    complexity: 4,
  },
  {
    title: 'Creator Product Site',
    prompt: 'Build a media-rich creator website with episodes, lead magnet funnel, and paid membership upsell.',
    template: 'content',
    audience: 'hybrid',
    visualDirection: 'neo-brutalist',
    complexity: 3,
  },
];

const TEMPLATE_OPTIONS = [
  { value: 'custom', label: 'Custom Build' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'operations', label: 'Operations' },
  { value: 'community', label: 'Community' },
  { value: 'content', label: 'Content + Media' },
];

const AUDIENCE_OPTIONS = [
  { value: 'consumers', label: 'Consumers' },
  { value: 'members', label: 'Members' },
  { value: 'field-team', label: 'Field Team' },
  { value: 'internal-team', label: 'Internal Team' },
  { value: 'hybrid', label: 'Hybrid' },
];

const VISUAL_DIRECTION_OPTIONS = [
  { value: 'editorial-bold', label: 'Editorial Bold' },
  { value: 'bento-tech', label: 'Bento Tech' },
  { value: 'neo-brutalist', label: 'Neo Brutalist' },
  { value: 'conversion-luxe', label: 'Conversion Luxe' },
  { value: 'playful-futurist', label: 'Playful Futurist' },
  { value: 'minimal-architectural', label: 'Minimal Architectural' },
];

const COMPLEXITY_LABELS = {
  1: 'Simple landing flow',
  2: 'Structured single experience',
  3: 'Multi-section product',
  4: 'Advanced interactive system',
  5: 'Complex design language + flows',
};

const CAPABILITY_OPTIONS = [
  { id: 'auth', label: 'Sign In' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'payments', label: 'Payments' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'chat', label: 'Chat' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'map', label: 'Map/Location' },
];

const FUNDAMENTAL_OPTIONS = [
  { id: 'information_architecture', label: 'Information Architecture' },
  { id: 'conversion_path', label: 'Conversion Path' },
  { id: 'responsive_behavior', label: 'Responsive Behavior' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'performance_budget', label: 'Performance Budget' },
  { id: 'states_feedback', label: 'Error/Empty/Loading States' },
  { id: 'analytics_events', label: 'Analytics Events' },
  { id: 'content_hierarchy', label: 'Content Hierarchy' },
];

const INTRO_MESSAGE = {
  id: 'intro',
  role: 'assistant',
  content:
    'Welcome to EB28 App Builder. Drop a short prompt and I will expand it into a stronger design brief, then generate a unique scaffold with fundamentals covered.',
  createdAt: Date.now(),
};

const DEFAULT_SETTINGS = {
  appName: '',
  primaryColor: '#0891B2',
  template: 'custom',
  audience: 'consumers',
  businessGoal: 'Ship quickly and validate demand',
  visualDirection: 'editorial-bold',
  complexity: 3,
  capabilities: ['auth', 'dashboard', 'notifications'],
  fundamentals: [
    'information_architecture',
    'conversion_path',
    'responsive_behavior',
    'accessibility',
    'performance_budget',
    'states_feedback',
  ],
};

const DEFAULT_PREVIEW = {
  appName: 'Your Product',
  tagline: 'Experience scaffold by EB28',
  primaryColor: '#0891B2',
  screens: [
    {
      name: 'Hero',
      purpose: 'Core value proposition and action',
      elements: ['Dominant headline', 'Primary CTA', 'Trust proof'],
    },
    {
      name: 'Workflow',
      purpose: 'Main user journey',
      elements: ['Progressive steps', 'Supporting media', 'Secondary CTA'],
    },
  ],
};

function sanitizePaletteColor(value) {
  const normalized = String(value || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return '';
  }
  return normalized.toUpperCase();
}

function inferMimeTypeFromDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[-+.a-zA-Z0-9]+);base64,/);
  return match ? match[1] : 'image/jpeg';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode the image.'));
    image.src = dataUrl;
  });
}

async function compressReferenceImageDataUrl(dataUrl, maxDimension = 1200, quality = 0.88) {
  const image = await loadImageFromDataUrl(dataUrl);
  const longest = Math.max(image.width, image.height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    return dataUrl;
  }
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function extractPaletteFromDataUrl(dataUrl, maxColors = 5) {
  const image = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  if (!context) {
    return [];
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Map();

  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3];
    if (alpha < 130) {
      continue;
    }

    const baseR = data[index];
    const baseG = data[index + 1];
    const baseB = data[index + 2];
    const average = (baseR + baseG + baseB) / 3;
    if (average < 16 || average > 240) {
      continue;
    }

    const r = Math.max(0, Math.min(255, Math.round(baseR / 24) * 24));
    const g = Math.max(0, Math.min(255, Math.round(baseG / 24) * 24));
    const b = Math.max(0, Math.min(255, Math.round(baseB / 24) * 24));
    const key = `${r}-${g}-${b}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([key]) => {
      const [r, g, b] = key.split('-').map((value) => Number(value));
      return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    })
    .map(sanitizePaletteColor)
    .filter(Boolean)
    .filter((color, index, source) => source.indexOf(color) === index)
    .slice(0, maxColors);
}

async function optimizeReferenceImage(file) {
  const rawDataUrl = await fileToDataUrl(file);
  let compressed = await compressReferenceImageDataUrl(rawDataUrl, 1280, 0.88);

  if (compressed.length > MAX_REFERENCE_IMAGE_DATA_URL_CHARS) {
    compressed = await compressReferenceImageDataUrl(compressed, 1000, 0.78);
  }
  if (compressed.length > MAX_REFERENCE_IMAGE_DATA_URL_CHARS) {
    compressed = await compressReferenceImageDataUrl(compressed, 860, 0.68);
  }
  if (compressed.length > MAX_REFERENCE_IMAGE_DATA_URL_CHARS) {
    throw new Error('Image is too large after compression. Try a smaller screenshot.');
  }

  const palette = await extractPaletteFromDataUrl(compressed, 5).catch(() => []);

  return {
    name: String(file?.name || 'reference-image').slice(0, 120),
    mimeType: String(file?.type || inferMimeTypeFromDataUrl(compressed) || 'image/jpeg'),
    dataUrl: compressed,
    palette,
  };
}

function pickVariantDirections(baseDirection) {
  const planned = VARIANT_DIRECTION_PLANS[baseDirection];
  if (Array.isArray(planned) && planned.length === 3) {
    return planned;
  }

  const allDirections = VISUAL_DIRECTION_OPTIONS.map((option) => option.value);
  const unique = [baseDirection, ...allDirections.filter((direction) => direction !== baseDirection)];
  return unique.slice(0, 3);
}

function buildReferenceImageSummary(referenceImage) {
  if (!referenceImage) {
    return 'No reference image attached.';
  }

  const palette = Array.isArray(referenceImage.palette)
    ? referenceImage.palette.map(sanitizePaletteColor).filter(Boolean)
    : [];

  const paletteText = palette.length > 0 ? palette.join(', ') : 'palette unavailable';
  return `Reference image: ${referenceImage.name || 'uploaded'}; extracted palette: ${paletteText}.`;
}

function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return 'now';
  }
}

function sanitizeHexColor(value) {
  const normalized = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#0891B2';
}

function slugify(value) {
  return String(value || 'eb28-site')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'eb28-site';
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function guessAppName(prompt) {
  const words = String(prompt || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const candidate = titleCase(words.join(' '));
  return candidate ? `${candidate} Experience` : 'EB28 Experience';
}

function asFileList(files) {
  if (!files || typeof files !== 'object') {
    return [];
  }

  return Object.keys(files)
    .filter((path) => typeof files[path] === 'string')
    .sort((a, b) => a.localeCompare(b));
}

function sanitizeFiles(files) {
  if (!files || typeof files !== 'object') {
    return {};
  }

  const output = {};
  Object.entries(files).forEach(([filePath, value]) => {
    const safePath = String(filePath || '').replace(/^\/+/, '').replace(/\.\./g, '').trim();
    if (!safePath || typeof value !== 'string') {
      return;
    }
    output[safePath] = value;
  });

  return output;
}

function describeVisualDirection(direction) {
  const map = {
    'editorial-bold': 'Large expressive typography, asymmetrical composition, strong editorial rhythm.',
    'bento-tech': 'Modular bento grid, high legibility cards, product-system clarity.',
    'neo-brutalist': 'High contrast blocks, playful borders, deliberate visual tension.',
    'conversion-luxe': 'Premium spacing, polished contrast, high-conversion CTA hierarchy.',
    'playful-futurist': 'Energetic gradients, kinetic accents, modern motion cues.',
    'minimal-architectural': 'Precise spacing, restrained palette, architectural calm.',
  };
  return map[direction] || map['editorial-bold'];
}

function capabilityLabel(id) {
  const option = CAPABILITY_OPTIONS.find((item) => item.id === id);
  return option ? option.label : titleCase(id);
}

function fundamentalLabel(id) {
  const option = FUNDAMENTAL_OPTIONS.find((item) => item.id === id);
  return option ? option.label : titleCase(String(id || '').replace(/_/g, ' '));
}

function inferCapabilitiesFromPrompt(prompt) {
  const text = String(prompt || '').toLowerCase();
  const map = [
    { key: 'login', value: 'auth' },
    { key: 'auth', value: 'auth' },
    { key: 'payment', value: 'payments' },
    { key: 'checkout', value: 'payments' },
    { key: 'notify', value: 'notifications' },
    { key: 'chat', value: 'chat' },
    { key: 'book', value: 'bookings' },
    { key: 'calendar', value: 'bookings' },
    { key: 'map', value: 'map' },
    { key: 'location', value: 'map' },
    { key: 'analytics', value: 'analytics' },
    { key: 'dashboard', value: 'dashboard' },
  ];

  return [...new Set(map.filter((item) => text.includes(item.key)).map((item) => item.value))].slice(0, 6);
}

function buildFundamentalsReport(selectedFundamentals) {
  const list = selectedFundamentals.length > 0
    ? selectedFundamentals
    : DEFAULT_SETTINGS.fundamentals;

  return list.map((id) => ({
    id,
    label: fundamentalLabel(id),
    status: 'covered',
    note: `Generation plan explicitly includes ${fundamentalLabel(id).toLowerCase()}.`,
  }));
}

function estimateLocalQuality({ settings, fundamentals, referenceImage, regenerated = false }) {
  const required = (Array.isArray(settings.fundamentals) && settings.fundamentals.length > 0
    ? settings.fundamentals
    : DEFAULT_SETTINGS.fundamentals).length;
  const covered = Array.isArray(fundamentals)
    ? fundamentals.filter((item) => String(item.status || '').toLowerCase() === 'covered').length
    : 0;

  const fundamentalsScore = Math.max(65, Math.min(100, Math.round(65 + (covered / Math.max(required, 1)) * 35)));
  const vibeScore = Math.max(
    60,
    Math.min(100, Math.round(68 + settings.complexity * 4 + (referenceImage ? 8 : 0)))
  );
  const uxScore = Math.max(
    62,
    Math.min(100, Math.round(70 + Math.min(10, required * 2) + (settings.template === 'custom' ? 3 : 0)))
  );
  const uniquenessScore = Math.max(
    60,
    Math.min(100, Math.round(69 + settings.complexity * 3 + (referenceImage ? 7 : 0)))
  );
  const totalScore = Math.round((vibeScore + uxScore + fundamentalsScore + uniquenessScore) / 4);

  const strengths = [
    `Visual direction: ${titleCase(String(settings.visualDirection || 'editorial-bold').replace(/-/g, ' '))}.`,
    `${covered}/${Math.max(required, 1)} required fundamentals are explicitly covered.`,
    referenceImage
      ? 'Reference screenshot palette was used to guide vibe and contrast.'
      : 'Prompt expansion generated a structured brief from concise input.',
  ].slice(0, 3);

  const issues = [];
  if (!referenceImage) {
    issues.push('Upload a reference screenshot to improve style match precision.');
  }
  if (!settings.fundamentals.includes('analytics_events')) {
    issues.push('Analytics events are not enforced in the fundamentals checklist.');
  }
  if (settings.complexity >= 4 && !settings.fundamentals.includes('states_feedback')) {
    issues.push('Complex flows should include explicit empty/loading/error states.');
  }

  return {
    totalScore,
    vibeScore,
    uxScore,
    fundamentalsScore,
    uniquenessScore,
    strengths,
    issues: issues.slice(0, 4),
    regenerated,
  };
}

function buildReferencePayload(referenceImage) {
  if (!referenceImage || typeof referenceImage !== 'object') {
    return null;
  }

  const dataUrl = String(referenceImage.dataUrl || '');
  if (!dataUrl.startsWith('data:image/')) {
    return null;
  }

  const palette = Array.isArray(referenceImage.palette)
    ? referenceImage.palette.map(sanitizePaletteColor).filter(Boolean).slice(0, 6)
    : [];

  return {
    name: String(referenceImage.name || 'reference-image').slice(0, 120),
    mimeType: String(referenceImage.mimeType || inferMimeTypeFromDataUrl(dataUrl)).slice(0, 80),
    dataUrl,
    palette,
  };
}

function buildPromptExpansion({ userPrompt, settings, referenceImage, variantLabel = '' }) {
  const cleanedPrompt = String(userPrompt || '').trim();
  const capabilities = settings.capabilities.length > 0
    ? settings.capabilities
    : inferCapabilitiesFromPrompt(cleanedPrompt);
  const capabilityList = (capabilities.length > 0 ? capabilities : DEFAULT_SETTINGS.capabilities)
    .map(capabilityLabel)
    .join(', ');

  const fundamentals = (settings.fundamentals.length > 0 ? settings.fundamentals : DEFAULT_SETTINGS.fundamentals)
    .map(fundamentalLabel)
    .join(', ');

  const concisePrompt = cleanedPrompt.split(/\s+/).filter(Boolean).length <= 14;

  const lines = [
    `Project: ${settings.appName || guessAppName(cleanedPrompt)}`,
    `Template: ${settings.template}`,
    `Audience: ${settings.audience}`,
    `Business goal: ${settings.businessGoal}`,
    `Visual direction: ${settings.visualDirection} (${describeVisualDirection(settings.visualDirection)})`,
    `Complexity target: ${settings.complexity}/5 (${COMPLEXITY_LABELS[settings.complexity] || COMPLEXITY_LABELS[3]})`,
    `Primary brand color: ${sanitizeHexColor(settings.primaryColor)}`,
    `Core capabilities: ${capabilityList}`,
    `Required fundamentals: ${fundamentals}`,
    buildReferenceImageSummary(referenceImage),
    '',
    'User direction:',
    cleanedPrompt || 'No prompt provided.',
  ];

  if (variantLabel) {
    lines.push('', `Variant target: ${variantLabel}. Explore this direction distinctly while preserving usability.`);
  }

  if (concisePrompt) {
    lines.push('', 'Interpretation rule: prompt is intentionally concise, infer missing UX details while preserving clarity and conversion intent.');
  }

  return lines.join('\n');
}

function buildLocalFallback({ prompt, settings, currentFiles, referenceImage, variantLabel = '' }) {
  const inferredAppName = settings.appName || guessAppName(prompt);
  const referencePalette = Array.isArray(referenceImage?.palette)
    ? referenceImage.palette.map(sanitizePaletteColor).filter(Boolean)
    : [];
  const accent = sanitizeHexColor(referencePalette[0] || settings.primaryColor);
  const inferredCapabilities = settings.capabilities.length > 0
    ? settings.capabilities
    : inferCapabilitiesFromPrompt(prompt);
  const capabilityLabels = (inferredCapabilities.length > 0 ? inferredCapabilities : DEFAULT_SETTINGS.capabilities)
    .map(capabilityLabel);

  const hasExistingFiles = Object.keys(sanitizeFiles(currentFiles)).length > 0;
  const fundamentals = buildFundamentalsReport(settings.fundamentals);

  const featureRows = capabilityLabels
    .slice(0, 6)
    .map((label, index) => `          <p className=\"itemText\">${index + 1}. ${label}</p>`)
    .join('\n');

  const files = {
    '.gitignore': 'node_modules\\n.DS_Store\\n',
    'package.json': JSON.stringify(
      {
        name: slugify(inferredAppName),
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          vite: '^5.4.11',
          '@vitejs/plugin-react': '^4.3.3',
        },
      },
      null,
      2
    ),
    'index.html': [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `    <title>${inferredAppName}</title>`,
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.jsx"></script>',
      '  </body>',
      '</html>',
      '',
    ].join('\n'),
    'src/main.jsx': [
      "import React from 'react';",
      "import ReactDOM from 'react-dom/client';",
      "import App from './App';",
      "import './styles.css';",
      '',
      "ReactDOM.createRoot(document.getElementById('root')).render(",
      '  <React.StrictMode>',
      '    <App />',
      '  </React.StrictMode>',
      ');',
      '',
    ].join('\n'),
    'src/App.jsx': [
      "import React from 'react';",
      '',
      'export default function App() {',
      '  return (',
      '    <main className="shell">',
      '      <section className="hero">',
      `        <h1>${inferredAppName}</h1>`,
      `        <p>${settings.businessGoal || 'Ship quickly and validate demand'}.</p>`,
      '        <button className="cta">Launch Experience</button>',
      '      </section>',
      '      <section className="panel">',
      `        <h2>${titleCase(settings.visualDirection)} System</h2>`,
      '        <div className="featureList">',
      featureRows,
      '        </div>',
      '      </section>',
      '    </main>',
      '  );',
      '}',
      '',
    ].join('\n'),
    'src/styles.css': [
      ':root {',
      `  --accent: ${accent};`,
      '  --bg: #050816;',
      '  --panel: rgba(15, 23, 42, 0.78);',
      '}',
      '',
      '* { box-sizing: border-box; }',
      'body {',
      '  margin: 0;',
      '  font-family: "Space Grotesk", "Inter", sans-serif;',
      '  color: #e2e8f0;',
      '  background:',
      '    radial-gradient(circle at 10% 15%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 40%),',
      '    radial-gradient(circle at 80% 85%, rgba(251, 191, 36, 0.12), transparent 35%),',
      '    linear-gradient(135deg, var(--bg), #0b1025);',
      '  min-height: 100vh;',
      '}',
      '.shell {',
      '  max-width: 1080px;',
      '  margin: 0 auto;',
      '  padding: 3rem 1rem;',
      '  display: grid;',
      '  gap: 1rem;',
      '}',
      '.hero, .panel {',
      '  border: 1px solid rgba(148, 163, 184, 0.2);',
      '  border-radius: 1.25rem;',
      '  background: var(--panel);',
      '  backdrop-filter: blur(10px);',
      '  padding: 1.25rem;',
      '}',
      '.hero h1 { margin: 0; font-size: clamp(2rem, 6vw, 3.4rem); }',
      '.hero p { color: #cbd5e1; max-width: 55ch; }',
      '.cta {',
      '  background: var(--accent);',
      '  border: 0;',
      '  color: #001018;',
      '  font-weight: 700;',
      '  border-radius: 999px;',
      '  padding: 0.65rem 1rem;',
      '}',
      '.featureList { display: grid; gap: 0.6rem; }',
      '.itemText { color: #dbeafe; margin: 0; }',
      '@media (max-width: 720px) { .shell { padding: 1rem; } }',
      '',
    ].join('\n'),
    'README.md': [
      `# ${inferredAppName}`,
      '',
      'Generated by EB28 App Builder in local template mode.',
      '',
      '## Run locally',
      '',
      '```bash',
      'npm install',
      'npm run dev',
      '```',
      '',
      `Template: ${titleCase(settings.template)}`,
      `Audience: ${titleCase(settings.audience.replace('-', ' '))}`,
      `Visual direction: ${titleCase(settings.visualDirection.replace(/-/g, ' '))}`,
      `Complexity: ${settings.complexity}/5`,
      '',
      'Prompt:',
      prompt,
      '',
    ].join('\n'),
  };

  const designRecipe = {
    visualDirection: settings.visualDirection,
    complexity: settings.complexity,
    complexityLabel: COMPLEXITY_LABELS[settings.complexity] || COMPLEXITY_LABELS[3],
    signature: referenceImage
      ? `${describeVisualDirection(settings.visualDirection)} Style rhythm calibrated from uploaded reference screenshot.`
      : describeVisualDirection(settings.visualDirection),
    palette: referencePalette.length > 0
      ? [accent, ...referencePalette.slice(1), '#050816', '#e2e8f0'].slice(0, 6)
      : [accent, '#050816', '#e2e8f0'],
  };

  const quality = estimateLocalQuality({
    settings: { ...settings, primaryColor: accent },
    fundamentals,
    referenceImage,
  });

  return {
    assistantMessage: hasExistingFiles
      ? `Applied a new design pass for ${inferredAppName} with stronger vibe + fundamentals alignment.`
      : `Generated first pass for ${inferredAppName} with unique design direction and fundamentals baked in.`,
    project: {
      name: inferredAppName,
      description: `EB28 App Builder output for ${settings.audience}.`,
      platform: 'react-web',
    },
    preview: {
      appName: inferredAppName,
      tagline: capabilityLabels[0] || 'High-conversion interactive product shell',
      primaryColor: accent,
      screens: [
        {
          name: 'Landing',
          purpose: 'Immediate value proposition and CTA',
          elements: ['Primary headline', 'Proof strip', 'CTA'],
        },
        {
          name: 'Workflow',
          purpose: 'Core use-case walkthrough',
          elements: capabilityLabels.slice(0, 3),
        },
        {
          name: 'Conversion',
          purpose: 'Decision and checkout / booking path',
          elements: ['Offer framing', 'Urgency or trust', 'Action trigger'],
        },
      ],
    },
    files,
    changes: [
      hasExistingFiles
        ? 'Ran a higher-fidelity design iteration based on the latest prompt.'
        : 'Generated a complete React web scaffold from a concise prompt.',
      'Expanded short prompt into structured design brief automatically.',
      'Embedded visual direction tokens and conversion-focused hierarchy.',
      'Included explicit fundamentals coverage report.',
      referenceImage ? 'Reference screenshot palette and mood cues were applied to this build.' : 'No reference screenshot provided; style was inferred from prompt.',
    ],
    fundamentals,
    designRecipe,
    nextActions: [
      'Ask for a second variant with a different visual direction for A/B comparison.',
      'Request stricter conversion flow with stronger objection-handling sections.',
      'Add event schema details for analytics implementation.',
    ],
    quality,
    variantLabel,
    source: 'browser-template',
    model: 'browser-template-v3',
  };
}

const AppBuilderStudio = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [versions, setVersions] = useState([]);
  const [activeVersionId, setActiveVersionId] = useState('');
  const [activeFile, setActiveFile] = useState('');
  const [fileQuery, setFileQuery] = useState('');
  const [referenceImage, setReferenceImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [statusNote, setStatusNote] = useState('Ready to build');
  const [error, setError] = useState('');
  const referenceInputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed?.settings && typeof parsed.settings === 'object') {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed.settings,
          complexity: Number.isFinite(parsed.settings.complexity)
            ? Math.max(1, Math.min(5, Number(parsed.settings.complexity)))
            : DEFAULT_SETTINGS.complexity,
          capabilities: Array.isArray(parsed.settings.capabilities)
            ? parsed.settings.capabilities.slice(0, 8)
            : DEFAULT_SETTINGS.capabilities,
          fundamentals: Array.isArray(parsed.settings.fundamentals)
            ? parsed.settings.fundamentals.slice(0, 8)
            : DEFAULT_SETTINGS.fundamentals,
        });
      }

      if (typeof parsed?.prompt === 'string') {
        setPrompt(parsed.prompt);
      }
      if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
        setMessages(parsed.messages.slice(-40));
      }
      if (Array.isArray(parsed?.versions)) {
        setVersions(parsed.versions.slice(0, 12));
      }
      if (typeof parsed?.activeVersionId === 'string') {
        setActiveVersionId(parsed.activeVersionId);
      }
      if (typeof parsed?.activeFile === 'string') {
        setActiveFile(parsed.activeFile);
      }
    } catch {
      // ignore invalid cache
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings,
          prompt,
          messages: messages.slice(-40),
          versions: versions.slice(0, 12),
          activeVersionId,
          activeFile,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [settings, prompt, messages, versions, activeVersionId, activeFile]);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeVersionId) || versions[0] || null,
    [versions, activeVersionId]
  );

  const activePreview = activeVersion?.preview || {
    ...DEFAULT_PREVIEW,
    appName: settings.appName || DEFAULT_PREVIEW.appName,
    primaryColor: sanitizeHexColor(settings.primaryColor),
  };

  const activeFiles = activeVersion?.files || {};
  const allFilePaths = useMemo(() => asFileList(activeFiles), [activeFiles]);

  const filteredFilePaths = useMemo(() => {
    const query = fileQuery.trim().toLowerCase();
    if (!query) {
      return allFilePaths;
    }
    return allFilePaths.filter((path) => path.toLowerCase().includes(query));
  }, [allFilePaths, fileQuery]);

  const currentFilePath =
    activeFile && activeFiles[activeFile]
      ? activeFile
      : filteredFilePaths[0] || allFilePaths[0] || '';
  const currentFileContent = currentFilePath ? activeFiles[currentFilePath] : '';

  const expandedPrompt = useMemo(
    () => buildPromptExpansion({ userPrompt: prompt, settings, referenceImage }),
    [prompt, settings, referenceImage]
  );

  const selectedCapabilityLabels = settings.capabilities
    .map(capabilityLabel)
    .slice(0, 6);

  const fundamentalsReport = Array.isArray(activeVersion?.fundamentals)
    ? activeVersion.fundamentals
    : buildFundamentalsReport(settings.fundamentals);
  const coveredFundamentals = fundamentalsReport.filter((item) => item.status === 'covered').length;
  const activeQuality = activeVersion?.quality && typeof activeVersion.quality === 'object'
    ? activeVersion.quality
    : null;

  const updateSettings = (patch) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  };

  const toggleCapability = (capabilityId) => {
    setSettings((previous) => {
      const alreadyIncluded = previous.capabilities.includes(capabilityId);
      if (alreadyIncluded) {
        return {
          ...previous,
          capabilities: previous.capabilities.filter((id) => id !== capabilityId),
        };
      }

      return {
        ...previous,
        capabilities: [...previous.capabilities, capabilityId].slice(-8),
      };
    });
  };

  const toggleFundamental = (fundamentalId) => {
    setSettings((previous) => {
      const alreadyIncluded = previous.fundamentals.includes(fundamentalId);
      if (alreadyIncluded) {
        return {
          ...previous,
          fundamentals: previous.fundamentals.filter((id) => id !== fundamentalId),
        };
      }

      return {
        ...previous,
        fundamentals: [...previous.fundamentals, fundamentalId].slice(-8),
      };
    });
  };

  const applyPayload = (payload, visiblePrompt, options = {}) => {
    const now = Date.now();
    const files = payload?.files && typeof payload.files === 'object' ? payload.files : {};
    const settingsSnapshot = options?.settingsSnapshot && typeof options.settingsSnapshot === 'object'
      ? options.settingsSnapshot
      : settings;
    const variantLabel = String(payload?.variantLabel || options?.variantLabel || '').trim();

    const projectName = String(
      payload?.project?.name ||
      settingsSnapshot.appName ||
      settings.appName ||
      'EB28 Build'
    ).trim();
    const versionName = variantLabel ? `${projectName} · ${variantLabel}` : projectName;

    const fundamentals = Array.isArray(payload?.fundamentals)
      ? payload.fundamentals.slice(0, 12)
      : [];
    const quality = payload?.quality && typeof payload.quality === 'object'
      ? payload.quality
      : estimateLocalQuality({
          settings: settingsSnapshot,
          fundamentals,
          referenceImage,
        });

    const version = {
      id: `version-${now}-${Math.round(Math.random() * 10_000)}`,
      name: versionName,
      variantLabel,
      prompt: variantLabel ? `${visiblePrompt} (${variantLabel})` : visiblePrompt,
      createdAt: now,
      project: payload?.project || { name: projectName, description: '' },
      preview: payload?.preview || DEFAULT_PREVIEW,
      files,
      changes: Array.isArray(payload?.changes) ? payload.changes.slice(0, 12) : [],
      fundamentals,
      designRecipe: payload?.designRecipe && typeof payload.designRecipe === 'object' ? payload.designRecipe : null,
      nextActions: Array.isArray(payload?.nextActions) ? payload.nextActions.slice(0, 6) : [],
      quality,
      source: payload?.source || 'unknown',
      model: payload?.model || '',
      settingsSnapshot,
    };

    const assistantMessage = {
      id: `assistant-${now}-${Math.round(Math.random() * 10_000)}`,
      role: 'assistant',
      content: payload?.assistantMessage || `Generated ${Object.keys(files).length} files for ${versionName}.`,
      createdAt: now,
      changes: version.changes,
    };

    setVersions((previous) => [version, ...previous].slice(0, 12));
    setActiveVersionId(version.id);
    setActiveFile(asFileList(files)[0] || '');
    setMessages((previous) => [...previous, assistantMessage].slice(-40));

    if (!settings.appName && projectName) {
      updateSettings({ appName: projectName });
    }

    if (!options?.skipStatusUpdate) {
      const runtimeLabel =
        version.source === 'openai'
          ? 'OpenAI generation'
          : version.source === 'fallback-template' || version.source === 'browser-template'
            ? 'Template generation'
            : 'Generation complete';

      const modelLabel = version.model ? ` (${version.model})` : '';
      const qualityLabel = Number.isFinite(Number(quality?.totalScore))
        ? ` · Score ${Math.round(Number(quality.totalScore))}/100`
        : '';
      setStatusNote(`${runtimeLabel}${modelLabel}${qualityLabel}`);
    }
  };

  const handleQuickStart = (preset) => {
    updateSettings({
      template: preset.template,
      audience: preset.audience,
      appName: preset.title,
      visualDirection: preset.visualDirection,
      complexity: preset.complexity,
    });
    setPrompt(preset.prompt);
    setStatusNote(`Preset loaded: ${preset.title}`);
  };

  const handleReferenceImageUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, WebP, etc).');
      event.target.value = '';
      return;
    }

    setError('');
    setIsAnalyzingImage(true);
    setStatusNote('Analyzing reference screenshot...');

    try {
      const optimized = await optimizeReferenceImage(file);
      setReferenceImage(optimized);

      if (
        settings.primaryColor === DEFAULT_SETTINGS.primaryColor &&
        Array.isArray(optimized.palette) &&
        optimized.palette[0]
      ) {
        updateSettings({ primaryColor: optimized.palette[0] });
      }

      setStatusNote(`Reference loaded: ${optimized.name}`);
    } catch (processingError) {
      setError(processingError?.message || 'Unable to process this screenshot.');
      setStatusNote('Reference image failed to load');
    } finally {
      setIsAnalyzingImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveReferenceImage = () => {
    setReferenceImage(null);
    setStatusNote('Reference image removed');
  };

  const runBuildRequest = async ({
    visiblePrompt,
    settingsForRun,
    currentFiles,
    historyPayload,
    variantLabel = '',
  }) => {
    const fullPrompt = buildPromptExpansion({
      userPrompt: visiblePrompt,
      settings: settingsForRun,
      referenceImage,
      variantLabel,
    });

    try {
      const response = await fetch('/api/appbuilder-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          rawPrompt: visiblePrompt,
          config: settingsForRun,
          variantLabel,
          currentFiles,
          referenceImage: buildReferencePayload(referenceImage),
          history: historyPayload,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Generation failed');
      }

      return payload;
    } catch {
      const fallbackPayload = buildLocalFallback({
        prompt: visiblePrompt,
        settings: settingsForRun,
        currentFiles,
        referenceImage,
        variantLabel,
      });
      fallbackPayload.assistantMessage = `${fallbackPayload.assistantMessage} API unavailable, local mode used.`;
      return fallbackPayload;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const visiblePrompt = prompt.trim();
    if (!visiblePrompt || isGenerating || isAnalyzingImage) {
      return;
    }

    const now = Date.now();
    const userMessage = {
      id: `user-${now}`,
      role: 'user',
      content: visiblePrompt,
      createdAt: now,
    };

    const currentFiles = activeVersion?.files || {};
    const historyPayload = [...messages.slice(-8), userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setError('');
    setMessages((previous) => [...previous, userMessage].slice(-40));
    setIsGenerating(true);
    setBatchProgress(null);
    setStatusNote('Generating scaffold...');

    try {
      const payload = await runBuildRequest({
        visiblePrompt,
        settingsForRun: settings,
        currentFiles,
        historyPayload,
      });
      applyPayload(payload, visiblePrompt, {
        settingsSnapshot: settings,
      });
    } catch (generationError) {
      setError(generationError?.message || 'Generation failed.');
      setStatusNote('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVariants = async () => {
    const visiblePrompt = prompt.trim();
    if (!visiblePrompt || isGenerating || isAnalyzingImage) {
      return;
    }

    const now = Date.now();
    const userMessage = {
      id: `user-variants-${now}`,
      role: 'user',
      content: `${visiblePrompt} (Generate 3 stylistic variants)`,
      createdAt: now,
    };

    const directions = pickVariantDirections(settings.visualDirection);
    const currentFiles = activeVersion?.files || {};
    const historyPayload = [...messages.slice(-8), userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setError('');
    setMessages((previous) => [...previous, userMessage].slice(-40));
    setIsGenerating(true);
    setBatchProgress({ current: 0, total: 3, label: 'Starting' });
    setStatusNote('Generating style variants...');

    try {
      for (let index = 0; index < 3; index += 1) {
        const variantLabel = VARIANT_LABELS[index];
        const variantDirection = directions[index] || settings.visualDirection;
        const settingsForRun = { ...settings, visualDirection: variantDirection };

        setBatchProgress({ current: index + 1, total: 3, label: variantLabel });
        setStatusNote(`${variantLabel}: building ${titleCase(variantDirection.replace(/-/g, ' '))} style (${index + 1}/3)...`);

        const payload = await runBuildRequest({
          visiblePrompt,
          settingsForRun,
          currentFiles,
          historyPayload,
          variantLabel,
        });

        applyPayload(payload, visiblePrompt, {
          settingsSnapshot: settingsForRun,
          variantLabel,
          skipStatusUpdate: true,
        });
      }

      setStatusNote('3 variants ready for comparison');
    } catch (errorValue) {
      setError(errorValue?.message || 'Variant generation failed.');
      setStatusNote('Variant generation failed');
    } finally {
      setBatchProgress(null);
      setIsGenerating(false);
    }
  };

  const handleRestore = (versionId) => {
    const selected = versions.find((version) => version.id === versionId);
    if (!selected) {
      return;
    }

    setActiveVersionId(selected.id);
    setActiveFile(asFileList(selected.files)[0] || '');
    if (selected.settingsSnapshot && typeof selected.settingsSnapshot === 'object') {
      setSettings((previous) => ({ ...previous, ...selected.settingsSnapshot }));
    }

    setMessages((previous) => [
      ...previous,
      {
        id: `restore-${Date.now()}`,
        role: 'assistant',
        content: `Version restored: ${selected.name}. Continue iterating whenever you are ready.`,
        createdAt: Date.now(),
      },
    ].slice(-40));
    setStatusNote(`Restored ${selected.name}`);
  };

  const handleExportZip = async () => {
    if (!activeVersion || isExporting) {
      return;
    }

    setError('');
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const rootDir = slugify(activeVersion.project?.name || settings.appName || 'eb28-experience');

      Object.entries(activeVersion.files || {}).forEach(([filePath, content]) => {
        if (typeof content === 'string') {
          zip.file(`${rootDir}/${filePath}`, content);
        }
      });

      zip.file(
        `${rootDir}/EB28_BUILD_BRIEF.md`,
        [
          `# ${activeVersion.project?.name || 'EB28 App Builder Project'}`,
          '',
          `Generated at: ${new Date(activeVersion.createdAt).toISOString()}`,
          `Template: ${settings.template}`,
          `Audience: ${settings.audience}`,
          `Visual direction: ${settings.visualDirection}`,
          `Complexity: ${settings.complexity}/5`,
          `Goal: ${settings.businessGoal}`,
          `Prompt: ${activeVersion.prompt}`,
          '',
          '## Run',
          '',
          '```bash',
          'npm install',
          'npm run dev',
          '```',
          '',
        ].join('\n')
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${rootDir}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusNote('ZIP exported');
    } catch (exportError) {
      setError(exportError?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyFile = async () => {
    if (!currentFileContent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentFileContent);
      setStatusNote(`Copied ${currentFilePath}`);
    } catch {
      setError('Unable to copy file to clipboard in this browser.');
    }
  };

  const handleResetSession = () => {
    setSettings(DEFAULT_SETTINGS);
    setPrompt('');
    setMessages([INTRO_MESSAGE]);
    setVersions([]);
    setActiveVersionId('');
    setActiveFile('');
    setFileQuery('');
    setReferenceImage(null);
    setBatchProgress(null);
    setError('');
    setStatusNote('Session reset');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="eb28-appbuilder relative min-h-screen overflow-x-hidden text-slate-100">
      <div className="eb28-appbuilder-noise pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="eb28-panel eb28-gradient-border mb-6 overflow-hidden rounded-3xl">
          <div className="grid gap-5 p-6 lg:grid-cols-[1.4fr,1fr] lg:items-end">
            <div>
              <p className="font-brand inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs tracking-[0.2em] text-cyan-200">
                <WandSparkles size={14} /> EB28 APP BUILDER
              </p>
              <h1 className="font-brand mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Vibe-first generation with fundamentals enforced
              </h1>
              <p className="font-body mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
                Start with a short prompt. The builder expands it into a richer creative brief,
                generates a distinct design system, and returns source with an explicit fundamentals report.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <article className="rounded-2xl border border-cyan-400/25 bg-slate-950/60 p-3">
                <p className="font-brand text-xs uppercase tracking-[0.14em] text-cyan-200">Prompt</p>
                <p className="font-brand mt-1 text-lg font-bold text-white">Short inputs accepted</p>
              </article>
              <article className="rounded-2xl border border-amber-300/25 bg-slate-950/60 p-3">
                <p className="font-brand text-xs uppercase tracking-[0.14em] text-amber-200">Output</p>
                <p className="font-brand mt-1 text-lg font-bold text-white">Unique visual direction</p>
              </article>
              <article className="rounded-2xl border border-emerald-300/25 bg-slate-950/60 p-3">
                <p className="font-brand text-xs uppercase tracking-[0.14em] text-emerald-200">Guardrails</p>
                <p className="font-brand mt-1 text-lg font-bold text-white">Fundamentals checklist</p>
              </article>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-12">
          <section className="eb28-panel rounded-3xl border border-white/10 p-4 xl:col-span-4">
            <h2 className="font-brand mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.14em] text-slate-200">
              <Rocket size={16} /> 1. Build Brief
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="builder-app-name" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                  App Name
                </label>
                <input
                  id="builder-app-name"
                  value={settings.appName}
                  onChange={(event) => updateSettings({ appName: event.target.value })}
                  placeholder="EB28 Experience"
                  className="font-body w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="builder-template" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                    Template
                  </label>
                  <select
                    id="builder-template"
                    value={settings.template}
                    onChange={(event) => updateSettings({ template: event.target.value })}
                    className="font-body w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                  >
                    {TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="builder-audience" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                    Audience
                  </label>
                  <select
                    id="builder-audience"
                    value={settings.audience}
                    onChange={(event) => updateSettings({ audience: event.target.value })}
                    className="font-body w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="builder-visual" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                    Visual Direction
                  </label>
                  <select
                    id="builder-visual"
                    value={settings.visualDirection}
                    onChange={(event) => updateSettings({ visualDirection: event.target.value })}
                    className="font-body w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                  >
                    {VISUAL_DIRECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="builder-complexity" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                    Complexity ({settings.complexity}/5)
                  </label>
                  <input
                    id="builder-complexity"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={settings.complexity}
                    onChange={(event) => updateSettings({ complexity: Number(event.target.value) })}
                    className="w-full"
                  />
                  <p className="font-body mt-1 text-[11px] text-slate-300">
                    {COMPLEXITY_LABELS[settings.complexity] || COMPLEXITY_LABELS[3]}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
                <div>
                  <label htmlFor="builder-goal" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                    Business Goal
                  </label>
                  <input
                    id="builder-goal"
                    value={settings.businessGoal}
                    onChange={(event) => updateSettings({ businessGoal: event.target.value })}
                    className="font-body w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                  />
                </div>
                <div>
                  <label htmlFor="builder-color" className="font-body mb-1 block text-xs uppercase tracking-[0.12em] text-slate-400">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/70 px-2 py-1">
                    <input
                      id="builder-color"
                      type="color"
                      value={sanitizeHexColor(settings.primaryColor)}
                      onChange={(event) => updateSettings({ primaryColor: event.target.value })}
                      className="h-8 w-8 rounded border-0 bg-transparent"
                    />
                    <span className="font-code text-xs text-slate-200">{sanitizeHexColor(settings.primaryColor)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-body mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITY_OPTIONS.map((option) => {
                    const selected = settings.capabilities.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleCapability(option.id)}
                        className={`font-body rounded-full border px-3 py-1 text-xs transition ${
                          selected
                            ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                            : 'border-white/15 bg-slate-900/50 text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-body mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">Fundamentals to enforce</p>
                <div className="flex flex-wrap gap-2">
                  {FUNDAMENTAL_OPTIONS.map((option) => {
                    const selected = settings.fundamentals.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleFundamental(option.id)}
                        className={`font-body rounded-full border px-3 py-1 text-xs transition ${
                          selected
                            ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100'
                            : 'border-white/15 bg-slate-900/50 text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-body text-xs uppercase tracking-[0.12em] text-slate-400">
                    Reference Vibe Screenshot
                  </p>
                  <button
                    type="button"
                    onClick={() => referenceInputRef.current?.click()}
                    disabled={isAnalyzingImage}
                    className="font-body rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAnalyzingImage ? 'Analyzing...' : referenceImage ? 'Replace' : 'Upload'}
                  </button>
                </div>

                <input
                  ref={referenceInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceImageUpload}
                  className="hidden"
                />

                {!referenceImage && (
                  <p className="font-body rounded-xl border border-dashed border-white/20 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                    Add one screenshot and the builder will mirror tone, spacing rhythm, and color mood.
                  </p>
                )}

                {referenceImage && (
                  <article className="rounded-2xl border border-cyan-300/25 bg-slate-900/60 p-3">
                    <img
                      src={referenceImage.dataUrl}
                      alt={referenceImage.name || 'Reference screenshot preview'}
                      className="h-28 w-full rounded-xl border border-white/10 object-cover"
                    />
                    <p className="font-body mt-2 truncate text-xs text-slate-200">{referenceImage.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(referenceImage.palette || []).map((color) => (
                        <span
                          key={`reference-color-${color}`}
                          className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[10px] text-slate-100"
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-white/40"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-code">{color}</span>
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveReferenceImage}
                      className="font-body mt-2 rounded-full border border-white/20 px-3 py-1 text-[11px] text-slate-300 transition hover:border-rose-300 hover:text-rose-200"
                    >
                      Remove reference
                    </button>
                  </article>
                )}
              </div>

              <div>
                <p className="font-body mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">Quick Starts</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {QUICK_STARTS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => handleQuickStart(preset)}
                      className="rounded-xl border border-white/10 bg-slate-900/55 px-3 py-2 text-left transition hover:border-cyan-300/60"
                    >
                      <p className="font-brand text-xs text-white">{preset.title}</p>
                      <p className="font-body mt-1 text-[11px] text-slate-400">Load preset</p>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <label htmlFor="builder-prompt" className="font-body block text-xs uppercase tracking-[0.12em] text-slate-400">
                  2. Product Direction Prompt
                </label>
                <textarea
                  id="builder-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="ex: redesign a finance dashboard for independent contractors"
                  className="font-body h-28 w-full resize-none rounded-2xl border border-white/15 bg-slate-900/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={isGenerating || isAnalyzingImage}
                    className="font-brand inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-500"
                  >
                    {isGenerating && !batchProgress ? <RefreshCw size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                    {isGenerating && !batchProgress ? 'Generating Build...' : 'Generate EB28 Build'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateVariants}
                    disabled={isGenerating || isAnalyzingImage || !prompt.trim()}
                    className="font-brand inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating && batchProgress ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Generate 3 Variants
                  </button>
                </div>

                {batchProgress && (
                  <p className="font-body rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Running {batchProgress.label} ({batchProgress.current}/{batchProgress.total})
                  </p>
                )}
              </form>

              <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                <p className="font-brand mb-1 text-xs uppercase tracking-[0.14em] text-slate-200">
                  Prompt Expansion Preview
                </p>
                <pre className="font-code max-h-[180px] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300">
                  {expandedPrompt}
                </pre>
              </article>

              {error && (
                <p className="font-body rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-body text-xs uppercase tracking-[0.12em] text-slate-400">{statusNote}</p>
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="font-body rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-100"
                >
                  Reset Session
                </button>
              </div>
            </div>
          </section>

          <section className="eb28-panel rounded-3xl border border-white/10 p-4 xl:col-span-5">
            <div className="grid gap-4">
              <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-3">
                <h2 className="font-brand mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.14em] text-slate-200">
                  <Bot size={16} /> Builder Timeline
                </h2>
                <div className="max-h-[210px] space-y-2 overflow-y-auto pr-1">
                  {messages.map((message) => {
                    const assistant = message.role === 'assistant';
                    return (
                      <article
                        key={message.id}
                        className={`rounded-xl border px-3 py-2 ${
                          assistant
                            ? 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100'
                            : 'border-amber-300/25 bg-amber-500/10 text-amber-100'
                        }`}
                      >
                        <p className="font-body mb-1 text-[11px] uppercase tracking-[0.14em] opacity-80">
                          {assistant ? 'Builder' : 'You'} · {formatTimestamp(message.createdAt)}
                        </p>
                        <p className="font-body whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      </article>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-brand flex items-center gap-2 text-sm uppercase tracking-[0.14em] text-slate-200">
                    <Smartphone size={16} /> Live Experience Preview
                  </h2>
                  <div className="flex gap-2">
                    <span className="font-body rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{versions.length} versions</span>
                    <span className="font-body rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{Object.keys(activeFiles).length} files</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[260px,1fr]">
                  <div className="mx-auto w-full max-w-[260px] rounded-[2.2rem] border-8 border-slate-950 bg-slate-950 p-2 shadow-[0_16px_60px_rgba(8,145,178,0.35)]">
                    <div className="rounded-[1.8rem] bg-slate-100 p-4" style={{ minHeight: 420 }}>
                      <div
                        className="rounded-2xl p-4 text-white"
                        style={{
                          background: `linear-gradient(135deg, ${sanitizeHexColor(activePreview.primaryColor)}, #0f172a)`,
                        }}
                      >
                        <p className="font-brand text-xs uppercase tracking-[0.16em]">
                          {activePreview.appName || 'EB28 Experience'}
                        </p>
                        <p className="font-body mt-1 text-sm leading-snug opacity-95">
                          {activePreview.tagline || 'Generated preview'}
                        </p>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(activePreview.screens || []).slice(0, 3).map((screen, index) => (
                          <article key={`${screen.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="font-brand text-xs uppercase tracking-[0.12em] text-slate-900">
                              {screen.name || `Section ${index + 1}`}
                            </p>
                            <p className="font-body mt-1 text-xs text-slate-600">{screen.purpose || 'Core section'}</p>
                            {Array.isArray(screen.elements) && screen.elements.length > 0 && (
                              <p className="font-body mt-1 text-[11px] text-slate-500">
                                {screen.elements.slice(0, 3).join(' • ')}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <article className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3">
                      <p className="font-brand mb-1 text-xs uppercase tracking-[0.14em] text-cyan-100">Design recipe</p>
                      <p className="font-body text-sm text-cyan-50">
                        {activeVersion?.designRecipe?.signature || describeVisualDirection(settings.visualDirection)}
                      </p>
                      <p className="font-body mt-1 text-xs text-cyan-100">
                        Complexity: {activeVersion?.designRecipe?.complexity || settings.complexity}/5
                      </p>
                    </article>

                    {activeQuality && (
                      <article className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-500/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-brand text-xs uppercase tracking-[0.14em] text-fuchsia-100">
                            Critic score
                          </p>
                          <p className="font-brand text-sm text-fuchsia-50">
                            {Math.round(Number(activeQuality.totalScore) || 0)}/100
                          </p>
                        </div>
                        <p className="font-body mt-1 text-xs text-fuchsia-50">
                          Vibe {Math.round(Number(activeQuality.vibeScore) || 0)} · UX {Math.round(Number(activeQuality.uxScore) || 0)} · Fundamentals {Math.round(Number(activeQuality.fundamentalsScore) || 0)} · Uniqueness {Math.round(Number(activeQuality.uniquenessScore) || 0)}
                        </p>
                        {activeQuality.regenerated && (
                          <p className="font-body mt-1 text-[11px] text-fuchsia-100">
                            Auto-regenerated once after critic feedback.
                          </p>
                        )}
                        {Array.isArray(activeQuality.issues) && activeQuality.issues.length > 0 && (
                          <p className="font-body mt-1 text-[11px] text-fuchsia-100">
                            Watchouts: {activeQuality.issues.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </article>
                    )}

                    <article className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3">
                      <p className="font-brand mb-1 text-xs uppercase tracking-[0.14em] text-emerald-100">Fundamentals coverage</p>
                      <p className="font-body text-sm text-emerald-50">
                        {coveredFundamentals}/{fundamentalsReport.length} fundamentals explicitly covered.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {fundamentalsReport.slice(0, 4).map((item) => (
                          <span key={item.id} className="font-body inline-flex items-center gap-1 rounded-full bg-emerald-900/40 px-2 py-1 text-[11px] text-emerald-100">
                            <CheckCircle2 size={12} /> {item.label}
                          </span>
                        ))}
                      </div>
                    </article>

                    <article className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-3">
                      <p className="font-brand mb-1 text-xs uppercase tracking-[0.14em] text-amber-100">This build includes</p>
                      <p className="font-body text-sm text-amber-50">
                        {(selectedCapabilityLabels.length > 0
                          ? selectedCapabilityLabels
                          : ['Sign In', 'Dashboard', 'Notifications']
                        ).join(' • ')}
                      </p>
                    </article>

                    <div>
                      <p className="font-brand mb-2 text-xs uppercase tracking-[0.14em] text-slate-300">Version history</p>
                      <div className="max-h-[120px] space-y-2 overflow-y-auto pr-1">
                        {versions.length === 0 && (
                          <p className="font-body rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs text-slate-400">
                            No versions yet. Generate your first build.
                          </p>
                        )}
                        {versions.map((version) => {
                          const active = activeVersion?.id === version.id;
                          return (
                            <button
                              key={version.id}
                              type="button"
                              onClick={() => handleRestore(version.id)}
                              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                active
                                  ? 'border-cyan-300 bg-cyan-500/15'
                                  : 'border-white/15 bg-slate-900/45 hover:border-slate-200'
                              }`}
                            >
                              <p className="font-brand truncate text-xs uppercase tracking-[0.12em] text-white">
                                {version.name}
                              </p>
                              <p className="font-body truncate text-xs text-slate-300">{version.prompt}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="eb28-panel rounded-3xl border border-white/10 p-4 xl:col-span-3">
            <h2 className="font-brand mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.14em] text-slate-200">
              <Layers3 size={16} /> Source Workspace
            </h2>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportZip}
                disabled={!activeVersion || isExporting}
                className="font-body inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                <Download size={14} /> {isExporting ? 'Exporting...' : 'Export ZIP'}
              </button>
              <button
                type="button"
                onClick={handleCopyFile}
                disabled={!currentFileContent}
                className="font-body inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900/65 px-3 py-2 text-xs text-slate-100 transition hover:border-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clipboard size={14} /> Copy File
              </button>
            </div>

            <div className="mb-2">
              <label htmlFor="file-query" className="font-body mb-1 block text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Search file
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/65 px-3 py-2">
                <FileSearch size={14} className="text-slate-400" />
                <input
                  id="file-query"
                  value={fileQuery}
                  onChange={(event) => setFileQuery(event.target.value)}
                  placeholder="src/App.jsx"
                  className="font-code w-full bg-transparent text-xs text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="mb-3 max-h-[180px] space-y-1 overflow-y-auto rounded-xl border border-white/15 bg-slate-950/55 p-2">
              {filteredFilePaths.length === 0 && (
                <p className="font-body rounded-lg border border-dashed border-white/15 px-2 py-2 text-xs text-slate-400">
                  No files found
                </p>
              )}
              {filteredFilePaths.map((filePath) => (
                <button
                  key={filePath}
                  type="button"
                  onClick={() => setActiveFile(filePath)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition ${
                    currentFilePath === filePath
                      ? 'bg-cyan-500/15 text-cyan-100'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <FileCode2 size={13} />
                  <span className="font-code truncate">{filePath}</span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/15 bg-slate-950/80 p-3">
              <p className="font-code mb-2 truncate text-[11px] uppercase tracking-[0.12em] text-slate-400">
                {currentFilePath || 'No file selected'}
              </p>
              <pre className="font-code max-h-[250px] overflow-auto whitespace-pre text-[11px] leading-relaxed text-slate-100">
                {currentFileContent || 'Generate a build to inspect source files.'}
              </pre>
            </div>

            <article className="mt-3 rounded-2xl border border-amber-300/35 bg-amber-500/10 p-3">
              <p className="font-brand text-xs uppercase tracking-[0.14em] text-amber-100">Suggested next prompts</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {(activeVersion?.nextActions || [
                  'Ask for an alternate visual direction.',
                  'Request stricter conversion and CTA copy.',
                  'Add analytics event naming and tracking points.',
                ]).map((item, index) => (
                  <li key={`next-action-${index}`} className="font-body text-xs text-amber-50">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppBuilderStudio;
