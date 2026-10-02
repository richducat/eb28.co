import { execFile } from 'node:child_process';

/**
 * macOS Keychain, read by name only. The only module in Mission Control allowed to touch
 * secrets. There is deliberately no set(): Richard adds items in Terminal with
 *   security add-generic-password -U -s co.eb28.missioncontrol.trading -a <name> -w
 * (the trailing -w prompts, so the value never lands in shell history).
 * Values are returned to the caller in memory only: never cached, logged or put in errors.
 */
export const SERVICE = 'co.eb28.missioncontrol.trading';
export const NAMES = ['simmer-api-key', 'polygon-rpc-url', 'solana-rpc-url', 'helius-api-key'];
const NAME_RE = /^[a-z0-9-]{3,48}$/;

let runner = (args) =>
  new Promise((resolve) => {
    execFile('/usr/bin/security', args, { timeout: 5000 }, (err, stdout) => resolve({ code: err ? err.code || 1 : 0, stdout: String(stdout || '') }));
  });
/** Tests swap the runner so no real Keychain is touched. */
export function _setRunner(fn) { runner = fn; }

function check(name) {
  if (!NAME_RE.test(String(name)) || !NAMES.includes(name)) throw new Error(`Keychain item "${String(name).slice(0, 48)}" is not on the allow-list`);
}

export async function has(name) {
  check(name);
  const res = await runner(['find-generic-password', '-s', SERVICE, '-a', name]);
  return res.code === 0;
}

export async function get(name) {
  check(name);
  const res = await runner(['find-generic-password', '-s', SERVICE, '-a', name, '-w']);
  if (res.code !== 0) throw new Error(`Keychain item "${name}" not found`);
  return res.stdout.trim();
}

export async function status() {
  const out = [];
  for (const name of NAMES) out.push({ name, present: await has(name).catch(() => false), addCommand: `security add-generic-password -U -s ${SERVICE} -a ${name} -w` });
  return out;
}
