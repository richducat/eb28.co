import { execFile } from 'node:child_process';
import os from 'node:os';

/**
 * Desktop notification without Electron (web mode / CLI). Electron mode uses the
 * native Notification API in electron/main.cjs instead. Failures are silent.
 */
export function notify({ title, body }) {
  const platform = os.platform();
  const safe = (s) => String(s || '').replace(/["\\]/g, ' ').slice(0, 200);
  if (platform === 'darwin') {
    execFile('osascript', ['-e', `display notification "${safe(body)}" with title "${safe(title)}"`], () => {});
  } else if (platform === 'linux') {
    execFile('notify-send', [safe(title), safe(body)], () => {});
  } else if (platform === 'win32') {
    execFile('powershell', ['-Command', `[console]::beep(800,200)`], () => {});
  }
}

export function messageFor(event) {
  if (event.type === 'job:transition') {
    const what = { needs_you: 'needs you', done: 'is done', failed: 'failed' }[event.to] || event.to;
    return { title: `${event.title.slice(0, 60)} ${what}`, body: event.reason || event.source };
  }
  if (event.type === 'proposal:new') return { title: 'Approval needed', body: `Run "${event.title}"?` };
  if (event.type === 'automation:finish' && !event.run.ok) return { title: `Automation failed: ${event.run.title}`, body: event.run.error || `exit ${event.run.code}` };
  return null;
}
