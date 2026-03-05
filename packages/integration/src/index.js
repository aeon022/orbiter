/**
 * @orbiter/integration
 *
 * Astro integration that:
 * 1. Opens the .pod file at build/dev time
 * 2. Injects a virtual module `orbiter:collections`
 *    that mirrors Astro's content collection API
 */
import { openPod } from '@orbiter/core';
import { resolve } from 'node:path';

const VIRTUAL_MODULE_ID = 'orbiter:collections';
const RESOLVED_ID = `\0${VIRTUAL_MODULE_ID}`;

/**
 * @param {{ pod: string }} options
 * @returns {import('astro').AstroIntegration}
 */
export default function orbiter(options = {}) {
  const podPath = options.pod ?? './content.pod';

  return {
    name: '@orbiter/integration',

    hooks: {
      'astro:config:setup': ({ updateConfig, config, logger }) => {
        logger.info(`◆ Orbiter — loading pod: ${podPath}`);

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'orbiter-virtual',
                resolveId(id) {
                  if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
                },
                load(id) {
                  if (id !== RESOLVED_ID) return;

                  const db = openPod(resolve(config.root.pathname, podPath));
                  const collections = db.getCollections();

                  // Build a static snapshot for the virtual module
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
                },
              },
            ],
          },
        });
      },
    },
  };
}
