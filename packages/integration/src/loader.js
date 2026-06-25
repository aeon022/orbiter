/**
 * @a83/orbiter-integration/loader
 *
 * Astro Content Layer loaders for Orbiter CMS.
 *
 * Build-time:
 *   import { orbiterLoader } from '@a83/orbiter-integration/loader';
 *   const posts = defineCollection({ loader: orbiterLoader({ pod: './content.pod', collection: 'posts' }) });
 *
 * Live (SSR/hybrid):
 *   import { orbiterLiveLoader } from '@a83/orbiter-integration/loader';
 *   const posts = defineCollection({ type: 'live', loader: orbiterLiveLoader({ pod: './content.pod', collection: 'posts' }) });
 */
import { openPod } from '@a83/orbiter-core';
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';

function resolvePodPath(pod, config) {
  if (!pod) throw new Error('orbiterLoader: pod path is required');
  const root = config?.root?.pathname || process.cwd();
  return resolve(root, pod);
}

function findBodyField(schema) {
  for (const [key, def] of Object.entries(schema)) {
    if (def.type === 'richtext') return key;
  }
  return null;
}

function resolveRelations(entries, schema, db) {
  const relFields = Object.entries(schema).filter(([, f]) => f.type === 'relation');
  if (!relFields.length) return;
  for (const entry of entries) {
    for (const [key, field] of relFields) {
      const raw = entry.data[key];
      const ids = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      const resolved = ids.map(id => {
        const row = db.db.prepare('SELECT * FROM _entries WHERE id = ? AND deleted_at IS NULL').get(id);
        return row ? { id: row.id, slug: row.slug, collection_id: row.collection_id, data: JSON.parse(row.data) } : id;
      }).filter(Boolean);
      entry.data[key] = field.multiple !== false ? resolved : (resolved[0] ?? null);
    }
  }
}

function withSeo(entry) {
  const s = entry.data?._seo ?? {};
  return {
    ...entry,
    data: {
      ...entry.data,
      _seo: { title: s.title ?? '', description: s.description ?? '', ogImage: s.ogImage ?? '' },
    },
  };
}

/**
 * Build-time Content Layer loader.
 * Reads published entries from the pod at build time and stores them in Astro's data store.
 * In dev mode, watches the pod file for changes and triggers hot reload.
 *
 * @param {{ pod: string, collection: string, status?: string, locale?: string }} options
 * @returns {import('astro').Loader}
 */
export function orbiterLoader(options) {
  const { pod, collection, status = 'published', locale } = options;
  let watcherRegistered = false;

  return {
    name: '@a83/orbiter-loader',

    async load(context) {
      const { store, meta, logger, config, generateDigest, watcher } = context;
      const podPath = resolvePodPath(pod, config);

      if (!existsSync(podPath)) {
        logger.warn(`Pod file not found: ${podPath}`);
        return;
      }

      const db = openPod(podPath);
      const col = db.getCollection(collection);
      if (!col) {
        logger.warn(`Collection "${collection}" not found in pod`);
        db.close();
        return;
      }

      const schema = col.schema ? (typeof col.schema === 'string' ? JSON.parse(col.schema) : col.schema) : {};
      const bodyField = findBodyField(schema);

      const fetchOpts = { status };
      if (locale !== undefined) fetchOpts.locale = locale;
      const entries = db.getEntries(collection, fetchOpts);

      resolveRelations(entries, schema, db);

      const digest = generateDigest(JSON.stringify(entries.map(e => e.id + e.updated_at)));
      const lastDigest = meta.get('digest');
      if (lastDigest === digest) {
        logger.info(`◆ ${collection}: unchanged (${entries.length} entries)`);
        db.close();
        return;
      }

      store.clear();

      for (const entry of entries) {
        const enriched = withSeo(entry);
        const body = bodyField ? (enriched.data[bodyField] || '') : undefined;

        store.set({
          id: entry.slug,
          data: enriched.data,
          body,
          digest: generateDigest(JSON.stringify(enriched.data)),
        });
      }

      meta.set('digest', digest);
      logger.info(`◆ ${collection}: loaded ${entries.length} entries`);
      db.close();

      // Hot reload: watch the pod file for changes
      if (watcher && !watcherRegistered) {
        watcherRegistered = true;
        watcher.add(podPath);
        logger.info(`◆ ${collection}: watching ${pod} for changes`);
      }
    },
  };
}

