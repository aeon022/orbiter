const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path');
const sharp = require('../../../../packages/admin/node_modules/sharp');
const OUT = process.argv[2]; const { cookie } = JSON.parse(fs.readFileSync(path.join(__dirname, 'session.json'), 'utf8'));
const W = 1200, H = 750;
const SHOTS = [
  { id: 'dashboard', title: 'Dashboard', page: '/dashboard.html', caption: 'Calendar of what goes live when, stats at a glance, notes and to-dos — everything an editor needs on one screen.',
    hot: [['#cal-strip', 'This month', 'Scheduled and published entries on a calendar; click a day.'], ['.stats-row', 'Stats', 'Entries, drafts and media — live from the pod.'], ['#xfce-dock', 'Station dock', 'Collections, tools and the command palette in one floating dock.']],
    prep: async (p) => { await p.evaluate(() => window.scrollTo(0, 0)); } },
  { id: 'security', title: 'Security check', page: '/dashboard.html', caption: 'The security check tells admins what to fix before it bites: plaintext credentials, an open API, a pod tracked by git — each with the fix. Same as orbiter doctor.',
    hot: [['#security-section', 'Security check', 'Findings with the fix next to each one — encrypt credentials, require a token…']],
    prep: async (p) => { await p.evaluate(() => { const e = document.getElementById('security-section'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 190); }); } },
  { id: 'editor', title: 'Editor', page: '/editor.html?collection=journal&slug=single-file-website', caption: 'The body stays the main content — block editor, AI assistant and suggestions. Custom fields wait in a collapsible card above it.',
    hot: [['#main-fields', 'Details card', 'Collapsed, it takes one line. Open it when you need the fields.'], ['#be-editor', 'Block editor', 'Write in blocks; insert media, tables and callouts.'], ['.ai-btn-group', 'AI & suggestions', 'Local (Ollama) or cloud models; translate missing languages as drafts.']],
    prep: async (p) => { await p.evaluate(() => { document.querySelectorAll('.main-fields .field-group').forEach((g) => g.classList.remove('open')); }); } },
  { id: 'details', title: 'Custom fields', page: '/editor.html?collection=journal&slug=single-file-website', caption: 'Open the Details card: fields grouped as in your schema, two per row, long inputs at full width. It remembers how you left it.',
    hot: [['#fields-card-head', 'Collapsible card', 'Click to collapse; the choice is remembered per collection.'], ['.main-fields .field-group', 'Grouped fields', 'Groups come from your schema; the first one opens by default.'], ['.main-fields textarea', 'Room for long fields', 'Text areas, tables, relations and media take the full row.']],
    prep: async (p) => { await p.evaluate(() => { document.querySelectorAll('.main-fields .field-group').forEach((g, i) => g.classList.toggle('open', i === 0)); }); } },
  { id: 'review', title: 'Review workflow', page: '/entries.html?col=journal&label=Journal', caption: 'Editors submit, reviewers approve. In-review, scheduled and draft entries are one filter away.',
    hot: [['.entries-filter-bar', 'Status filters', 'Published, drafts, in review, scheduled, trash.'], ['.badge-in_review', 'In review', 'Waiting for a reviewer — nothing goes live by accident.'], ['.badge-scheduled', 'Scheduled', 'Publishes itself at the time you set.']] },
  { id: 'media', title: 'Media', page: '/media.html', caption: 'Usage badges, unused and broken-reference filters, and focal points so crops keep the subject in frame.',
    hot: [['#filter-bar', 'Clean-up filters', 'Find unused files and entries pointing at deleted media.'], ['.media-card:first-child .media-meta:last-child', 'Where is it used?', 'Every file shows how many entries use it.'], ['.btn-focal', 'Focal point', 'Click the important part; ?ar=16:9 crops respect it.']], prep: async (p) => { const c = await p.$('.media-card'); if (c) await c.hover(); } },
  { id: 'account', title: 'Account & sessions', page: '/account.html', caption: 'Two-factor sign-in with an authenticator app, recovery codes, and every signed-in device with one-click sign-out.',
    hot: [['#tfa-desc', 'Two-factor', 'TOTP with one-time recovery codes; codes can’t be replayed.'], ['#sessions-list', 'Active sessions', 'Browser, IP and time — sign out any device.']], prep: async (p) => { await p.evaluate(() => { const g = document.getElementById('tfa-desc')?.closest('.settings-group'); if (g) window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 110); }); } },
  { id: 'settings', title: 'Keys & webhooks', page: '/settings.html', caption: 'API keys with scopes, expiry and rate limits. Signed webhooks with retries and a delivery log.',
    hot: [['#api-keys-list', 'API keys', 'Read-only, or draft-only for agents — limited to collections, with an expiry date.'], ['#webhooks-list', 'Signed webhooks', 'HMAC-signed, retried, logged.']], prep: async (p) => { await p.evaluate(() => { const e = document.getElementById('api-keys-list'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 260); }); } },
];
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => { localStorage.setItem('orb_style', 'xfce'); localStorage.setItem('orb_scheme', 'dark'); localStorage.setItem('orb_ui_zoom', '100'); });
  const [name, value] = cookie.split('='); await page.setCookie({ name, value, domain: 'localhost', path: '/' });
  const out = [];
  for (const s of SHOTS) {
    await page.goto('http://localhost:4398' + s.page, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 1200));
    await page.evaluate(() => window.scrollTo(0, 0)); if (s.prep) { await s.prep(page); } await new Promise(r => setTimeout(r, 700));
    const hot = await page.evaluate((hs) => hs.map(([sel, label, text]) => { const el = document.querySelector(sel); if (!el) return { label, missing: true }; const r = el.getBoundingClientRect(); return { label, text, x: r.left, y: r.top, w: r.width, h: r.height }; }), s.hot);
    const png = await page.screenshot({ type: 'png' });
    const file = `${s.id}.webp`; await sharp(png).resize({ width: 1600 }).webp({ quality: 82 }).toFile(path.join(OUT, file));
    const kept = hot.filter(h => !h.missing && h.w > 8 && h.h > 8 && h.y < H - 40 && h.x < W && h.y + h.h > 0).map(h => ({ label: h.label, text: h.text, x: +(Math.max(0, h.x) / W * 100).toFixed(2), y: +(Math.max(0, h.y) / H * 100).toFixed(2), w: +(Math.min(h.w, W - h.x) / W * 100).toFixed(2), h: +(Math.min(h.h, H - h.y) / H * 100).toFixed(2) }));
    console.log(s.id.padEnd(10), 'hotspots found:', kept.length + '/' + s.hot.length, hot.filter(h => h.missing).map(h => 'MISSING ' + h.label).join(', '));
    out.push({ id: s.id, title: s.title, caption: s.caption, file: '/tour/' + file, width: 1600, height: 1000, hotspots: kept });
  }
  fs.writeFileSync(path.join(OUT, 'tour.json'), JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
