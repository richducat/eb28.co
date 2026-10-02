import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Free local inference: the llama.cpp server Hermes keeps running (Qwen models).
 * Mission Control uses it for all of its own background thinking (suggested replies,
 * one-line summaries, briefings) so none of that touches Claude/Grok/Codex usage.
 *
 * The endpoint comes from MC_LOCAL_LLM_URL or ~/.hermes/config.yaml (model.base_url).
 * The server's key is read at runtime from MC_LOCAL_LLM_KEY or the running
 * llama-server's own command line; it is never written anywhere.
 */
const DEFAULT_MODEL = process.env.MC_LOCAL_MODEL || 'Qwen3.6-35B-A3B-UD-Q4_K_M';

function hermesBaseUrl() {
  try {
    const yaml = fs.readFileSync(path.join(os.homedir(), '.hermes', 'config.yaml'), 'utf8');
    const block = yaml.slice(yaml.search(/^model:/m));
    const m = block.match(/^\s+base_url:\s*"?([^"\s#]+)"?/m);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

let cached = null;
export function endpoint() {
  if (cached && Date.now() - cached.at < 5 * 60e3) return cached;
  const url = (process.env.MC_LOCAL_LLM_URL || hermesBaseUrl() || 'http://127.0.0.1:18434/v1').replace(/\/$/, '');
  let key = process.env.MC_LOCAL_LLM_KEY || '';
  if (!key) {
    try {
      const port = new URL(url).port;
      const ps = execFileSync('/bin/ps', ['-axo', 'command='], { encoding: 'utf8', timeout: 3000 });
      const line = ps.split('\n').find((l) => /llama-server/.test(l) && l.includes(`--port ${port}`));
      const m = line && line.match(/--api-key\s+(\S+)/);
      if (m) key = m[1];
    } catch {
      /* no server */
    }
  }
  cached = { at: Date.now(), url, key };
  return cached;
}

/** Is the local model server up? */
export async function localAvailable() {
  const { url, key } = endpoint();
  try {
    const res = await fetch(`${url}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * One chat completion. Qwen's thinking is switched off (/no_think) because these are
 * short, practical tasks where speed matters. Returns the text, or '' on any failure.
 */
export async function localComplete(prompt, { system = '', maxTokens = 400, temperature = 0.2, model = DEFAULT_MODEL, timeoutMs = 90000 } = {}) {
  const { url, key } = endpoint();
  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        model,
        messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: `${prompt}\n/no_think` }],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  } catch {
    return '';
  }
}

/** Parse the first JSON object in a model reply. */
export function firstJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}
