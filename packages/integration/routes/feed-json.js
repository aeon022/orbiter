export const prerender = false;

/**
 * GET /orbiter/feed.json
 * JSON Feed v1.1 — structured content for AI agents and feed readers.
 * Supports ?depth=0-3 to filter fields by semantic depth level.
 * Supports ?collections=col1,col2 to filter by collection.
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const JSON_H = { 'Content-Type': 'application/feed+json; charset=utf-8' };

export async function GET({ url }) {
  const db = openPod(podPath);

  const siteName = db.getMeta('site.name') || 'Orbiter Site';
  const siteUrl  = (db.getMeta('site.url') || '').replace(/\/$/, '');
  const siteDesc = db.getMeta('site.description') || '';

  const depthParam = url.searchParams.get('depth');
  const maxDepth = depthParam != null ? parseInt(depthParam) : null;
  const colsParam = url.searchParams.get('collections');
  const allowedCols = colsParam
    ? new Set(colsParam.split(',').map(s => s.trim()).filter(Boolean))
    : null;

  const cols = db.getCollections();
  const items = [];

  for (const col of cols) {
    if (allowedCols && !allowedCols.has(col.id)) continue;

    const schema = col.schema ? JSON.parse(col.schema) : {};
    const entries = db.getEntries(col.id, { status: 'published' });

    for (const e of entries) {
      const d = e.data;
      const entryUrl = siteUrl ? `${siteUrl}/${col.id}/${e.slug}` : `/${col.id}/${e.slug}`;

      const data = {};
      if (maxDepth != null) {
        for (const [key, field] of Object.entries(schema)) {
          const fieldDepth = field.depth ?? 0;
          if (fieldDepth <= maxDepth && d[key] != null) data[key] = d[key];
        }
      } else {
        Object.assign(data, d);
      }

      const item = {
        id: entryUrl,
        url: entryUrl,
        title: data.title || d.title || e.slug,
        date_published: (e.created_at || '').replace(' ', 'T') + 'Z',
        date_modified: (e.updated_at || '').replace(' ', 'T') + 'Z',
      };

      if (data.summaryMachine || data.excerpt) item.summary = data.summaryMachine || data.excerpt;
      if (data.body) item.content_html = data.body;
      if (data.keywords) item.tags = Array.isArray(data.keywords) ? data.keywords : [];
      if (data.hero && siteUrl) item.image = `${siteUrl}/orbiter/media/${data.hero}`;

      item._orbiter = {
        collection: col.id,
        slug: e.slug,
      };
      if (data.author) item._orbiter.author = data.author;
      if (data.authorship) item._orbiter.authorship = data.authorship;
      if (data.contentType) item._orbiter.contentType = data.contentType;
      if (data.dossierId) item._orbiter.dossierId = data.dossierId;

      items.push(item);
    }
  }

  db.close();

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: siteName,
    description: siteDesc || undefined,
    home_page_url: siteUrl || undefined,
    feed_url: siteUrl ? `${siteUrl}/orbiter/feed.json` : '/orbiter/feed.json',
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), { headers: JSON_H });
}
