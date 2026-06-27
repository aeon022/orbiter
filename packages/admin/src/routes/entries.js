import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { sendNotification } from '../email.js';
import { requireCollectionAccess } from '../middleware/auth.js';

export const entryRoutes = new Hono();

// Collection-level permission check for non-admin users
entryRoutes.use('/:collectionId/*', requireCollectionAccess);

function fireWebhook(podPath, event = 'publish', payload = {}) {
  const db  = openPod(podPath);
  const buildUrl = db.getMeta('build.webhook_url') ?? '';
  db.setMeta('build.last_triggered', new Date().toISOString());

  let hooks = [];
  try { hooks = JSON.parse(db.getMeta('webhooks.urls') || '[]'); } catch {}
  db.close();

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload });
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Orbiter-Webhook/1.0' };

  if (buildUrl && (event === 'publish' || event === 'build')) {
    fetch(buildUrl, { method: 'POST' }).catch(() => {});
  }

  for (const hook of hooks) {
    if (!hook.url) continue;
    if (hook.events && !hook.events.includes(event) && !hook.events.includes('*')) continue;
    fetch(hook.url, { method: 'POST', headers, body }).catch(() => {});
  }
}

// POST /api/collections/:id/entries/bulk — bulk publish or delete
entryRoutes.post('/:collectionId/entries/bulk', async (c) => {
  const { collectionId } = c.req.param();
  const { action, slugs, locale = '' } = await c.req.json();
  if (!Array.isArray(slugs) || !slugs.length) return c.json({ error: 'slugs required' }, 400);
  if (!['publish', 'draft', 'delete', 'restore', 'permanent'].includes(action)) return c.json({ error: 'Invalid action' }, 400);
  const db = openPod(c.get('podPath'));
  if (action === 'delete')    { slugs.forEach(slug => db.deleteEntry(collectionId, slug, locale)); }
  else if (action === 'restore')   { slugs.forEach(slug => db.restoreEntry(collectionId, slug, locale)); }
  else if (action === 'permanent') { slugs.forEach(slug => db.permanentDeleteEntry(collectionId, slug, locale)); }
  else {
    const status = action === 'publish' ? 'published' : 'draft';
    slugs.forEach(slug => {
      const entry = db.getEntry(collectionId, slug, locale);
      if (entry) db.updateEntry(collectionId, slug, { slug, data: entry.data, status, locale });
    });
  }
  db.close();
  if (action === 'publish') fireWebhook(c.get('podPath'), 'publish', { collection: collectionId, action, count: slugs.length });
  else if (action === 'delete') fireWebhook(c.get('podPath'), 'delete', { collection: collectionId, action, count: slugs.length });
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

// GET /api/collections/:id/entries?status=draft|published&locale=
entryRoutes.get('/:collectionId/entries', (c) => {
  const { collectionId } = c.req.param();
  const status = c.req.query('status') || undefined;
  const locale = c.req.query('locale');          // undefined = all locales
  const db     = openPod(c.get('podPath'));
  if (!db.getCollection(collectionId)) { db.close(); return c.json({ error: 'Collection not found' }, 404); }
  const entries = db.getEntries(collectionId, { status, locale });
  db.close();
  return c.json(entries);
});

// GET /api/collections/:id/entries/:slug?locale=
entryRoutes.get('/:collectionId/entries/:slug', (c) => {
  const { collectionId, slug } = c.req.param();
  const locale = c.req.query('locale') ?? '';
  const db     = openPod(c.get('podPath'));
  const entry  = db.getEntry(collectionId, slug, locale);
  db.close();
  if (!entry) return c.json({ error: 'Not found' }, 404);
  return c.json(entry);
});

// GET /api/collections/:id/entries/:slug/locales — list all locale versions
entryRoutes.get('/:collectionId/entries/:slug/locales', (c) => {
  const { collectionId, slug } = c.req.param();
  const db      = openPod(c.get('podPath'));
  const locales = db.getEntryLocales(collectionId, slug);
  db.close();
  return c.json(locales);
});

function validateFields(schema, data) {
  const errors = [];
  for (const [key, field] of Object.entries(schema ?? {})) {
    const val = data?.[key];
    const isEmpty = Array.isArray(val) ? val.length === 0 : (val === '' || val == null);
    const lbl = field.label || key;
    if (field.required && isEmpty) { errors.push(`${lbl}: required`); continue; }
    if (isEmpty) continue;
    const strVal = String(val);
    if (field.min != null) {
      const min = Number(field.min);
      if (field.type === 'number' ? Number(val) < min : strVal.length < min)
        errors.push(`${lbl}: minimum ${field.type === 'number' ? 'value' : 'length'} is ${min}`);
    }
    if (field.max != null) {
      const max = Number(field.max);
      if (field.type === 'number' ? Number(val) > max : strVal.length > max)
        errors.push(`${lbl}: maximum ${field.type === 'number' ? 'value' : 'length'} is ${max}`);
    }
    if (field.regex) {
      try { if (!new RegExp(field.regex).test(strVal)) errors.push(`${lbl}: format invalid`); } catch {}
    }
  }
  return errors;
}

// POST /api/collections/:id/entries
entryRoutes.post('/:collectionId/entries', async (c) => {
  const { collectionId } = c.req.param();
  const { slug, data = {}, status = 'draft', locale = '' } = await c.req.json();
  if (!slug) return c.json({ error: 'slug is required' }, 400);

  const db = openPod(c.get('podPath'));
  if (!db.getCollection(collectionId)) { db.close(); return c.json({ error: 'Collection not found' }, 404); }
  if (db.getEntry(collectionId, slug, locale)) { db.close(); return c.json({ error: `Entry "${slug}" (${locale || 'default'}) already exists` }, 409); }

  if (status === 'published' || status === 'scheduled') {
    const col = db.getCollection(collectionId);
    const schema = col?.schema ? JSON.parse(col.schema) : {};
    const errors = validateFields(schema, data);
    if (errors.length) { db.close(); return c.json({ error: 'Validation failed', errors }, 422); }
  }

  const id    = db.createEntry(collectionId, slug, data, status, locale);
  const entry = db.getEntry(collectionId, slug, locale);
  db.logAudit(id, c.get('user')?.username ?? 'unknown', 'create');
  db.close();
  return c.json({ ...entry, id }, 201);
});

// PUT /api/collections/:id/entries/:slug
entryRoutes.put('/:collectionId/entries/:slug', async (c) => {
  const { collectionId, slug } = c.req.param();
  const body   = await c.req.json();
  const locale = body.locale ?? c.req.query('locale') ?? '';

  const db     = openPod(c.get('podPath'));

  if (body.status === 'published' || body.status === 'scheduled') {
    const col = db.getCollection(collectionId);
    const schema = col?.schema ? JSON.parse(col.schema) : {};
    const errors = validateFields(schema, body.data ?? {});
    if (errors.length) { db.close(); return c.json({ error: 'Validation failed', errors }, 422); }
  }

  const before = db.getEntry(collectionId, slug, locale);
  const ok     = db.updateEntry(collectionId, slug, { ...body, locale });
  if (!ok) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const updated  = db.getEntry(collectionId, body.slug ?? slug, locale);
  const username = c.get('user')?.username ?? 'unknown';
  if (body.status === 'published' && before?.status !== 'published') {
    db.logAudit(updated.id, username, 'publish');
  } else if (body.status === 'draft' && before?.status === 'published') {
    db.logAudit(updated.id, username, 'unpublish');
  } else if (body.status === 'scheduled' && before?.status !== 'scheduled') {
    db.logAudit(updated.id, username, 'schedule');
  } else {
    db.logAudit(updated.id, username, 'update');
  }
  db.close();

  if (body.status === 'published' && before?.status !== 'published') {
    fireWebhook(c.get('podPath'));
    sendNotification(c.get('podPath'), 'publish', { collection: collectionId, slug: body.slug ?? slug, username }).catch(()=>{});
  }
  return c.json(updated);
});

// DELETE /api/collections/:id/entries/:slug?locale= → soft delete (trash)
entryRoutes.delete('/:collectionId/entries/:slug', (c) => {
  const { collectionId, slug } = c.req.param();
  const locale = c.req.query('locale') ?? '';
  const db     = openPod(c.get('podPath'));
  const entry  = db.getEntry(collectionId, slug, locale);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  db.deleteEntry(collectionId, slug, locale);
  db.logAudit(entry.id, c.get('user')?.username ?? 'unknown', 'delete');
  db.close();
  return c.json({ ok: true });
});

// POST /api/collections/:id/entries/:slug/restore?locale=
entryRoutes.post('/:collectionId/entries/:slug/restore', (c) => {
  const { collectionId, slug } = c.req.param();
  const locale = c.req.query('locale') ?? '';
  const db     = openPod(c.get('podPath'));
  const row    = db.db.prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND locale = ? AND deleted_at IS NOT NULL').get(collectionId, slug, locale);
  const ok     = db.restoreEntry(collectionId, slug, locale);
  if (row) db.logAudit(row.id, c.get('user')?.username ?? 'unknown', 'restore');
  db.close();
  if (!ok) return c.json({ error: 'Not found in trash' }, 404);
  return c.json({ ok: true });
});

// DELETE /api/collections/:id/entries/:slug/permanent?locale=
entryRoutes.delete('/:collectionId/entries/:slug/permanent', (c) => {
  const { collectionId, slug } = c.req.param();
  const locale = c.req.query('locale') ?? '';
  const db     = openPod(c.get('podPath'));
  const ok     = db.permanentDeleteEntry(collectionId, slug, locale);
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

// POST /api/collections/:id/entries/:slug/versions/:versionId/restore
entryRoutes.post('/:collectionId/entries/:slug/versions/:versionId/restore', (c) => {
  const { collectionId, slug, versionId } = c.req.param();
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const ok = db.restoreVersion(entry.id, versionId);
  if (ok) db.logAudit(entry.id, c.get('user')?.username ?? 'unknown', 'restore_version');
  db.close();
  if (!ok) return c.json({ error: 'Version not found' }, 404);
  return c.json({ ok: true });
});

// GET /api/collections/:id/entries/export.csv
entryRoutes.get('/:collectionId/entries/export.csv', (c) => {
  const { collectionId } = c.req.param();
  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(collectionId);
  if (!col) { db.close(); return c.json({ error: 'Collection not found' }, 404); }
  const entries = db.getEntries(collectionId);
  const schema  = col.schema ? JSON.parse(col.schema) : {};
  const fields  = Object.keys(schema);
  const headers = ['slug', 'status', ...fields];
  const csvEsc  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows    = [headers.map(csvEsc).join(',')];
  for (const e of entries) {
    rows.push(headers.map(h => {
      if (h === 'slug')   return csvEsc(e.slug);
      if (h === 'status') return csvEsc(e.status);
      const v = e.data[h];
      return csvEsc(Array.isArray(v) ? v.join(';') : v);
    }).join(','));
  }
  db.close();
  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${collectionId}.csv"`,
    },
  });
});

// POST /api/collections/:id/entries/import.csv
entryRoutes.post('/:collectionId/entries/import.csv', async (c) => {
  const { collectionId } = c.req.param();
  const db  = openPod(c.get('podPath'));
  if (!db.getCollection(collectionId)) { db.close(); return c.json({ error: 'Collection not found' }, 404); }
  const text    = await c.req.text();
  const lines   = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) { db.close(); return c.json({ error: 'Empty CSV' }, 400); }
  const parseCsv = line => {
    const cols = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQ) { inQ = true; continue; }
      if (ch === '"' && inQ && line[i+1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"' && inQ) { inQ = false; continue; }
      if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);
    return cols;
  };
  const headers = parseCsv(lines[0]);
  let created = 0, updated = 0, skipped = 0;
  for (const line of lines.slice(1)) {
    const vals = parseCsv(line);
    const row  = Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    if (!row.slug) { skipped++; continue; }
    const data   = {};
    for (const h of headers.filter(h => h !== 'slug' && h !== 'status')) {
      data[h] = row[h];
    }
    const status = ['draft','published'].includes(row.status) ? row.status : 'draft';
    if (db.getEntry(collectionId, row.slug)) {
      db.updateEntry(collectionId, row.slug, { slug: row.slug, data, status });
      updated++;
    } else {
      db.createEntry(collectionId, row.slug, data, status);
      created++;
    }
  }
  db.close();
  return c.json({ ok: true, created, updated, skipped });
});

