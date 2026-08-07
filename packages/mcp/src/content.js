/**
 * mode: 'trusted' (stdio, local) — full access, no restrictions.
 * mode: 'public' (http, remote) — same restrictions as the Public Content API
 * (packages/integration/routes/public-collection.js / public-entry.js):
 * collection must be opted in via `public.collections` meta, only
 * `status: 'published'` entries are visible.
 */

function publicCollectionScope(db) {
  const raw = db.getMeta('public.collections') ?? '';
  const all = raw.trim() === '*';
  const set = all ? null : new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
  return { all, set };
}

function isCollectionAccessible(db, mode, collectionId) {
  if (mode === 'trusted') return true;
  const { all, set } = publicCollectionScope(db);
  return all || set.has(collectionId);
}

function siteUrlOf(db) {
  return (db.getMeta('site.url') ?? '').replace(/\/$/, '');
}

function entryShape(e, collection, siteUrl) {
  const d = e.data ?? {};
  return {
    slug: e.slug,
    title: d.title ?? e.slug,
    excerpt: d.excerpt ?? d.summaryMachine ?? null,
    date: (e.updated_at ?? e.created_at ?? '').split(' ')[0] || null,
    author: d.author ?? d.authorName ?? null,
    image: d.image?.url ?? d.coverImage?.url ?? null,
    tags: Array.isArray(d.tags) ? d.tags : null,
    url: siteUrl ? `${siteUrl}/${collection}/${e.slug}` : `/${collection}/${e.slug}`,
  };
}

function fullEntryShape(entry, collection, siteUrl) {
  const d = entry.data ?? {};
  return {
    slug: entry.slug,
    title: d.title ?? entry.slug,
    excerpt: d.excerpt ?? d.summaryMachine ?? null,
    body: d.body ?? d.content ?? null,
    date: (entry.updated_at ?? entry.created_at ?? '').split(' ')[0] || null,
    publishedAt: (entry.publish_at ?? entry.created_at ?? '').split(' ')[0] || null,
    author: d.author ?? d.authorName ?? null,
    image: d.image?.url ?? d.coverImage?.url ?? null,
    tags: Array.isArray(d.tags) ? d.tags : null,
    seo: {
      title: d._seo?.title ?? d.title ?? null,
      description: d._seo?.description ?? d.excerpt ?? null,
    },
    url: siteUrl ? `${siteUrl}/${collection}/${entry.slug}` : `/${collection}/${entry.slug}`,
  };
}

export function listCollections(db, mode) {
  const cols = db.getCollections().filter(c => isCollectionAccessible(db, mode, c.id));
  const statusOpts = mode === 'public' ? { status: 'published' } : {};
  return cols.map(c => ({
    id: c.id,
    label: c.label,
    total: db.getEntries(c.id, statusOpts).length,
  }));
}

export function getEntries(db, mode, { collection, status, locale, limit = 20, offset = 0 } = {}) {
  if (!collection) throw new Error('Missing required param: collection');
  if (!isCollectionAccessible(db, mode, collection)) {
    throw new Error(`Collection "${collection}" is not accessible`);
  }
  if (!db.getCollection(collection)) {
    throw new Error(`Collection "${collection}" not found`);
  }

  const opts = {};
  const effectiveStatus = mode === 'public' ? 'published' : status;
  if (effectiveStatus !== undefined) opts.status = effectiveStatus;
  if (locale !== undefined) opts.locale = locale;

  const all = db.getEntries(collection, opts);
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const siteUrl = siteUrlOf(db);

  return {
    collection,
    total: all.length,
    limit: lim,
    offset: off,
    entries: all.slice(off, off + lim).map(e => entryShape(e, collection, siteUrl)),
  };
}

export function getEntry(db, mode, { collection, slug, locale } = {}) {
  if (!collection || !slug) throw new Error('Missing required params: collection, slug');
  if (!isCollectionAccessible(db, mode, collection)) {
    throw new Error(`Collection "${collection}" is not accessible`);
  }

  const entry = db.getEntry(collection, slug, locale ?? '');
  if (!entry || (mode === 'public' && entry.status !== 'published')) {
    throw new Error(`Entry "${collection}/${slug}" not found`);
  }

  return fullEntryShape(entry, collection, siteUrlOf(db));
}

export function searchContent(db, mode, { collection, query, limit = 20 } = {}) {
  if (!query) throw new Error('Missing required param: query');
  if (collection && !isCollectionAccessible(db, mode, collection)) {
    throw new Error(`Collection "${collection}" is not accessible`);
  }

  const q = String(query).toLowerCase().trim();
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const siteUrl = siteUrlOf(db);
  const targetIds = collection
    ? [collection]
    : db.getCollections().map(c => c.id).filter(id => isCollectionAccessible(db, mode, id));

  const opts = mode === 'public' ? { status: 'published' } : {};
  const results = [];

  for (const id of targetIds) {
    if (!db.getCollection(id)) continue;
    for (const e of db.getEntries(id, opts)) {
      const d = e.data ?? {};
      const haystack = `${d.title ?? ''} ${d.excerpt ?? ''} ${d.body ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) continue;
      results.push({ collection: id, ...entryShape(e, id, siteUrl) });
      if (results.length >= lim) break;
    }
    if (results.length >= lim) break;
  }

  return { query, total: results.length, results };
}
