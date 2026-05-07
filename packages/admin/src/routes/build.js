import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const buildRoutes = new Hono();

// POST /api/build/trigger
buildRoutes.post('/trigger', async (c) => {
  const db  = openPod(c.get('podPath'));
  const url = db.getMeta('build.webhook_url') ?? '';
  db.close();
  if (!url) return c.json({ error: 'No webhook URL configured' }, 400);

  const res = await fetch(url, { method: 'POST' }).catch(e => ({ ok: false, status: 0, err: e.message }));
  if (!res.ok) return c.json({ error: `Webhook returned ${res.status}` }, 502);
  return c.json({ ok: true });
});

// GET /api/build/status
buildRoutes.get('/status', (c) => {
  const db     = openPod(c.get('podPath'));
  const webhook = db.getMeta('build.webhook_url') ?? '';
  const last   = db.getMeta('build.last_triggered') ?? null;
  db.close();
  return c.json({ configured: !!webhook, lastTriggered: last });
});
