// Browser smoke test for the admin (Station mode + classic). Builds its own pod, starts its own server.
//   npm i --no-save puppeteer-core && node tests/e2e/admin.mjs      (CHROME_PATH=… if Chrome is not in a standard place)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPod, openPod, hashPassword } from '../../packages/core/src/index.js';
import { launch, check, assert, finish, sleep, waitFor, watchErrors } from './harness.mjs';

const PORT = 4590 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'orbiter-e2e-'));
const pod = join(dir, 'e2e.pod');

// ── seed ───────────────────────────────────────────────────────────────────────
createPod(pod);
{
  const db = openPod(pod);
  db.insertUser('u-admin', 'admin', await hashPassword('e2e-admin-pass'), 'admin');
  db.insertUser('u-ed', 'editor', await hashPassword('e2e-editor-pass'), 'editor');
  db.setMeta('site.name', 'E2E Site');
  db.createCollection('posts', 'Posts', {
    title: { type: 'string', label: 'Title', required: true }, body: { type: 'richtext', label: 'Body' },
    excerpt: { type: 'richtext', label: 'Excerpt', group: 'Basics' }, category: { type: 'select', label: 'Category', options: ['A', 'B'], group: 'Basics' },
    featured: { type: 'boolean', label: 'Featured', group: 'Basics' }, tags: { type: 'array', label: 'Tags', group: 'Basics' },
    source: { type: 'url', label: 'Source', group: 'Links' }, seo_title: { type: 'string', label: 'SEO title', group: 'SEO' },
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`extra_${i}`, { type: 'string', label: `Extra field ${i}`, group: 'More' }])),
  }, false);
  db.createEntry('posts', 'hello', { title: 'Hello', body: 'Body text.\n\nSecond paragraph.', excerpt: 'Short.', category: 'A', featured: true }, 'draft');
  db.createCollection('events', 'Events', { title: { type: 'string', label: 'Event', group: 'Basics' }, venue: { type: 'string', label: 'Venue', group: 'Basics' }, capacity: { type: 'number', label: 'Capacity', group: 'Logistics' } }, false);
  db.createEntry('events', 'party', { title: 'Party', venue: 'Hall', capacity: 10 }, 'draft');
  const ids = [];
  for (let i = 1; i <= 16; i++) { const id = `shelf_${String(i).padStart(2, '0')}`; db.createCollection(id, `Shelf ${i}`, { title: { type: 'string', label: 'Title' } }, false); ids.push(id); }
  db.setMeta('nav.groups', JSON.stringify({ Shelves: ids }));
  db.close();
}

const server = spawn(process.execPath, ['packages/admin/src/server.js'], { env: { ...process.env, ORBITER_POD: pod, PORT: String(PORT), ADMIN_ORIGIN: BASE }, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = ''; server.stdout.on('data', (d) => (serverLog += d)); server.stderr.on('data', (d) => (serverLog += d));
const cleanup = () => { try { server.kill(); } catch { /* gone */ } try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } };
process.on('exit', cleanup);

async function login(username, password) {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE }, body: JSON.stringify({ username, password }) });
  assert(r.ok, `login ${username} failed: ${r.status}`);
  return r.headers.get('set-cookie').split(';')[0];
}
const api = (cookie, path, { method = 'GET', json } = {}) =>
  fetch(BASE + path, { method, headers: { cookie, Origin: BASE, ...(json ? { 'Content-Type': 'application/json' } : {}) }, body: json ? JSON.stringify(json) : undefined }).then((r) => r.json().catch(() => ({})));

await waitFor(async () => (await fetch(BASE + '/health')).ok, { timeout: 20000 }).catch(() => { console.error('server did not start:\n' + serverLog); process.exit(2); });

const browser = await launch();
const adminCookie = await login('admin', 'e2e-admin-pass');
const [cName, cValue] = adminCookie.split('=');

