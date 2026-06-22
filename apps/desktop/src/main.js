'use strict';

const { app, BrowserWindow, Tray, Menu, dialog, nativeImage, shell, utilityProcess } = require('electron');
const { autoUpdater } = require('electron-updater');
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

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATE_IDS = ['blank', 'blog', 'portfolio', 'business', 'events', 'dossier'];

async function seedPod(podPath, templateId) {
  const { createPod, hashPassword } = await import('@a83/orbiter-core');
  const { randomUUID } = require('node:crypto');

  const db = createPod(podPath);
  const pw = await hashPassword('admin');
  db.insertUser(randomUUID(), 'admin', pw, 'admin');

  if (templateId === 'blog') {
    db.createCollection('posts', 'Posts', {
      title:      { type: 'string',   required: true,  label: 'Titel' },
      excerpt:    { type: 'string',   required: false, label: 'Teaser' },
      body:       { type: 'richtext', required: false, label: 'Text' },
      image:      { type: 'media',    required: false, label: 'Bild' },
      tags:       { type: 'array',    required: false, label: 'Tags' },
      categories: { type: 'relation', collection: 'post_categories', multiple: true, required: false, label: 'Kategorien' },
    });
    db.createCollection('post_categories', 'Post-Kategorien', {
      title: { type: 'string', required: true, label: 'Name' },
    });
    db.setMeta('collection.post_categories.parent', 'posts');

    const catId = db.createEntry('post_categories', 'allgemein', { title: 'Allgemein' }, 'published');
    db.createEntry('posts', 'herzlich-willkommen', {
      title:      'Herzlich willkommen',
      excerpt:    'Das ist mein erster Beitrag — schön, dass du da bist.',
      body:       '## Herzlich willkommen\n\nDas ist ein Beispiel-Beitrag, der zeigt wie Posts in Orbiter aussehen. Du kannst diesen Eintrag bearbeiten oder löschen und mit eigenen Inhalten loslegen.\n\n### Was du hier findest\n\n- Artikel und Beiträge mit Richtext-Editor\n- Kategorien zur Übersicht\n- Medien-Upload für Bilder\n- Versionsverlauf für jeden Eintrag\n\nViel Spaß beim Schreiben!',
      tags:       ['willkommen', 'start'],
      categories: [catId],
    }, 'published');
    db.createEntry('posts', 'mein-zweiter-beitrag', {
      title:      'Mein zweiter Beitrag',
      excerpt:    'Hier kommt bald mehr — dieser Entwurf wartet noch auf seinen großen Auftritt.',
      body:       '## Noch in Arbeit\n\nDieser Beitrag ist ein Entwurf. Er wird erst veröffentlicht, wenn du ihn auf *Veröffentlicht* setzt.\n\nDu kannst im Editor mit `⌘S` speichern und den Status oben rechts ändern.',
      tags:       ['entwurf'],
      categories: [catId],
    }, 'draft');

  } else if (templateId === 'portfolio') {
    db.createCollection('projects', 'Projekte', {
      title:      { type: 'string',   required: true,  label: 'Titel' },
      body:       { type: 'richtext', required: false, label: 'Beschreibung' },
      image:      { type: 'media',    required: false, label: 'Vorschau' },
      url:        { type: 'string',   required: false, label: 'Website' },
      tags:       { type: 'array',    required: false, label: 'Tags' },
      categories: { type: 'relation', collection: 'project_categories', multiple: true, required: false, label: 'Kategorien' },
    });
    db.createCollection('project_categories', 'Projekt-Kategorien', {
      title: { type: 'string', required: true, label: 'Name' },
    });
    db.setMeta('collection.project_categories.parent', 'projects');

    const webId  = db.createEntry('project_categories', 'webdesign',  { title: 'Webdesign' },  'published');
    const brandId = db.createEntry('project_categories', 'branding',  { title: 'Branding' },   'published');
    db.createEntry('projects', 'website-muster-gmbh', {
      title:      'Website Muster GmbH',
      body:       '## Aufgabe\n\nNeue Unternehmenswebsite mit modernem Design, klarer Struktur und schnellen Ladezeiten.\n\n## Umsetzung\n\nAstro als Framework, Orbiter als CMS. Der Kunde pflegt Inhalte selbst über den Admin — keine technischen Kenntnisse nötig.\n\n## Ergebnis\n\nPerformance Score 98/100, vollständig responsiv, SEO-optimiert.',
      url:        'https://beispiel.at',
      tags:       ['astro', 'cms', 'responsive'],
      categories: [webId],
    }, 'published');
    db.createEntry('projects', 'logo-corporate-identity', {
      title:      'Logo & Corporate Identity',
      body:       '## Aufgabe\n\nEntwicklung einer neuen visuellen Identität für ein lokales Unternehmen.\n\n## Ergebnis\n\nLogo, Farbpalette, Typografie und Anwendungsbeispiele als Styleguide-Dokument.',
      tags:       ['logo', 'design', 'branding'],
      categories: [brandId],
    }, 'published');

  } else if (templateId === 'business') {
    db.createCollection('pages', 'Seiten', {
      title: { type: 'string',   required: true,  label: 'Titel' },
      body:  { type: 'richtext', required: false, label: 'Text' },
    });
    db.createCollection('services', 'Leistungen', {
      title:       { type: 'string', required: true,  label: 'Titel' },
      description: { type: 'string', required: false, label: 'Beschreibung' },
      price:       { type: 'string', required: false, label: 'Preis' },
    });
    db.createCollection('team', 'Team', {
      name:  { type: 'string',   required: true,  label: 'Name' },
      role:  { type: 'string',   required: false, label: 'Rolle' },
      bio:   { type: 'richtext', required: false, label: 'Bio' },
      image: { type: 'media',    required: false, label: 'Foto' },
    });

    db.createEntry('pages', 'ueber-uns', {
      title: 'Über uns',
      body:  '## Wer wir sind\n\nWir sind ein kleines Team mit großer Leidenschaft für gute Arbeit. Seit Jahren begleiten wir Kunden von der ersten Idee bis zum fertigen Ergebnis.\n\n## Unsere Werte\n\n- **Qualität** — Wir liefern sorgfältige Arbeit, keine schnellen Lösungen.\n- **Verlässlichkeit** — Termine werden eingehalten, Kommunikation ist klar.\n- **Partnerschaft** — Wir denken mit, nicht nur mit.',
    }, 'published');
    db.createEntry('pages', 'kontakt', {
      title: 'Kontakt',
      body:  '## Kontakt aufnehmen\n\nDu erreichst uns per E-Mail oder telefonisch. Wir antworten in der Regel innerhalb eines Werktags.\n\n**E-Mail:** hallo@beispiel.at\n**Telefon:** +43 1 234 567 89\n**Adresse:** Musterstraße 1, 1010 Wien',
    }, 'published');
    db.createEntry('services', 'beratung', {
      title:       'Beratung',
      description: 'Wir analysieren deine Situation und zeigen dir den richtigen Weg — klar, verständlich, ohne Fachchinesisch.',
      price:       'ab € 120 / Stunde',
    }, 'published');
    db.createEntry('services', 'umsetzung', {
      title:       'Umsetzung',
      description: 'Von der Konzeption bis zum fertigen Ergebnis. Wir übernehmen Planung, Design und technische Realisierung.',
      price:       'auf Anfrage',
    }, 'published');
    db.createEntry('team', 'max-mustermann', {
      name: 'Max Mustermann',
      role: 'Gründer & Geschäftsführer',
      bio:  '## Max Mustermann\n\nMax gründete das Unternehmen 2018 mit dem Ziel, kleinen Betrieben zu helfen, professionell im Web aufzutreten. Davor war er zehn Jahre in der Agenturwelt tätig.',
    }, 'published');

  } else if (templateId === 'events') {
    db.createCollection('events', 'Events', {
      title:      { type: 'string',   required: true,  label: 'Titel' },
      date:       { type: 'date',     required: true,  label: 'Datum' },
      location:   { type: 'string',   required: false, label: 'Ort' },
      body:       { type: 'richtext', required: false, label: 'Beschreibung' },
      image:      { type: 'media',    required: false, label: 'Bild' },
      ticket_url: { type: 'string',   required: false, label: 'Ticket-Link' },
      categories: { type: 'relation', collection: 'event_categories', multiple: true, required: false, label: 'Kategorien' },
    });
    db.createCollection('event_categories', 'Event-Kategorien', {
      title: { type: 'string', required: true, label: 'Name' },
    });
    db.setMeta('collection.event_categories.parent', 'events');

    const workshopId = db.createEntry('event_categories', 'workshop', { title: 'Workshop' }, 'published');
    const konzertId  = db.createEntry('event_categories', 'konzert',  { title: 'Konzert' },  'published');
    db.createEntry('events', 'orbiter-einfuehrung', {
      title:      'Orbiter Einführungs-Workshop',
      date:       '2026-09-15',
      location:   'Wien, Musterstraße 1',
      body:       '## Workshop: Orbiter kennenlernen\n\nIn diesem halbtägigen Workshop lernst du, wie du Orbiter als CMS für deine Astro-Website einrichtest und verwendest.\n\n### Inhalte\n\n- Installation und erster POD\n- Collections und Felder anlegen\n- Inhalte pflegen\n- Astro-Integration\n\n### Zielgruppe\n\nWebentwickler:innen und Designer:innen mit Grundkenntnissen in HTML/CSS.',
      ticket_url: 'https://tickets.beispiel.at',
      categories: [workshopId],
    }, 'published');
    db.createEntry('events', 'sommerkonzert-2026', {
      title:      'Sommerkonzert 2026',
      date:       '2026-07-20',
      location:   'Stadtpark Wien',
      body:       '## Sommerkonzert im Stadtpark\n\nEin Abend unter freiem Himmel mit Live-Musik, Getränken und gutem Gespräch.\n\nEintritt frei — Spende willkommen.',
      categories: [konzertId],
    }, 'published');
  } else if (templateId === 'dossier') {
    db.createCollection('dossiers', 'Dossiers', {
      title:           { type: 'string',   required: true,  label: 'Titel', group: 'Content' },
      excerpt:         { type: 'string',   required: false, label: 'Teaser', group: 'Content' },
      body:            { type: 'richtext', required: false, label: 'Text', group: 'Content' },
      humanSummary:    { type: 'string',   required: false, label: 'Human Summary', group: 'Content' },
      hypothesis:      { type: 'string',   required: false, label: 'Hypothese', group: 'Research' },
      testSetup:       { type: 'string',   required: false, label: 'Test-Setup', group: 'Research' },
      observations:    { type: 'string',   required: false, label: 'Beobachtungen', group: 'Research' },
      findings:        { type: 'string',   required: false, label: 'Findings', group: 'Research' },
      limitations:     { type: 'string',   required: false, label: 'Einschränkungen', group: 'Research' },
      openQuestions:    { type: 'string',   required: false, label: 'Offene Fragen', group: 'Research' },
      claims:          { type: 'table',    required: false, label: 'Claims', group: 'Evidence' },
      sources:         { type: 'table',    required: false, label: 'Sources (APA 7)', group: 'Evidence', format: 'apa7' },
      relationships:   { type: 'table',    required: false, label: 'Relationships', group: 'Evidence' },
      series:          { type: 'string',   required: false, label: 'Serie', group: 'Meta' },
      keywords:        { type: 'array',    required: false, label: 'Keywords', group: 'Meta' },
      contentType:     { type: 'select',   required: false, label: 'Content-Typ', group: 'Meta', options: ['investigation', 'analysis', 'comparison', 'guide', 'deep-dive', 'tutorial'] },
      language:        { type: 'select',   required: false, label: 'Sprache', group: 'Meta', options: ['de', 'en', 'de+en'] },
      author:          { type: 'string',   required: false, label: 'Autor', group: 'Provenance' },
      authorship:      { type: 'select',   required: false, label: 'Authorship', group: 'Provenance', options: ['human', 'ai-assisted', 'ai-generated', 'collaborative'] },
      aiContribution:  { type: 'string',   required: false, label: 'AI-Beitrag', group: 'Provenance' },
      reviewedBy:      { type: 'string',   required: false, label: 'Reviewed by', group: 'Provenance' },
      reviewStatus:    { type: 'select',   required: false, label: 'Review-Status', group: 'Provenance', options: ['draft', 'peer-reviewed', 'self-reviewed', 'unreviewed'] },
      modelDisclosure: { type: 'string',   required: false, label: 'Modell-Disclosure', group: 'Provenance' },
      summaryMachine:  { type: 'string',   required: false, label: 'Machine Summary', group: 'Agent' },
      dossierId:       { type: 'string',   required: false, label: 'Dossier-ID', group: 'Agent' },
      tokensApprox:    { type: 'number',   required: false, label: 'Tokens (ca.)', group: 'Agent' },
      suggestedPrompts:{ type: 'array',    required: false, label: 'Suggested Prompts', group: 'Agent' },
      hero:            { type: 'media',    required: false, label: 'Hero-Bild' },
    });

    db.createEntry('dossiers', 'pilot-dossier', {
      title:          'Pilot-Dossier: Dual Render im Praxistest',
      excerpt:        'Erste Untersuchung, ob ein Dossier-Format gleichzeitig für Menschen und AI-Agenten funktioniert.',
      body:           '## Kontext\n\nDieses Pilot-Dossier testet das Dual Render Konzept in der Praxis. Ziel ist eine Dokumentstruktur, die auf Depth 0 eine lesbare Erzählung bietet und ab Depth 2 maschinenlesbare Evidence bereitstellt.\n\n## Vorgehen\n\nWir definieren ein Schema mit 39 Feldern, gruppiert in Content, Research, Evidence, Meta, Provenance und Agent. Jede Gruppe wird im Editor als collapsible Section dargestellt.\n\n## Ergebnis\n\nDas Format funktioniert — Menschen lesen den Body, Agenten lesen summaryMachine + Claims.',
      humanSummary:   'Dual Render funktioniert als Dokumentformat: eine Erzählung für Menschen, strukturierte Daten für AI.',
      hypothesis:     'Ein einzelnes Dokument kann gleichzeitig als menschenlesbarer Artikel und als maschinenlesbare Datenquelle dienen.',
      testSetup:      'Schema V2 mit 39 Feldern, Orbiter Admin als Editor, Astro als Frontend mit Depth-basiertem Rendering.',
      observations:   'Die Gruppierung im Editor reduziert die kognitive Last. Claims-Tables werden von LLMs gut geparst.',
      findings:       'Dual Render ist praktikabel. Der Schlüssel ist die Depth-Abstraktion: nicht alle Felder auf einmal zeigen.',
      limitations:    'Nur mit 3 Pilot-Dossiers getestet. Noch keine echte Agent-Interaktion validiert.',
      openQuestions:   'Wie verhält sich das Format bei >50 Dossiers? Braucht summaryMachine ein Token-Limit?',
      claims:         [['Claim', 'Confidence', 'Source'], ['Dual Render funktioniert als Einzeldokument', 'high', 'Pilot-Test'], ['Depth-Modell reduziert UI-Komplexität', 'medium', 'Editor-Beobachtung']],
      sources:        [['Author', 'Year', 'Title', 'Source', 'URL', 'Type'], ['Weiher, G.', '2026', 'Dual Render: Astro + Orbiter Guide', 'a83tech.com', 'https://a83tech.com', 'website'], ['Orbiter Project', '2026', 'Vision: Dual Render CMS', 'orbiter.sh', 'https://orbiter.sh/vision', 'website']],
      relationships:  [['Von', 'Relation', 'Zu'], ['pilot-dossier', 'validates', 'Dual Render Konzept'], ['pilot-dossier', 'precedes', 'depth-analysis']],
      series:         'dual-render',
      keywords:       ['dual-render', 'dossier', 'pilot', 'orbiter'],
      contentType:    'investigation',
      language:       'de',
      author:         'admin',
      authorship:     'collaborative',
      aiContribution: 'Schema-Design, Template-Generierung',
      reviewStatus:   'self-reviewed',
      modelDisclosure:'Claude Sonnet 4',
      summaryMachine: 'Pilot investigation of the Dual Render document format. Tests whether a single dossier can serve both human readers (via narrative body) and AI agents (via structured claims, sources, and machine summary). Result: viable with depth-based progressive disclosure.',
      dossierId:      'dsr-pilot-001',
      tokensApprox:   '1200',
      suggestedPrompts:['What is Dual Render?', 'How does the depth model work?', 'What are the limitations of this approach?'],
    }, 'published');
  }
  // 'blank': nur Admin-User, keine Collections

  db.close();
}

