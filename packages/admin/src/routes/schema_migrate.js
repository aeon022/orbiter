import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const schemaMigrateRoutes = new Hono();

// POST /api/collections/:id/schema/rename-field
// Body: { from: 'oldKey', to: 'newKey' }
schemaMigrateRoutes.post('/:collectionId/schema/rename-field', async (c) => {
  const { collectionId } = c.req.param();
  const { from, to } = await c.req.json();
  if (!from || !to || from === to) return c.json({ error: 'from and to are required and must differ' }, 400);

  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(collectionId);
  if (!col) { db.close(); return c.json({ error: 'Collection not found' }, 404); }

  let schema = {};
  try { schema = col.schema ? JSON.parse(col.schema) : {}; } catch {}
  if (!schema[from]) { db.close(); return c.json({ error: `Field "${from}" not found in schema` }, 400); }
  if (schema[to])    { db.close(); return c.json({ error: `Field "${to}" already exists` }, 409); }

  // Rename in schema
  const newSchema = {};
  for (const [k, v] of Object.entries(schema)) newSchema[k === from ? to : k] = v;

  // Rename in all entry data rows
  const entries = db.db.prepare(`SELECT id, data FROM _entries WHERE collection_id = ?`).all(collectionId);
  const update  = db.db.prepare(`UPDATE _entries SET data = ? WHERE id = ?`);
  const tx = db.db.transaction(() => {
    for (const row of entries) {
      let d = {};
      try { d = JSON.parse(row.data); } catch {}
      if (from in d) {
        d[to] = d[from];
        delete d[from];
        update.run(JSON.stringify(d), row.id);
      }
    }
    db.db.prepare(`UPDATE _collections SET schema = ? WHERE id = ?`).run(JSON.stringify(newSchema), collectionId);
  });
  tx();
  db.close();
  return c.json({ ok: true, renamed: entries.length, from, to });
});

// POST /api/collections/:id/schema/change-type
// Body: { field: 'key', type: 'newType' }
// Data is preserved as-is; values that cannot be coerced will be left as strings.
schemaMigrateRoutes.post('/:collectionId/schema/change-type', async (c) => {
  const { collectionId } = c.req.param();
  const { field, type } = await c.req.json();
  if (!field || !type) return c.json({ error: 'field and type are required' }, 400);

  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(collectionId);
  if (!col) { db.close(); return c.json({ error: 'Collection not found' }, 404); }

  let schema = {};
  try { schema = col.schema ? JSON.parse(col.schema) : {}; } catch {}
  if (!schema[field]) { db.close(); return c.json({ error: `Field "${field}" not found` }, 400); }

  const oldType = schema[field].type;
  schema[field] = { ...schema[field], type };

  db.db.prepare(`UPDATE _collections SET schema = ? WHERE id = ?`).run(JSON.stringify(schema), collectionId);
  db.close();
  return c.json({ ok: true, field, from: oldType, to: type });
});

// POST /api/collections/:id/schema/delete-field
// Body: { field: 'key', purgeData: true|false }
schemaMigrateRoutes.post('/:collectionId/schema/delete-field', async (c) => {
  const { collectionId } = c.req.param();
  const { field, purgeData = false } = await c.req.json();
  if (!field) return c.json({ error: 'field is required' }, 400);

  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(collectionId);
  if (!col) { db.close(); return c.json({ error: 'Collection not found' }, 404); }

  let schema = {};
  try { schema = col.schema ? JSON.parse(col.schema) : {}; } catch {}
  if (!schema[field]) { db.close(); return c.json({ error: `Field "${field}" not found` }, 400); }

  delete schema[field];

  const tx = db.db.transaction(() => {
    db.db.prepare(`UPDATE _collections SET schema = ? WHERE id = ?`).run(JSON.stringify(schema), collectionId);
    if (purgeData) {
      const entries = db.db.prepare(`SELECT id, data FROM _entries WHERE collection_id = ?`).all(collectionId);
      const upd = db.db.prepare(`UPDATE _entries SET data = ? WHERE id = ?`);
      for (const row of entries) {
        let d = {};
        try { d = JSON.parse(row.data); } catch {}
        if (field in d) { delete d[field]; upd.run(JSON.stringify(d), row.id); }
      }
    }
  });
  tx();
  db.close();
  return c.json({ ok: true, field, purgeData });
});
