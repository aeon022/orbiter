export const prerender = false;

/**
 * GET /api/public
 * Discovery endpoint — lists all publicly accessible collections.
 * Returns collection metadata so agents can explore available content.
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const JSON_H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
};

export async function GET({ request }) {
  const db = openPod(podPath);

  const rawPublic = db.getMeta('public.collections') ?? '';
  const publicAll = rawPublic.trim() === '*';
  const publicSet = publicAll
    ? null
    : new Set(rawPublic.split(',').map(s => s.trim()).filter(Boolean));

  if (!publicAll && !publicSet?.size) {
    db.close();
    return new Response(JSON.stringify({ error: 'Public API not enabled' }), { status: 403, headers: JSON_H });
  }

  const siteUrl  = (db.getMeta('site.url') ?? '').replace(/\/$/, '');
  const siteName = db.getMeta('site.name') ?? '';
  const siteDesc = db.getMeta('site.description') ?? '';
  const requireKey = db.getMeta('api.requireKey') === '1';

  const cols = db.getCollections().filter(c => publicAll || publicSet.has(c.id));

  const collections = cols.map(col => {
    const total = db.db.prepare(
      `SELECT COUNT(*) AS n FROM _entries WHERE collection_id = ? AND status = 'published'`
    ).get(col.id)?.n ?? 0;
    return {
      id:    col.id,
      label: col.label || col.id,
      total,
      url:   `${siteUrl}/api/public/${col.id}`,
    };
  });

  db.close();

  return new Response(JSON.stringify({
    name:        siteName,
    description: siteDesc,
    url:         siteUrl || null,
    auth:        requireKey ? 'bearer' : 'none',
    collections,
    links: {
      openapi:  `${siteUrl}/api/public/openapi.json`,
      llms:     siteUrl ? `${siteUrl}/llms.txt` : null,
    },
  }, null, 2), { headers: JSON_H });
}
