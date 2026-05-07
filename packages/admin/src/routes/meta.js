import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const metaRoutes = new Hono();

const ALLOWED_KEYS = [
  'site.name', 'site.url', 'site.description',
  'api.enabled', 'api.token',
  'dashboard.notes', 'dashboard.todos',
];

// GET /api/meta
metaRoutes.get('/', (c) => {
  const db  = openPod(c.get('podPath'));
  const out = {};
  for (const key of ALLOWED_KEYS) out[key] = db.getMeta(key);
  db.close();
  return c.json(out);
});

// GET /api/meta/:key
metaRoutes.get('/:key', (c) => {
  const key = c.req.param('key').replace('~', '.');
  const db  = openPod(c.get('podPath'));
  const val = db.getMeta(key);
  db.close();
  return c.json({ key, value: val });
});

// PUT /api/meta
metaRoutes.put('/', async (c) => {
  const body = await c.req.json();
  const db   = openPod(c.get('podPath'));
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS.includes(key)) db.setMeta(key, String(value));
  }
  db.close();
  return c.json({ ok: true });
});
