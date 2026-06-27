import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { runFtpDeploy } from './deploy.js';

export const buildRoutes = new Hono();

// POST /api/build/trigger
buildRoutes.post('/trigger', async (c) => {
  const db  = openPod(c.get('podPath'));
  const url = db.getMeta('build.webhook_url') ?? '';
  db.close();
  if (!url) return c.json({ error: 'No webhook URL configured' }, 400);

  const res = await fetch(url, { method: 'POST' }).catch(e => ({ ok: false, status: 0, err: e.message }));
  if (!res.ok) return c.json({ error: `Webhook returned ${res.status}` }, 502);

  const db2 = openPod(c.get('podPath'));
  db2.setMeta('build.last_triggered', new Date().toISOString());
  db2.setMeta('build.last_status', 'triggered');
  const autoDeploy = db2.getMeta('ftp.auto_deploy') === '1';
  db2.close();
  if (autoDeploy) runFtpDeploy(c.get('podPath')).catch(e => console.warn('[ftp-auto-deploy]', e.message));

  return c.json({ ok: true });
});

// GET /api/build/status
buildRoutes.get('/status', (c) => {
  const db     = openPod(c.get('podPath'));
  const webhook = db.getMeta('build.webhook_url') ?? '';
  const last   = db.getMeta('build.last_triggered') ?? null;
  const status  = db.getMeta('build.last_status')   ?? null;
  db.close();
  return c.json({ configured: !!webhook, lastTriggered: last, lastStatus: status });
});

// POST /api/build/callback — incoming webhook from Netlify/Vercel/CI
// Netlify: { state: 'ready'|'error'|'building', deploy_url }
// Vercel:  { type: 'deployment', payload: { readyState: 'READY'|'ERROR' } }
buildRoutes.post('/callback', async (c) => {
  let body = {};
  try { body = await c.req.json(); } catch {}
  const netlifyState = body?.state;
  const vercelState  = body?.payload?.readyState ?? body?.readyState;
  let status = 'unknown';
  if (netlifyState === 'ready'   || vercelState === 'READY')   status = 'success';
  if (netlifyState === 'error'   || vercelState === 'ERROR')   status = 'failed';
  if (netlifyState === 'building'|| vercelState === 'BUILDING') status = 'building';
  const db = openPod(c.get('podPath'));
  db.setMeta('build.last_status', status);
  db.setMeta('build.last_callback', new Date().toISOString());
  db.close();
  return c.json({ ok: true, status });
});