/**
 * Live Content Layer loader for SSR/hybrid mode.
 * Queries the pod at request time — no build-time snapshot needed.
 *
 * @param {{ pod: string, collection: string, status?: string }} options
 * @returns {import('astro').LiveLoader}
 */
export function orbiterLiveLoader(options) {
  const { pod, collection, status = 'published' } = options;

  return {
    name: '@a83/orbiter-live-loader',

    async loadEntry({ filter }) {
      const podPath = resolve(process.cwd(), pod);
      if (!existsSync(podPath)) return undefined;

      const db = openPod(podPath);
      const col = db.getCollection(collection);
      if (!col) { db.close(); return undefined; }

      const schema = col.schema ? (typeof col.schema === 'string' ? JSON.parse(col.schema) : col.schema) : {};
      const entry = db.getEntry(collection, filter.id);
      if (!entry) { db.close(); return undefined; }

      resolveRelations([entry], schema, db);
      const enriched = withSeo(entry);
      const bodyField = findBodyField(schema);
      db.close();

      return {
        id: entry.slug,
        data: enriched.data,
        rendered: bodyField && enriched.data[bodyField] ? { html: enriched.data[bodyField] } : undefined,
      };
    },

    async loadCollection({ filter }) {
      const podPath = resolve(process.cwd(), pod);
      if (!existsSync(podPath)) return { entries: [] };

      const db = openPod(podPath);
      const col = db.getCollection(collection);
      if (!col) { db.close(); return { entries: [] }; }

      const schema = col.schema ? (typeof col.schema === 'string' ? JSON.parse(col.schema) : col.schema) : {};
      const bodyField = findBodyField(schema);
      const entries = db.getEntries(collection, { status });
      resolveRelations(entries, schema, db);
      db.close();

      return {
        entries: entries.map(e => {
          const enriched = withSeo(e);
          return {
            id: e.slug,
            data: enriched.data,
            rendered: bodyField && enriched.data[bodyField] ? { html: enriched.data[bodyField] } : undefined,
          };
        }),
      };
    },
  };
}

/**
 * Generate a Zod schema from a pod collection's field definitions.
 * Use this as the `schema` option in defineCollection() for automatic type safety.
 *
 * @param {string} podPath - Path to the pod file
 * @param {string} collectionId - Collection ID to generate schema for
 * @returns {import('zod').ZodObject}
 */
export function orbiterSchema(podPath, collectionId) {
  let z;
  try {
    z = require('zod');
  } catch {
    try {
      z = require('astro/zod');
    } catch {
      throw new Error('orbiterSchema requires zod — install it or use astro/zod');
    }
  }

  const resolvedPath = resolve(process.cwd(), podPath);
  const db = openPod(resolvedPath);
  const col = db.getCollection(collectionId);
  if (!col) { db.close(); throw new Error(`Collection "${collectionId}" not found`); }

  const schema = col.schema ? (typeof col.schema === 'string' ? JSON.parse(col.schema) : col.schema) : {};
  db.close();

  const shape = {};
  for (const [key, field] of Object.entries(schema)) {
    switch (field.type) {
      case 'string': case 'richtext': case 'url': case 'email':
      case 'date': case 'datetime': case 'image': case 'media':
        shape[key] = z.string().optional();
        break;
      case 'number':
        shape[key] = z.number().optional();
        break;
      case 'boolean':
        shape[key] = z.boolean().optional();
        break;
      case 'array': case 'weekdays':
        shape[key] = z.array(z.string()).optional();
        break;
      case 'table':
        shape[key] = z.array(z.array(z.string())).optional();
        break;
      case 'select':
        if (field.options?.length) {
          shape[key] = z.enum(field.options).optional();
        } else {
          shape[key] = z.string().optional();
        }
        break;
      case 'relation':
        shape[key] = z.any().optional();
        break;
      default:
        shape[key] = z.unknown().optional();
    }
  }

  shape._seo = z.object({
    title: z.string().default(''),
    description: z.string().default(''),
    ogImage: z.string().default(''),
  }).optional();

  return z.object(shape);
}
