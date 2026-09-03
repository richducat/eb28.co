/* Electron shell: starts the local server in-process, opens the window, tray, and native notifications. */
const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, shell } = require('electron');
const path = require('node:path');

let win = null;
let tray = null;
let server = null;
let port = 0;

async function boot() {
  const { createServer, listen } = await import(path.join(__dirname, '..', 'src', 'server.js'));
  const { Orchestrator } = await import(path.join(__dirname, '..', 'src', 'workforce', 'orchestrator.js'));
  const orchestrator = new Orchestrator();
  server = createServer({
    orchestrator,
    nativeNotify: ({ title, body }) => {
      if (Notification.isSupported()) {
        const n = new Notification({ title, body });
        n.on('click', () => win && win.show());
        n.show();
      }
    },
  });
  port = await listen(server, Number(process.env.MC_PORT || 47831)).catch(() => listen(server, 0));
  orchestrator.start();
  orchestrator.on('event', (e) => {
    if (e.type === 'board:refresh' && tray) updateTray(e.summary);
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 980,
    minHeight: 600,
    title: 'EB28 Mission Control',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0b1020',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
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
      { label: 'Open Mission Control', click: () => win && win.show() },
      { label: 'Open in browser', click: () => shell.openExternal(`http://127.0.0.1:${port}/`) },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
    ]),
  );
  tray.on('click', () => win && (win.isVisible() ? win.hide() : win.show()));
}

app.whenReady().then(async () => {
  await boot();
  createWindow();
  createTray();
  app.on('activate', () => win && win.show());
});

app.on('window-all-closed', (e) => e && e.preventDefault && e.preventDefault());
app.on('before-quit', () => { app.isQuiting = true; if (server) server.close(); });
