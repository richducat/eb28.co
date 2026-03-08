import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const COMPLETION_KEYWORDS = /#completion|\[completion\]|\b(completed|completion|shipped|implemented|deployed|fixed|resolved|delivered|merged|launched|published|added|updated)\b/i;
const WARNING_KEYWORDS = /\b(error|failed|failure|warning|warn|blocked|lag|issue|urgent)\b/i;
const CRON_KEYWORDS = /\b(cron|schedule|scheduled|automation|job\s*id|jobId|run\s+history)\b/i;
const HEADING_COMPLETION_KEYWORDS = /\b(what\s+shipped|completion|completed|deliverable|definition\s+of\s+done|done)\b/i;
const DATE_MEMORY_FILE_REGEX = /^\d{4}-\d{2}-\d{2}(?:-\d{2,4})?\.md$/i;
const SEARCH_CACHE_TTL_MS = 60_000;
const SEARCH_FILE_LIMIT = 220;
const SEARCH_TEXT_LIMIT = 200_000;

let searchCache = {
    expiresAt: 0,
    data: null,
};

function fileNameForDisplay(filePath) {
    return filePath.split(path.sep).slice(-2).join('/');
}

function normalizeWhitespace(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim();
}

function classifyActivityType(text, explicitType = '') {
    const normalizedExplicit = String(explicitType || '').toLowerCase();
    if (['success', 'warning', 'cron', 'info'].includes(normalizedExplicit)) {
        return normalizedExplicit;
    }

    const normalizedText = String(text || '').toLowerCase();
    if (CRON_KEYWORDS.test(normalizedText)) {
        return 'cron';
    }
    if (WARNING_KEYWORDS.test(normalizedText)) {
        return 'warning';
    }
    if (COMPLETION_KEYWORDS.test(normalizedText)) {
        return 'success';
    }
    return 'info';
}

