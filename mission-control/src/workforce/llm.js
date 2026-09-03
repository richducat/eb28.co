import fs from 'node:fs';
import os from 'node:os';
import { store } from '../store.js';

/**
 * Optional Claude access for the workforce. Everything in the app works without it;
 * with it, agents write better one-line summaries and briefings.
 *
 * Credentials come from the SDK's normal resolution (ANTHROPIC_API_KEY, or an
 * `ant auth login` profile). Set MC_LLM=off to force heuristics only.
 */
const MODEL = process.env.MC_MODEL || 'claude-opus-5';
let clientPromise = null;

async function client() {
  if (process.env.MC_LLM === 'off') return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod = await import('@anthropic-ai/sdk');
        const Anthropic = mod.default || mod.Anthropic;
        if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN && !process.env.ANTHROPIC_PROFILE && !hasProfile()) return null;
        return new Anthropic();
      } catch {
        return null;
      }
    })();
  }
  return clientPromise;
}

function hasProfile() {
  return fs.existsSync(`${os.homedir()}/.config/anthropic`);
}

export async function available() {
  return Boolean(await client());
}

/**
 * Ask Claude for a short answer. Cached by `key` so the same question is never billed twice.
 * Returns null when Claude is unavailable or the call fails, so callers fall back to heuristics.
 */
export async function ask({ key, system, prompt, maxTokens = 600, effort = 'low' }) {
  const cache = store.get('llm-cache', {});
  if (key && cache[key]) return cache[key].text;
  const c = await client();
  if (!c) return null;
  try {
    const response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      output_config: { effort },
      messages: [{ role: 'user', content: prompt }],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (key) {
      store.update('llm-cache', {}, (all) => {
        const next = { ...all, [key]: { text, at: new Date().toISOString() } };
        const keys = Object.keys(next);
        if (keys.length > 800) for (const k of keys.slice(0, keys.length - 800)) delete next[k];
        return next;
      });
    }
    return text;
  } catch (err) {
    store.append('workforce-log', { level: 'warn', agent: 'llm', message: `Claude call failed: ${err.message}` });
    return null;
  }
}

export { MODEL };
