const DEFAULT_MODEL = process.env.APPBUILDER_MODEL || 'gpt-4.1-mini';
const MAX_HISTORY_ITEMS = 8;
const MAX_FILE_CONTEXT = 8;
const MAX_FILE_CONTENT_CHARS = 1800;

const VISUAL_DIRECTION_HINTS = {
  'editorial-bold': 'Large expressive typography, asymmetrical layout, clear hierarchy.',
  'bento-tech': 'Modular card grid, crisp spacing, system-like polish.',
  'neo-brutalist': 'High contrast blocks, bold borders, playful confidence.',
  'conversion-luxe': 'Premium look with clear high-conversion CTA rhythm.',
  'playful-futurist': 'Energetic gradients, modern motion cues, approachable interaction.',
  'minimal-architectural': 'Quiet palette, geometric restraint, strong structure.',
};

const FUNDAMENTAL_LABELS = {
  information_architecture: 'Information Architecture',
  conversion_path: 'Conversion Path',
  responsive_behavior: 'Responsive Behavior',
  accessibility: 'Accessibility',
  performance_budget: 'Performance Budget',
  states_feedback: 'Error/Empty/Loading States',
  analytics_events: 'Analytics Events',
  content_hierarchy: 'Content Hierarchy',
};

const CAPABILITY_LABELS = {
  auth: 'Sign In and onboarding',
  dashboard: 'Operational dashboard cards',
  payments: 'Checkout and payment flow',
  notifications: 'Notification center',
  chat: 'In-app messaging',
  analytics: 'Usage analytics surfaces',
  bookings: 'Scheduling and bookings',
  map: 'Map and location workflows',
};

function parseRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return {};
}

function toSafeString(value, fallback = '') {
  const output = String(value || '').trim();
  return output || fallback;
}

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function sanitizeHexColor(value) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : '#0891B2';
}

function sanitizeFilePath(filePath) {
  return String(filePath || '')
    .replace(/^\/+/, '')
    .replace(/\.\./g, '')
    .trim();
}

function sanitizeFiles(files) {
  if (!files || typeof files !== 'object') {
    return {};
  }

  const output = {};
  for (const [filePath, value] of Object.entries(files)) {
    if (typeof value !== 'string') {
      continue;
    }

    const safePath = sanitizeFilePath(filePath);
    if (!safePath) {
      continue;
    }

    output[safePath] = value;
  }

  return output;
}

function normalizeConfig(config) {
  const input = config && typeof config === 'object' ? config : {};
  const allowedTemplates = new Set(['custom', 'commerce', 'operations', 'community', 'content']);
  const allowedAudiences = new Set(['consumers', 'members', 'field-team', 'internal-team', 'hybrid']);
  const allowedVisualDirections = new Set([
    'editorial-bold',
    'bento-tech',
    'neo-brutalist',
    'conversion-luxe',
    'playful-futurist',
    'minimal-architectural',
  ]);
  const allowedCapabilities = new Set(Object.keys(CAPABILITY_LABELS));
  const allowedFundamentals = new Set(Object.keys(FUNDAMENTAL_LABELS));

  const capabilities = Array.isArray(input.capabilities)
    ? input.capabilities
        .map((capability) => String(capability || '').trim().toLowerCase())
        .filter((capability) => allowedCapabilities.has(capability))
        .slice(0, 8)
    : [];

  const fundamentals = Array.isArray(input.fundamentals)
    ? input.fundamentals
        .map((fundamental) => String(fundamental || '').trim().toLowerCase())
        .filter((fundamental) => allowedFundamentals.has(fundamental))
        .slice(0, 8)
    : [];

  const complexityRaw = Number.parseInt(input.complexity, 10);

  return {
    appName: toSafeString(input.appName),
    template: allowedTemplates.has(String(input.template || '').toLowerCase())
      ? String(input.template || '').toLowerCase()
      : 'custom',
    audience: allowedAudiences.has(String(input.audience || '').toLowerCase())
      ? String(input.audience || '').toLowerCase()
      : 'consumers',
    businessGoal: toSafeString(input.businessGoal, 'Ship quickly and validate demand'),
    primaryColor: sanitizeHexColor(input.primaryColor),
    visualDirection: allowedVisualDirections.has(String(input.visualDirection || '').toLowerCase())
      ? String(input.visualDirection || '').toLowerCase()
      : 'editorial-bold',
    complexity: Number.isFinite(complexityRaw)
      ? Math.max(1, Math.min(5, complexityRaw))
      : 3,
    capabilities,
    fundamentals,
  };
}

