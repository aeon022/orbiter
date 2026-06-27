import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const qualityRoutes = new Hono();

// GET /api/quality — aggregate content quality report across all published entries
qualityRoutes.get('/', (c) => {
  const db   = openPod(c.get('podPath'));
  const cols = db.getCollections();
  const issues = [];

  for (const col of cols) {
    let schema = {};
    try { schema = col.schema ? JSON.parse(col.schema) : {}; } catch {}
    const hasBody  = 'body'   in schema;
    const hasImage = Object.values(schema).some(f => f.type === 'image' || f.type === 'media');
    const hasSeo   = Object.values(schema).some(f => f.key === '_seo' || f.type === 'seo');

    const entries = db.db.prepare(
      `SELECT slug, data FROM _entries WHERE collection_id = ? AND status = 'published'`
    ).all(col.id);

    for (const row of entries) {
      let data = {};
      try { data = JSON.parse(row.data); } catch {}

      if (hasBody && !data.body?.trim?.()) {
        issues.push({ col: col.id, colLabel: col.label, slug: row.slug, type: 'no-body',  label: 'No body content' });
      } else if (hasBody && data.body) {
        const len = data.body.replace(/<[^>]+>/g, '').trim().length;
        if (len < 100) issues.push({ col: col.id, colLabel: col.label, slug: row.slug, type: 'short-body', label: `Body too short (${len} chars)` });
      }
      if (hasImage && !Object.values(data).some(v => v && typeof v === 'string' && /\.(jpg|jpeg|png|webp|gif|avif|svg)/i.test(v))) {
        issues.push({ col: col.id, colLabel: col.label, slug: row.slug, type: 'no-image', label: 'No image' });
      }
      if (!data._seo?.title) {
        issues.push({ col: col.id, colLabel: col.label, slug: row.slug, type: 'no-seo-title', label: 'No SEO title' });
      }
      if (!data._seo?.description) {
        issues.push({ col: col.id, colLabel: col.label, slug: row.slug, type: 'no-seo-desc', label: 'No SEO description' });
      }
    }
  }

  db.close();

  const byType = {};
  for (const i of issues) byType[i.type] = (byType[i.type] ?? 0) + 1;
  return c.json({ total: issues.length, byType, issues: issues.slice(0, 50) });
});
