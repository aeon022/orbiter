export const prerender = false;

/**
 * GET /orbiter/sitemap.xml
 * XML sitemap for all published entries across all collections.
 * Uses site.url from _meta for absolute URLs.
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const XML_H = { 'Content-Type': 'application/xml; charset=utf-8' };
const esc   = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
  const db = openPod(podPath);

  const siteUrl = (db.getMeta('site.url') ?? '').replace(/\/$/, '');
  const cols    = db.getCollections();

  const urls = [];
  for (const col of cols) {
    const entries = db.getEntries(col.id, { status: 'published' });
    for (const e of entries) {
      const loc     = siteUrl ? `${siteUrl}/${col.id}/${e.slug}` : `/${col.id}/${e.slug}`;
      const lastmod = e.updated_at.replace(' ', 'T').replace(/(\d{2}:\d{2}:\d{2})$/, '$1Z');
      urls.push(`  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`);
    }
  }
  db.close();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, { headers: XML_H });
}
