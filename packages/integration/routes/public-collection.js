export const prerender = false;

/**
 * GET /api/public/[collection]
 * Unauthenticated read-only API for published content.
 * Collections must be opt-in via Settings → Public API (meta key: public.collections).
 *
 * Query params:
 *   ?limit=20   max 100
 *   ?offset=0
 *   ?q=keyword  simple title/body search
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const JSON_H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
};
const err = (msg, status) => new Response(JSON.stringify({ error: msg }), { status, headers: JSON_H });

function checkApiKey(db, request) {
  const requireKey = db.getMeta('api.requireKey');
  if (requireKey !== '1') return true;
  const authHeader = request.headers.get('authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return false;
  try {
    const keys = JSON.parse(db.getMeta('api.keys') ?? '[]');
    const found = keys.find(k => k.key === bearer);
    if (!found) return false;
    found.hits = (found.hits || 0) + 1;
    found.lastUsed = new Date().toISOString().split('T')[0];
    db.setMeta('api.keys', JSON.stringify(keys));
    return true;
  } catch { return false; }
}

export async function GET({ params, request }) {
  const { collection } = params;
  const url = new URL(request.url);

  const db = openPod(podPath);

  if (!checkApiKey(db, request)) {
    db.close();
    return err('Unauthorized — provide a valid API key as Bearer token', 401);
  }

  // Per-collection opt-in: public.collections = "posts,pages" or "*"
  const rawPublic = db.getMeta('public.collections') ?? '';
  const publicAll = rawPublic.trim() === '*';
  const publicSet = publicAll
    ? null
    : new Set(rawPublic.split(',').map(s => s.trim()).filter(Boolean));

  if (!publicAll && !publicSet?.has(collection)) {
    db.close();
    return err(`Collection "${collection}" is not publicly accessible`, 403);
  }

  const col = db.getCollection(collection);
  if (!col) { db.close(); return err(`Collection "${collection}" not found`, 404); }

  const limit  = Math.min(parseInt(url.searchParams.get('limit')  ?? '20'), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0'),  0);
  const q      = (url.searchParams.get('q') ?? '').toLowerCase().trim();
  const siteUrl = (db.getMeta('site.url') ?? '').replace(/\/$/, '');

  let all = db.getEntries(collection, { status: 'published' });

  if (q) {
    all = all.filter(e => {
      const d = e.data ?? {};
      return (d.title ?? '').toLowerCase().includes(q)
          || (d.excerpt ?? '').toLowerCase().includes(q)
          || (d.body ?? '').toLowerCase().includes(q);
    });
  }

  const sliced = all.slice(offset, offset + limit).map(e => entryShape(e, collection, siteUrl));
  db.close();

  return new Response(JSON.stringify({
    collection,
    total: all.length,
    limit,
    offset,
    entries: sliced,
  }, null, 2), { headers: JSON_H });
}

function entryShape(e, collection, siteUrl) {
  const d = e.data ?? {};
  return {
    slug:    e.slug,
    title:   d.title ?? e.slug,
    excerpt: d.excerpt ?? d.summaryMachine ?? null,
    date:    (e.updated_at ?? e.created_at ?? '').split(' ')[0] || null,
    author:  d.author ?? d.authorName ?? null,
    image:   d.image?.url ?? d.coverImage?.url ?? null,
    tags:    Array.isArray(d.tags) ? d.tags : null,
    url:     siteUrl ? `${siteUrl}/${collection}/${e.slug}` : `/${collection}/${e.slug}`,
  };
}
