import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { requireAdmin } from '../middleware/auth.js';

export const collectionRoutes = new Hono();

// GET /api/collections
collectionRoutes.get('/', (c) => {
  const db   = openPod(c.get('podPath'));
  const cols = db.getCollections().map(col => ({
    ...col,
    schema:    col.schema ? JSON.parse(col.schema) : {},
    singleton: !!col.singleton,
    total:     db.getEntries(col.id).length,
  }));
  db.close();
  return c.json(cols);
});

// GET /api/collections/:id
collectionRoutes.get('/:id', (c) => {
  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(c.req.param('id'));
  db.close();
  if (!col) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...col, schema: col.schema ? JSON.parse(col.schema) : {}, singleton: !!col.singleton });
});

// GET /api/collections/:id/singleton — get or auto-create the single entry
collectionRoutes.get('/:id/singleton', (c) => {
  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(c.req.param('id'));
  if (!col) { db.close(); return c.json({ error: 'Not found' }, 404); }
  let entries = db.getEntries(col.id);
  if (entries.length === 0) {
    db.createEntry(col.id, 'index', {}, 'draft');
    entries = db.getEntries(col.id);
  }
  db.close();
  return c.json(entries[0]);
});

// POST /api/collections  (admin only)
collectionRoutes.post('/', requireAdmin, async (c) => {
  const { id, label, schema = {}, singleton = false } = await c.req.json();
  if (!id || !label) return c.json({ error: 'id and label are required' }, 400);

  const safeId = id.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  const db     = openPod(c.get('podPath'));
  if (db.getCollection(safeId)) {
    db.close();
    return c.json({ error: `Collection "${safeId}" already exists` }, 409);
  }
  db.createCollection(safeId, label, schema, singleton);
  const created = db.getCollection(safeId);
  db.close();
  return c.json({ ...created, schema, singleton: !!singleton }, 201);
});

// PUT /api/collections/:id  (admin only)
collectionRoutes.put('/:id', requireAdmin, async (c) => {
  const { label, schema, singleton } = await c.req.json();
  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(c.req.param('id'));
  if (!col) { db.close(); return c.json({ error: 'Not found' }, 404); }
  db.updateCollection(col.id, label ?? col.label, schema ?? JSON.parse(col.schema ?? '{}'), singleton);
  const updated = db.getCollection(col.id);
  db.close();
  return c.json({ ...updated, schema: updated.schema ? JSON.parse(updated.schema) : {}, singleton: !!updated.singleton });
});

// DELETE /api/collections/:id  (admin only)
collectionRoutes.delete('/:id', requireAdmin, (c) => {
  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(c.req.param('id'));
  if (!col) { db.close(); return c.json({ error: 'Not found' }, 404); }
  db.deleteCollection(col.id);
  db.close();
  return c.json({ ok: true });
});
