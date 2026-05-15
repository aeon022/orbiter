/**
 * @a83/orbiter-integration
 *
 * Astro integration that:
 * 1. Opens the .pod file at build/dev time
 * 2. Injects virtual module `orbiter:collections` — read published content in Astro pages
 * 3. Injects virtual module `orbiter:db` — pod path for custom server routes
 * 4. Serves media BLOBs at /orbiter/media/[id]
 * 5. Exposes a read-only JSON API at /orbiter/api/[collection]
 *
 * The admin UI runs separately via @a83/orbiter-admin.
 */
import { openPod } from '@a83/orbiter-core';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VIRTUAL_COLLECTIONS_ID = 'orbiter:collections';
const RESOLVED_COLLECTIONS_ID = `\0${VIRTUAL_COLLECTIONS_ID}`;

const VIRTUAL_DB_ID = 'orbiter:db';
const RESOLVED_DB_ID = `\0${VIRTUAL_DB_ID}`;

/**
 * @param {{ pod: string }} options
 * @returns {import('astro').AstroIntegration}
 */
export default function orbiter(options = {}) {
  const podPath = options.pod ?? './content.pod';

  return {
    name: '@a83/orbiter-integration',

    hooks: {
      'astro:config:setup': ({ updateConfig, config, injectRoute, logger }) => {
        logger.info(`◆ Orbiter — loading pod: ${podPath}`);

        const routesDir = resolve(__dirname, '../routes');

        // Media BLOB serving — public, no auth required
        injectRoute({
          pattern:    '/orbiter/media/[id]',
          entrypoint: resolve(routesDir, 'media-serve.astro'),
        });

        // Read-only JSON API
        injectRoute({
          pattern:    '/orbiter/api/[collection]',
          entrypoint: resolve(routesDir, 'api-collection.js'),
        });

        // ── Vite virtual modules ─────────────────
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'orbiter-virtual',
                resolveId(id) {
                  if (id === VIRTUAL_COLLECTIONS_ID) return RESOLVED_COLLECTIONS_ID;
                  if (id === VIRTUAL_DB_ID)          return RESOLVED_DB_ID;
                },
                load(id) {
                  const resolvedPodPath = resolve(
                    config.root.pathname,
                    podPath
                  );

                  // orbiter:collections — static snapshot of published content for build
                  if (id === RESOLVED_COLLECTIONS_ID) {
                    const db = openPod(resolvedPodPath);
                    const collections = db.getCollections();
                    const snapshot = {};
                    for (const col of collections) {
                      snapshot[col.id] = db.getEntries(col.id, { status: 'published' });
                    }

                    const defaultLocale = db.getMeta('site.locale') ?? 'en';
                    const rawLocales    = db.getMeta('site.locales') ?? defaultLocale;
                    const locales       = rawLocales.split(',').map(l => l.trim()).filter(Boolean);

                    // Resolve relation fields inline
                    const byId = {};
                    for (const entries of Object.values(snapshot)) {
                      for (const e of entries) byId[e.id] = e;
                    }
                    for (const col of collections) {
                      const colSchema = col.schema ? JSON.parse(col.schema) : {};
                      const relFields = Object.entries(colSchema).filter(([, f]) => f.type === 'relation');
                      if (!relFields.length) continue;
                      for (const entry of snapshot[col.id] ?? []) {
                        for (const [key, field] of relFields) {
                          const raw = entry.data[key];
                          const ids = Array.isArray(raw) ? raw : (raw ? [raw] : []);
                          const resolved = ids.map(id => byId[id] ?? id).filter(Boolean);
                          entry.data[key] = field.multiple !== false ? resolved : (resolved[0] ?? null);
                        }
                      }
                    }

                    db.close();

                    return `
export const collections = ${JSON.stringify(snapshot, null, 2)};

/** Default locale (e.g. "de") */
export const locale = ${JSON.stringify(defaultLocale)};

/** All configured locales (e.g. ["de", "en"]) */
export const locales = ${JSON.stringify(locales)};

export function getCollection(name) {
  return Promise.resolve(collections[name] ?? []);
}

export function getEntry(collection, slug) {
  const entries = collections[collection] ?? [];
  return Promise.resolve(entries.find(e => e.slug === slug) ?? null);
}

export function getLocaleCollection(name, loc) {
  const sep = '--';
  const all = collections[name] ?? [];
  if (!loc) return Promise.resolve(all.filter(e => !e.slug.includes(sep)));
  return Promise.resolve(all.filter(e => e.slug.endsWith(sep + loc)));
}

export function getLocaleEntry(collection, baseSlug, loc) {
  const sep = '--';
  const entries = collections[collection] ?? [];
  const variant = loc ? entries.find(e => e.slug === baseSlug + sep + loc) : null;
  if (variant) return Promise.resolve(variant);
  return Promise.resolve(entries.find(e => e.slug === baseSlug) ?? null);
}
`;
                  }

                  // orbiter:db — pod path for custom server routes
                  if (id === RESOLVED_DB_ID) {
                    return `export const podPath = ${JSON.stringify(resolvedPodPath)};`;
                  }
                },
              },
            ],
          },
        });
      },
    },
  };
}