async function newPage({ style = 'xfce', scheme = 'dark', width = 1280, height = 800, cookie = [cName, cValue] } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument((st, sc) => { localStorage.setItem('orb_style', st); localStorage.setItem('orb_scheme', sc); }, style, scheme);
  await page.setCookie({ name: cookie[0], value: cookie[1], domain: 'localhost', path: '/' });
  return page;
}
const go = async (page, path) => { await page.goto(BASE + path, { waitUntil: 'networkidle0' }); await sleep(500); };

console.log('Admin smoke test →', BASE);

await check('security headers + script nonces on HTML pages', async () => {
  const r = await fetch(BASE + '/login.html'); const html = await r.text();
  assert(/frame-ancestors 'self'/.test(r.headers.get('content-security-policy') ?? ''), 'missing frame-ancestors');
  assert(r.headers.get('x-content-type-options') === 'nosniff', 'missing nosniff');
  const nonce = (r.headers.get('content-security-policy-report-only') ?? '').match(/nonce-([^']+)'/)?.[1];
  assert(nonce, 'no nonce in the report-only policy');
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  assert(scripts.length && scripts.every((s) => s.includes(`nonce="${nonce}"`)), 'a <script> tag has no matching nonce');
});

const PAGES = ['dashboard.html', 'entries.html?col=posts&label=Posts', 'collections.html', 'media.html', 'inbox.html', 'forms.html', 'analytics.html', 'calendar.html', 'settings.html', 'users.html', 'schema.html', 'build.html', 'import.html', 'publish.html', 'pods.html', 'account.html', 'snippets.html'];
await check('every page in Station mode: one dock, scrollable, no horizontal overflow, no JS errors', async () => {
  const page = await newPage(); const errors = watchErrors(page, ['favicon', 'Failed to load resource: the server responded with a status of 404']);
  const problems = [];
  for (const p of PAGES) {
    await go(page, '/' + p);
    const m = await page.evaluate(() => {
      const se = document.scrollingElement, locked = ['hidden', 'clip'].includes(getComputedStyle(document.documentElement).overflowY) || ['hidden', 'clip'].includes(getComputedStyle(document.body).overflowY);
      const main = document.querySelector('.main'); const mainBottom = main ? main.getBoundingClientRect().bottom + se.scrollTop : 0;
      return { docks: document.querySelectorAll('#xfce-dock').length, hOverflow: se.scrollWidth > innerWidth + 1, locked, below: mainBottom > innerHeight + 2 };
    });
    if (m.docks !== 1) problems.push(`${p}: ${m.docks} docks`);
    if (m.hOverflow) problems.push(`${p}: horizontal overflow`);
    if (m.locked && m.below) problems.push(`${p}: document scroll is locked but content continues below the fold`);
  }
  const e = errors(); if (e.length) problems.push('JS errors: ' + e.slice(0, 3).join(' | '));
  assert(!problems.length, problems.join('\n'));
  await page.close();
});

await check('schema page scrolls once a collection with many fields is open (Station mode)', async () => {
  const page = await newPage({ height: 600 }); await go(page, '/schema.html');
  await page.evaluate(() => [...document.querySelectorAll('.coll-item')].find((e) => e.textContent.trim().startsWith('Posts'))?.click()); await sleep(800);
  const m = await page.evaluate(() => { const se = document.scrollingElement; const y0 = se.scrollTop; scrollTo(0, 99999); return { h: se.scrollHeight, vh: innerHeight, moved: se.scrollTop - y0 }; });
  assert(m.h > m.vh && m.moved > 0, `document cannot scroll (scrollHeight ${m.h}, viewport ${m.vh}, moved ${m.moved})`);
  await page.close();
});

await check('editor: Details card replaces the sidebar fields, collapses and remembers it', async () => {
  const page = await newPage(); await go(page, '/editor.html?collection=posts&slug=hello');
  const m = await page.evaluate(() => ({ card: !!document.querySelector('#main-fields'), inSidebar: !!document.querySelector('#meta-panel [data-field-key]'), fields: document.querySelectorAll('#main-fields [data-field-key]').length, head: !!document.getElementById('fields-card-head') }));
  assert(m.card && m.head && m.fields >= 10 && !m.inSidebar, JSON.stringify(m));
  await page.click('#fields-card-head'); await sleep(200);
  assert(await page.evaluate(() => document.getElementById('main-fields').classList.contains('collapsed')), 'card did not collapse');
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  assert(await page.evaluate(() => document.getElementById('main-fields').classList.contains('collapsed')), 'collapsed state was not remembered');
  await page.close();
});

await check('editor: a collection without a body field shows no block editor', async () => {
  const page = await newPage(); await go(page, '/editor.html?collection=events&slug=party');
  const m = await page.evaluate(() => ({ noBody: document.getElementById('editor-main').classList.contains('no-body'), be: getComputedStyle(document.getElementById('be-editor')).display, open: document.querySelectorAll('#main-fields .field-group.open').length, groups: document.querySelectorAll('#main-fields .field-group').length }));
  assert(m.noBody && m.be === 'none' && m.open === m.groups, JSON.stringify(m));
  await page.close();
});

await check('modal dialogs are centred (API key dialog)', async () => {
  const page = await newPage(); await go(page, '/settings.html');
  await page.evaluate(() => document.getElementById('btn-gen-api-key').click()); await sleep(400);
  const m = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return null; const b = d.getBoundingClientRect(); return { dx: Math.abs((b.left + b.right) / 2 - innerWidth / 2), dy: Math.abs((b.top + b.bottom) / 2 - innerHeight / 2) }; });
  assert(m && m.dx < 4 && m.dy < 4, 'dialog missing or off-centre: ' + JSON.stringify(m));
  await page.close();
});