function sanitizeActivityMessage(text) {
    return normalizeWhitespace(
        String(text || '')
            .replace(/^[-*]\s*/, '')
            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
            .replace(/`/g, '')
    );
}

async function pathExists(targetPath) {
    if (!targetPath) {
        return false;
    }

    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function dirExists(targetPath) {
    if (!targetPath) {
        return false;
    }

    try {
        const stat = await fs.stat(targetPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

function resolveCandidateWorkspacePaths() {
    const homedir = os.homedir();
    return [
        process.env.COMMAND_CENTER_WORKSPACE,
        process.env.OPENCLAW_WORKSPACE,
        process.env.OPENCLAW_MEMORY_ROOT,
        '/Users/ducatllm/.openclaw/workspace',
        path.join(homedir, '.openclaw', 'workspace'),
        path.join(homedir, '.openclaw-dev', 'workspace'),
        path.join(homedir, '.openclaw-office', 'workspace'),
        path.join(homedir, 'Desktop', 'clawd'),
        path.join(homedir, 'GITHUB', 'clawd'),
        path.join(homedir, 'repos', 'clawd'),
    ].filter(Boolean);
}

export async function resolveWorkspaceContext() {
    const seen = new Set();
    const candidates = resolveCandidateWorkspacePaths().filter((candidate) => {
        const normalized = path.resolve(candidate);
        if (seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });

    for (const candidate of candidates) {
        const workspacePath = path.resolve(candidate);
        const memoryDir = path.join(workspacePath, 'memory');

        const hasMemoryDir = await dirExists(memoryDir);
        const hasMemoryFile = await pathExists(path.join(workspacePath, 'MEMORY.md'));

        if (hasMemoryDir || hasMemoryFile) {
            return {
                workspacePath,
                memoryDir,
            };
        }
    }

    const fallbackWorkspacePath = path.resolve(candidates[0] || process.cwd());
    return {
        workspacePath: fallbackWorkspacePath,
        memoryDir: path.join(fallbackWorkspacePath, 'memory'),
    };
}

function extractDateFromMemoryFileName(fileName) {
    const dateMatch = String(fileName).match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
        return null;
    }

    const isoCandidate = `${dateMatch[1]}T12:00:00Z`;
    const date = new Date(isoCandidate);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function normalizeActivityItem(item, fallbackId) {
    if (typeof item === 'string') {
        const message = sanitizeActivityMessage(item);
        if (!message) {
            return null;
        }

        return {
            id: fallbackId,
            timestamp: null,
            message,
            type: classifyActivityType(message),
            status: 'success',
            source: 'completed-tasks.json',
        };
    }

    if (!item || typeof item !== 'object') {
        return null;
    }

    const message = sanitizeActivityMessage(
        item.message ||
        item.text ||
        item.title ||
        item.task ||
        item.summary ||
        item.description ||
        ''
    );

    if (!message) {
        return null;
    }

    const timestamp = item.timestamp || item.completedAt || item.date || item.time || null;
    const status = String(item.status || item.state || 'success').toLowerCase();

    return {
        id: String(item.id || item.uuid || item.key || fallbackId),
        timestamp,
        message,
        type: classifyActivityType(message, item.type || item.category || ''),
        status,
        source: item.source || 'completed-tasks.json',
    };
}

function normalizeCompletedTaskPayload(payload) {
    let rawItems = [];

    if (Array.isArray(payload)) {
        rawItems = payload;
    } else if (payload && typeof payload === 'object') {
        const possibleArrays = [
            payload.items,
            payload.tasks,
            payload.completions,
            payload.completed,
            payload.data,
            payload.results,
        ];

        for (const candidate of possibleArrays) {
            if (Array.isArray(candidate)) {
                rawItems = candidate;
                break;
            }
        }
    }

    return rawItems
        .map((item, index) => normalizeActivityItem(item, `completed-task-${index}`))
        .filter(Boolean);
}

async function readJsonFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
}

async function getCompletedTaskItems(memoryDir) {
    const completedTasksPath = path.join(memoryDir, 'completed-tasks.json');
    if (!(await pathExists(completedTasksPath))) {
        return [];
    }

    try {
        const payload = await readJsonFile(completedTasksPath);
        return normalizeCompletedTaskPayload(payload).map((entry) => ({
            ...entry,
            source: 'memory/completed-tasks.json',
        }));
    } catch (error) {
        return [{
            id: 'completed-tasks-read-error',
            timestamp: null,
            message: `Unable to parse completed-tasks.json: ${error.message}`,
            type: 'warning',
            status: 'warning',
            source: 'memory/completed-tasks.json',
        }];
    }
}

async function parseCompletionEntriesFromMarkdown(memoryDir, limit = 120) {
    if (!(await dirExists(memoryDir))) {
        return [];
    }

    const fileEntries = await fs.readdir(memoryDir, { withFileTypes: true });
    const candidateFiles = fileEntries
        .filter((entry) => entry.isFile() && DATE_MEMORY_FILE_REGEX.test(entry.name))
        .map((entry) => entry.name)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 50);

    const activities = [];

    for (const fileName of candidateFiles) {
        if (activities.length >= limit) {
            break;
        }

        const absolutePath = path.join(memoryDir, fileName);
        let content;

        try {
            content = await fs.readFile(absolutePath, 'utf8');
        } catch {
            continue;
        }

        const lines = content.split(/\r?\n/);
        let inCompletionSection = false;
        const timestamp = extractDateFromMemoryFileName(fileName);

        for (let index = 0; index < lines.length; index += 1) {
            const rawLine = lines[index];
            const headingMatch = rawLine.match(/^#{2,6}\s+(.*)$/);

            if (headingMatch) {
                inCompletionSection = HEADING_COMPLETION_KEYWORDS.test(headingMatch[1]);
                continue;
            }

            const bulletMatch = rawLine.match(/^\s*[-*]\s+(.*)$/);
            if (!bulletMatch) {
                continue;
            }

            const message = sanitizeActivityMessage(bulletMatch[1]);
            if (!message) {
                continue;
            }

            const isCompletion = inCompletionSection || COMPLETION_KEYWORDS.test(message) || CRON_KEYWORDS.test(message);
            if (!isCompletion) {
                continue;
            }

            activities.push({
                id: `${fileName}:${index + 1}`,
                timestamp,
                message,
                type: classifyActivityType(message),
                status: 'success',
                source: `memory/${fileName}`,
            });

            if (activities.length >= limit) {
                break;
            }
        }
    }

    return activities;
}

function sortActivityEntries(entries) {
    return entries
        .slice()
        .sort((left, right) => {
            const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
            const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
            return rightTime - leftTime;
        });
}

export async function getActivityFeed({ limit = 60 } = {}) {
    const maxEntries = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 250)) : 60;
    const workspace = await resolveWorkspaceContext();

    const completedTaskEntries = await getCompletedTaskItems(workspace.memoryDir);
    let source = 'memory/completed-tasks.json';
    let items = completedTaskEntries;

    if (!items.length) {
        source = 'memory/*.md';
        items = await parseCompletionEntriesFromMarkdown(workspace.memoryDir, maxEntries * 2);
    }

    const sorted = sortActivityEntries(items).slice(0, maxEntries);

    return {
        source,
        workspace: workspace.workspacePath,
        count: sorted.length,
        items: sorted,
    };
}

function extractJsonPayload(outputText) {
    if (!outputText || typeof outputText !== 'string') {
        return null;
    }

    try {
        return JSON.parse(outputText);
    } catch {
        // continue
    }

    const firstBrace = outputText.indexOf('{');
    const firstBracket = outputText.indexOf('[');
    const starts = [firstBrace, firstBracket].filter((value) => value >= 0);

    if (!starts.length) {
        return null;
    }

    const start = Math.min(...starts);
    const possibleChunk = outputText.slice(start).trim();

    try {
        return JSON.parse(possibleChunk);
    } catch {
        return null;
    }
}

let openclawBinCache = null;

async function resolveOpenclawBin() {
    if (openclawBinCache) {
        return openclawBinCache;
    }

    const candidates = [
        process.env.OPENCLAW_BIN,
        '/opt/homebrew/bin/openclaw',
        '/usr/local/bin/openclaw',
        '/usr/bin/openclaw',
        'openclaw',
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (candidate === 'openclaw') {
            openclawBinCache = candidate;
            return candidate;
        }

        if (await pathExists(candidate)) {
            openclawBinCache = candidate;
            return candidate;
        }
    }

    openclawBinCache = 'openclaw';
    return openclawBinCache;
}

async function runCronCommand(args, timeoutMs = 30_000) {
    const openclawBin = await resolveOpenclawBin();

    try {
        const { stdout, stderr } = await execFileAsync(openclawBin, ['cron', ...args], {
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024,
        });

        return {
            ok: true,
            stdout: String(stdout || '').trim(),
            stderr: String(stderr || '').trim(),
            exitCode: 0,
        };
    } catch (error) {
        return {
            ok: false,
            stdout: String(error.stdout || '').trim(),
            stderr: String(error.stderr || error.message || '').trim(),
            exitCode: Number.isInteger(error.code) ? error.code : 1,
        };
    }
}

function normalizeCronJobs(payload) {
    let rawJobs = [];

    if (Array.isArray(payload)) {
        rawJobs = payload;
    } else if (payload && typeof payload === 'object') {
        const container = [
            payload.jobs,
            payload.items,
            payload.data,
            payload.results,
            payload.cron,
            payload.list,
        ].find(Array.isArray);

        if (container) {
            rawJobs = container;
        }
    }

    return rawJobs
        .filter((job) => job && typeof job === 'object')
        .map((job, index) => {
            const enabled = typeof job.enabled === 'boolean'
                ? job.enabled
                : job.disabled === true
                    ? false
                    : !['disabled', 'paused'].includes(String(job.status || '').toLowerCase());

            const id = String(job.id || job.jobId || job.uuid || `job-${index}`);

            return {
                id,
                name: String(job.name || job.title || job.description || id),
                schedule: String(job.schedule || job.cron || job.expression || job.rrule || 'n/a'),
                enabled,
                status: String(job.status || (enabled ? 'active' : 'paused')),
                lastRun: job.lastRun || job.lastRunAt || job.lastRunTime || null,
                nextRun: job.nextRun || job.nextRunAt || job.nextRunTime || null,
                command: job.command || job.prompt || job.task || '',
            };
        });
}

function parseCronSchedulerStatus(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    return {
        status: payload.status || payload.state || null,
        running: typeof payload.running === 'boolean' ? payload.running : null,
        heartbeatAt: payload.heartbeatAt || payload.lastHeartbeatAt || payload.updatedAt || null,
        raw: payload,
    };
}

export async function getCronStatus() {
    const listResult = await runCronCommand(['list', '--all', '--json']);
    const statusResult = await runCronCommand(['status', '--json']);

    const listPayload = extractJsonPayload(listResult.stdout);
    const statusPayload = extractJsonPayload(statusResult.stdout);

    const jobs = normalizeCronJobs(listPayload);
    const scheduler = parseCronSchedulerStatus(statusPayload);
    const errors = [];

    if (!listResult.ok) {
        errors.push(listResult.stderr || listResult.stdout || 'Failed to load cron list');
    }

    if (!statusResult.ok) {
        errors.push(statusResult.stderr || statusResult.stdout || 'Failed to load cron scheduler status');
    }

    return {
        jobs,
        scheduler,
        errors,
    };
}

const CRON_ACTION_MAP = {
    run: ['run'],
    pause: ['disable'],
    resume: ['enable'],
};

export async function runCronAction({ action, id }) {
    const normalizedAction = String(action || '').toLowerCase();
    const commandParts = CRON_ACTION_MAP[normalizedAction];

    if (!commandParts) {
        return {
            ok: false,
            error: `Unsupported action "${action}"`,
        };
    }

    if (!id) {
        return {
            ok: false,
            error: 'Cron action requires an id',
        };
    }

    const result = await runCronCommand([...commandParts, String(id)]);

    return {
        ok: result.ok,
        action: normalizedAction,
        id: String(id),
        output: result.stdout || result.stderr || '',
        error: result.ok ? null : (result.stderr || result.stdout || 'Command failed'),
    };
}

async function walkSearchFiles(rootDir, options, state = { count: 0 }, depth = 0) {
    if (!rootDir || depth > options.maxDepth || state.count >= options.maxFiles) {
        return [];
    }

    let entries;
    try {
        entries = await fs.readdir(rootDir, { withFileTypes: true });
    } catch {
        return [];
    }

    const output = [];

    for (const entry of entries) {
        if (state.count >= options.maxFiles) {
            break;
        }

        if (entry.name.startsWith('.')) {
            continue;
        }

        const absolutePath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            const nested = await walkSearchFiles(absolutePath, options, state, depth + 1);
            output.push(...nested);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const isMarkdown = entry.name.toLowerCase().endsWith('.md');
        const isTodoJson = /^todo.*\.json$/i.test(entry.name);

        if (!isMarkdown && !isTodoJson) {
            continue;
        }

        state.count += 1;
        output.push(absolutePath);
    }

    return output;
}

function buildSearchSnippet(rawText, terms) {
    const text = normalizeWhitespace(rawText).slice(0, SEARCH_TEXT_LIMIT);
    if (!text) {
        return '';
    }

    const lowerText = text.toLowerCase();
    const firstMatch = terms
        .map((term) => lowerText.indexOf(term))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];

    if (firstMatch === undefined) {
        return text.slice(0, 220);
    }

    const start = Math.max(0, firstMatch - 90);
    const end = Math.min(text.length, firstMatch + 180);
    const snippet = text.slice(start, end);

    return `${start > 0 ? '...' : ''}${snippet}${end < text.length ? '...' : ''}`;
}

function scoreSearchDocument(doc, terms) {
    const lowerTitle = doc.title.toLowerCase();
    const lowerText = doc.textLower;
    let score = 0;

    for (const term of terms) {
        const firstIndex = lowerText.indexOf(term);
        if (firstIndex < 0) {
            return 0;
        }

        if (lowerTitle.includes(term)) {
            score += 8;
        }

        score += 3;
        score += Math.max(0, 4 - Math.floor(firstIndex / 400));
    }

    return score;
}

async function buildSearchIndex(force = false) {
    const now = Date.now();
    if (!force && searchCache.data && searchCache.expiresAt > now) {
        return searchCache.data;
    }

    const workspace = await resolveWorkspaceContext();
    const files = new Set();

    const memoryRoot = workspace.memoryDir;

    if (await pathExists(path.join(workspace.workspacePath, 'MEMORY.md'))) {
        files.add(path.join(workspace.workspacePath, 'MEMORY.md'));
    }

    if (await dirExists(memoryRoot)) {
        const memoryFiles = await walkSearchFiles(memoryRoot, {
            maxDepth: 4,
            maxFiles: SEARCH_FILE_LIMIT,
        });
        for (const filePath of memoryFiles) {
            files.add(filePath);
        }
    }

    const workspaceFiles = await walkSearchFiles(workspace.workspacePath, {
        maxDepth: 2,
        maxFiles: 40,
    });
    for (const filePath of workspaceFiles) {
        files.add(filePath);
    }

    const docs = [];

    for (const filePath of files) {
        try {
            const stat = await fs.stat(filePath);
            if (!stat.isFile() || stat.size > 1_000_000) {
                continue;
            }

            const rawText = await fs.readFile(filePath, 'utf8');
            const text = rawText.slice(0, SEARCH_TEXT_LIMIT);
            if (!text.trim()) {
                continue;
            }

            docs.push({
                id: filePath,
                path: filePath,
                title: path.basename(filePath),
                source: fileNameForDisplay(filePath),
                text,
                textLower: text.toLowerCase(),
            });
        } catch {
            continue;
        }
    }

    const index = {
        workspace: workspace.workspacePath,
        builtAt: new Date().toISOString(),
        docs,
    };

    searchCache = {
        expiresAt: now + SEARCH_CACHE_TTL_MS,
        data: index,
    };

    return index;
}

export async function searchWorkspace(query, { limit = 20 } = {}) {
    const trimmedQuery = String(query || '').trim();
    if (!trimmedQuery) {
        const index = await buildSearchIndex(false);
        return {
            query: '',
            workspace: index.workspace,
            indexedFiles: index.docs.length,
            items: [],
        };
    }

    const terms = trimmedQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8);

    const index = await buildSearchIndex(false);
    const maxItems = Number.isFinite(limit) ? Math.max(1, Math.min(Number(limit), 50)) : 20;

    const results = [];

    for (const doc of index.docs) {
        const score = scoreSearchDocument(doc, terms);
        if (score <= 0) {
            continue;
        }

        results.push({
            id: doc.id,
            title: doc.title,
            source: doc.source,
            snippet: buildSearchSnippet(doc.text, terms),
            score,
        });
    }

    results.sort((left, right) => right.score - left.score);

    return {
        query: trimmedQuery,
        workspace: index.workspace,
        indexedFiles: index.docs.length,
        items: results.slice(0, maxItems),
    };
}
