'use strict';

const { app, BrowserWindow, Tray, Menu, dialog, nativeImage, shell, utilityProcess } = require('electron');
const path  = require('path');
const net   = require('net');
const fs    = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────
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
const SERVER_ENTRY = app.isPackaged
  ? path.join(app.getAppPath(), 'admin', 'src', 'server.js')
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

// ── Pod switch helper ─────────────────────────────────────────────────────────
async function switchPod() {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title:      'POD auswählen',
    filters:    [{ name: 'Orbiter POD (SQLite)', extensions: ['pod'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return;
  saveConfig({ podPath: filePaths[0] });
  app.relaunch();
  app.isQuitting = true;
  app.quit();
}

async function createNewPod() {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title:       'Neuen POD erstellen',
    defaultPath: 'content.pod',
    filters:     [{ name: 'Orbiter POD (SQLite)', extensions: ['pod'] }],
  });
  if (canceled || !filePath) return;
  saveConfig({ podPath: filePath });
  app.relaunch();
  app.isQuitting = true;
  app.quit();
}

// ── Pod picker (first launch) ─────────────────────────────────────────────────
async function pickPod() {
  const cfg = loadConfig();
  if (cfg.podPath && fs.existsSync(cfg.podPath)) return cfg.podPath;

  const { response } = await dialog.showMessageBox({
    type:      'question',
    title:     'Orbiter',
    message:   'Willkommen bei Orbiter!',
    detail:    'Wähle einen vorhandenen POD (SQLite-Datenbank, .pod) oder erstelle einen neuen.',
    buttons:   ['POD öffnen…', 'Neuen POD erstellen…', 'Beenden'],
    defaultId: 0,
    cancelId:  2,
    icon:      fs.existsSync(ICON_PNG) ? ICON_PNG : undefined,
  });

  if (response === 2) { app.quit(); return null; }

  if (response === 0) {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title:      'POD öffnen',
      filters:    [{ name: 'Orbiter POD (SQLite)', extensions: ['pod'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) { app.quit(); return null; }
    saveConfig({ ...cfg, podPath: filePaths[0] });
    return filePaths[0];
  }

  const { filePath, canceled } = await dialog.showSaveDialog({
    title:       'Neuen POD erstellen',
    defaultPath: 'content.pod',
    filters:     [{ name: 'Orbiter POD (SQLite)', extensions: ['pod'] }],
  });
  if (canceled || !filePath) { app.quit(); return null; }
  saveConfig({ ...cfg, podPath: filePath });
  return filePath;
}

// ── Server ────────────────────────────────────────────────────────────────────
function startServer(podPath, port) {
  const proc = utilityProcess.fork(SERVER_ENTRY, [], {
    serviceName: 'orbiter-server',
    env: {
      ...process.env,
      PORT:         String(port),
      ORBITER_POD:  podPath,
      ADMIN_ORIGIN: `http://localhost:${port}`,
      ELECTRON:     '1',
    },
    stdio: 'pipe',
  });

  proc.stdout?.on('data', d => process.stdout.write('[server] ' + d));
  proc.stderr?.on('data', d => process.stderr.write('[server] ' + d));

  proc.on('exit', code => {
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox('Server beendet', `Der Server wurde unerwartet beendet (Code ${code}).`);
    }
  });

  return proc;
}

// ── macOS application menu ────────────────────────────────────────────────────
function buildAppMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: `Über ${app.name}` },
        { type: 'separator' },
        { role: 'services', label: 'Dienste' },
        { type: 'separator' },
        { role: 'hide', label: `${app.name} ausblenden` },
        { role: 'hideOthers', label: 'Andere ausblenden' },
        { role: 'unhide', label: 'Alle einblenden' },
        { type: 'separator' },
        {
          label: 'Beenden',
          accelerator: 'Cmd+Q',
          click: () => { app.isQuitting = true; app.quit(); },
        },
      ],
    },
    {
      label: 'Datei',
      submenu: [
        {
          label: 'POD wechseln…',
          accelerator: 'Cmd+O',
          click: switchPod,
        },
        {
          label: 'Neuen POD erstellen…',
          click: createNewPod,
        },
        { type: 'separator' },
        {
          label: 'Im Browser öffnen',
          click: () => serverPort && shell.openExternal(`http://localhost:${serverPort}`),
        },
        { type: 'separator' },
        { role: 'close', label: 'Fenster schließen' },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Widerrufen' },
        { role: 'redo', label: 'Wiederholen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einsetzen' },
        { role: 'selectAll', label: 'Alles auswählen' },
      ],
    },
    {
      label: 'Fenster',
      submenu: [
        { role: 'minimize', label: 'Im Dock ablegen' },
        { role: 'zoom', label: 'Zoomen' },
        { type: 'separator' },
        { role: 'front', label: 'Alle nach vorne' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  });

  mainWindow.loadURL(`http://localhost:${port}/dashboard.html`);

  // X hides window; app stays alive in tray + dock
  mainWindow.on('close', e => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray(port, podPath) {
  // Template image: macOS renders it correctly in both light + dark menu bar
  let icon;
  if (fs.existsSync(ICON_PNG)) {
    icon = nativeImage.createFromPath(ICON_PNG).resize({ width: 16, height: 16 });
    icon.setTemplateImage(true);
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip(`Orbiter — ${path.basename(podPath)}`);

  const buildMenu = () => Menu.buildFromTemplate([
    { label: `Orbiter — ${path.basename(podPath)}`, enabled: false },
    { type: 'separator' },
    { label: 'Fenster öffnen',    click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Im Browser öffnen', click: () => shell.openExternal(`http://localhost:${port}`) },
    { type: 'separator' },
    { label: 'POD wechseln…',     click: switchPod },
    { label: 'Neuen POD erstellen…', click: createNewPod },
    { type: 'separator' },
    { label: 'Beenden', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    buildAppMenu();

    const podPath = await pickPod();
    if (!podPath) return;

    serverPort = await findFreePort();
    serverProc = startServer(podPath, serverPort);
    await waitForServer(serverPort, 10000);

    createWindow(serverPort, podPath);
    createTray(serverPort, podPath);

  } catch (err) {
    dialog.showErrorBox('Startfehler', err.message);
    app.quit();
  }
});

app.on('activate', () => { if (mainWindow) { mainWindow.show(); } });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProc) { serverProc.kill(); serverProc = null; }
});
