#!/usr/bin/env node

import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDraftDir = path.join(repoRoot, 'output', 'lead-ops', 'drafts');
const defaultStatePath = path.join(repoRoot, 'output', 'lead-ops', 'eb28-32940-outreach-state.json');
const defaultSendLogPath = path.join(repoRoot, 'output', 'lead-ops', '32940-send-log.json');
const requiredSender = 'social@eb28.co';

function parseArgs(argv) {
  const args = {
    draftDir: defaultDraftDir,
    statePath: defaultStatePath,
    sendLogPath: defaultSendLogPath,
    dryRun: true,
    send: false,
    preflightSmtp: false,
    limit: Number.POSITIVE_INFINITY,
    offset: 0,
    updateState: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];

    if (arg === '--send') {
      args.send = true;
      args.dryRun = false;
    } else if (arg === '--preflight-smtp') {
      args.preflightSmtp = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.send = false;
    } else if (arg === '--draft-dir') {
      args.draftDir = path.resolve(repoRoot, next());
    } else if (arg === '--state') {
      args.statePath = path.resolve(repoRoot, next());
    } else if (arg === '--send-log') {
      args.sendLogPath = path.resolve(repoRoot, next());
    } else if (arg === '--limit') {
      args.limit = Number.parseInt(next(), 10);
    } else if (arg === '--offset') {
      args.offset = Number.parseInt(next(), 10);
    } else if (arg === '--no-state') {
      args.updateState = false;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.limit !== Number.POSITIVE_INFINITY && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }
  if (!Number.isFinite(args.offset) || args.offset < 0) {
    throw new Error('--offset must be zero or a positive integer');
  }

  return args;
}

function usage() {
  return `Usage:
  npm run leadops:send-drafts:32940 -- --dry-run --limit 5
  SMTP_HOST=mail.privateemail.com SMTP_PORT=465 SMTP_SECURE=true SMTP_USER=social@eb28.co SMTP_PASS_KEYCHAIN_SERVICE='EB28 social@eb28.co SMTP' npm run leadops:preflight-sender:32940
  SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... npm run leadops:send-drafts:32940 -- --send --limit 10

Environment:
  SMTP_HOST                  Required for --send and --preflight-smtp.
  SMTP_PORT                  Defaults to 587, or 465 when SMTP_SECURE=true.
  SMTP_SECURE                Set true for implicit TLS on port 465.
  SMTP_USER                  Optional SMTP auth username.
  SMTP_PASS                  Optional SMTP auth password.
  SMTP_PASS_KEYCHAIN_SERVICE Optional macOS Keychain generic password service.
  SMTP_PASS_KEYCHAIN_ACCOUNT Optional Keychain account, defaults to SMTP_USER.
  SMTP_EHLO_NAME             Optional EHLO name, defaults to eb28.co.

The runner refuses drafts unless From and Reply-To are both social@eb28.co.`;
}

function parseHeaders(raw) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const splitIndex = normalized.indexOf('\n\n');
  if (splitIndex === -1) {
    throw new Error('Draft is missing a header/body separator');
  }

  const headerText = normalized.slice(0, splitIndex);
  const body = normalized.slice(splitIndex + 2);
  const headers = new Map();
  let current = null;

  for (const line of headerText.split('\n')) {
    if (/^[ \t]/.test(line) && current) {
      headers.set(current, `${headers.get(current)} ${line.trim()}`);
      continue;
    }

    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    current = line.slice(0, separator).toLowerCase();
    headers.set(current, line.slice(separator + 1).trim());
  }

  return { headers, body };
}

function extractEmails(value = '') {
  return [...String(value).matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0]);
}

function parseDraft(filePath, raw) {
  const { headers, body } = parseHeaders(raw);
  const to = extractEmails(headers.get('to'));
  const from = extractEmails(headers.get('from'));
  const replyTo = extractEmails(headers.get('reply-to'));
  const subject = headers.get('subject') || '';
  const conceptUrl = headers.get('x-eb28-concept') || '';
  const priority = path.basename(filePath).match(/^(\d+)-/)?.[1] || '';
  const business = path.basename(filePath).replace(/^\d+-/, '').replace(/\.eml$/i, '').replace(/-/g, ' ');

  if (!to.length) {
    throw new Error(`${filePath} is missing a To email`);
  }
  if (!from.map((email) => email.toLowerCase()).includes(requiredSender)) {
    throw new Error(`${filePath} From must include ${requiredSender}`);
  }
  if (!replyTo.map((email) => email.toLowerCase()).includes(requiredSender)) {
    throw new Error(`${filePath} Reply-To must include ${requiredSender}`);
  }
  if (!conceptUrl.startsWith('https://eb28.co/32940/')) {
    throw new Error(`${filePath} is missing a valid X-EB28-Concept header`);
  }
  if (!body.includes('reply "no thanks"')) {
    throw new Error(`${filePath} is missing the opt-out line`);
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    priority,
    business,
    to,
    from: requiredSender,
    replyTo: requiredSender,
    subject,
    conceptUrl,
    raw,
  };
}

