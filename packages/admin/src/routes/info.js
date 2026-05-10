import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const infoRoutes = new Hono();

// GET /api/info — pod path, format version, collection stats
infoRoutes.get('/', (c) => {
  const podPath = c.get('podPath');
  const db      = openPod(podPath);
  const cols    = db.getCollections().map(col => ({
    id:    col.id,
    label: col.label,
    total: db.getEntries(col.id).length,
  }));
  const version = db.getMeta('format_version') ?? '1';
  db.close();
  return c.json({ podPath, formatVersion: version, collections: cols });
});
