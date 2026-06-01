export const prerender = false;

/**
 * GET /orbiter/rss/[collection].xml
 * RSS 2.0 feed for published entries in a collection.
 * Uses site.name, site.url, site.description from _meta.
 * Entry title comes from data.title, date from updated_at.
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const XML_H = { 'Content-Type': 'application/rss+xml; charset=utf-8' };
const esc   = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET({ params }) {
  const collectionId = params.collection.replace(/\.xml$/, '');
  const db = openPod(podPath);

  const col = db.getCollection(collectionId);
  if (!col) { db.close(); return new Response('Collection not found', { status: 404 }); }

  const siteUrl  = (db.getMeta('site.url') ?? '').replace(/\/$/, '');
  const siteName = db.getMeta('site.name') ?? 'Orbiter Site';
  const siteDesc = db.getMeta('site.description') ?? '';
  const entries  = db.getEntries(collectionId, { status: 'published' });
  db.close();

  const items = entries.map(e => {
    const title   = esc(e.data?.title ?? e.slug);
    const link    = siteUrl ? `${siteUrl}/${collectionId}/${e.slug}` : '';
    const pubDate = new Date(e.updated_at.replace(' ', 'T') + 'Z').toUTCString();
    const desc    = esc(e.data?.excerpt ?? e.data?.description ?? e.data?.summary ?? '');
    return `    <item>
      <title>${title}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="${link ? 'true' : 'false'}">${link || e.id}</guid>
      <pubDate>${pubDate}</pubDate>${desc ? `\n      <description>${desc}</description>` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(siteName)}</title>
    <link>${esc(siteUrl)}</link>
    <description>${esc(siteDesc)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: XML_H });
}