async function loadDrafts(draftDir, offset, limit) {
  const entries = await fs.readdir(draftDir);
  const files = entries
    .filter((entry) => entry.endsWith('.eml'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .slice(offset, offset + limit)
    .map((entry) => path.join(draftDir, entry));

  return Promise.all(files.map(async (filePath) => parseDraft(filePath, await fs.readFile(filePath, 'utf8'))));
}

function readKeychainPassword(service, account) {
  try {
    return execFileSync(
      'security',
      ['find-generic-password', '-s', service, '-a', account, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  } catch {
    throw new Error(`Unable to read SMTP password from macOS Keychain service "${service}" account "${account}"`);
  }
}

function smtpConfigFromEnv() {
  const secure = /^true|1|yes$/i.test(process.env.SMTP_SECURE || '');
  const port = Number.parseInt(process.env.SMTP_PORT || (secure ? '465' : '587'), 10);
  const user = process.env.SMTP_USER;
  const keychainService = process.env.SMTP_PASS_KEYCHAIN_SERVICE;
  const keychainAccount = process.env.SMTP_PASS_KEYCHAIN_ACCOUNT || user;
  let pass = process.env.SMTP_PASS;
  let passSource = pass ? 'env:SMTP_PASS' : '';

  if (!pass && keychainService) {
    if (!keychainAccount) {
      throw new Error('SMTP_PASS_KEYCHAIN_ACCOUNT or SMTP_USER is required when SMTP_PASS_KEYCHAIN_SERVICE is set');
    }
    pass = readKeychainPassword(keychainService, keychainAccount);
    passSource = `keychain:${keychainService}`;
  }

  return {
    host: process.env.SMTP_HOST,
    port,
    secure,
    user,
    pass,
    passSource,
    ehloName: process.env.SMTP_EHLO_NAME || 'eb28.co',
  };
}

function requireSmtpConfig(config, action = '--send') {
  if (!config.host) {
    throw new Error(`SMTP_HOST is required for ${action}`);
  }
  if (!Number.isFinite(config.port) || config.port < 1) {
    throw new Error('SMTP_PORT must be a valid port');
  }
  if ((config.user && !config.pass) || (!config.user && config.pass)) {
    throw new Error('SMTP_USER and SMTP_PASS must be provided together');
  }
}

function redactSmtpError(message, config) {
  let redacted = String(message || '');
  if (config.pass) {
    redacted = redacted.replaceAll(config.pass, '[redacted-password]');
  }
  return redacted.replace(/[A-Za-z0-9+/=]{24,}/g, '[redacted-token]');
}

function normalizeForSmtp(raw) {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .split('\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}

class SmtpClient {
  constructor(config) {
    this.config = config;
    this.socket = null;
    this.buffer = '';
  }

  async connect() {
    this.socket = this.config.secure
      ? tls.connect({ host: this.config.host, port: this.config.port, servername: this.config.host })
      : net.connect({ host: this.config.host, port: this.config.port });
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk) => {
      this.buffer += chunk;
    });
    await this.read(220);
    await this.ehlo();

    if (!this.config.secure) {
      await this.command('STARTTLS', 220);
      this.socket = tls.connect({ socket: this.socket, servername: this.config.host });
      this.socket.setEncoding('utf8');
      this.buffer = '';
      this.socket.on('data', (chunk) => {
        this.buffer += chunk;
      });
      await this.ehlo();
    }

    if (this.config.user) {
      const token = Buffer.from(`\0${this.config.user}\0${this.config.pass}`).toString('base64');
      await this.command(`AUTH PLAIN ${token}`, 235);
    }
  }

  async ehlo() {
    await this.command(`EHLO ${this.config.ehloName}`, 250);
  }

  async sendDraft(draft) {
    await this.command(`MAIL FROM:<${draft.from}>`, 250);
    for (const recipient of draft.to) {
      await this.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await this.command('DATA', 354);
    this.socket.write(`${normalizeForSmtp(draft.raw)}\r\n.\r\n`);
    await this.read(250);
  }

  async quit() {
    if (!this.socket || this.socket.destroyed) {
      return;
    }
    try {
      await this.command('QUIT', 221);
    } finally {
      this.socket.end();
    }
  }

  command(command, expected) {
    this.socket.write(`${command}\r\n`);
    return this.read(expected);
  }

  read(expected) {
    const expectedCodes = Array.isArray(expected) ? expected : [expected];
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        const lines = this.buffer.split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1] || '';
        const code = Number.parseInt(last.slice(0, 3), 10);
        const complete = /^\d{3} /.test(last);

        if (complete && Number.isFinite(code)) {
          const response = this.buffer.trimEnd();
          this.buffer = '';
          clearInterval(timer);
          if (expectedCodes.includes(code)) {
            resolve(response);
          } else {
            reject(new Error(`SMTP expected ${expectedCodes.join('/')} but received ${response}`));
          }
        } else if (Date.now() - startedAt > 30000) {
          clearInterval(timer);
          reject(new Error(`SMTP response timed out waiting for ${expectedCodes.join('/')}`));
        }
      }, 25);
    });
  }
}