async function pickTemplateAndSeed(filePath) {
  const { response } = await dialog.showMessageBox({
    type:      'question',
    title:     'Template wählen',
    message:   'Welches Template soll verwendet werden?',
    detail:    `Datei: ${path.basename(filePath)}\n\nLogin nach dem Start: admin / admin\n(Passwort bitte danach ändern)`,
    buttons:   ['Leer', 'Blog', 'Portfolio', 'Business', 'Events', 'Dossier', 'Abbrechen'],
    defaultId: 0,
    cancelId:  6,
  });
  if (response === 6) return false;
  await seedPod(filePath, TEMPLATE_IDS[response]);
  return true;
}

// ── Backup ───────────────────────────────────────────────────────────────────
async function backupPod() {
  const cfg = loadConfig();
  const source = cfg.podPath;
  if (!source || !fs.existsSync(source)) {
    dialog.showErrorBox('Fehler', 'Kein aktiver POD gefunden.');
    return;
  }
  const basename = path.basename(source, '.pod');
  const date = new Date().toISOString().slice(0, 10);
  const { filePath, canceled } = await dialog.showSaveDialog({
    title:       'POD sichern',
    defaultPath: path.join(path.dirname(source), `${basename}-backup-${date}.pod`),
    filters:     [{ name: 'Orbiter POD (SQLite)', extensions: ['pod'] }],
  });
  if (canceled || !filePath) return;
  fs.copyFileSync(source, filePath);
  const { response } = await dialog.showMessageBox({
    type:      'info',
    title:     'Backup gespeichert',
    message:   'POD erfolgreich gesichert.',
    detail:    path.basename(filePath),
    buttons:   ['OK', 'Im Finder zeigen'],
    defaultId: 0,
  });
  if (response === 1) shell.showItemInFolder(filePath);
}

