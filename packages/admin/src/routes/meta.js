import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const metaRoutes = new Hono();

const ALLOWED_KEYS = [
  'site.name', 'site.url', 'site.description', 'site.locale', 'site.locales',
  'build.webhook_url',
  'github.token', 'github.repo', 'github.branch',
  'media.backend', 'media.local_path',
  'media.github_token', 'media.github_repo', 'media.github_branch', 'media.github_dir',
  'media.s3_bucket', 'media.s3_region', 'media.s3_endpoint', 'media.s3_access_key', 'media.s3_secret_key', 'media.s3_public_url',
  'media.img_max_width', 'media.img_quality',
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
];

const PREVIEW_URL_RE = /^preview_url\.[a-z0-9_-]+$/;

// GET /api/meta — returns all allowed keys as a flat object
metaRoutes.get('/', (c) => {
  const db  = openPod(c.get('podPath'));
  const out = {};
  for (const key of ALLOWED_KEYS) out[key] = db.getMeta(key) ?? null;
  // preview_url keys are per-collection and not enumerated here
  db.close();
  return c.json(out);
});

// GET /api/meta/:key
metaRoutes.get('/:key', (c) => {
  const key = c.req.param('key').replace(/~/g, '.');
  const db  = openPod(c.get('podPath'));
  const val = db.getMeta(key);
  db.close();
  return c.json({ key, value: val });
});

// PUT /api/meta — batch update
metaRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const db   = openPod(c.get('podPath'));
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS.includes(key) || PREVIEW_URL_RE.test(key)) db.setMeta(key, value == null ? '' : String(value));
  }
  db.close();
  return c.json({ ok: true });
});

// PUT /api/meta/:key — single key update
metaRoutes.put('/:key', async (c) => {
  const key = c.req.param('key').replace(/~/g, '.');
  if (!ALLOWED_KEYS.includes(key) && !PREVIEW_URL_RE.test(key)) return c.json({ error: 'Key not allowed' }, 403);
  const { value } = await c.req.json();
  const db = openPod(c.get('podPath'));
  db.setMeta(key, value == null ? '' : String(value));
  db.close();
  return c.json({ ok: true });
});
