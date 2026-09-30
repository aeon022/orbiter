export const prerender = false;

/**
 * GET /api/public/[collection]/[slug]
 * Single entry — includes full body content.
 */
import { podPath } from 'orbiter:db';
import { openPod, checkApiKey } from '@a83/orbiter-core';

const JSON_H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=60',
};
const err = (msg, status) => new Response(JSON.stringify({ error: msg }), { status, headers: JSON_H });

export async function GET({ params, request }) {
  const { collection, slug } = params;

  const db = openPod(podPath);

  if (!checkApiKey(db, request.headers.get('authorization'))) {
    db.close();
    return err('Unauthorized — provide a valid API key as Bearer token', 401);
  }

  const rawPublic = db.getMeta('public.collections') ?? '';
  const publicAll = rawPublic.trim() === '*';
  const publicSet = publicAll
    ? null
    : new Set(rawPublic.split(',').map(s => s.trim()).filter(Boolean));

  if (!publicAll && !publicSet?.has(collection)) {
    db.close();
    return err(`Collection "${collection}" is not publicly accessible`, 403);
  }

  const entry = db.getEntry(collection, slug);
  if (!entry || entry.status !== 'published') {
    db.close();
    return err('Not found', 404);
  }

  const siteUrl = (db.getMeta('site.url') ?? '').replace(/\/$/, '');
  const d = entry.data ?? {};

  db.close();

  return new Response(JSON.stringify({
    slug:        entry.slug,
    title:       d.title ?? entry.slug,
    excerpt:     d.excerpt ?? d.summaryMachine ?? null,
    body:        d.body ?? d.content ?? null,
    date:        (entry.updated_at ?? entry.created_at ?? '').split(' ')[0] || null,
    publishedAt: (entry.publish_at ?? entry.created_at ?? '').split(' ')[0] || null,
    author:      d.author ?? d.authorName ?? null,
    image:       d.image?.url ?? d.coverImage?.url ?? null,
    tags:        Array.isArray(d.tags) ? d.tags : null,
    seo: {
      title:       d._seo?.title ?? d.title ?? null,
      description: d._seo?.description ?? d.excerpt ?? null,
    },
    url:         siteUrl ? `${siteUrl}/${collection}/${entry.slug}` : `/${collection}/${entry.slug}`,
  }, null, 2), { headers: JSON_H });
}
