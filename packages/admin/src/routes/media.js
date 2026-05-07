import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';

export const mediaRoutes = new Hono();

// GET /api/media?folder=
mediaRoutes.get('/', (c) => {
  const folder = c.req.query('folder') ?? null;
  const db     = openPod(c.get('podPath'));
  const items  = db.listMedia(folder);
  db.close();
  return c.json(items);
});

// GET /api/media/:id/raw  — serve the binary
mediaRoutes.get('/:id/raw', (c) => {
  const db   = openPod(c.get('podPath'));
  const item = db.getMediaItem(c.req.param('id'));
  db.close();
  if (!item) return c.json({ error: 'Not found' }, 404);
  return new Response(item.data, {
    headers: {
      'Content-Type':  item.mime_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// POST /api/media  — multipart upload
mediaRoutes.post('/', async (c) => {
  const form     = await c.req.formData();
  const file     = form.get('file');
  const alt      = form.get('alt')?.toString()    ?? null;
  const folder   = form.get('folder')?.toString() ?? '';

  if (!file || typeof file === 'string') return c.json({ error: 'No file provided' }, 400);

  const buffer   = Buffer.from(await file.arrayBuffer());
  const id       = randomUUID();
  const db       = openPod(c.get('podPath'));
  db.insertMedia(id, file.name, file.type, buffer.byteLength, buffer, alt, folder);
  const item = db.getMediaItem(id);
  db.close();

  const { data: _, ...meta } = item;
  return c.json(meta, 201);
});

// DELETE /api/media/:id
mediaRoutes.delete('/:id', (c) => {
  const db   = openPod(c.get('podPath'));
  const item = db.getMediaItem(c.req.param('id'));
  if (!item) { db.close(); return c.json({ error: 'Not found' }, 404); }
  db.deleteMedia(item.id);
  db.close();
  return c.json({ ok: true });
});
