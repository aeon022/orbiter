import { Hono } from 'hono';
import { openPod, signPreviewToken } from '@a83/orbiter-core';
import { userCanAccessCollection } from '../middleware/auth.js';

export const previewRoutes = new Hono();

// GET /api/preview-token?collection=&slug= → { token } valid ~1 h for exactly that entry (null if previews aren't set up)
previewRoutes.get('/', (c) => {
  const collection = c.req.query('collection') ?? '';
  const slug       = c.req.query('slug') ?? '';
  if (!collection || !slug) return c.json({ error: 'collection and slug are required' }, 400);
  if (!userCanAccessCollection(c.get('user'), c.get('podPath'), collection)) return c.json({ error: 'Forbidden' }, 403);
  const db = openPod(c.get('podPath'));
  const master = db.getMeta('preview.token');
  db.close();
  return c.json({ token: master ? signPreviewToken(master, collection, slug) : null });
});
