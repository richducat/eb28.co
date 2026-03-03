const DEFAULT_MODEL = process.env.RORK_MODEL || 'gpt-4.1-mini';
const MAX_HISTORY_ITEMS = 8;
const MAX_FILE_CONTEXT = 8;
const MAX_FILE_CONTENT_CHARS = 1800;

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

function sanitizeColor(value) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : '#0F766E';
}

function normalizePayload(payload) {
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

  return {
    assistantMessage: toSafeString(payload?.assistantMessage, 'Generated project update.'),
    project: {
      name: toSafeString(payload?.project?.name, 'Generated App'),
      description: toSafeString(payload?.project?.description, 'Expo React Native project generated from prompt.'),
      platform: toSafeString(payload?.project?.platform, 'expo-react-native'),
    },
    preview: {
      appName: toSafeString(payload?.preview?.appName, payload?.project?.name || 'Generated App'),
      tagline: toSafeString(payload?.preview?.tagline, 'AI-generated mobile prototype'),
      primaryColor: sanitizeColor(payload?.preview?.primaryColor),
      screens: screens.length > 0 ? screens : [
        {
          name: 'Home',
          purpose: 'Primary app experience',
          elements: ['Header', 'Main action', 'Status section'],
        },
      ],
    },
    files,
    changes: Array.isArray(payload?.changes)
      ? payload.changes.slice(0, 12).map((item) => toSafeString(item)).filter(Boolean)
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

  return paths.map((filePath) => {
    const content = safeFiles[filePath].slice(0, MAX_FILE_CONTENT_CHARS);
    return `FILE: ${filePath}\n${content}`;
  }).join('\n\n');
}

function inferFeatureList(prompt) {
  const text = String(prompt || '').toLowerCase();
  const catalog = [
    { key: 'auth', label: 'Account sign in and onboarding' },
    { key: 'chat', label: 'Real-time chat-style interactions' },
    { key: 'payment', label: 'Checkout and payment flow' },
    { key: 'calendar', label: 'Calendar scheduling experience' },
    { key: 'map', label: 'Location and map-aware views' },
    { key: 'track', label: 'Live status or activity tracking' },
    { key: 'notification', label: 'Push-style notification center' },
    { key: 'profile', label: 'Profile and settings management' },
    { key: 'ai', label: 'AI assistant workflow entry point' },
    { key: 'dashboard', label: 'Operational dashboard cards' },
  ];

  const matched = catalog
    .filter((item) => text.includes(item.key))
    .map((item) => item.label)
    .slice(0, 5);

  if (matched.length > 0) {
    return matched;
  }

  const tokens = String(prompt || '')
    .split(/[,.\n]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((token) => {
      const shortened = token.length > 56 ? `${token.slice(0, 53)}...` : token;
      return toTitleCase(shortened);
    });

  if (tokens.length > 0) {
    return tokens;
  }

  return ['Core primary action', 'Main content feed', 'Settings and profile'];
}

function inferAppName(prompt) {
  const words = String(prompt || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const candidate = toTitleCase(words.join(' '));
  if (candidate.length >= 3) {
    return `${candidate} App`;
  }

  return 'Generated App';
}

function escapeTemplateString(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

function buildFallbackProject({ prompt, currentFiles }) {
  const appName = inferAppName(prompt);
  const description = `Expo React Native app generated for: ${toSafeString(prompt, 'New mobile app')}`;
  const features = inferFeatureList(prompt);

  const featureItems = features
    .map((feature, index) => `            <Text style={styles.itemText}>${index + 1}. ${escapeTemplateString(feature)}</Text>`)
    .join('\n');

  const files = {
    '.gitignore': 'node_modules\\n.expo\\n.DS_Store\\n',
    'package.json': JSON.stringify(
      {
        name: 'generated-mobile-app',
        version: '1.0.0',
        private: true,
        main: 'node_modules/expo/AppEntry.js',
        scripts: {
          start: 'expo start',
          android: 'expo start --android',
          ios: 'expo start --ios',
          web: 'expo start --web',
        },
        dependencies: {
          expo: '^53.0.0',
          react: '^19.0.0',
          'react-native': '^0.79.0',
          'expo-status-bar': '~2.2.0',
        },
      },
      null,
      2
    ),
    'app.json': JSON.stringify(
      {
        expo: {
          name: appName,
          slug: 'generated-mobile-app',
          version: '1.0.0',
          orientation: 'portrait',
          userInterfaceStyle: 'automatic',
          splash: {
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
          },
          assetBundlePatterns: ['**/*'],
          ios: {
            supportsTablet: true,
          },
          android: {
            adaptiveIcon: {
              backgroundColor: '#ffffff',
            },
          },
          web: {
            bundler: 'metro',
          },
        },
      },
      null,
      2
    ),
    'babel.config.js': [
      'module.exports = function(api) {',
      '  api.cache(true);',
      '  return {',
      "    presets: ['babel-preset-expo'],",
      '  };',
      '};',
      '',
    ].join('\n'),
    'App.js': [
      "import React from 'react';",
      "import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';",
      '',
      'const accent = "#0F766E";',
      '',
      'export default function App() {',
      '  return (',
      '    <SafeAreaView style={styles.safe}>',
      '      <StatusBar barStyle="light-content" />',
      '      <ScrollView contentContainerStyle={styles.container}>',
      '        <View style={styles.hero}>',
      `          <Text style={styles.title}>${escapeTemplateString(appName)}</Text>`,
      `          <Text style={styles.subtitle}>${escapeTemplateString(description)}</Text>`,
      '        </View>',
      '        <View style={styles.card}>',
      '          <Text style={styles.sectionLabel}>Primary Features</Text>',
      featureItems,
      '        </View>',
      '      </ScrollView>',
      '    </SafeAreaView>',
      '  );',
      '}',
      '',
      'const styles = StyleSheet.create({',
      '  safe: {',
      '    flex: 1,',
      '    backgroundColor: "#0b1220",',
      '  },',
      '  container: {',
      '    padding: 20,',
      '    gap: 16,',
      '  },',
      '  hero: {',
      '    borderRadius: 16,',
      '    padding: 18,',
      '    backgroundColor: accent,',
      '  },',
      '  title: {',
      '    color: "white",',
      '    fontSize: 28,',
      '    fontWeight: "700",',
      '  },',
      '  subtitle: {',
      '    marginTop: 6,',
      '    color: "#e2e8f0",',
      '    fontSize: 14,',
      '    lineHeight: 20,',
      '  },',
      '  card: {',
      '    borderRadius: 16,',
      '    backgroundColor: "#111827",',
      '    borderWidth: 1,',
      '    borderColor: "#1f2937",',
      '    padding: 16,',
      '    gap: 10,',
      '  },',
      '  sectionLabel: {',
      '    color: "#f8fafc",',
      '    fontWeight: "700",',
      '    fontSize: 16,',
      '  },',
      '  itemText: {',
      '    color: "#cbd5e1",',
      '    fontSize: 14,',
      '    lineHeight: 20,',
      '  },',
      '});',
      '',
    ].join('\n'),
    'README.md': [
      `# ${appName}`,
      '',
      description,
      '',
      '## Run locally',
      '',
      '```bash',
      'npm install',
      'npm run start',
      '```',
      '',
      'Scan the Expo Go QR code to preview on device.',
      '',
      '## Prompt used',
      '',
      toSafeString(prompt, 'No prompt provided.'),
      '',
    ].join('\n'),
  };

  const hasExistingFiles = currentFiles && Object.keys(sanitizeFiles(currentFiles)).length > 0;

  return {
    assistantMessage: hasExistingFiles
      ? `Updated your app with a new prompt-driven iteration: ${toSafeString(prompt)}.`
      : `Created an initial Expo project for: ${toSafeString(prompt)}.`,
    project: {
      name: appName,
      description,
      platform: 'expo-react-native',
    },
    preview: {
      appName,
      tagline: features[0] || 'AI-generated mobile app prototype',
      primaryColor: '#0F766E',
      screens: [
        {
          name: 'Home',
          purpose: 'Main app hub',
          elements: features.slice(0, 3),
        },
        {
          name: 'Details',
          purpose: 'Focused workflow details',
          elements: features.slice(1, 4),
        },
      ],
    },
    files,
    changes: [
      hasExistingFiles ? 'Applied new feature iteration to the project scaffold.' : 'Generated initial Expo project scaffold.',
      'Set up app configuration and runtime scripts.',
      'Created baseline UI structure in App.js.',
      'Prepared README with run instructions.',
    ],
    source: 'fallback-template',
    model: 'template-v1',
  };
}

async function generateWithOpenAI({ prompt, history, currentFiles }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const historyLines = normalizeHistory(history)
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join('\n');

  const fileContext = compactCurrentFiles(currentFiles);

  const schema = {
    name: 'mobile_builder_output',
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
      },
      required: ['assistantMessage', 'project', 'preview', 'files', 'changes'],
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
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
      messages: [
        {
          role: 'system',
          content: [
            'You generate Expo React Native projects from prompts.',
            'Return a compact but runnable project structure with coherent files.',
            'Always include package.json, app.json, App.js, README.md, and any additional supporting files.',
            'When current files are provided, produce a full updated file set instead of only a diff.',
            'Use modern React Native patterns and readable code.',
            'Output valid JSON only via the enforced schema.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Prompt: ${prompt}`,
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
  const normalized = normalizePayload(parsed);

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
  const currentFiles = sanitizeFiles(body?.currentFiles);
  const history = normalizeHistory(body?.history);

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const openAIResult = await generateWithOpenAI({ prompt, history, currentFiles });

    if (openAIResult) {
      return res.status(200).json(openAIResult);
    }

    return res.status(200).json(buildFallbackProject({ prompt, currentFiles }));
  } catch (error) {
    const fallback = buildFallbackProject({ prompt, currentFiles });
    return res.status(200).json({
      ...fallback,
      assistantMessage: `${fallback.assistantMessage} OpenAI generation failed, so template mode was used instead.`,
      warning: error.message,
    });
  }
}