await check('dock drawer with many collections stays on screen and scrolls', async () => {
  const page = await newPage({ height: 620 }); await go(page, '/dashboard.html');
  await page.evaluate(() => document.querySelector('.xfce-dock-col-group')?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))); await sleep(400);
  const m = await page.evaluate(() => { const p = document.querySelector('.xfce-drawer-popup.open'); if (!p) return null; const r = p.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, scrolls: p.scrollHeight > p.clientHeight, ovf: getComputedStyle(p).overflowY }; });
  assert(m, 'drawer did not open');
  assert(m.top >= 0 && m.bottom <= m.vh, `popup leaves the viewport: ${JSON.stringify(m)}`);
  assert(m.scrolls && m.ovf === 'auto', `popup does not scroll: ${JSON.stringify(m)}`);
  await page.close();
});

await check('review workflow: editors see "Submit for review", not Publish/Schedule', async () => {
  await api(adminCookie, '/api/meta', { method: 'PUT', json: { 'workflow.review': '1' } });
  const edCookie = await login('editor', 'e2e-editor-pass'); const [n, v] = edCookie.split('=');
  const page = await newPage({ cookie: [n, v] }); await go(page, '/editor.html?collection=posts&slug=hello');
  const m = await page.evaluate(() => ({ publish: document.getElementById('btn-publish')?.textContent.trim(), schedHidden: document.getElementById('btn-schedule')?.hidden }));
  assert(m.publish === 'Submit for review' && m.schedHidden === true, JSON.stringify(m));
  const r = await api(edCookie, '/api/collections/posts/entries/hello/status', { method: 'PATCH', json: { status: 'published' } });
  assert(/reviewer or admin/i.test(r.error ?? ''), 'server accepted a publish from an editor: ' + JSON.stringify(r));
  await page.close();
});

await check('security check: admins get findings, editors get 403', async () => {
  const a = await api(adminCookie, '/api/security-check'); assert(Array.isArray(a.findings), 'no findings array');
  const ed = await fetch(BASE + '/api/security-check', { headers: { cookie: await login('editor', 'e2e-editor-pass') } }); assert(ed.status === 403, 'editor got ' + ed.status);
});

await check('classic style: dashboard and editor render without JS errors', async () => {
  const page = await newPage({ style: 'classic' }); const errors = watchErrors(page, ['favicon', 'status of 404']);
  await go(page, '/dashboard.html'); await go(page, '/editor.html?collection=posts&slug=hello');
  assert(!errors().length, errors().slice(0, 3).join(' | ')); await page.close();
});

await browser.close();
finish('Admin smoke test');