function normalizePayload(payload, config) {
  const files = sanitizeFiles(payload?.files);

  const screens = Array.isArray(payload?.preview?.screens)
    ? payload.preview.screens.slice(0, 5).map((screen, index) => ({
        name: toSafeString(screen?.name, `Screen ${index + 1}`),
        purpose: toSafeString(screen?.purpose, 'Primary workflow screen'),
        elements: Array.isArray(screen?.elements)
          ? screen.elements.slice(0, 5).map((element) => toSafeString(element)).filter(Boolean)
          : [],
      }))
    : [];

  const fundamentals = Array.isArray(payload?.fundamentals)
    ? payload.fundamentals.slice(0, 12).map((item) => ({
        id: toSafeString(item?.id),
        label: toSafeString(item?.label, 'Fundamental'),
        status: toSafeString(item?.status, 'covered'),
        note: toSafeString(item?.note, 'Included in generation plan.'),
      })).filter((item) => item.id)
    : [];

  const designRecipe = payload?.designRecipe && typeof payload.designRecipe === 'object'
    ? {
        visualDirection: toSafeString(payload.designRecipe.visualDirection, config.visualDirection),
        complexity: Number.isFinite(Number(payload.designRecipe.complexity))
          ? Math.max(1, Math.min(5, Number(payload.designRecipe.complexity)))
          : config.complexity,
        complexityLabel: toSafeString(payload.designRecipe.complexityLabel, 'Balanced complexity'),
        signature: toSafeString(payload.designRecipe.signature, VISUAL_DIRECTION_HINTS[config.visualDirection]),
        palette: Array.isArray(payload.designRecipe.palette)
          ? payload.designRecipe.palette.slice(0, 6).map((value) => toSafeString(value)).filter(Boolean)
          : [config.primaryColor, '#050816', '#e2e8f0'],
      }
    : {
        visualDirection: config.visualDirection,
        complexity: config.complexity,
        complexityLabel: 'Balanced complexity',
        signature: VISUAL_DIRECTION_HINTS[config.visualDirection],
        palette: [config.primaryColor, '#050816', '#e2e8f0'],
      };

  return {
    assistantMessage: toSafeString(payload?.assistantMessage, 'Generated project update.'),
    project: {
      name: toSafeString(payload?.project?.name, 'EB28 Experience'),
      description: toSafeString(payload?.project?.description, 'React web project generated from brief.'),
      platform: toSafeString(payload?.project?.platform, 'react-web'),
    },
    preview: {
      appName: toSafeString(payload?.preview?.appName, payload?.project?.name || 'EB28 Experience'),
      tagline: toSafeString(payload?.preview?.tagline, 'High-conversion experience scaffold'),
      primaryColor: sanitizeHexColor(payload?.preview?.primaryColor || config.primaryColor),
      screens: screens.length > 0
        ? screens
        : [
            {
              name: 'Hero',
              purpose: 'Primary value proposition and CTA',
              elements: ['Headline', 'Trust proof', 'Action trigger'],
            },
          ],
    },
    files,
    changes: Array.isArray(payload?.changes)
      ? payload.changes.slice(0, 12).map((item) => toSafeString(item)).filter(Boolean)
      : [],
    fundamentals,
    designRecipe,
    nextActions: Array.isArray(payload?.nextActions)
      ? payload.nextActions.slice(0, 6).map((item) => toSafeString(item)).filter(Boolean)
      : [],
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice(-MAX_HISTORY_ITEMS)
    .map((entry) => ({
      role: entry?.role === 'assistant' ? 'assistant' : 'user',
      content: toSafeString(entry?.content),
    }))
    .filter((entry) => entry.content.length > 0);
}

function compactCurrentFiles(currentFiles) {
  const safeFiles = sanitizeFiles(currentFiles);
  const paths = Object.keys(safeFiles).sort().slice(0, MAX_FILE_CONTEXT);

  return paths
    .map((filePath) => {
      const content = safeFiles[filePath].slice(0, MAX_FILE_CONTENT_CHARS);
      return `FILE: ${filePath}\n${content}`;
    })
    .join('\n\n');
}

function inferAppName(prompt) {
  const words = String(prompt || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const candidate = toTitleCase(words.join(' '));
  if (candidate.length >= 3) {
    return `${candidate} Experience`;
  }

  return 'EB28 Experience';
}

function fallbackFundamentals(config) {
  const selected = config.fundamentals.length > 0
    ? config.fundamentals
    : ['information_architecture', 'conversion_path', 'responsive_behavior', 'accessibility'];

  return selected.map((id) => ({
    id,
    label: FUNDAMENTAL_LABELS[id] || toTitleCase(String(id || '').replace(/_/g, ' ')),
    status: 'covered',
    note: `This output explicitly considers ${FUNDAMENTAL_LABELS[id] || id}.`,
  }));
}

function buildFallbackProject({ prompt, rawPrompt, currentFiles, config }) {
  const appName = config.appName || inferAppName(rawPrompt || prompt);
  const capabilities = config.capabilities.length > 0
    ? config.capabilities
    : ['auth', 'dashboard', 'notifications'];
  const featureLabels = capabilities.map((id) => CAPABILITY_LABELS[id] || toTitleCase(id)).slice(0, 6);

  const featureRows = featureLabels
    .map((feature, index) => `        <p className="itemText">${index + 1}. ${feature}</p>`)
    .join('\n');

  const files = {
    '.gitignore': 'node_modules\\n.DS_Store\\n',
    'package.json': JSON.stringify(
      {
        name: appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'eb28-experience',
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
          '@vitejs/plugin-react': '^4.3.3',
          vite: '^5.4.11',
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
      `    <title>${appName}</title>`,
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
      `        <h1>${appName}</h1>`,
      `        <p>${config.businessGoal}</p>`,
      '        <button className="cta">Start Now</button>',
      '      </section>',
      '      <section className="panel">',
      `        <h2>${toTitleCase(config.visualDirection.replace(/-/g, ' '))} Direction</h2>`,
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
      `  --accent: ${config.primaryColor};`,
      '  --bg: #050816;',
      '  --panel: rgba(15, 23, 42, 0.78);',
      '}',
      '* { box-sizing: border-box; }',
      'body {',
      '  margin: 0;',
      '  font-family: "Space Grotesk", "Inter", sans-serif;',
      '  color: #e2e8f0;',
      '  min-height: 100vh;',
      '  background:',
      '    radial-gradient(circle at 12% 16%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 45%),',
      '    radial-gradient(circle at 84% 82%, rgba(251, 191, 36, 0.12), transparent 36%),',
      '    linear-gradient(140deg, #020617, #0f172a);',
      '}',
      '.shell { max-width: 1080px; margin: 0 auto; padding: 2rem 1rem; display: grid; gap: 1rem; }',
      '.hero, .panel {',
      '  border: 1px solid rgba(148, 163, 184, 0.24);',
      '  border-radius: 1.2rem;',
      '  background: var(--panel);',
      '  backdrop-filter: blur(10px);',
      '  padding: 1.2rem;',
      '}',
      '.hero h1 { margin: 0; font-size: clamp(2rem, 6vw, 3.4rem); }',
      '.hero p { color: #cbd5e1; max-width: 55ch; }',
      '.cta {',
      '  border: 0;',
      '  background: var(--accent);',
      '  color: #001018;',
      '  font-weight: 700;',
      '  border-radius: 999px;',
      '  padding: 0.6rem 1rem;',
      '}',
      '.featureList { display: grid; gap: 0.6rem; }',
      '.itemText { margin: 0; color: #dbeafe; }',
      '@media (max-width: 720px) { .shell { padding: 1rem; } }',
      '',
    ].join('\n'),
    'README.md': [
      `# ${appName}`,
      '',
      'Generated by EB28 App Builder in fallback mode.',
      '',
      '## Run locally',
      '',
      '```bash',
      'npm install',
      'npm run dev',
      '```',
      '',
      `Template: ${toTitleCase(config.template)}`,
      `Audience: ${toTitleCase(config.audience.replace('-', ' '))}`,
      `Visual direction: ${toTitleCase(config.visualDirection.replace(/-/g, ' '))}`,
      `Complexity: ${config.complexity}/5`,
      '',
      rawPrompt || prompt,
      '',
    ].join('\n'),
  };

  const hasExistingFiles = currentFiles && Object.keys(sanitizeFiles(currentFiles)).length > 0;

  return {
    assistantMessage: hasExistingFiles
      ? `Generated a new EB28 App Builder iteration for ${appName}.`
      : `Created the first EB28 App Builder scaffold for ${appName}.`,
    project: {
      name: appName,
      description: `EB28 App Builder scaffold for ${config.audience}.`,
      platform: 'react-web',
    },
    preview: {
      appName,
      tagline: featureLabels[0] || 'High-conversion experience scaffold',
      primaryColor: config.primaryColor,
      screens: [
        {
          name: 'Hero',
          purpose: 'Primary value proposition and CTA',
          elements: ['Headline', 'Trust proof', 'Action trigger'],
        },
        {
          name: 'Journey',
          purpose: 'Core workflow walkthrough',
          elements: featureLabels.slice(0, 3),
        },
      ],
    },
    files,
    changes: [
      hasExistingFiles
        ? 'Applied the latest brief as a higher-fidelity iteration.'
        : 'Generated complete React web scaffold from concise brief.',
      'Expanded prompt into structured design intent automatically.',
      'Applied selected visual direction and complexity constraints.',
      'Included explicit fundamentals coverage report.',
    ],
    fundamentals: fallbackFundamentals(config),
    designRecipe: {
      visualDirection: config.visualDirection,
      complexity: config.complexity,
      complexityLabel: `Level ${config.complexity} complexity`,
      signature: VISUAL_DIRECTION_HINTS[config.visualDirection],
      palette: [config.primaryColor, '#050816', '#e2e8f0'],
    },
    nextActions: [
      'Generate a second variant with a different visual direction.',
      'Request stronger conversion objection-handling sections.',
      'Add analytics event map and naming conventions.',
    ],
    source: 'fallback-template',
    model: 'template-v3',
  };
}

async function generateWithOpenAI({ prompt, rawPrompt, history, currentFiles, config }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const historyLines = normalizeHistory(history)
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join('\n');

  const fileContext = compactCurrentFiles(currentFiles);

  const schema = {
    name: 'eb28_app_builder_output',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        assistantMessage: { type: 'string' },
        project: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            platform: { type: 'string' },
          },
          required: ['name', 'description', 'platform'],
        },
        preview: {
          type: 'object',
          additionalProperties: false,
          properties: {
            appName: { type: 'string' },
            tagline: { type: 'string' },
            primaryColor: { type: 'string' },
            screens: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  purpose: { type: 'string' },
                  elements: {
                    type: 'array',
                    maxItems: 5,
                    items: { type: 'string' },
                  },
                },
                required: ['name', 'purpose', 'elements'],
              },
            },
          },
          required: ['appName', 'tagline', 'primaryColor', 'screens'],
        },
        files: {
          type: 'object',
          minProperties: 4,
          maxProperties: 20,
          additionalProperties: {
            type: 'string',
          },
        },
        changes: {
          type: 'array',
          maxItems: 12,
          items: { type: 'string' },
        },
        fundamentals: {
          type: 'array',
          maxItems: 12,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              status: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['id', 'label', 'status', 'note'],
          },
        },
        designRecipe: {
          type: 'object',
          additionalProperties: false,
          properties: {
            visualDirection: { type: 'string' },
            complexity: { type: 'number' },
            complexityLabel: { type: 'string' },
            signature: { type: 'string' },
            palette: {
              type: 'array',
              maxItems: 6,
              items: { type: 'string' },
            },
          },
          required: ['visualDirection', 'complexity', 'complexityLabel', 'signature', 'palette'],
        },
        nextActions: {
          type: 'array',
          maxItems: 6,
          items: { type: 'string' },
        },
      },
      required: [
        'assistantMessage',
        'project',
        'preview',
        'files',
        'changes',
        'fundamentals',
        'designRecipe',
        'nextActions',
      ],
    },
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.25,
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
      messages: [
        {
          role: 'system',
          content: [
            'You are EB28 App Builder, generating React web project scaffolds from concise prompts.',
            'Your output must feel distinctive and intentional, not boilerplate.',
            'Always produce runnable files including package.json, index.html, src/main.jsx, src/App.jsx, src/styles.css, README.md.',
            'Use the provided visual direction and complexity level to shape typography, layout, spacing, and motion notes.',
            'Return a fundamentals report that confirms coverage for each required fundamental.',
            'When current files are provided, return a full updated file set, not a diff.',
            'Output valid JSON only via the enforced schema.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Build brief: ${prompt}`,
            '',
            `Raw direction: ${rawPrompt || prompt}`,
            '',
            `Config: ${JSON.stringify(config)}`,
            '',
            `Visual direction hint: ${VISUAL_DIRECTION_HINTS[config.visualDirection]}`,
            '',
            'Recent history:',
            historyLines || '(no history)',
            '',
            'Current file context (trimmed):',
            fileContext || '(no existing files)',
          ].join('\n'),
        },
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'OpenAI request failed');
  }

  const rawContent = payload?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(rawContent || '{}');
  const normalized = normalizePayload(parsed, config);

  return {
    ...normalized,
    source: 'openai',
    model: payload?.model || DEFAULT_MODEL,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseRequestBody(req.body);
  const prompt = toSafeString(body?.prompt);
  const rawPrompt = toSafeString(body?.rawPrompt, prompt);
  const currentFiles = sanitizeFiles(body?.currentFiles);
  const history = normalizeHistory(body?.history);
  const config = normalizeConfig(body?.config);

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const openAIResult = await generateWithOpenAI({
      prompt,
      rawPrompt,
      history,
      currentFiles,
      config,
    });

    if (openAIResult) {
      return res.status(200).json(openAIResult);
    }

    return res.status(200).json(
      buildFallbackProject({
        prompt,
        rawPrompt,
        currentFiles,
        config,
      })
    );
  } catch (error) {
    const fallback = buildFallbackProject({
      prompt,
      rawPrompt,
      currentFiles,
      config,
    });

    return res.status(200).json({
      ...fallback,
      assistantMessage: `${fallback.assistantMessage} OpenAI generation failed, so template mode was used instead.`,
      warning: error.message,
    });
  }
}
