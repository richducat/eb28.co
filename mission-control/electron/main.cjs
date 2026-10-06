/* Electron shell: starts the local server in-process, opens the window, tray, and native notifications. */
const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, shell, screen, systemPreferences, dialog } = require('electron');
const path = require('node:path');

let win = null;
let tray = null;
let server = null;
let port = 0;
let orchestrator = null;
const fs = require('node:fs');
const stateRoot = process.env.MC_HOME || path.join(require('node:os').homedir(), '.eb28-mission-control');
function log(event, detail = {}) {
  try {
    fs.mkdirSync(stateRoot, { recursive: true });
    const file = path.join(stateRoot, 'desktop-events.log');
    if (fs.existsSync(file) && fs.statSync(file).size > 1024 * 1024) fs.renameSync(file, `${file}.previous`);
    fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), event, ...detail }) + '\n');
  } catch { /* Diagnostics must never prevent startup. */ }
}
function showWindow() {
  if (!win || win.isDestroyed()) createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

async function boot() {
  const { createServer, listen } = await import(path.join(__dirname, '..', 'src', 'server.js'));
  const { Orchestrator } = await import(path.join(__dirname, '..', 'src', 'workforce', 'orchestrator.js'));
  orchestrator = new Orchestrator();
  server = createServer({
    // Touch ID gate for the Trading tab (disengaging the kill switch, risky approvals).
    // Not available in `npm run web`, so those actions are refused there.
    confirmOwner: systemPreferences && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID() ? (reason) => systemPreferences.promptTouchID(reason) : null,
    orchestrator,
    mobile: true,
    nativeNotify: ({ title, body }) => {
      if (Notification.isSupported()) {
        const n = new Notification({ title, body });
        n.on('click', () => win && win.show());
        n.show();
      }
    },
  });
  port = await listen(server, Number(process.env.MC_PORT || 47831)).catch(() => listen(server, 0));
  log('server-ready', { url: `http://127.0.0.1:${port}/`, paused: orchestrator.paused });
  orchestrator.start();
  orchestrator.on('event', (e) => {
    if (e.type === 'board:refresh' && tray) updateTray(e.summary);
  });
}

// Open big: fill the screen's work area the first time, then remember where Richard left it.
const boundsFile = () => path.join(stateRoot, 'window.json');
function savedBounds() {
  try {
    const b = JSON.parse(require('node:fs').readFileSync(boundsFile(), 'utf8'));
    const area = screen.getDisplayMatching(b).workArea;
    if (b.width >= 980 && b.height >= 600 && b.x >= area.x - 50 && b.y >= area.y - 50) return b;
  } catch {
    /* first run */
  }
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  return { x, y, width, height };
}

function createWindow() {
  const bounds = savedBounds();
  win = new BrowserWindow({
    ...bounds,
    minWidth: 980,
    minHeight: 600,
    title: 'EB28 Mission Control',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0b1020',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  const contents = win.webContents;
  let recoveries = 0;
  const load = () => win.loadURL(`http://127.0.0.1:${port}/`).catch((err) => log('load-error', { message: err.message }));
  contents.on('render-process-gone', (_event, details) => {
    log('renderer-gone', details);
    if (app.isQuiting || details.reason === 'clean-exit') return;
    if (recoveries++ < 2) load();
    else dialog.showErrorBox('Mission Control renderer stopped', `Open http://127.0.0.1:${port}/ in your browser. See ${path.join(stateRoot, 'desktop-events.log')} for diagnostics.`);
  });
  contents.on('did-finish-load', () => log('window-loaded'));
  win.on('unresponsive', () => log('window-unresponsive'));
  win.on('closed', () => { win = null; });
  load();
  const remember = () => {
    try {
      if (win.isMinimized() || win.isFullScreen()) return;
      require('node:fs').mkdirSync(path.dirname(boundsFile()), { recursive: true });
      require('node:fs').writeFileSync(boundsFile(), JSON.stringify(win.getBounds()));
    } catch {
      /* not critical */
    }
  };
  win.on('resized', remember);
  win.on('moved', remember);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function trayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="none" stroke="black" stroke-width="2.2"/><circle cx="11" cy="11" r="3" fill="black"/></svg>`;
  const img = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  img.setTemplateImage(true);
  return img;
}

function updateTray(summary) {
  if (!tray || !summary) return;
  const c = summary.counts || {};
  const needs = (c.needs_you || 0) + (c.failed || 0);
  if (process.platform === 'darwin') tray.setTitle(needs ? ` ${needs}` : '');
  tray.setToolTip(`Mission Control · ${c.needs_you || 0} need you · ${c.working || 0} working · ${c.failed || 0} failed`);
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Mission Control', click: showWindow },
      { label: 'Open in browser', click: () => shell.openExternal(`http://127.0.0.1:${port}/`) },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
    ]),
  );
  tray.on('click', () => { if (win && !win.isDestroyed() && win.isVisible()) win.hide(); else showWindow(); });
}

// One Mission Control at a time: a second copy would run a second set of agents on the same state.
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { log('second-instance'); if (port) showWindow(); });

app.whenReady().then(async () => {
  if (!app.hasSingleInstanceLock()) return;
  await boot();
  createWindow();
  createTray();
  app.on('activate', showWindow);
}).catch((err) => {
  log('startup-failed', { message: err.message });
  dialog.showErrorBox('Mission Control could not start', `${err.message}\nDiagnostics: ${path.join(stateRoot, 'desktop-events.log')}`);
  app.quit();
});

app.on('window-all-closed', (e) => e && e.preventDefault && e.preventDefault());
app.on('before-quit', () => { app.isQuiting = true; if (orchestrator) orchestrator.stop(); if (server) server.close(); log('quit'); });
