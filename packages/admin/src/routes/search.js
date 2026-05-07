import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const searchRoutes = new Hono();

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
