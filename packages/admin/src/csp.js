/**
 * Nonce-based Content-Security-Policy for the admin pages — currently REPORT-ONLY.
 *
 * Every served .html gets a fresh nonce on all of its <script> tags and a
 * Content-Security-Policy-Report-Only header. The admin UI still has ~90 inline event handlers
 * (onclick="…") that a strict policy would block, so we collect violation reports first
 * (GET /api/security-check/csp-reports, admin only), convert those handlers, and only then switch
 * the header to enforcing. The always-on baseline in server.js (frame-ancestors, object-src …) is unaffected.
 */
import { Hono } from 'hono';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { allow } from './ratelimit.js';
import { requireAdmin } from './middleware/auth.js';

const NAME_RE = /^[a-z0-9_-]+\.html$/i;

export function policy(nonce) {
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https: http:",
    "frame-src 'self' https: http:",
    "connect-src 'self'",
    "frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'self'",
    'report-uri /csp-report',
  ].join('; ');
}

export const addNonce = (html, nonce) => html.replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`);

/** Hono handler for GET /:file.html — serves public/<file> with nonce + report-only header. */
export function htmlHandler(publicDir) {
  const root = resolve(publicDir);
  return (c, next) => {
    const name = c.req.path.slice(1);
    if (!NAME_RE.test(name)) return next();
    const file = join(root, name);
    if (!existsSync(file)) return next();
    const nonce = randomBytes(16).toString('base64');
    c.header('Content-Security-Policy-Report-Only', policy(nonce));
    c.header('Cache-Control', 'no-cache');
    return c.html(addNonce(readFileSync(file, 'utf8'), nonce));
  };
}

// ── Violation reports ───────────────────────────────────────────────────────
const reports = new Map(); // key → { directive, blocked, source, sample, count, last }
const MAX_REPORTS = 200;

export const cspPublicRoutes = new Hono();
// POST /csp-report — browsers send this themselves; unauthenticated, so bounded hard.
cspPublicRoutes.post('/', async (c) => {
  if (!allow('csp-report', 120, 60_000)) return c.body(null, 429);
  if (Number(c.req.header('content-length') ?? 0) > 20_000) return c.body(null, 413);
  const body = await c.req.json().catch(() => null);
  const r = body?.['csp-report'];
  if (r && typeof r === 'object') {
    const clip = (v) => String(v ?? '').slice(0, 200);
    const e = {
      directive: clip(r['violated-directive'] ?? r['effective-directive']),
      blocked:   clip(r['blocked-uri']),
      source:    clip(`${r['document-uri'] ?? ''}`.replace(/^https?:\/\/[^/]+/, '')) + (r['line-number'] ? `:${r['line-number']}` : ''),
      sample:    clip(r['script-sample']),
    };
    const key = `${e.directive}|${e.blocked}|${e.source}`;
    const cur = reports.get(key);
    if (cur) { cur.count++; cur.last = new Date().toISOString(); }
    else if (reports.size < MAX_REPORTS) reports.set(key, { ...e, count: 1, last: new Date().toISOString() });
  }
  return c.body(null, 204);
});

export const cspAdminRoutes = new Hono();
cspAdminRoutes.use('*', requireAdmin);
cspAdminRoutes.get('/', (c) => c.json({ reports: [...reports.values()].sort((a, b) => b.count - a.count) }));
