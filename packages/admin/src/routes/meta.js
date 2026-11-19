import { Hono } from 'hono';
import { openPod, hashApiToken } from '@a83/orbiter-core';
import { requireAdmin } from '../middleware/auth.js';

export const metaRoutes = new Hono();

const ALLOWED_KEYS = [
  'site.name', 'site.url', 'site.description', 'site.locale', 'site.locales',
  'build.webhook_url',
  'github.token', 'github.repo', 'github.branch',
  'media.backend', 'media.local_path',
  'media.github_token', 'media.github_repo', 'media.github_branch', 'media.github_dir',
  'media.s3_bucket', 'media.s3_region', 'media.s3_endpoint', 'media.s3_access_key', 'media.s3_secret_key', 'media.s3_public_url',
  'media.img_max_width', 'media.img_quality', 'media.img_convert_webp',
  'api.enabled', 'api.token', 'preview.token',
  'dashboard.notes', 'dashboard.todos',
  'dashboard.show_calendar', 'dashboard.show_recent', 'dashboard.show_collections', 'dashboard.show_workspace',
  'analytics.enabled',
  'ai.provider', 'ai.model', 'ai.api_key', 'ai.ollama_url',
  'ui.theme', 'workflow.review',
  'format_version',
  'email.smtp_host', 'email.smtp_port', 'email.smtp_user', 'email.smtp_pass',
  'email.smtp_from', 'email.notify_publish', 'email.notify_comment', 'email.notify_form', 'email.notify_to',
  'ftp.host', 'ftp.port', 'ftp.user', 'ftp.password',
  'ftp.remote_path', 'ftp.local_path', 'ftp.secure', 'ftp.auto_deploy',
  'nav.hidden', 'nav.groups', 'nav.order', 'nav.links',
  'llms.collections',
];

export const SECRET_KEYS = new Set([
  'github.token', 'ai.api_key', 'api.token', 'preview.token',
  'media.github_token', 'media.s3_access_key', 'media.s3_secret_key',
  'email.smtp_pass', 'ftp.password',
]);

const ADMIN_ONLY_KEYS = new Set([
  ...SECRET_KEYS,
  'build.webhook_url',
  'github.repo', 'github.branch',
  'media.backend', 'media.local_path',
  'media.github_repo', 'media.github_branch', 'media.github_dir',
  'media.s3_bucket', 'media.s3_region', 'media.s3_endpoint', 'media.s3_public_url',
  'ftp.host', 'ftp.port', 'ftp.user', 'ftp.remote_path', 'ftp.local_path', 'ftp.secure', 'ftp.auto_deploy',
  'email.smtp_host', 'email.smtp_port', 'email.smtp_user', 'email.smtp_from',
  'email.notify_publish', 'email.notify_comment', 'email.notify_form', 'email.notify_to',
  'api.enabled', 'workflow.review', 'nav.links',
  // ai.ollama_url makes the server call an arbitrary host (SSRF + prompt leak); the rest steer it / break migrations / feed mails & links
  'ai.provider', 'ai.model', 'ai.ollama_url', 'site.url', 'format_version',
]);

// api.token is only ever stored hashed (the site compares hashes); everything else is stored as given.
const storeValue = (key, value) => {
  const v = value == null ? '' : String(value);
  return key === 'api.token' ? hashApiToken(v) : v;
};

const PREVIEW_URL_RE = /^preview_url\.[a-z0-9_-]+$/;
// preview URLs end up in an <a href> in the editor: admins only, and only http(s) or site-relative (no javascript:/data:)
const SAFE_PREVIEW_URL_RE = /^(https?:\/\/|\/(?!\/))/i;
const previewUrlRejected = (key, value, isAdmin) =>
  PREVIEW_URL_RE.test(key) && (!isAdmin || (value != null && String(value) !== '' && !SAFE_PREVIEW_URL_RE.test(String(value).trim())));
