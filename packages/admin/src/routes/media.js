import { Hono } from 'hono';
import { openPod, getMediaBackend } from '@a83/orbiter-core';
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

// GET /api/media/:id/raw  — serve binary or redirect to CDN
mediaRoutes.get('/:id/raw', async (c) => {
  const db      = openPod(c.get('podPath'));
  const item    = db.getMediaItem(c.req.param('id'));
  if (!item) { db.close(); return c.json({ error: 'Not found' }, 404); }

  // External backends: redirect to CDN/storage URL
  if (item.url) {
    db.close();
    return c.redirect(item.url, 302);
  }

  // Local backend: read from disk
  if (item.path) {
    const backend = getMediaBackend(db);
    const result  = await backend.get(item.id).catch(() => null);
    db.close();
    if (!result?.data) return c.json({ error: 'File not found on disk' }, 404);
    return new Response(result.data, {
      headers: {
        'Content-Type':  item.mime_type,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // Default: serve BLOB from SQLite
  db.close();
  return new Response(item.data, {
    headers: {
      'Content-Type':  item.mime_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// POST /api/media  — multipart upload
mediaRoutes.post('/', async (c) => {
  const form   = await c.req.formData();
  const file   = form.get('file');
  const alt    = form.get('alt')?.toString()    ?? null;
  const folder = form.get('folder')?.toString() ?? '';

  if (!file || typeof file === 'string') return c.json({ error: 'No file provided' }, 400);

  const buffer  = Buffer.from(await file.arrayBuffer());
  const id      = randomUUID();
  const db      = openPod(c.get('podPath'));

  try {
    const backend = getMediaBackend(db);
    await backend.upload(id, file.name, file.type, buffer.byteLength, buffer, alt, folder);
    const item    = db.getMediaItem(id);
    db.close();
    const { data: _, ...meta } = item;
    return c.json(meta, 201);
  } catch (err) {
    db.close();
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/media/import-url  — server-side fetch from a public URL
mediaRoutes.post('/import-url', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  let { url, alt, folder } = body;
  if (!url) return c.json({ error: 'No URL provided' }, 400);

  // Dropbox: convert share link to direct download
  if (/dropbox\.com/.test(url)) {
    url = url.replace(/[?&]dl=0/, '').replace(/(\?.*)$/, '$1&dl=1');
    if (!url.includes('?')) url += '?dl=1';
  }
  // Google Drive: convert /file/d/ID/view to direct download
  const gdrive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdrive) url = `https://drive.google.com/uc?export=download&id=${gdrive[1]}`;

  let resp;
  try {
    resp = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Orbiter-Admin/1.0' } });
  } catch (err) {
    return c.json({ error: `Fetch failed: ${err.message}` }, 400);
  }
  if (!resp.ok) return c.json({ error: `Remote returned ${resp.status}` }, 400);

  const mime     = (resp.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
  const buffer   = Buffer.from(await resp.arrayBuffer());
  const filename = url.split('/').pop()?.split('?')[0] || 'imported';
  const id       = randomUUID();
  const db       = openPod(c.get('podPath'));

  try {
    const backend = getMediaBackend(db);
    await backend.upload(id, filename, mime, buffer.byteLength, buffer, alt ?? null, folder ?? '');
    const item    = db.getMediaItem(id);
    db.close();
    const { data: _, ...meta } = item;
    return c.json(meta, 201);
  } catch (err) {
    db.close();
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /api/media/:id
mediaRoutes.delete('/:id', async (c) => {
  const db   = openPod(c.get('podPath'));
  const item = db.getMediaItem(c.req.param('id'));
  if (!item) { db.close(); return c.json({ error: 'Not found' }, 404); }

  try {
    const backend = getMediaBackend(db);
    await backend.delete(item.id);
    db.close();
    return c.json({ ok: true });
  } catch (err) {
    db.close();
    return c.json({ error: err.message }, 500);
  }
});
