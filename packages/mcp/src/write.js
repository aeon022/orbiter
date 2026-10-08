/**
 * Draft-only write operations for MCP. By construction an agent can create and edit
 * DRAFTS and nothing else: it can't publish, schedule, delete, or touch an entry that
 * is already published/scheduled. A human publishes in the admin.
 */
const SLUG_RE   = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const MAX_BYTES = 200_000;

function guard(db, { collection, slug, data }, allowed) {
  if (allowed && !allowed.includes(collection)) throw new Error(`This API key may not write to "${collection}"`);
  if (!db.getCollection(collection)) throw new Error(`Collection "${collection}" not found`);
  if (!SLUG_RE.test(slug ?? '')) throw new Error('slug must be lowercase letters, digits, "-" or "_" (max 128)');
  if (data == null || typeof data !== 'object' || Array.isArray(data)) throw new Error('data must be an object');
  if (JSON.stringify(data).length > MAX_BYTES) throw new Error('data too large');
}

export function createDraft(db, args, { allowed, actor }) {
  guard(db, args, allowed);
  const locale = args.locale ?? '';
  if (db.getEntry(args.collection, args.slug, locale)) throw new Error(`Entry "${args.slug}" already exists — use update_draft`);
  const id = db.createEntry(args.collection, args.slug, args.data, 'draft', locale);
  db.logAudit(id, actor, 'create');
  return { ok: true, collection: args.collection, slug: args.slug, status: 'draft' };
}

export function updateDraft(db, args, { allowed, actor }) {
  guard(db, args, allowed);
  const locale = args.locale ?? '';
  const entry  = db.getEntry(args.collection, args.slug, locale);
  if (!entry) throw new Error(`Entry "${args.slug}" not found — use create_draft`);
  if (entry.status !== 'draft') throw new Error(`Entry is ${entry.status}; only drafts can be edited over MCP`);
  db.updateEntry(args.collection, args.slug, { slug: args.slug, data: { ...entry.data, ...args.data }, status: 'draft', locale });
  db.logAudit(entry.id, actor, 'update');
  return { ok: true, collection: args.collection, slug: args.slug, status: 'draft' };
}
