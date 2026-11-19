import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const helpRoutes = new Hono();

// GET /api/help — the entries of the "anleitungen" collection for every signed-in user (also editors restricted to other
// collections): the read-only help view (hilfe.html) shows them. Drafts included (help texts stay unpublished on purpose).
helpRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath'));
  const entries = db.getCollection('anleitungen') ? db.getEntries('anleitungen') : [];
  db.close();
  return c.json(entries.map(({ slug, data, updated_at }) => ({ slug, data, updated_at })));
});
