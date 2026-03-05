/**
 * @orbiter/integration
 *
 * Astro integration that:
 * 1. Opens the .pod file at build/dev time
 * 2. Injects virtual module `orbiter:collections`
 * 3. Injects admin routes under /orbiter
 */
import { openPod } from '@orbiter/core';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const VIRTUAL_MODULE_ID = 'orbiter:collections';
const RESOLVED_ID = `\0${VIRTUAL_MODULE_ID}`;

const VIRTUAL_DB_ID = 'orbiter:db';
const RESOLVED_DB_ID = `\0${VIRTUAL_DB_ID}`;

/**
 * @param {{ pod: string }} options
 * @returns {import('astro').AstroIntegration}
 */
export default function orbiter(options = {}) {
  const podPath = options.pod ?? './content.pod';

  return {
    name: '@orbiter/integration',

    hooks: {
      'astro:config:setup': ({ updateConfig, config, injectRoute, logger }) => {
        logger.info(`◆ Orbiter — loading pod: ${podPath}`);

        // ── Inject admin routes ──────────────────


        const __dirname = dirname(fileURLToPath(import.meta.url));
        const routesDir = resolve(__dirname, '../routes');

        injectRoute({
          pattern:    '/orbiter',
          entrypoint: resolve(routesDir, 'dashboard.astro'),
        });
        injectRoute({
          pattern:    '/orbiter/[collection]',
          entrypoint: resolve(routesDir, 'collection.astro'),
        });
        injectRoute({
          pattern:    '/orbiter/[collection]/[slug]',
          entrypoint: resolve(routesDir, 'editor.astro'),
        });
        injectRoute({
          pattern:    '/orbiter/media',
          entrypoint: resolve(routesDir, 'media.astro'),
        });
        injectRoute({
          pattern:    '/orbiter/settings',
          entrypoint: resolve(routesDir, 'settings.astro'),
        });

        // ── Vite virtual modules ─────────────────
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'orbiter-virtual',
                resolveId(id) {
                  if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
                  if (id === VIRTUAL_DB_ID) return RESOLVED_DB_ID;
                },
                load(id) {
                  const resolvedPodPath = resolve(
                    config.root.pathname,
                    podPath
                  );

                  // orbiter:collections — static snapshot for build
                  if (id === RESOLVED_ID) {
                    const db = openPod(resolvedPodPath);
                    const collections = db.getCollections();
                    const snapshot = {};
                    for (const col of collections) {
                      snapshot[col.id] = db.getEntries(col.id, { status: 'published' });
                    }
                    db.close();

                    return `
export const collections = ${JSON.stringify(snapshot, null, 2)};

export function getCollection(name) {
  return Promise.resolve(collections[name] ?? []);
}

export function getEntry(collection, slug) {
  const entries = collections[collection] ?? [];
  return Promise.resolve(entries.find(e => e.slug === slug) ?? null);
}
`;
                  }

                  // orbiter:db — live db access for admin routes
                  if (id === RESOLVED_DB_ID) {
                    return `
export const podPath = ${JSON.stringify(resolvedPodPath)};
`;
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
