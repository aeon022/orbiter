import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { sendFormNotification, sendFormReply } from '../email.js';
import { requireAdmin } from '../middleware/auth.js';
import { clientIp } from '../net.js';
import { allow } from '../ratelimit.js';

export const formPublicRoutes = new Hono();  // mounted without auth
export const formRoutes       = new Hono();  // mounted with auth

const MAX_FORM_BYTES  = 100_000;
const MAX_FORM_FIELDS = 50;
const MAX_FIELD_CHARS = 5_000;
const VALID_STATUSES = new Set(['new', 'read', 'done', 'spam', 'confirmed', 'rejected']);

// ── Public: POST /api/form/:formId ─────────────────
// Called from static Astro sites — no auth, wide CORS handled at server level.
formPublicRoutes.post('/:formId', async (c) => {
  const formId  = c.req.param('formId').slice(0, 64).replace(/[^a-z0-9_-]/gi, '-');
  const podPath = c.get('podPath');
  const ip      = clientIp(c.env?.incoming?.socket?.remoteAddress, c.req.header('x-forwarded-for'));

  // Public, unauthenticated: cap request rate and size so it can't be used to flood the pod or inbox
  if (!allow(`form:${ip}`, 10, 60_000)) return c.json({ error: 'Too many submissions' }, 429);
  if (Number(c.req.header('content-length') ?? 0) > MAX_FORM_BYTES) return c.json({ error: 'Payload too large' }, 413);

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

  const keys = Object.keys(body);
  if (!keys.length) return c.json({ error: 'Empty submission' }, 400);
  if (keys.length > MAX_FORM_FIELDS) return c.json({ error: 'Too many fields' }, 413);
  for (const k of keys) {
    if (k.length > 100) return c.json({ error: 'Field name too long' }, 413);
    if (typeof body[k] === 'string' && body[k].length > MAX_FIELD_CHARS) body[k] = body[k].slice(0, MAX_FIELD_CHARS);
  }

  const db = openPod(podPath);
  const id = db.createFormSubmission(formId, body, ip);
  db.close();

  // Global cap on notification mails so a flood of submissions can't turn into a mail flood
  if (allow('form-mail', 30, 10 * 60_000)) sendFormNotification(podPath, formId, body).catch(() => {});

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
  return c.json(rows);
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

// POST /api/forms/:id/reply — send email reply to submitter
formRoutes.post('/:id/reply', async (c) => {
  const { subject, text } = await c.req.json();
  if (!subject?.trim() || !text?.trim()) return c.json({ error: 'subject and text required' }, 400);
  const db  = openPod(c.get('podPath'));
  const row = db.getFormSubmission(c.req.param('id'));
  db.close();
  if (!row) return c.json({ error: 'Not found' }, 404);
  const to = row.data?.email ?? row.data?.Email ?? row.data?.e_mail ?? null;
  if (!to) return c.json({ error: 'No email address in submission' }, 400);
  try {
    await sendFormReply(c.get('podPath'), to, subject.trim(), text.trim());
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e.message }, 502);
  }
});

// DELETE /api/forms/:id
formRoutes.delete('/:id', (c) => {
  const db = openPod(c.get('podPath'));
  db.deleteFormSubmission(c.req.param('id'));
  db.close();
  return c.json({ ok: true });
});

// ── Form Builder Configs ──────────────────────────

// GET /api/forms/configs — list all form configs
formRoutes.get('/configs/list', (c) => {
  const db = openPod(c.get('podPath'));
  const configs = db.getFormConfigs();
  db.close();
  return c.json(configs);
});

// GET /api/forms/configs/:formId — get single config
formRoutes.get('/configs/:formId', (c) => {
  const db = openPod(c.get('podPath'));
  const config = db.getFormConfig(c.req.param('formId'));
  db.close();
  if (!config) return c.json({ error: 'Not found' }, 404);
  return c.json(config);
});

// PUT /api/forms/configs/:formId — save config
formRoutes.put('/configs/:formId', requireAdmin, async (c) => {
  const formId = c.req.param('formId').slice(0, 64).replace(/[^a-z0-9_-]/gi, '-');
  const body = await c.req.json();
  const db = openPod(c.get('podPath'));
  db.saveFormConfig(formId, {
    label: body.label,
    fields: body.fields,
    settings: body.settings,
  });
  db.close();
  return c.json({ ok: true });
});

// DELETE /api/forms/configs/:formId — delete config
formRoutes.delete('/configs/:formId', requireAdmin, (c) => {
  const db = openPod(c.get('podPath'));
  db.deleteFormConfig(c.req.param('formId'));
  db.close();
  return c.json({ ok: true });
});
