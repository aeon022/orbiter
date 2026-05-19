import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const entryRoutes = new Hono();

function fireWebhook(podPath) {
  const db  = openPod(podPath);
  const url = db.getMeta('build.webhook_url') ?? '';
  db.setMeta('build.last_triggered', new Date().toISOString());
  db.close();
  if (url) fetch(url, { method: 'POST' }).catch(() => {});
}

// POST /api/collections/:id/entries/bulk — bulk publish or delete
entryRoutes.post('/:collectionId/entries/bulk', async (c) => {
  const { collectionId } = c.req.param();
  const { action, slugs } = await c.req.json();
  if (!Array.isArray(slugs) || !slugs.length) return c.json({ error: 'slugs required' }, 400);
  if (!['publish', 'draft', 'delete', 'restore', 'permanent'].includes(action)) return c.json({ error: 'Invalid action' }, 400);
  const db = openPod(c.get('podPath'));
  if (action === 'delete')    { slugs.forEach(slug => db.deleteEntry(collectionId, slug)); }
  else if (action === 'restore')   { slugs.forEach(slug => db.restoreEntry(collectionId, slug)); }
  else if (action === 'permanent') { slugs.forEach(slug => db.permanentDeleteEntry(collectionId, slug)); }
  else {
    const status = action === 'publish' ? 'published' : 'draft';
    slugs.forEach(slug => {
      const entry = db.getEntry(collectionId, slug);
      if (entry) db.updateEntry(collectionId, slug, { slug, data: entry.data, status });
    });
  }
  db.close();
  if (action === 'publish') fireWebhook(c.get('podPath'));
  return c.json({ ok: true, count: slugs.length });
});

// PATCH /api/collections/:id/entries/reorder — set sort_order by slug array
entryRoutes.patch('/:collectionId/entries/reorder', async (c) => {
  const { collectionId } = c.req.param();
  const { slugs } = await c.req.json();
  if (!Array.isArray(slugs)) return c.json({ error: 'slugs must be an array' }, 400);
  const db  = openPod(c.get('podPath'));
  const set = db.db.prepare('UPDATE _entries SET sort_order = ? WHERE collection_id = ? AND slug = ?');
  const tx  = db.db.transaction(() => { slugs.forEach((slug, i) => set.run(i, collectionId, slug)); });
  tx();
  db.close();
  return c.json({ ok: true });
});

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
  db.logAudit(id, c.get('user')?.username ?? 'unknown', 'create');
  db.close();
  return c.json({ ...entry, id }, 201);
});

// PUT /api/collections/:id/entries/:slug
entryRoutes.put('/:collectionId/entries/:slug', async (c) => {
  const { collectionId, slug } = c.req.param();
  const body = await c.req.json();

  const db     = openPod(c.get('podPath'));
  const before = db.getEntry(collectionId, slug);
  const ok     = db.updateEntry(collectionId, slug, body);
  if (!ok) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const updated  = db.getEntry(collectionId, body.slug ?? slug);
  const username = c.get('user')?.username ?? 'unknown';
  if (body.status === 'published' && before?.status !== 'published') {
    db.logAudit(updated.id, username, 'publish');
  } else if (body.status === 'draft' && before?.status === 'published') {
    db.logAudit(updated.id, username, 'unpublish');
  } else {
    db.logAudit(updated.id, username, 'update');
  }
  db.close();

  if (body.status === 'published' && before?.status !== 'published') {
    fireWebhook(c.get('podPath'));
  }
  return c.json(updated);
});

// DELETE /api/collections/:id/entries/:slug → soft delete (trash)
entryRoutes.delete('/:collectionId/entries/:slug', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  db.deleteEntry(collectionId, slug);
  db.logAudit(entry.id, c.get('user')?.username ?? 'unknown', 'delete');
  db.close();
  return c.json({ ok: true });
});

// POST /api/collections/:id/entries/:slug/restore — move from trash back to draft
entryRoutes.post('/:collectionId/entries/:slug/restore', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const row   = db.db.prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND deleted_at IS NOT NULL').get(collectionId, slug);
  const ok    = db.restoreEntry(collectionId, slug);
  if (row) db.logAudit(row.id, c.get('user')?.username ?? 'unknown', 'restore');
  db.close();
  if (!ok) return c.json({ error: 'Not found in trash' }, 404);
  return c.json({ ok: true });
});

// DELETE /api/collections/:id/entries/:slug/permanent — hard delete from trash
entryRoutes.delete('/:collectionId/entries/:slug/permanent', (c) => {
  const { collectionId, slug } = c.req.param();
  const db = openPod(c.get('podPath'));
  const ok = db.permanentDeleteEntry(collectionId, slug);
  db.close();
  if (!ok) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

// GET /api/collections/:id/entries/:slug/activity
entryRoutes.get('/:collectionId/entries/:slug/activity', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.db.prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ?').get(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const log = db.getAuditLog(entry.id);
  db.close();
  return c.json(log);
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
  let newSlug = slug + '-copy';
  let i = 2;
  while (db.getEntry(collectionId, newSlug)) newSlug = `${slug}-copy-${i++}`;
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
  if (status === 'published') fireWebhook(c.get('podPath'));
  return c.json({ ok: true });
});