async function readJsonObject(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mergeState(state, sent, sentAt) {
  for (const draft of sent) {
    if (!draft.priority) {
      continue;
    }
    state[String(Number.parseInt(draft.priority, 10))] = {
      status: 'contacted',
      evidence: `SMTP sent outreach draft ${draft.fileName} to ${draft.to.join(', ')} for ${draft.conceptUrl}. This is contact evidence only, not booked-call evidence.`,
      source: 'scripts/send-32940-drafts.mjs',
      datetime: sentAt,
    };
  }
  return state;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const drafts = await loadDrafts(args.draftDir, args.offset, args.limit);
  const uniqueRecipients = new Set(drafts.flatMap((draft) => draft.to.map((email) => email.toLowerCase())));
  const duplicateRecipients = drafts.length - uniqueRecipients.size;

  console.log(JSON.stringify({
    mode: args.preflightSmtp ? 'smtp-preflight' : args.send ? 'send' : 'dry-run',
    draftDir: args.draftDir,
    drafts: drafts.length,
    uniqueRecipients: uniqueRecipients.size,
    duplicateRecipients,
    firstDraft: drafts[0]?.fileName || null,
    lastDraft: drafts[drafts.length - 1]?.fileName || null,
    sender: requiredSender,
    replyTo: requiredSender,
  }, null, 2));

  if (args.preflightSmtp) {
    const smtpConfig = smtpConfigFromEnv();
    requireSmtpConfig(smtpConfig, '--preflight-smtp');
    const client = new SmtpClient(smtpConfig);

    try {
      await client.connect();
      console.log(JSON.stringify({
        smtpPreflight: 'passed',
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.user || null,
        passwordSource: smtpConfig.passSource || null,
      }, null, 2));
    } catch (error) {
      console.log(JSON.stringify({
        smtpPreflight: 'failed',
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.user || null,
        passwordSource: smtpConfig.passSource || null,
        error: redactSmtpError(error.message, smtpConfig),
      }, null, 2));
      process.exitCode = 1;
    } finally {
      await client.quit();
    }
    return;
  }

  if (!args.send) {
    return;
  }

  const smtpConfig = smtpConfigFromEnv();
  requireSmtpConfig(smtpConfig, '--send');

  const client = new SmtpClient(smtpConfig);
  const sent = [];
  const failed = [];
  const sentAt = new Date().toISOString();

  try {
    await client.connect();
    for (const draft of drafts) {
      try {
        await client.sendDraft(draft);
        sent.push(draft);
        console.log(`sent ${draft.fileName} -> ${draft.to.join(', ')}`);
      } catch (error) {
        failed.push({ draft, error: error.message });
        console.error(`failed ${draft.fileName}: ${error.message}`);
      }
    }
  } finally {
    await client.quit();
  }

  const sendLog = await readJsonObject(args.sendLogPath);
  sendLog.generatedAt = new Date().toISOString();
  sendLog.sender = requiredSender;
  sendLog.lastRun = {
    sentAt,
    attempted: drafts.length,
    sent: sent.length,
    failed: failed.length,
    files: sent.map((draft) => draft.fileName),
    failures: failed.map(({ draft, error }) => ({ file: draft.fileName, to: draft.to, error })),
  };
  sendLog.runs = Array.isArray(sendLog.runs) ? sendLog.runs : [];
  sendLog.runs.push(sendLog.lastRun);
  await writeJson(args.sendLogPath, sendLog);

  if (args.updateState && sent.length) {
    const state = mergeState(await readJsonObject(args.statePath), sent, sentAt);
    await writeJson(args.statePath, state);
  }

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
