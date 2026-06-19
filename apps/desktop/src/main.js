'use strict';

const { app, BrowserWindow, Tray, Menu, dialog, nativeImage, shell } = require('electron');
const { spawn } = require('child_process');
const path  = require('path');
const net   = require('net');
const fs    = require('fs');

// ── Config (userData/config.json — no external dep) ──────────────────────────
const CONFIG_PATH = () => path.join(app.getPath('userData'), 'orbiter-config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8')); }
  catch { return {}; }
}
function saveConfig(data) {
  const p = CONFIG_PATH();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ── Paths ─────────────────────────────────────────────────────────────────────
// Phase 1 (dev): resolve relative to this file.
// Phase 2 (packaged): use process.resourcesPath/admin/src/server.js
const SERVER_ENTRY = app.isPackaged
  ? path.join(process.resourcesPath, 'admin', 'src', 'server.js')
  : path.join(__dirname, '../../../packages/admin/src/server.js');

const ICON_PNG = path.join(__dirname, '../assets/icon.png');

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow   = null;
let tray         = null;
let serverProc   = null;
let serverPort   = null;
app.isQuitting   = false;

// ── Single-instance lock ───────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
app.on('second-instance', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });

// ── Helpers ───────────────────────────────────────────────────────────────────
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); });
    srv.on('error', reject);
  });
}

function waitForServer(port, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = net.createConnection(port, '127.0.0.1');
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Server-Start Timeout'));
        setTimeout(attempt, 300);
      });
    };
    attempt();
  });
}

// ── Pod picker ────────────────────────────────────────────────────────────────
async function pickPod() {
  const cfg = loadConfig();

  if (cfg.podPath && fs.existsSync(cfg.podPath)) return cfg.podPath;

  const { response } = await dialog.showMessageBox({
    type:      'question',
    title:     'Orbiter',
    message:   'Willkommen bei Orbiter!',
    detail:    'Wähle eine vorhandene .pod-Datei oder erstelle eine neue.',
    buttons:   ['Pod öffnen…', 'Neues Pod erstellen…', 'Beenden'],
    defaultId: 0,
    cancelId:  2,
    icon:      fs.existsSync(ICON_PNG) ? ICON_PNG : undefined,
  });

  if (response === 2) { app.quit(); return null; }

  if (response === 0) {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title:      'Pod öffnen',
      filters:    [{ name: 'Orbiter Pod', extensions: ['pod'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) { app.quit(); return null; }
    saveConfig({ ...cfg, podPath: filePaths[0] });
    return filePaths[0];
  }

  // Create new pod
  const { filePath, canceled } = await dialog.showSaveDialog({
    title:       'Neues Pod erstellen',
    defaultPath: 'content.pod',
    filters:     [{ name: 'Orbiter Pod', extensions: ['pod'] }],
  });
  if (canceled || !filePath) { app.quit(); return null; }
  saveConfig({ ...cfg, podPath: filePath });
  return filePath;
}

// ── Server ────────────────────────────────────────────────────────────────────
function startServer(podPath, port) {
  // Phase 1: use system node. Phase 2: use utilityProcess.fork() or bundled node.
  const nodeExec = process.env.ORBITER_NODE ?? 'node';

  const proc = spawn(nodeExec, [SERVER_ENTRY], {
    env: {
      ...process.env,
      PORT:           String(port),
      ORBITER_POD:    podPath,
      ADMIN_ORIGIN:   `http://localhost:${port}`,
      ELECTRON:       '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', d => process.stdout.write('[server] ' + d));
  proc.stderr.on('data', d => process.stderr.write('[server] ' + d));

  proc.on('error', err => {
    dialog.showErrorBox('Serverfehler', `Orbiter-Server konnte nicht gestartet werden:\n${err.message}`);
  });

  proc.on('exit', (code, signal) => {
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox(
        'Server beendet',
        `Der Server wurde unerwartet beendet (Code ${code ?? signal}).\n\nNeu starten?`,
      );
    }
  });

  return proc;
}

// ── Browser window ────────────────────────────────────────────────────────────
function createWindow(port, podPath) {
  const icon = fs.existsSync(ICON_PNG) ? nativeImage.createFromPath(ICON_PNG) : undefined;

  mainWindow = new BrowserWindow({
    width:  1300,
    height: 880,
    minWidth:  900,
    minHeight: 600,
    title: `Orbiter — ${path.basename(podPath)}`,
    icon,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    // Frameless on macOS gives a polished native feel (optional, can be removed)
    // titleBarStyle: 'hiddenInset',
  });

  mainWindow.loadURL(`http://localhost:${port}/dashboard.html`);

  // Clicking X hides instead of quitting (stays in tray)
  mainWindow.on('close', e => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray(port, podPath) {
  const icon = fs.existsSync(ICON_PNG)
    ? nativeImage.createFromPath(ICON_PNG).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip(`Orbiter — ${path.basename(podPath)}`);

  const rebuildMenu = (pod) => Menu.buildFromTemplate([
    {
      label:   `Orbiter — ${path.basename(pod)}`,
      enabled: false,
    },
    { type: 'separator' },
    { label: 'Öffnen',             click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Im Browser öffnen',  click: () => shell.openExternal(`http://localhost:${port}`) },
    { type: 'separator' },
    {
      label: 'Pod wechseln…',
      click: async () => {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          title:      'Pod öffnen',
          filters:    [{ name: 'Orbiter Pod', extensions: ['pod'] }],
          properties: ['openFile'],
        });
        if (canceled || !filePaths.length) return;
        saveConfig({ podPath: filePaths[0] });
        app.relaunch();
        app.isQuitting = true;
        app.quit();
      },
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => { app.isQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(rebuildMenu(podPath));
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });

  // Rebuild menu so the pod name updates on pod switch
  tray.rebuildMenu = (pod) => tray.setContextMenu(rebuildMenu(pod));
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    const podPath = await pickPod();
    if (!podPath) return;

    serverPort = await findFreePort();
    serverProc = startServer(podPath, serverPort);

    // Wait up to 10s for server to accept connections
    await waitForServer(serverPort, 10000);

    createWindow(serverPort, podPath);
    createTray(serverPort, podPath);

  } catch (err) {
    dialog.showErrorBox('Startfehler', err.message);
    app.quit();
  }
});

// macOS: clicking dock icon re-shows the window
app.on('activate', () => {
  if (mainWindow) { mainWindow.show(); }
});

// Keep process alive on macOS when all windows are closed (lives in tray)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProc) { serverProc.kill(); serverProc = null; }
});
