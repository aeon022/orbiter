import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { listCollections, getEntries, getEntry, searchContent } from './content.js';
import { createDraft, updateDraft } from './write.js';

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const respond = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });

/**
 * mode: 'trusted' (stdio, local — full access) | 'public' (http, remote —
 * same restrictions as the Public Content API). See content.js.
 */
export function createMcpServer({ db, mode, scope = null, keyLabel = 'mcp', collections = null }) {
  const server = new McpServer({ name: 'orbiter-mcp', version });

  server.registerTool('list_collections', {
    title: 'List collections',
    description: 'List accessible content collections in this Orbiter pod, with entry counts.',
    inputSchema: {},
  }, async () => respond(listCollections(db, mode)));

  server.registerTool('get_entries', {
    title: 'Get entries',
    description: 'List entries in a collection, optionally filtered by status/locale and paginated.',
    inputSchema: {
      collection: z.string().describe('Collection id'),
      status: z.string().optional().describe('Filter by status. Ignored in remote/public mode — always "published".'),
      locale: z.string().optional().describe('Filter by locale'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20, max 100)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
  }, async (args) => respond(getEntries(db, mode, args)));

  server.registerTool('get_entry', {
    title: 'Get entry',
    description: 'Fetch a single entry with full body content.',
    inputSchema: {
      collection: z.string().describe('Collection id'),
      slug: z.string().describe('Entry slug'),
      locale: z.string().optional().describe('Locale variant'),
    },
  }, async (args) => respond(getEntry(db, mode, args)));

  server.registerTool('search_content', {
    title: 'Search content',
    description: 'Substring search over title/excerpt/body, across one or all accessible collections.',
    inputSchema: {
      collection: z.string().optional().describe('Restrict search to one collection id'),
      query: z.string().describe('Search text'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20, max 100)'),
    },
  }, async (args) => respond(searchContent(db, mode, args)));

  // Draft-write tools: only for a draft-write API key (http) or ORBITER_MCP_WRITE=1 (stdio).
  if (scope === 'draft-write') {
    const ctx = { allowed: collections, actor: `mcp:${keyLabel}` };
    const run = (fn, args) => { try { return respond(fn(db, args, ctx)); } catch (e) { return { isError: true, ...respond({ error: e.message }) }; } };
    const shape = {
      collection: z.string().describe('Collection id'),
      slug: z.string().describe('Entry slug (lowercase letters, digits, - or _)'),
      data: z.record(z.any()).describe('Field values keyed by schema field name'),
      locale: z.string().optional().describe('Locale (default: none)'),
    };
    server.registerTool('create_draft', {
      title: 'Create draft',
      description: 'Create a new entry as a DRAFT. It is not public until a human publishes it in the admin.',
      inputSchema: shape,
    }, async (args) => run(createDraft, args));
    server.registerTool('update_draft', {
      title: 'Update draft',
      description: 'Merge fields into an existing DRAFT entry. Published or scheduled entries cannot be changed this way.',
      inputSchema: shape,
    }, async (args) => run(updateDraft, args));
  }

  return server;
}
