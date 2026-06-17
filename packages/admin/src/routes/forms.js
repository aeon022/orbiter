import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { sendFormNotification } from '../email.js';

export const formPublicRoutes = new Hono();  // mounted without auth
export const formRoutes       = new Hono();  // mounted with auth

const VALID_STATUSES = new Set(['new', 'read', 'done', 'spam']);

// ── Public: POST /api/form/:formId ─────────────────
// Called from static Astro sites — no auth, wide CORS handled at server level.
formPublicRoutes.post('/:formId', async (c) => {
  const formId  = c.req.param('formId').slice(0, 64).replace(/[^a-z0-9_-]/gi, '-');
  const podPath = c.get('podPath');
  const ip      = c.req.header('x-forwarded-for')?.split(',')[0].trim()
                ?? c.req.header('cf-connecting-ip')
                ?? null;

  let body;
  const ct = c.req.header('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = await c.req.json().catch(() => null);
  } else {
    const fd = await c.req.formData().catch(() => null);
    body = fd ? Object.fromEntries(fd.entries()) : null;
  }

  if (!body || typeof body !== 'object') return c.json({ error: 'Invalid body' }, 400);

  // Honeypot: if _honeypot field is present and non-empty, silently accept but don't save
  if (body._honeypot) return c.json({ ok: true });
  delete body._honeypot;

  if (!Object.keys(body).length) return c.json({ error: 'Empty submission' }, 400);

  const db = openPod(podPath);
  const id = db.createFormSubmission(formId, body, ip);
  db.close();

  sendFormNotification(podPath, formId, body).catch(() => {});

  return c.json({ ok: true, id });
});

// ── Protected: GET /api/forms ──────────────────────
formRoutes.get('/', (c) => {
  const db    = openPod(c.get('podPath'));
  const stats = db.getFormStats();
  db.close();
  return c.json(stats);
});

// GET /api/forms/:formId
formRoutes.get('/:formId', (c) => {
  const formId = c.req.param('formId');
  const status = c.req.query('status') || undefined;
  const limit  = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);
  const db     = openPod(c.get('podPath'));
  const rows   = db.getFormSubmissions({ formId, status, limit, offset });
  db.close();
  return c.json(rows.map(r => ({ ...r, data: JSON.parse(r.data) })));
});

// PUT /api/forms/:id/status
formRoutes.put('/:id/status', async (c) => {
  const { status } = await c.req.json();
  if (!VALID_STATUSES.has(status)) return c.json({ error: 'Invalid status' }, 400);
  const db = openPod(c.get('podPath'));
  db.setFormStatus(c.req.param('id'), status);
  db.close();
  return c.json({ ok: true });
});

// DELETE /api/forms/:id
formRoutes.delete('/:id', (c) => {
  const db = openPod(c.get('podPath'));
  db.deleteFormSubmission(c.req.param('id'));
  db.close();
  return c.json({ ok: true });
});
