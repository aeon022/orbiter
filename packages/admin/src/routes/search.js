import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const searchRoutes = new Hono();

// GET /api/search/recent — last N entries across all collections
searchRoutes.get('/recent', (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '10', 10), 50);
  const db    = openPod(c.get('podPath'));
  const cols  = db.getCollections();
  const colMap = Object.fromEntries(cols.map(c => [c.id, c.label]));

  const rows = db.db
    .prepare(`SELECT e.*, e.collection_id as collection FROM _entries e ORDER BY e.updated_at DESC LIMIT ?`)
    .all(limit);

  const results = rows.map(r => {
    const data = JSON.parse(r.data);
    return {
      collection: r.collection_id,
      label:      colMap[r.collection_id] ?? r.collection_id,
      slug:       r.slug,
      title:      data.title ?? r.slug,
      status:     r.status,
      updated_at: r.updated_at,
    };
  });
  db.close();
  return c.json(results);
});

// GET /api/search?q=
searchRoutes.get('/', (c) => {
  const q = (c.req.query('q') ?? '').trim().toLowerCase();
  if (!q) return c.json([]);

  const db          = openPod(c.get('podPath'));
  const collections = db.getCollections();
  const results     = [];

  for (const col of collections) {
    const entries = db.getEntries(col.id);
    for (const entry of entries) {
      const title = (entry.data?.title ?? entry.slug ?? '').toLowerCase();
      const body  = (entry.data?.body  ?? '').toLowerCase();
      if (title.includes(q) || body.includes(q) || entry.slug.includes(q)) {
        results.push({
          type:       'entry',
          collection: col.id,
          label:      col.label,
          slug:       entry.slug,
          title:      entry.data?.title ?? entry.slug,
          status:     entry.status,
        });
        if (results.length >= 20) break;
      }
    }
    if (results.length >= 20) break;
  }
  db.close();
  return c.json(results);
});
