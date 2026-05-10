import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const metaRoutes = new Hono();

const ALLOWED_KEYS = [
  'site.name', 'site.url', 'site.description', 'site.locale', 'site.locales',
  'build.webhook_url',
  'github.token', 'github.repo', 'github.branch',
  'api.enabled', 'api.token',
  'dashboard.notes', 'dashboard.todos',
  'ui.theme',
  'format_version',
];

// GET /api/meta — returns all allowed keys as a flat object
metaRoutes.get('/', (c) => {
  const db  = openPod(c.get('podPath'));
  const out = {};
  for (const key of ALLOWED_KEYS) out[key] = db.getMeta(key) ?? null;
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
    if (ALLOWED_KEYS.includes(key)) db.setMeta(key, value == null ? '' : String(value));
  }
  db.close();
  return c.json({ ok: true });
});

// PUT /api/meta/:key — single key update
metaRoutes.put('/:key', async (c) => {
  const key = c.req.param('key').replace(/~/g, '.');
  if (!ALLOWED_KEYS.includes(key)) return c.json({ error: 'Key not allowed' }, 403);
  const { value } = await c.req.json();
  const db = openPod(c.get('podPath'));
  db.setMeta(key, value == null ? '' : String(value));
  db.close();
  return c.json({ ok: true });
});
