import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { randomBytes } from 'node:crypto';
import { requireAdmin } from '../middleware/auth.js';
import { readHooks, writeHooks, readLog, newSecret, deliver } from '../webhooks.js';

export const webhookRoutes = new Hono();
webhookRoutes.use('*', requireAdmin);

const EVENTS = ['publish', 'delete', 'review', '*'];
const publicHook = (h) => ({ id: h.id, url: h.url, events: h.events ?? ['*'], signed: !!h.secret });

// GET /api/webhooks → hooks (never their secrets) + recent deliveries
webhookRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath'));
  const out = { hooks: readHooks(db).map(publicHook), log: readLog(db) };
  db.close();
  return c.json(out);
});

// POST /api/webhooks { url, events? } → the signing secret is returned once
webhookRoutes.post('/', async (c) => {
  const { url, events } = await c.req.json().catch(() => ({}));
  let u; try { u = new URL(url); } catch { return c.json({ error: 'Invalid URL' }, 400); }
  if (!['http:', 'https:'].includes(u.protocol)) return c.json({ error: 'Only http(s) URLs are allowed' }, 400);
  const ev = Array.isArray(events) && events.length ? events.filter(e => EVENTS.includes(e)) : ['*'];
  const hook = { id: 'wh_' + randomBytes(5).toString('hex'), url: u.href, events: ev.length ? ev : ['*'], secret: newSecret() };
  const db = openPod(c.get('podPath'));
  writeHooks(db, [...readHooks(db), hook]);
  db.close();
  return c.json({ ...publicHook(hook), secret: hook.secret }, 201);
});

// DELETE /api/webhooks/:id
webhookRoutes.delete('/:id', (c) => {
  const db = openPod(c.get('podPath'));
  writeHooks(db, readHooks(db).filter(h => h.id !== c.req.param('id')));
  db.close();
  return c.json({ ok: true });
});

// POST /api/webhooks/:id/test → sends a "ping" once (no retries) and returns the result
webhookRoutes.post('/:id/test', async (c) => {
  const db = openPod(c.get('podPath'));
  const hook = readHooks(db).find(h => h.id === c.req.param('id'));
  db.close();
  if (!hook) return c.json({ error: 'Not found' }, 404);
  const r = await deliver(c.get('podPath'), hook, 'ping', { message: 'Test delivery from Orbiter' }, { retry: false });
  return c.json({ ok: r.ok, status: r.status, error: r.error });
});
