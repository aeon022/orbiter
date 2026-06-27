import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { existsSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { requireAdmin } from '../middleware/auth.js';

export const podRoutes = new Hono();
podRoutes.use('*', requireAdmin);

function podSummary(podPath) {
  if (!existsSync(podPath)) return null;
  try {
    const db   = openPod(podPath);
    const stat = statSync(podPath);
    let siteName = '';
    try { const m = db.getMeta('site'); siteName = typeof m === 'string' ? JSON.parse(m)?.name ?? '' : m?.name ?? ''; } catch {}
    if (!siteName) siteName = db.getMeta('site.name') ?? basename(podPath);
    const cols    = db.getCollections();
    const entries = db.db.prepare(`SELECT COUNT(*) AS n FROM _entries WHERE status = 'published'`).get();
    const last    = db.db.prepare(`SELECT MAX(updated_at) AS t FROM _entries`).get();
    db.close();
    return {
      path: podPath,
      name: siteName || basename(podPath),
      fileSize: stat.size,
      collections: cols.length,
      published: entries?.n ?? 0,
      lastModified: last?.t ?? null,
    };
  } catch { return null; }
}

// GET /api/pods — list linked pods + current pod summary
podRoutes.get('/', (c) => {
  const db   = openPod(c.get('podPath'));
  const raw  = db.getMeta('pods.linked') ?? '[]';
  db.close();
  let linked = [];
  try { linked = JSON.parse(raw); } catch {}
  const current = podSummary(c.get('podPath'));
  const pods = [
    current ? { ...current, current: true } : null,
    ...linked.map(p => ({ ...podSummary(resolve(p)), current: false })).filter(Boolean),
  ].filter(Boolean);
  return c.json(pods);
});

// PUT /api/pods/linked — save linked pod paths
podRoutes.put('/linked', async (c) => {
  const { paths } = await c.req.json();
  if (!Array.isArray(paths)) return c.json({ error: 'paths must be an array' }, 400);
  const db = openPod(c.get('podPath'));
  db.setMeta('pods.linked', JSON.stringify(paths));
  db.close();
  return c.json({ ok: true });
});
