// Browser + link smoke test for the landing site. Needs a built site:  (cd apps/landing && npm run build)
//   npm i --no-save puppeteer-core && node tests/e2e/landing.mjs
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { launch, check, assert, finish, sleep, waitFor, watchErrors } from './harness.mjs';

const DIST = resolve('apps/landing/dist');
if (!existsSync(join(DIST, 'index.html'))) { console.error('apps/landing/dist is missing — build the landing site first'); process.exit(2); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const resolveFile = (p) => { const f = join(DIST, decodeURIComponent(p)); for (const c of [f, join(f, 'index.html'), f + '.html']) if (existsSync(c) && statSync(c).isFile()) return c; return null; };
const server = createServer((req, res) => {
  const file = resolveFile(new URL(req.url, 'http://x').pathname);
  if (!file) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
process.on('exit', () => server.close());
console.log('Landing smoke test →', BASE);

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

await check('every internal link and asset in the built pages exists', async () => {
  const broken = new Set();
  for (const f of walk(DIST).filter((x) => x.endsWith('.html'))) {
    // code samples (<pre>/<code>) contain example URLs, not real links
    const html = readFileSync(f, 'utf8').replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
    for (const m of html.matchAll(/\s(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      const p = m[1]; if (p === '/' || p.startsWith('//')) continue;
      if (!resolveFile(p)) broken.add(`${p}   (in ${f.slice(DIST.length)})`);
    }
  }
  assert(!broken.size, [...broken].slice(0, 15).join('\n'));
});

await check('feeds and search index are well-formed', async () => {
  const atom = readFileSync(join(DIST, 'changelog.xml'), 'utf8'); assert((atom.match(/<entry>/g) ?? []).length >= 10, 'atom feed has few entries');
  const jf = JSON.parse(readFileSync(join(DIST, 'changelog.json'), 'utf8')); assert(jf.version?.includes('jsonfeed') && jf.items.length >= 10, 'json feed broken');
  const idx = JSON.parse(readFileSync(join(DIST, 'search-index.json'), 'utf8')); assert(idx.entries.length > 80, 'search index is small: ' + idx.entries.length);
  assert(['Docs', 'Roadmap', 'Changelog', 'Page'].every((k) => idx.entries.some((e) => e.k === k)), 'search index misses a kind');
});

const browser = await launch();
const newPage = async (mobile = false) => { const p = await browser.newPage(); await p.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1280, height: 800 }); return p; };

await check('vision: roadmap filter, deep links, machine view, weigh-in links', async () => {
  const page = await newPage(); const errors = watchErrors(page, ['favicon']); await page.goto(BASE + '/vision/', { waitUntil: 'networkidle0' });
  const st = () => page.evaluate(() => ({ visible: [...document.querySelectorAll('.rm-item')].filter((e) => !e.hidden).length, shipped: [...document.querySelectorAll('.rm-item[data-kind=shipped]')].filter((e) => !e.hidden).length, total: document.querySelectorAll('.rm-item').length }));
  let s = await st(); assert(s.shipped === 0 && s.visible > 5 && s.visible < s.total, 'default view should show only upcoming items: ' + JSON.stringify(s));
  await page.click('.rm-chip[data-filter=all]'); s = await st(); assert(s.visible === s.total, 'All should show everything');
  await page.goto(BASE + '/vision/#shipped', { waitUntil: 'networkidle0' }); s = await st(); assert(s.shipped > 0 && s.visible === s.shipped, '#shipped deep link');
  await page.goto(BASE + '/vision/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.getElementById('rm-machine-btn').click()); await sleep(300);
  const j = await page.evaluate(() => { try { const o = JSON.parse(document.getElementById('mv-pre').textContent); return { n: o.items.length, ok: document.getElementById('mv-dialog').open }; } catch (e) { return { err: e.message }; } });
  assert(j.ok && j.n > 30, 'machine view: ' + JSON.stringify(j));
  await page.keyboard.press('Escape');
  assert((await page.evaluate(() => document.querySelectorAll('.rm-weigh').length)) > 5, 'weigh-in links missing');
  assert(!errors().length, errors().join(' | ')); await page.close();
});

await check('search: "/" opens, finds docs + roadmap, Esc closes; works on a docs page too', async () => {
  const page = await newPage(); const errors = watchErrors(page, ['favicon']);
  for (const path of ['/', '/docs/security/']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle0' });
    await page.keyboard.press('/'); await waitFor(() => page.evaluate(() => document.getElementById('sp-dialog')?.open));
    await page.keyboard.type('webhook'); await waitFor(() => page.evaluate(() => document.querySelector('#sp-list mark')));   // highlighted matches = real results, not the suggestions
    const kinds = await page.evaluate(() => [...document.querySelectorAll('#sp-list .sp-kind')].map((e) => e.textContent));
    assert(kinds.includes('Docs') && kinds.includes('Roadmap'), `${path}: kinds ${kinds}`);
    await page.keyboard.press('Escape'); await sleep(150);
    assert(!(await page.evaluate(() => document.getElementById('sp-dialog').open)), `${path}: Esc did not close`);
  }
  assert(!errors().length, errors().join(' | ')); await page.close();
});

await check('tour: steps switch, hotspots open, keyboard works', async () => {
  const page = await newPage(); const errors = watchErrors(page, ['favicon']); await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.getElementById('tour').scrollIntoView()); await sleep(900);
  const n = await page.evaluate(() => document.querySelectorAll('.tour-step').length); assert(n >= 6, 'tour steps: ' + n);
  await page.click('.tour-step[data-i="3"]'); await sleep(300);
  assert((await page.evaluate(() => [...document.querySelectorAll('.tour-panel')].findIndex((p) => !p.hidden))) === 3, 'click did not switch step');
  await page.focus('.tour-step[aria-selected=true]'); await page.keyboard.press('ArrowDown'); await sleep(300);
  assert((await page.evaluate(() => [...document.querySelectorAll('.tour-panel')].findIndex((p) => !p.hidden))) === 4, 'ArrowDown did not advance');
  const imgOk = await page.evaluate(() => [...document.querySelectorAll('.tour-panel img')].every((i) => i.getAttribute('width') && i.getAttribute('alt')));
  assert(imgOk, 'tour images need width/height and alt'); assert(!errors().length, errors().join(' | ')); await page.close();
});

await check('mobile (390px): no horizontal overflow on home, vision and a docs page', async () => {
  const bad = [];
  for (const path of ['/', '/vision/', '/docs/security/', '/docs/webhook-recipes/']) {
    const page = await newPage(true); await page.goto(BASE + path, { waitUntil: 'networkidle0' }); await sleep(300);
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    if (w.sw > w.vw + 1) bad.push(`${path}: ${w.sw}px > ${w.vw}px`); await page.close();
  }
  assert(!bad.length, bad.join('\n'));
});

await browser.close();
finish('Landing smoke test');
