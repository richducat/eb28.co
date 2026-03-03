import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Bot,
  Brush,
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

const STORAGE_KEY = 'eb28-appbuilder-studio-v1';

const QUICK_STARTS = [
  {
    title: 'Service Business CRM',
    prompt:
      'Build a field-service mobile CRM with lead intake, appointment scheduling, route map, and job completion checklist.',
    template: 'operations',
    audience: 'field-team',
  },
  {
    title: 'Subscription Commerce',
    prompt:
      'Create a subscription ecommerce app with product feed, checkout, account portal, and retention-focused push notifications.',
    template: 'commerce',
    audience: 'consumers',
  },
  {
    title: 'Coaching Platform',
    prompt:
      'Build a coaching app with onboarding quiz, daily task feed, progress dashboard, and in-app messaging.',
    template: 'community',
    audience: 'members',
  },
  {
    title: 'Internal Ops Hub',
    prompt:
      'Create an internal operations app for staff with ticket queue, KPI board, shift logs, and escalation workflow.',
    template: 'operations',
    audience: 'internal-team',
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

const INTRO_MESSAGE = {
  id: 'intro',
  role: 'assistant',
  content:
    'Welcome to EB28 App Builder. Share your concept and I will generate a mobile app scaffold you can iterate, restore, and export instantly.',
  createdAt: Date.now(),
};

const DEFAULT_SETTINGS = {
  appName: '',
  primaryColor: '#0891B2',
  template: 'custom',
  audience: 'consumers',
  businessGoal: 'Ship quickly and validate demand',
  capabilities: ['auth', 'dashboard', 'notifications'],
};

const DEFAULT_PREVIEW = {
  appName: 'Your App',
  tagline: 'Mobile product scaffold by EB28',
  primaryColor: '#0891B2',
  screens: [
    {
      name: 'Home',
      purpose: 'Primary user dashboard',
      elements: ['Headline', 'Quick actions', 'Core metrics'],
    },
    {
      name: 'Activity',
      purpose: 'Track progress and status',
      elements: ['Timeline feed', 'Filters', 'Action buttons'],
    },
  ],
};

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
  return String(value || 'eb28-mobile-app')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'eb28-mobile-app';
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
  return candidate ? `${candidate} App` : 'EB28 Mobile App';
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

function buildCompositePrompt({ userPrompt, settings }) {
  const capabilityLabels = settings.capabilities
    .map((capabilityId) => CAPABILITY_OPTIONS.find((item) => item.id === capabilityId)?.label || capabilityId)
    .join(', ');

  return [
    `Build an Expo React Native app for EB28 named "${settings.appName || guessAppName(userPrompt)}".`,
    `Template: ${settings.template}.`,
    `Audience: ${settings.audience}.`,
    `Primary brand color: ${sanitizeHexColor(settings.primaryColor)}.`,
    `Business goal: ${settings.businessGoal || 'Ship quickly and validate demand'}.`,
    `Priority capabilities: ${capabilityLabels || 'Sign In, Dashboard, Notifications'}.`,
    '',
    'Requested direction:',
    userPrompt,
  ].join('\n');
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

  const inferred = map
    .filter((item) => text.includes(item.key))
    .map((item) => item.value);

  return [...new Set(inferred)].slice(0, 5);
}

function buildLocalFallback({ prompt, settings, currentFiles }) {
  const inferredAppName = settings.appName || guessAppName(prompt);
  const accent = sanitizeHexColor(settings.primaryColor);
  const inferredCapabilities = settings.capabilities.length > 0
    ? settings.capabilities
    : inferCapabilitiesFromPrompt(prompt);
  const capabilityLabels = inferredCapabilities.map((id) => {
    const match = CAPABILITY_OPTIONS.find((item) => item.id === id);
    return match ? match.label : titleCase(id);
  });

  const hasExistingFiles = Object.keys(sanitizeFiles(currentFiles)).length > 0;
  const firstMessage =
    capabilityLabels[0] ||
    `${titleCase(settings.template)} workflow`; 

  const capabilityRows = capabilityLabels
    .slice(0, 6)
    .map((label, index) => `          <Text style={styles.itemText}>${index + 1}. ${label}</Text>`)
    .join('\n');

  const files = {
    '.gitignore': 'node_modules\n.expo\n.DS_Store\n',
    'package.json': JSON.stringify(
      {
        name: slugify(inferredAppName),
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
          name: inferredAppName,
          slug: slugify(inferredAppName),
          version: '1.0.0',
          orientation: 'portrait',
          userInterfaceStyle: 'automatic',
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
      `const accent = '${accent}';`,
      '',
      'export default function App() {',
      '  return (',
      '    <SafeAreaView style={styles.safe}>',
      '      <StatusBar barStyle="light-content" />',
      '      <ScrollView contentContainerStyle={styles.container}>',
      '        <View style={styles.hero}>',
      `          <Text style={styles.title}>${inferredAppName}</Text>`,
      `          <Text style={styles.subtitle}>${settings.businessGoal || 'Ship quickly and validate demand'}</Text>`,
      '        </View>',
      '        <View style={styles.card}>',
      `          <Text style={styles.sectionLabel}>${titleCase(settings.template)} Capability Set</Text>`,
      capabilityRows,
      '        </View>',
      '      </ScrollView>',
      '    </SafeAreaView>',
      '  );',
      '}',
      '',
      'const styles = StyleSheet.create({',
      '  safe: {',
      '    flex: 1,',
      '    backgroundColor: "#030712",',
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
      `# ${inferredAppName}`,
      '',
      `Generated by EB28 App Builder for ${settings.audience}.`,
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
      '## Build brief',
      '',
      `Template: ${titleCase(settings.template)}`,
      `Audience: ${titleCase(settings.audience.replace('-', ' '))}`,
      `Goal: ${settings.businessGoal}`,
      `Primary color: ${accent}`,
      '',
      'Prompt:',
      prompt,
      '',
    ].join('\n'),
  };

  return {
    assistantMessage: hasExistingFiles
      ? `Iteration generated for ${inferredAppName}. I refreshed the scaffold around your latest brief.`
      : `First build generated for ${inferredAppName}. Your scaffold is ready to run in Expo.`,
    project: {
      name: inferredAppName,
      description: `EB28 App Builder project for ${settings.audience}.`,
      platform: 'expo-react-native',
    },
    preview: {
      appName: inferredAppName,
      tagline: firstMessage,
      primaryColor: accent,
      screens: [
        {
          name: 'Home',
          purpose: 'Primary value delivery screen',
          elements: capabilityLabels.slice(0, 3),
        },
        {
          name: 'Operations',
          purpose: 'Execution and workflow screen',
          elements: capabilityLabels.slice(1, 4),
        },
        {
          name: 'Account',
          purpose: 'Profile and settings screen',
          elements: ['Profile', 'Preferences', 'Support access'],
        },
      ],
    },
    files,
    changes: [
      hasExistingFiles
        ? 'Applied your latest build brief as a new version of the scaffold.'
        : 'Generated a complete Expo starter scaffold from your build brief.',
      'Prepared app configuration files and build scripts.',
      'Updated App.js with audience and capability-aligned structure.',
      'Added handoff-ready README and runtime instructions.',
    ],
    source: 'browser-template',
    model: 'browser-template-v2',
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusNote, setStatusNote] = useState('Ready to build');
  const [error, setError] = useState('');

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
          capabilities: Array.isArray(parsed.settings.capabilities)
            ? parsed.settings.capabilities.slice(0, 8)
            : DEFAULT_SETTINGS.capabilities,
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
      // ignore invalid local cache
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

  const selectedCapabilityLabels = settings.capabilities
    .map((id) => CAPABILITY_OPTIONS.find((option) => option.id === id)?.label || id)
    .slice(0, 6);

  const versionCount = versions.length;
  const fileCount = Object.keys(activeFiles).length;

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

  const applyPayload = (payload, visiblePrompt) => {
    const now = Date.now();
    const files = payload?.files && typeof payload.files === 'object' ? payload.files : {};

    const projectName = String(payload?.project?.name || settings.appName || `Build ${versions.length + 1}`)
      .trim();

    const version = {
      id: `version-${now}`,
      name: projectName,
      prompt: visiblePrompt,
      createdAt: now,
      project: payload?.project || { name: projectName, description: '' },
      preview: payload?.preview || DEFAULT_PREVIEW,
      files,
      changes: Array.isArray(payload?.changes) ? payload.changes.slice(0, 12) : [],
      source: payload?.source || 'unknown',
      model: payload?.model || '',
      settingsSnapshot: settings,
    };

    const assistantMessage = {
      id: `assistant-${now}`,
      role: 'assistant',
      content:
        payload?.assistantMessage || `Generated ${Object.keys(files).length} files for ${projectName}.`,
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

    const runtimeLabel =
      version.source === 'openai'
        ? 'OpenAI generation'
        : version.source === 'fallback-template' || version.source === 'browser-template'
          ? 'Template generation'
          : 'Generation complete';

    const modelLabel = version.model ? ` (${version.model})` : '';
    setStatusNote(`${runtimeLabel}${modelLabel}`);
  };

  const handleQuickStart = (preset) => {
    updateSettings({
      template: preset.template,
      audience: preset.audience,
      appName: preset.title,
    });
    setPrompt(preset.prompt);
    setStatusNote(`Preset loaded: ${preset.title}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const visiblePrompt = prompt.trim();
    if (!visiblePrompt || isGenerating) {
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
    const fullPrompt = buildCompositePrompt({ userPrompt: visiblePrompt, settings });

    setPrompt('');
    setError('');
    setMessages((previous) => [...previous, userMessage].slice(-40));
    setIsGenerating(true);
    setStatusNote('Generating scaffold...');

    try {
      const response = await fetch('/api/appbuilder-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          rawPrompt: visiblePrompt,
          config: settings,
          currentFiles,
          history: [...messages.slice(-8), userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Generation failed');
      }

      applyPayload(payload, visiblePrompt);
    } catch {
      const fallbackPayload = buildLocalFallback({
        prompt: visiblePrompt,
        settings,
        currentFiles,
      });
      fallbackPayload.assistantMessage = `${fallbackPayload.assistantMessage} API unavailable, local mode used.`;
      applyPayload(fallbackPayload, visiblePrompt);
    } finally {
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
      const rootDir = slugify(activeVersion.project?.name || settings.appName || 'eb28-mobile-app');

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
          `Goal: ${settings.businessGoal}`,
          `Prompt: ${activeVersion.prompt}`,
          '',
          '## Run',
          '',
          '```bash',
          'npm install',
          'npm run start',
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
                Ship mobile app prototypes clients can buy into
              </h1>
              <p className="font-body mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
                Convert a brief into an Expo-ready source scaffold, iterate in minutes, and export
                handoff code. Built as an EB28 offering for fast product validation and client delivery.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <article className="rounded-2xl border border-cyan-400/25 bg-slate-950/60 p-3">
                <p className="font-brand text-xs uppercase tracking-[0.14em] text-cyan-200">Speed</p>
                <p className="font-brand mt-1 text-lg font-bold text-white">10-minute build loop</p>
              </article>
              <article className="rounded-2xl border border-amber-300/25 bg-slate-950/60 p-3">
                <p className="font-brand text-xs uppercase tracking-[0.14em] text-amber-200">Output</p>
                <p className="font-brand mt-1 text-lg font-bold text-white">Expo-ready source</p>
              </article>
              <article className="rounded-2xl border border-emerald-300/25 bg-slate-950/60 p-3">
                <p className="font-brand text-xs uppercase tracking-[0.14em] text-emerald-200">Positioning</p>
                <p className="font-brand mt-1 text-lg font-bold text-white">EB28 white-label offer</p>
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
                  placeholder="EB28 Field Ops"
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
                      <p className="font-body mt-1 text-[11px] text-slate-400">Load brief preset</p>
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
                  placeholder="Describe the workflows, retention loop, and what this app should help users do in under 30 seconds."
                  className="font-body h-32 w-full resize-none rounded-2xl border border-white/15 bg-slate-900/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300"
                />

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="font-brand inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                  {isGenerating ? 'Generating Build...' : 'Generate EB28 Build'}
                </button>
              </form>

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
                <div className="max-h-[230px] space-y-2 overflow-y-auto pr-1">
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
                        {Array.isArray(message.changes) && message.changes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.changes.slice(0, 4).map((change, index) => (
                              <span key={`${message.id}-chip-${index}`} className="font-body rounded-full bg-slate-900/70 px-2 py-1 text-[11px] text-slate-200">
                                {change}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-brand flex items-center gap-2 text-sm uppercase tracking-[0.14em] text-slate-200">
                    <Smartphone size={16} /> Live Product Preview
                  </h2>
                  <div className="flex gap-2">
                    <span className="font-body rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{versionCount} versions</span>
                    <span className="font-body rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{fileCount} files</span>
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
                          {activePreview.appName || 'EB28 App'}
                        </p>
                        <p className="font-body mt-1 text-sm leading-snug opacity-95">
                          {activePreview.tagline || 'App preview'}
                        </p>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(activePreview.screens || []).slice(0, 3).map((screen, index) => (
                          <article key={`${screen.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="font-brand text-xs uppercase tracking-[0.12em] text-slate-900">
                              {screen.name || `Screen ${index + 1}`}
                            </p>
                            <p className="font-body mt-1 text-xs text-slate-600">{screen.purpose || 'Core screen'}</p>
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
                      <p className="font-brand mb-1 text-xs uppercase tracking-[0.14em] text-cyan-100">This build includes</p>
                      <p className="font-body text-sm text-cyan-50">
                        {(selectedCapabilityLabels.length > 0
                          ? selectedCapabilityLabels
                          : ['Sign In', 'Dashboard', 'Notifications']
                        ).join(' • ')}
                      </p>
                    </article>

                    <article className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3">
                      <p className="font-brand mb-1 text-xs uppercase tracking-[0.14em] text-emerald-100">How this sells</p>
                      <p className="font-body text-sm text-emerald-50">
                        Position as a rapid prototype sprint: custom UX direction, working source export,
                        and a path to white-glove production implementation by EB28.
                      </p>
                    </article>

                    <div>
                      <p className="font-brand mb-2 text-xs uppercase tracking-[0.14em] text-slate-300">Version history</p>
                      <div className="max-h-[140px] space-y-2 overflow-y-auto pr-1">
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
                  placeholder="App.js"
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
              <p className="font-brand text-xs uppercase tracking-[0.14em] text-amber-100">EB28 Upsell Layer</p>
              <p className="font-body mt-1 text-xs leading-relaxed text-amber-50">
                Package this as a paid strategy sprint, then offer implementation + maintenance as a monthly service.
              </p>
              <a
                href="/#contact"
                className="font-body mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-100 underline underline-offset-4"
              >
                <Sparkles size={12} /> Open contact section
              </a>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppBuilderStudio;
