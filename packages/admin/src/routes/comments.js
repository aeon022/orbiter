import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const commentRoutes = new Hono();

// GET /api/collections/:id/entries/:slug/comments
commentRoutes.get('/:collectionId/entries/:slug/comments', (c) => {
  const { collectionId, slug } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.db.prepare('SELECT id FROM _entries WHERE collection_id = ? AND slug = ?').get(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const comments = db.getComments(entry.id);
  db.close();
  return c.json(comments);
});

// POST /api/collections/:id/entries/:slug/comments
commentRoutes.post('/:collectionId/entries/:slug/comments', async (c) => {
  const { collectionId, slug } = c.req.param();
  const { body } = await c.req.json();
  if (!body?.trim()) return c.json({ error: 'body required' }, 400);
  const db    = openPod(c.get('podPath'));
  const entry = db.db.prepare('SELECT id FROM _entries WHERE collection_id = ? AND slug = ?').get(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const username = c.get('user')?.username ?? 'unknown';
  const id = db.createComment(entry.id, username, body.trim());
  db.close();
  return c.json({ ok: true, id }, 201);
});

// PATCH /api/comments/:id/resolve
commentRoutes.patch('/comments/:id/resolve', async (c) => {
  const { id } = c.req.param();
  const { resolved } = await c.req.json();
  const db = openPod(c.get('podPath'));
  db.resolveComment(id, resolved !== false);
  db.close();
  return c.json({ ok: true });
});

// DELETE /api/comments/:id
commentRoutes.delete('/comments/:id', (c) => {
  const { id } = c.req.param();
  const db = openPod(c.get('podPath'));
  db.deleteComment(id);
  db.close();
  return c.json({ ok: true });
});