// nav.links = {"Group": [{"label": "…", "url": "https://… or /…"}]}: external links in a sidebar group (the URLs end up in an <a href>)
const navLinksValid = (v) => {
  let d; try { d = typeof v === 'string' ? JSON.parse(v) : v; } catch { return false; }
  return !!d && typeof d === 'object' && !Array.isArray(d) && Object.entries(d).every(([g, links]) => typeof g === 'string' && Array.isArray(links) &&
    links.every((l) => l && typeof l.label === 'string' && typeof l.url === 'string' && SAFE_PREVIEW_URL_RE.test(l.url.trim())));
};
const navLinksRejected = (key, value) => key === 'nav.links' && value != null && String(value) !== '' && !navLinksValid(value);
const TEMPLATES_RE   = /^templates\.[a-z0-9_-]+$/;

function maskSecret(key, val) {
  if (!val || !SECRET_KEYS.has(key)) return val;
  return val.length > 6 ? val.slice(0, 3) + '•'.repeat(Math.min(val.length - 3, 20)) : '••••••';
}

// Read-side view of a value for the current role: admins see everything,
// non-admins get secrets masked and admin-only (non-secret) keys withheld —
// mirrors the write-side ADMIN_ONLY_KEYS check below.
// Admin-only to *change*, but every user needs to read them to render the UI correctly.
const READABLE_BY_ALL = new Set(['workflow.review', 'ai.provider', 'ai.model', 'site.url', 'format_version']);

function visibleValue(key, val, isAdmin) {
  if (isAdmin) return val;
  if (ADMIN_ONLY_KEYS.has(key) && !READABLE_BY_ALL.has(key)) return SECRET_KEYS.has(key) ? maskSecret(key, val) : null;
  return val;
}

// GET /api/meta — returns all allowed keys; secrets masked, admin-only keys withheld for non-admins
metaRoutes.get('/', (c) => {
  const db   = openPod(c.get('podPath'));
  const user = c.get('user');
  const isAdmin = user?.role === 'admin';
  const out = {};
  for (const key of ALLOWED_KEYS) {
    const val = db.getMeta(key) ?? null;
    out[key] = visibleValue(key, val, isAdmin);
  }
  db.close();
  return c.json(out);
});

// GET /api/meta/:key — validated against ALLOWED_KEYS; secrets masked, admin-only keys withheld for non-admins
metaRoutes.get('/:key', (c) => {
  const key = c.req.param('key').replace(/~/g, '.');
  if (!ALLOWED_KEYS.includes(key) && !PREVIEW_URL_RE.test(key) && !TEMPLATES_RE.test(key)) return c.json({ error: 'Key not allowed' }, 403);
  const user = c.get('user');
  const isAdmin = user?.role === 'admin';
  const db  = openPod(c.get('podPath'));
  const val = db.getMeta(key);
  db.close();
  return c.json({ key, value: visibleValue(key, val, isAdmin) });
});

// PUT /api/meta — batch update; admin-only keys require admin role
metaRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const user = c.get('user');
  const isAdmin = user?.role === 'admin';
  const db   = openPod(c.get('podPath'));
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key) && !PREVIEW_URL_RE.test(key) && !TEMPLATES_RE.test(key)) continue;
    if (ADMIN_ONLY_KEYS.has(key) && !isAdmin) continue;
    if (previewUrlRejected(key, value, isAdmin) || navLinksRejected(key, value)) continue;
    db.setMeta(key, storeValue(key, value));
  }
  db.close();
  return c.json({ ok: true });
});

// PUT /api/meta/:key — single key update; admin-only keys require admin role
metaRoutes.put('/:key', async (c) => {
  const key = c.req.param('key').replace(/~/g, '.');
  if (!ALLOWED_KEYS.includes(key) && !PREVIEW_URL_RE.test(key) && !TEMPLATES_RE.test(key)) return c.json({ error: 'Key not allowed' }, 403);
  const user = c.get('user');
  if (ADMIN_ONLY_KEYS.has(key) && user?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const { value } = await c.req.json();
  if (previewUrlRejected(key, value, user?.role === 'admin')) return c.json({ error: 'Preview URL must be admin-set and start with http(s):// or /' }, 400);
  if (navLinksRejected(key, value)) return c.json({ error: 'nav.links: [{label, url}] per group, URLs start with http(s):// or /' }, 400);
  const db = openPod(c.get('podPath'));
  db.setMeta(key, storeValue(key, value));
  db.close();
  return c.json({ ok: true });
});
