/**
 * @a83/orbiter-client
 *
 * Framework-agnostic client for Orbiter CMS.
 * Works in any Node.js environment: SvelteKit, Next.js, Nuxt, Remix, plain Node.
 *
 * Usage:
 *   import { createClient } from '@a83/orbiter-client';
 *   const orb = createClient('./content.pod');
 *   const posts = await orb.getCollection('posts');
 */
import { openPod } from '@a83/orbiter-core';
import { resolve } from 'node:path';

/**
 * Create an Orbiter client bound to a .pod file.
 *
 * The database connection is kept open for the lifetime of the client.
 * Call createClient() once (module level / server singleton) and reuse it
 * across requests for best performance.
 *
 * @param {string} podPath  Path to the .pod file, absolute or relative to CWD.
 * @returns {OrbiterClient}
 */
export function createClient(podPath) {
  const resolvedPath = resolve(process.cwd(), podPath);
  const db           = openPod(resolvedPath);

  const defaultLocale = db.getMeta('site.locale') ?? 'en';
  const rawLocales    = db.getMeta('site.locales') ?? defaultLocale;
  const localeList    = rawLocales.split(',').map(l => l.trim()).filter(Boolean);

  function resolveRelations(entries, colId) {
    const col = db.getCollection(colId);
    if (!col) return entries;
    const schema    = col.schema ? JSON.parse(col.schema) : {};
    const relFields = Object.entries(schema).filter(([, f]) => f.type === 'relation');
    if (!relFields.length) return entries;

    for (const entry of entries) {
      for (const [key, field] of relFields) {
        const raw  = entry.data[key];
        const ids  = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        const resolved = ids.map(id => {
          const row = db.db
            .prepare('SELECT * FROM _entries WHERE id = ? AND deleted_at IS NULL')
            .get(id);
          return row ? { ...row, data: JSON.parse(row.data) } : id;
        }).filter(Boolean);
        entry.data[key] = field.multiple !== false ? resolved : (resolved[0] ?? null);
      }
    }
    return entries;
  }

  return {
    /** Default locale string (e.g. `'en'`). */
    locale: defaultLocale,

    /** All configured locales (e.g. `['en', 'de', 'fr']`). */
    locales: localeList,

    /**
     * All published entries in a collection (default locale only).
     * @param {string} name  Collection id.
     */
    getCollection(name) {
      const entries = db
        .getEntries(name, { status: 'published' })
        .filter(e => (e.locale ?? '') === '');
      return Promise.resolve(resolveRelations(entries, name));
    },

    /**
     * Single published entry by slug (default locale).
     * Returns null if not found.
     */
    getEntry(collection, slug) {
      const entry = db.getEntry(collection, slug, '');
      if (entry) resolveRelations([entry], collection);
      return Promise.resolve(entry ?? null);
    },

    /**
     * Published entries for a specific locale.
     * Pass the locale code (e.g. `'de'`). The default locale maps to `''`
     * in the database — passing the first locale value handles this automatically.
     */
    getLocaleCollection(name, loc) {
      const dbLoc   = (!loc || loc === localeList[0]) ? '' : loc;
      const entries = db.getEntries(name, { status: 'published', locale: dbLoc });
      return Promise.resolve(resolveRelations(entries, name));
    },

    /**
     * Single entry for a specific locale with default-locale fallback.
     * If no translation exists for `loc`, returns the default-locale variant.
     */
    getLocaleEntry(collection, baseSlug, loc) {
      const dbLoc = (!loc || loc === localeList[0]) ? '' : loc;
      let entry   = db.getEntry(collection, baseSlug, dbLoc);
      if (!entry) entry = db.getEntry(collection, baseSlug, '');
      if (entry) resolveRelations([entry], collection);
      return Promise.resolve(entry ?? null);
    },

    /**
     * Any entry (any status) validated against the site's preview token.
     * Returns null if the token doesn't match.
     */
    getPreviewEntry(collection, slug, previewToken) {
      const storedToken = db.getMeta('preview.token');
      if (!previewToken || previewToken !== storedToken) return Promise.resolve(null);
      const row = db.db
        .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND deleted_at IS NULL')
        .get(collection, slug);
      if (!row) return Promise.resolve(null);
      return Promise.resolve({ ...row, data: JSON.parse(row.data) });
    },

    /** Close the database connection. Call when the process shuts down. */
    close() {
      db.close();
    },
  };
}