// ── Auto-update ───────────────────────────────────────────────────────────────
function initAutoUpdater() {
  if (!app.isPackaged) return; // dev mode: skip

  autoUpdater.autoDownload        = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger              = null; // quiet

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type:      'info',
      title:     'Update bereit',
      message:   `Orbiter ${info.version} ist installationsbereit`,
      detail:    'Jetzt neu starten, um das Update zu installieren?',
      buttons:   ['Jetzt neu starten', 'Beim nächsten Start'],
      defaultId: 0,
    });
    if (response === 0) {
      app.isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', err => console.error('[updater]', err.message));

  // Check shortly after launch — don't block startup
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
}

async function checkForUpdatesManually() {
  if (!app.isPackaged) {
    shell.openExternal('https://github.com/aeon022/orbiter/releases');
    return;
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result?.updateInfo || result.updateInfo.version === app.getVersion()) {
      dialog.showMessageBox({
        type:    'info',
        title:   'Kein Update',
        message: `Orbiter ${app.getVersion()} ist aktuell.`,
        buttons: ['OK'],
      });
    }
  } catch {
    shell.openExternal('https://github.com/aeon022/orbiter/releases');
  }
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
  const ok = await pickTemplateAndSeed(filePath);
  if (!ok) return;
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
  const ok = await pickTemplateAndSeed(filePath);
  if (!ok) { app.quit(); return null; }
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
        {
          label:        'POD sichern…',
          accelerator:  'Cmd+Shift+S',
          click:        backupPod,
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
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Nach Updates suchen…',
          click: checkForUpdatesManually,
        },
        { type: 'separator' },
        {
          label: 'GitHub — Releases',
          click: () => shell.openExternal('https://github.com/aeon022/orbiter/releases'),
        },
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
    { label: 'POD wechseln…',        click: switchPod },
    { label: 'Neuen POD erstellen…', click: createNewPod },
    { label: 'POD sichern…',         click: backupPod },
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
    initAutoUpdater();

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
