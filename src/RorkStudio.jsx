import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Bot,
  Code2,
  Download,
  FileCode2,
  History,
  RefreshCw,
  SendHorizontal,
  Smartphone,
  Sparkles,
  Wand2,
} from 'lucide-react';

const INTRO_MESSAGE = {
  id: 'intro',
  role: 'assistant',
  content:
    'Describe the mobile app you want. I will generate an Expo React Native project, keep version history, and let you export code as a ZIP.',
  createdAt: Date.now(),
};

const DEFAULT_PREVIEW = {
  appName: 'New App',
  tagline: 'AI-generated prototype',
  primaryColor: '#0F766E',
  screens: [
    {
      name: 'Home',
      purpose: 'Primary app experience',
      elements: ['Hero header', 'Main action button', 'Status cards'],
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
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#0F766E';
}

function asFileList(files) {
  if (!files || typeof files !== 'object') {
    return [];
  }

  return Object.keys(files)
    .filter((path) => typeof files[path] === 'string')
    .sort((a, b) => a.localeCompare(b));
}

function safeProjectName(name, fallback) {
  const candidate = String(name || '').trim();
  return candidate.length > 0 ? candidate : fallback;
}

function slugify(value) {
  return String(value || 'mobile-app')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'mobile-app';
}

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim();
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
    { key: 'notification', label: 'Notification center' },
    { key: 'profile', label: 'Profile and settings management' },
    { key: 'ai', label: 'AI assistant workflow entry point' },
    { key: 'dashboard', label: 'Operational dashboard cards' },
  ];

  const matches = catalog
    .filter((item) => text.includes(item.key))
    .map((item) => item.label)
    .slice(0, 5);

  if (matches.length > 0) {
    return matches;
  }

  const promptSlices = String(prompt || '')
    .split(/[,\n.]/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((token) => (token.length > 54 ? `${token.slice(0, 51)}...` : token))
    .map((token) => toTitleCase(token));

  return promptSlices.length > 0
    ? promptSlices
    : ['Core primary action', 'Main content feed', 'Settings and profile'];
}

function inferAppName(prompt) {
  const words = String(prompt || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  const candidate = toTitleCase(words.join(' '));
  return candidate.length >= 3 ? `${candidate} App` : 'Generated App';
}

function buildBrowserFallback({ prompt, currentFiles }) {
  const appName = inferAppName(prompt);
  const description = `Expo React Native app generated for: ${prompt}`;
  const features = inferFeatureList(prompt);
  const existingFileCount = Object.keys(currentFiles || {}).length;

  const featureItems = features
    .map((feature, index) => `        <Text style={styles.itemText}>${index + 1}. ${feature}</Text>`)
    .join('\n');

  return {
    assistantMessage:
      existingFileCount > 0
        ? `Applied your iteration in local template mode: ${prompt}`
        : `Created an initial app scaffold in local template mode: ${prompt}`,
    project: {
      name: appName,
      description,
      platform: 'expo-react-native',
    },
    preview: {
      appName,
      tagline: features[0] || 'AI-generated mobile prototype',
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
    files: {
      '.gitignore': 'node_modules\n.expo\n.DS_Store\n',
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
            ios: { supportsTablet: true },
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
        `          <Text style={styles.title}>${appName}</Text>`,
        `          <Text style={styles.subtitle}>${description}</Text>`,
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
        '  safe: { flex: 1, backgroundColor: "#0b1220" },',
        '  container: { padding: 20, gap: 16 },',
        '  hero: { borderRadius: 16, padding: 18, backgroundColor: accent },',
        '  title: { color: "white", fontSize: 28, fontWeight: "700" },',
        '  subtitle: { marginTop: 6, color: "#e2e8f0", fontSize: 14, lineHeight: 20 },',
        '  card: {',
        '    borderRadius: 16,',
        '    backgroundColor: "#111827",',
        '    borderWidth: 1,',
        '    borderColor: "#1f2937",',
        '    padding: 16,',
        '    gap: 10,',
        '  },',
        '  sectionLabel: { color: "#f8fafc", fontWeight: "700", fontSize: 16 },',
        '  itemText: { color: "#cbd5e1", fontSize: 14, lineHeight: 20 },',
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
      ].join('\n'),
    },
    changes: [
      existingFileCount > 0
        ? 'Applied new prompt iteration to local scaffold.'
        : 'Generated initial Expo project scaffold.',
      'Prepared runtime scripts and app configuration.',
      'Generated baseline React Native screen layout.',
    ],
    source: 'browser-template',
    model: 'browser-template-v1',
  };
}

const RorkStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [versions, setVersions] = useState([]);
  const [activeVersionId, setActiveVersionId] = useState('');
  const [activeFile, setActiveFile] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusNote, setStatusNote] = useState('Ready');
  const [error, setError] = useState('');

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeVersionId) || versions[0] || null,
    [versions, activeVersionId]
  );

  const activePreview = activeVersion?.preview || DEFAULT_PREVIEW;
  const activeFiles = activeVersion?.files || {};
  const filePaths = useMemo(() => asFileList(activeFiles), [activeFiles]);
  const currentFilePath = activeFile && activeFiles[activeFile] ? activeFile : filePaths[0] || '';
  const currentFileContent = currentFilePath ? activeFiles[currentFilePath] : '';

  const applyPayload = (payload, userPrompt) => {
    const now = Date.now();
    const files = payload?.files && typeof payload.files === 'object' ? payload.files : {};
    const projectName = safeProjectName(payload?.project?.name, `Build ${versions.length + 1}`);

    const version = {
      id: `version-${now}`,
      name: projectName,
      prompt: userPrompt,
      createdAt: now,
      project: payload?.project || { name: projectName, description: '' },
      preview: payload?.preview || DEFAULT_PREVIEW,
      files,
      changes: Array.isArray(payload?.changes) ? payload.changes : [],
      source: payload?.source || 'unknown',
      model: payload?.model || '',
    };

    const nextAssistantMessage = {
      id: `assistant-${now}`,
      role: 'assistant',
      content:
        payload?.assistantMessage ||
        `Generated ${Object.keys(files).length} files for ${projectName}.`,
      createdAt: now,
      changes: version.changes,
    };

    setVersions((previous) => [version, ...previous]);
    setActiveVersionId(version.id);
    setActiveFile(asFileList(files)[0] || '');
    setMessages((previous) => [...previous, nextAssistantMessage]);

    const runtimeLabel =
      version.source === 'openai'
        ? 'OpenAI mode'
        : version.source === 'browser-template'
          ? 'Browser template mode'
          : 'Template mode';
    const modelLabel = version.model ? ` (${version.model})` : '';
    setStatusNote(`${runtimeLabel}${modelLabel}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const userPrompt = prompt.trim();
    if (!userPrompt || isGenerating) {
      return;
    }

    const now = Date.now();
    const nextUserMessage = {
      id: `user-${now}`,
      role: 'user',
      content: userPrompt,
      createdAt: now,
    };

    const currentFiles = activeVersion?.files || {};

    setPrompt('');
    setError('');
    setMessages((previous) => [...previous, nextUserMessage]);
    setIsGenerating(true);
    setStatusNote('Generating app files...');

    try {
      const response = await fetch('/api/rork-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
          currentFiles,
          history: [...messages.slice(-8), nextUserMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Generation failed');
      }

      applyPayload(payload, userPrompt);
    } catch (requestError) {
      const fallbackPayload = buildBrowserFallback({ prompt: userPrompt, currentFiles });
      fallbackPayload.assistantMessage = `${fallbackPayload.assistantMessage} (API unavailable, local mode used)`;
      applyPayload(fallbackPayload, userPrompt);
      setError('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = (versionId) => {
    const candidate = versions.find((version) => version.id === versionId);
    if (!candidate) {
      return;
    }

    setActiveVersionId(candidate.id);
    setActiveFile(asFileList(candidate.files)[0] || '');
    setStatusNote(`Restored ${candidate.name}`);
    setMessages((previous) => [
      ...previous,
      {
        id: `assistant-restore-${Date.now()}`,
        role: 'assistant',
        content: `Restored version: ${candidate.name}. You can prompt again to continue iterating.`,
        createdAt: Date.now(),
      },
    ]);
  };

  const handleExportZip = async () => {
    if (!activeVersion || isExporting) {
      return;
    }

    setError('');
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const rootDir = slugify(activeVersion.project?.name || 'mobile-app');

      Object.entries(activeVersion.files || {}).forEach(([filePath, content]) => {
        if (typeof content === 'string') {
          zip.file(`${rootDir}/${filePath}`, content);
        }
      });

      zip.file(
        `${rootDir}/README.generated.md`,
        [
          `# ${activeVersion.project?.name || 'Generated App'}`,
          '',
          `Generated from prompt: ${activeVersion.prompt}`,
          '',
          '## Quick start',
          '',
          '```bash',
          'npm install',
          'npm run start',
          '```',
          '',
          'Use Expo Go or an emulator to preview the app.',
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

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                <Wand2 size={14} /> Rork-Style Builder
              </p>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
                Prompt to Mobile App Tool
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                Generates an Expo React Native project from prompts, keeps full version history,
                and exports source as a ZIP.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                {statusNote}
              </span>
              <button
                type="button"
                onClick={handleExportZip}
                disabled={!activeVersion || isExporting}
                className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                <Download size={16} />
                {isExporting ? 'Exporting...' : 'Export ZIP'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm lg:col-span-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-stone-700">
              <Bot size={16} /> Prompt + Iteration Chat
            </h2>

            <div className="mb-4 h-[280px] space-y-3 overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50 p-3">
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <article
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      isAssistant
                        ? 'border border-teal-200 bg-teal-50 text-teal-900'
                        : 'border border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] opacity-80">
                      {isAssistant ? 'Builder' : 'You'} · {formatTimestamp(message.createdAt)}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {Array.isArray(message.changes) && message.changes.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                        {message.changes.slice(0, 5).map((change, index) => (
                          <li key={`${message.id}-change-${index}`}>{change}</li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-stone-600" htmlFor="rork-prompt">
                Describe the app or next change
              </label>
              <textarea
                id="rork-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Build a food delivery app with live courier tracking and one-tap reorder."
                className="h-24 w-full resize-none rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-stone-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-stone-200"
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                {isGenerating ? 'Generating...' : 'Generate App Update'}
              </button>
            </form>

            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
                <History size={14} /> Versions
              </h3>
              <div className="max-h-[220px] space-y-2 overflow-y-auto">
                {versions.length === 0 && (
                  <p className="rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500">
                    No versions yet. Submit a prompt to generate your first build.
                  </p>
                )}
                {versions.map((version) => {
                  const isActive = activeVersion?.id === version.id;
                  return (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => handleRestore(version.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        isActive
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-stone-900">{version.name}</p>
                      <p className="truncate text-xs text-stone-500">{version.prompt}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-stone-500">
                        {formatTimestamp(version.createdAt)} · {Object.keys(version.files).length} files
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm lg:col-span-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-stone-700">
              <Smartphone size={16} /> Device Preview Blueprint
            </h2>

            <div className="mx-auto max-w-[280px] rounded-[2.5rem] border-8 border-stone-900 bg-stone-900 p-2 shadow-xl">
              <div className="rounded-[2rem] bg-stone-100 p-4" style={{ minHeight: 460 }}>
                <div
                  className="mb-4 rounded-2xl p-4 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${sanitizeHexColor(activePreview.primaryColor)}, #0f172a)`,
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-90">
                    {activePreview.appName || 'New App'}
                  </p>
                  <p className="mt-1 text-sm leading-snug opacity-95">{activePreview.tagline || 'Generated preview'}</p>
                </div>

                <div className="space-y-2">
                  {(activePreview.screens || []).slice(0, 3).map((screen, index) => (
                    <article
                      key={`${screen.name}-${index}`}
                      className="rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-700"
                    >
                      <p className="font-bold text-stone-900">{screen.name || `Screen ${index + 1}`}</p>
                      <p className="mt-1">{screen.purpose || 'Core workflow screen'}</p>
                      {Array.isArray(screen.elements) && screen.elements.length > 0 && (
                        <p className="mt-2 text-[11px] text-stone-500">
                          {screen.elements.slice(0, 3).join(' • ')}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-600">
                Run On Device (Expo)
              </h3>
              <pre className="overflow-x-auto text-xs text-stone-700">
{`npm install
npm run start
# press "s" for Expo Go QR`}
              </pre>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Mirrors Rork&apos;s core loop: prompt -&gt; generate -&gt; iterate -&gt; restore versions -&gt; export code.
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm lg:col-span-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-stone-700">
              <Code2 size={16} /> Project Files
            </h2>

            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50 p-2">
                  {filePaths.length === 0 && (
                    <p className="rounded-lg border border-dashed border-stone-300 px-2 py-1 text-xs text-stone-500">
                      No files yet
                    </p>
                  )}
                  {filePaths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => setActiveFile(path)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition ${
                        currentFilePath === path
                          ? 'bg-teal-100 text-teal-900'
                          : 'text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      <FileCode2 size={13} />
                      <span className="truncate">{path}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="rounded-2xl border border-stone-200 bg-stone-950 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-300">
                    {currentFilePath || 'No file selected'}
                  </p>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre text-xs leading-relaxed text-stone-100">
                    {currentFileContent || 'Generate a build to inspect source files.'}
                  </pre>
                </div>
              </div>
            </div>

            {activeVersion?.changes?.length > 0 && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-teal-900">
                  <Sparkles size={14} /> Latest change summary
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-xs text-teal-800">
                  {activeVersion.changes.slice(0, 7).map((item, index) => (
                    <li key={`change-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default RorkStudio;
