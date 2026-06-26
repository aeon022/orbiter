import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
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
  'ui.theme',
  'format_version',
  'email.smtp_host', 'email.smtp_port', 'email.smtp_user', 'email.smtp_pass',
  'email.smtp_from', 'email.notify_publish', 'email.notify_comment', 'email.notify_form', 'email.notify_to',
  'ftp.host', 'ftp.port', 'ftp.user', 'ftp.password',
  'ftp.remote_path', 'ftp.local_path', 'ftp.secure', 'ftp.auto_deploy',
  'nav.hidden', 'nav.groups',
  'llms.collections',
  'webhooks.urls',
];

const SECRET_KEYS = new Set([
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
  'api.enabled',
]);

const PREVIEW_URL_RE = /^preview_url\.[a-z0-9_-]+$/;
const TEMPLATES_RE   = /^templates\.[a-z0-9_-]+$/;

function maskSecret(key, val) {
  if (!val || !SECRET_KEYS.has(key)) return val;
  return val.length > 6 ? val.slice(0, 3) + '•'.repeat(Math.min(val.length - 3, 20)) : '••••••';
}

// GET /api/meta — returns all allowed keys; secrets masked for non-admins
metaRoutes.get('/', (c) => {
  const db   = openPod(c.get('podPath'));
  const user = c.get('user');
  const isAdmin = user?.role === 'admin';
  const out = {};
  for (const key of ALLOWED_KEYS) {
    const val = db.getMeta(key) ?? null;
    out[key] = isAdmin ? val : maskSecret(key, val);
  }
  db.close();
  return c.json(out);
});

// GET /api/meta/:key — validated against ALLOWED_KEYS; secrets masked for non-admins
metaRoutes.get('/:key', (c) => {
  const key = c.req.param('key').replace(/~/g, '.');
  if (!ALLOWED_KEYS.includes(key) && !PREVIEW_URL_RE.test(key) && !TEMPLATES_RE.test(key)) return c.json({ error: 'Key not allowed' }, 403);
  const user = c.get('user');
  const isAdmin = user?.role === 'admin';
  const db  = openPod(c.get('podPath'));
  const val = db.getMeta(key);
  db.close();
  return c.json({ key, value: isAdmin ? val : maskSecret(key, val) });
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
    db.setMeta(key, value == null ? '' : String(value));
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
  const db = openPod(c.get('podPath'));
  db.setMeta(key, value == null ? '' : String(value));
  db.close();
  return c.json({ ok: true });
});
