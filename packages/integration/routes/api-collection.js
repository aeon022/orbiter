export const prerender = false;

/**
 * GET /orbiter/api/[collection]
 * Read-only JSON API for published content.
 *
 * Auth: requires api.enabled = '1' in _meta (set in Settings → API).
 *       Optionally, if api.token is set, requests must include:
 *         Authorization: Bearer <token>
 *
 * Query params:
 *   ?status=draft       include drafts (only when authenticated with token)
 *   ?limit=20
 *   ?offset=0
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const JSON_H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const err = (msg, status) => new Response(JSON.stringify({ error: msg }), { status, headers: JSON_H });

export async function GET({ params, request }) {
  const { collection } = params;
  const url = new URL(request.url);

  const db      = openPod(podPath);
  const enabled = db.getMeta('api.enabled') === '1';
  const token   = db.getMeta('api.token') ?? '';

  if (!enabled) { db.close(); return err('API not enabled. Enable it in Settings → API.', 403); }

  // Token auth (optional — if no token set, all requests are allowed)
  let authed = !token;
  if (token) {
    const auth = request.headers.get('Authorization') ?? '';
    authed = auth === `Bearer ${token}`;
    if (!authed) { db.close(); return err('Unauthorized', 401); }
  }

  const col = db.getCollection(collection);
  if (!col) { db.close(); return err(`Collection "${collection}" not found`, 404); }

  // Status filter: only allow drafts with valid token
  const statusParam = url.searchParams.get('status');
  const status      = (authed && statusParam === 'draft') ? 'draft' : 'published';

  const limit  = Math.min(parseInt(url.searchParams.get('limit')  ?? '100'), 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0'),   0);

  const all     = db.getEntries(collection, { status });
  const sliced  = all.slice(offset, offset + limit);
  db.close();

  return new Response(JSON.stringify({
    collection,
    total:  all.length,
    limit,
    offset,
    entries: sliced,
  }), { headers: JSON_H });
}
