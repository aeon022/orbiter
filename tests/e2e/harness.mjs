// Tiny shared helpers for the browser smoke tests (no test framework: plain checks, exit code 1 on failure).
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function chromePath() {
  const c = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean);
  const found = c.find((p) => existsSync(p));
  if (!found) { console.error('No Chrome found. Set CHROME_PATH=/path/to/chrome'); process.exit(2); }
  return found;
}

export async function launch() {
  let puppeteer;
  try { puppeteer = require('puppeteer-core'); } catch { console.error('puppeteer-core is not installed: npm i --no-save puppeteer-core'); process.exit(2); }
  return puppeteer.launch({ executablePath: chromePath(), headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(fn, { timeout = 15000, every = 150 } = {}) {
  const t0 = Date.now();
  for (;;) { try { const v = await fn(); if (v) return v; } catch { /* retry */ } if (Date.now() - t0 > timeout) throw new Error('timed out'); await sleep(every); }
}

const results = [];
export async function check(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true }); console.log(`  ✓ ${name}  (${Date.now() - t0} ms)`); }
  catch (e) { results.push({ name, ok: false, err: e.message }); console.log(`  ✗ ${name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
}
export function assert(cond, msg) { if (!cond) throw new Error(msg); }
export function finish(title) {
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${title}: ${results.length - bad.length}/${results.length} passed`);
  process.exit(bad.length ? 1 : 0);
}

/** Collect uncaught page errors and console errors for a page; returns a getter. */
export function watchErrors(page, ignore = []) {
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !ignore.some((i) => m.text().includes(i))) errs.push('console: ' + m.text()); });
  return () => errs.slice();
}

/** Run axe-core on the current page; returns critical/serious violations as readable lines (needs `axe-core` next to puppeteer-core). */
export async function axeProblems(page, impacts = ['critical', 'serious']) {
  const { readFileSync } = await import('node:fs');
  // contrast is measured mid-fade otherwise (cookie banner, hero): let finite animations end first
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  await page.evaluate(readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));
  return page.evaluate(async (impacts) => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
    return r.violations.filter((v) => impacts.includes(v.impact)).map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes[0].target.join(' ')}`);
  }, impacts);
}
