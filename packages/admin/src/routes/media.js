import { Hono } from 'hono';
import { openPod, getMediaBackend } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']);

async function optimizeImage(buffer, mimeType, db) {
  if (!IMAGE_TYPES.has(mimeType)) return buffer;
  const maxWidth = parseInt(db.getMeta('media.img_max_width') ?? '2400', 10);
  const quality  = parseInt(db.getMeta('media.img_quality')   ?? '85',   10);
  try {
    const img  = sharp(buffer);
    const meta = await img.metadata();
    if (meta.width && meta.width > maxWidth) img.resize({ width: maxWidth, withoutEnlargement: true });
    if (mimeType === 'image/jpeg') return await img.jpeg({ quality, mozjpeg: true }).toBuffer();
    if (mimeType === 'image/png')  return await img.png({ quality }).toBuffer();
    if (mimeType === 'image/webp') return await img.webp({ quality }).toBuffer();
    if (mimeType === 'image/avif') return await img.avif({ quality }).toBuffer();
    return await img.toBuffer();
  } catch {
    return buffer;
  }
}

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

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const id        = randomUUID();
  const db        = openPod(c.get('podPath'));

  try {
    const buffer  = await optimizeImage(rawBuffer, file.type, db);
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

  const mime      = (resp.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
  const rawBuffer = Buffer.from(await resp.arrayBuffer());
  const filename  = url.split('/').pop()?.split('?')[0] || 'imported';
  const id        = randomUUID();
  const db        = openPod(c.get('podPath'));

  try {
    const buffer  = await optimizeImage(rawBuffer, mime, db);
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

// POST /api/media/add-link  — store an external URL reference, no data fetched
mediaRoutes.post('/add-link', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const { url, alt, folder, filename: providedName } = body;
  if (!url) return c.json({ error: 'No URL provided' }, 400);

  // Detect mime via HEAD request, fall back to extension sniffing
  let mime = 'application/octet-stream';
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'Orbiter-Admin/1.0' } });
    const ct = head.headers.get('content-type');
    if (ct) mime = ct.split(';')[0].trim();
  } catch {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    const extMap = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif',
                     webp:'image/webp', avif:'image/avif', svg:'image/svg+xml',
                     mp4:'video/mp4', webm:'video/webm', pdf:'application/pdf' };
    if (extMap[ext]) mime = extMap[ext];
  }

  const filename = providedName || url.split('/').pop()?.split('?')[0] || 'link';
  const id       = randomUUID();
  const db       = openPod(c.get('podPath'));
  db.insertMedia(id, filename, mime, 0, null, alt ?? null, folder ?? '', url, null);
  const item = db.getMediaItem(id);
  db.close();
  const { data: _, ...meta } = item;
  return c.json(meta, 201);
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