// POST /api/collections/:id/entries/:slug/duplicate?locale=
entryRoutes.post('/:collectionId/entries/:slug/duplicate', (c) => {
  const { collectionId, slug } = c.req.param();
  const locale = c.req.query('locale') ?? '';
  const db     = openPod(c.get('podPath'));
  const entry  = db.getEntry(collectionId, slug, locale);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  let newSlug = slug + '-copy';
  let i = 2;
  while (db.getEntry(collectionId, newSlug, locale)) newSlug = `${slug}-copy-${i++}`;
  db.createEntry(collectionId, newSlug, entry.data, 'draft', locale);
  const created = db.getEntry(collectionId, newSlug, locale);
  db.close();
  return c.json(created, 201);
});

// PATCH /api/collections/:id/entries/:slug/status
entryRoutes.patch('/:collectionId/entries/:slug/status', async (c) => {
  const { collectionId, slug } = c.req.param();
  const { status, publish_at, unpublish_at, locale = '' } = await c.req.json();
  if (!['draft', 'published', 'scheduled'].includes(status)) return c.json({ error: 'Invalid status' }, 400);
  if (status === 'scheduled' && !publish_at) return c.json({ error: 'publish_at required for scheduled status' }, 400);
  const db    = openPod(c.get('podPath'));
  const entry = db.getEntry(collectionId, slug, locale);
  if (!entry) { db.close(); return c.json({ error: 'Not found' }, 404); }
  const pa  = status === 'scheduled' ? publish_at : null;
  const ua  = status === 'published' ? (unpublish_at ?? null) : null;
  db.updateEntry(collectionId, slug, { slug, data: entry.data, status, publish_at: pa, unpublish_at: ua, locale });
  const username = c.get('user')?.username ?? 'unknown';
  if (status === 'scheduled') db.logAudit(entry.id, username, 'schedule');
  db.close();
  if (status === 'published') fireWebhook(c.get('podPath'));
  return c.json({ ok: true });
});
