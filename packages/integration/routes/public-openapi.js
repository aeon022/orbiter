export const prerender = false;

/**
 * GET /api/public/openapi.json
 * Auto-generated OpenAPI 3.1 spec for the Public Content API.
 * Schema is derived from pod collection schemas.
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const JSON_H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
};

function podTypeToJsonSchema(def) {
  switch (def?.type) {
    case 'number':   return { type: 'number' };
    case 'boolean':  return { type: 'boolean' };
    case 'array':    return { type: 'array', items: { type: 'string' } };
    case 'richtext': return { type: 'string', description: 'HTML string' };
    case 'date':     return { type: 'string', format: 'date' };
    case 'datetime': return { type: 'string', format: 'date-time' };
    case 'select':   return def.options?.length
      ? { type: 'string', enum: def.options.map(o => o.value ?? o) }
      : { type: 'string' };
    default:         return { type: 'string' };
  }
}

function entrySchema(col) {
  const props = {
    slug:    { type: 'string' },
    title:   { type: 'string' },
    excerpt: { type: 'string', nullable: true },
    date:    { type: 'string', format: 'date', nullable: true },
    author:  { type: 'string', nullable: true },
    image:   { type: 'string', nullable: true },
    tags:    { type: 'array', items: { type: 'string' }, nullable: true },
    url:     { type: 'string', format: 'uri' },
  };
  return { type: 'object', properties: props };
}

function fullEntrySchema(col) {
  const base = entrySchema(col);
  return {
    ...base,
    properties: {
      ...base.properties,
      body:        { type: 'string', nullable: true, description: 'Full HTML body' },
      publishedAt: { type: 'string', format: 'date', nullable: true },
      seo: {
        type: 'object',
        properties: {
          title:       { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
        },
      },
    },
  };
}

export async function GET() {
  const db = openPod(podPath);

  const rawPublic = db.getMeta('public.collections') ?? '';
  const publicAll = rawPublic.trim() === '*';
  const publicSet = publicAll
    ? null
    : new Set(rawPublic.split(',').map(s => s.trim()).filter(Boolean));

  const siteUrl  = (db.getMeta('site.url') ?? '').replace(/\/$/, '');
  const siteName = db.getMeta('site.name') ?? 'Orbiter Site';
  const requireKey = db.getMeta('api.requireKey') === '1';

  const cols = db.getCollections().filter(c => publicAll || publicSet?.has(c.id));
  db.close();

  const paths = {
    '/api/public': {
      get: {
        operationId: 'getIndex',
        summary: 'List available collections',
        tags: ['Discovery'],
        security: requireKey ? [{ bearerAuth: [] }] : [],
        responses: {
          '200': { description: 'Discovery index', content: { 'application/json': { schema: { type: 'object' } } } },
        },
      },
    },
  };

  for (const col of cols) {
    const listPath = `/api/public/${col.id}`;
    const entryPath = `/api/public/${col.id}/{slug}`;
    const tag = col.label || col.id;

    paths[listPath] = {
      get: {
        operationId: `list_${col.id}`,
        summary: `List ${tag} entries`,
        tags: [tag],
        security: requireKey ? [{ bearerAuth: [] }] : [],
        parameters: [
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'q',      in: 'query', description: 'Keyword search', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: `List of published ${tag}`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    collection: { type: 'string' },
                    total:      { type: 'integer' },
                    limit:      { type: 'integer' },
                    offset:     { type: 'integer' },
                    entries:    { type: 'array', items: entrySchema(col) },
                  },
                },
              },
            },
          },
          '403': { description: 'Collection not public or API key required' },
        },
      },
    };

    paths[entryPath] = {
      get: {
        operationId: `get_${col.id}_entry`,
        summary: `Get a single ${tag} entry`,
        tags: [tag],
        security: requireKey ? [{ bearerAuth: [] }] : [],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: `Single ${tag} entry with full body`,
            content: { 'application/json': { schema: fullEntrySchema(col) } },
          },
          '403': { description: 'Not public' },
          '404': { description: 'Not found or not published' },
        },
      },
    };
  }

  const spec = {
    openapi: '3.1.0',
    info: {
      title:   `${siteName} — Public Content API`,
      version: '1.0.0',
      description: `Read-only public API for ${siteName}. Powered by Orbiter CMS.`,
    },
    ...(siteUrl ? { servers: [{ url: siteUrl, description: 'Live' }] } : {}),
    paths,
    components: {
      securitySchemes: requireKey
        ? { bearerAuth: { type: 'http', scheme: 'bearer', description: 'Orbiter API key' } }
        : {},
    },
    tags: cols.map(c => ({ name: c.label || c.id })),
  };

  return new Response(JSON.stringify(spec, null, 2), { headers: JSON_H });
}
