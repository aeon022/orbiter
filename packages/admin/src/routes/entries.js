import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const entryRoutes = new Hono();

// GET /api/collections/:id/entries?status=draft|published
entryRoutes.get('/:collectionId/entries', (c) => {
  const { collectionId } = c.req.param();
  const status  = c.req.query('status') || undefined;
  const db      = openPod(c.get('podPath'));
  if (!db.getCollection(collectionId)) { db.close(); return c.json({ error: 'Collection not found' }, 404); }
  const entries = db.getEntries(collectionId, { status });
  db.close();
  return c.json(entries);
});

// GET /api/collections/:id/entries/:slug
entryRoutes.get('/:collectionId/entries/:slug', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug);
  db.close();
  if (!entry) return c.json({ error: 'Not found' }, 404);
  return c.json(entry);
});

// POST /api/collections/:id/entries
entryRoutes.post('/:collectionId/entries', async (c) => {
  const { collectionId } = c.req.param();
  const { slug, data = {}, status = 'draft' } = await c.req.json();
  if (!slug) return c.json({ error: 'slug is required' }, 400);

  const db = openPod(c.get('podPath'));
  if (!db.getCollection(collectionId)) { db.close(); return c.json({ error: 'Collection not found' }, 404); }
  if (db.getEntry(collectionId, slug)) { db.close(); return c.json({ error: `Entry "${slug}" already exists` }, 409); }

  const id    = db.createEntry(collectionId, slug, data, status);
  const entry = db.getEntry(collectionId, slug);
  db.close();
  return c.json({ ...entry, id }, 201);
});

// PUT /api/collections/:id/entries/:slug
entryRoutes.put('/:collectionId/entries/:slug', async (c) => {
  const { collectionId, slug } = c.req.param();
  const body = await c.req.json();

  const db = openPod(c.get('podPath'));
  const ok = db.updateEntry(collectionId, slug, body);
  if (!ok) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const updated = db.getEntry(collectionId, body.slug ?? slug);
  db.close();
  return c.json(updated);
});

// DELETE /api/collections/:id/entries/:slug
entryRoutes.delete('/:collectionId/entries/:slug', (c) => {
  const { collectionId, slug } = c.req.param();
  const db = openPod(c.get('podPath'));
  const ok = db.deleteEntry(collectionId, slug);
  db.close();
  if (!ok) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

// GET /api/collections/:id/entries/:slug/versions
entryRoutes.get('/:collectionId/entries/:slug/versions', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const versions = db.db
    .prepare('SELECT id, created_at FROM _versions WHERE entry_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(entry.id);
  db.close();
  return c.json(versions);
});

// POST /api/collections/:id/entries/:slug/duplicate
entryRoutes.post('/:collectionId/entries/:slug/duplicate', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const newSlug = slug + '-copy';
  db.createEntry(collectionId, newSlug, entry.data, 'draft');
  const created = db.getEntry(collectionId, newSlug);
  db.close();
  return c.json(created, 201);
});

// PATCH /api/collections/:id/entries/:slug/status
entryRoutes.patch('/:collectionId/entries/:slug/status', async (c) => {
  const { collectionId, slug } = c.req.param();
  const { status } = await c.req.json();
  if (!['draft', 'published'].includes(status)) return c.json({ error: 'Invalid status' }, 400);
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  db.updateEntry(collectionId, slug, { slug, data: entry.data, status });
  db.close();
  return c.json({ ok: true });
});
