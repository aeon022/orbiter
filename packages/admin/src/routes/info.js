import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version: adminVersion } = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf8')
);

export const infoRoutes = new Hono();

// GET /api/info — pod path, format version, collection stats
infoRoutes.get('/', (c) => {
  const podPath = c.get('podPath');
  const db      = openPod(podPath);
  const cols    = db.getCollections().map(col => ({
    id:        col.id,
    label:     col.label,
    total:     db.getEntries(col.id, { status: 'published' }).length,
    drafts:    db.getEntries(col.id, { status: 'draft' }).length,
    scheduled: db.getEntries(col.id, { status: 'scheduled' }).length,
    parent:    db.getMeta(`collection.${col.id}.parent`) ?? null,
    singleton: !!col.singleton,
  }));
  const version   = db.getMeta('format_version') ?? '1';
  const navHidden = db.getMeta('nav.hidden') ?? '';
  const navGroups = db.getMeta('nav.groups') ?? '';
  db.close();
  let navGroupsParsed = null;
  try { navGroupsParsed = navGroups ? JSON.parse(navGroups) : null; } catch {}
  return c.json({
    podPath, podSize: statSync(podPath).size, formatVersion: version, adminVersion, collections: cols,
    nav: {
      hidden: navHidden ? navHidden.split(',').map(s => s.trim()).filter(Boolean) : [],
      groups: navGroupsParsed,
    },
  });
});
