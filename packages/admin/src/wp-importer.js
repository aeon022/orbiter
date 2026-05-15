/**
 * wp-importer.js
 * WordPress WXR import logic for Orbiter.
 *
 * Exports:
 *   parseWXR(xmlText)        → { site, postTypes, items, attachments }
 *   buildImportPlan(parsed)  → summary for preview UI
 *   executeImport(db, plan, options) → { imported, skipped, errors, mediaResults }
 */

import { XMLParser } from 'fast-xml-parser';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const _require = createRequire(import.meta.url);
const TurndownService = _require('turndown');

// ── Turndown (HTML → Markdown) ────────────────────────────────────────────
const td = new TurndownService({
  headingStyle:    'atx',
  bulletListMarker: '-',
  codeBlockStyle:  'fenced',
  hr:              '---',
});

// Preserve WordPress shortcodes as inline code rather than dropping them
td.addRule('shortcode', {
  filter: (node) => node.nodeName === '#text' && /\[.+?\]/.test(node.nodeValue),
  replacement: (content) => content,
});

// ── XML parser config ─────────────────────────────────────────────────────
const xmlParser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  cdataPropName:       '__cdata',
  isArray: (name) => ['item', 'wp:postmeta', 'category', 'wp:author', 'wp:category', 'wp:tag'].includes(name),
  parseAttributeValue: true,
  trimValues:          true,
});

// Helper: unwrap CDATA or plain text value
function v(val) {
  if (val === undefined || val === null) return '';
  if (typeof val === 'object' && val.__cdata !== undefined) return String(val.__cdata ?? '');
  return String(val);
}

// Helper: safe slug from title
function slugify(str) {
  return str.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

// WordPress post status → Orbiter status
function mapStatus(wpStatus) {
  return wpStatus === 'publish' ? 'published' : 'draft';
}

// Default schema per post type
function schemaFor(postType) {
  if (postType === 'page') {
    return {
      title:   { type: 'string',   required: true,  label: 'Title' },
      body:    { type: 'richtext', required: false, label: 'Content' },
      date:    { type: 'date',     required: false, label: 'Date' },
    };
  }
  // posts + all custom post types
  return {
    title:   { type: 'string',   required: true,  label: 'Title' },
    excerpt: { type: 'string',   required: false, label: 'Excerpt' },
    body:    { type: 'richtext', required: false, label: 'Content' },
    tags:    { type: 'array',    required: false, label: 'Tags & Categories' },
    date:    { type: 'date',     required: false, label: 'Date' },
    image:   { type: 'media',    required: false, label: 'Featured Image' },
    author:  { type: 'string',   required: false, label: 'Author' },
  };
}

// Collection ID from post type (safe slug)
function collectionId(postType) {
  if (postType === 'post') return 'posts';
  if (postType === 'page') return 'pages';
  return slugify(postType).replace(/-/g, '_');
}

// ── parseWXR ─────────────────────────────────────────────────────────────
export function parseWXR(xmlText) {
  const root    = xmlParser.parse(xmlText);
  const channel = root?.rss?.channel ?? {};
  const items   = Array.isArray(channel.item) ? channel.item : (channel.item ? [channel.item] : []);

  const site = {
    title: v(channel.title),
    url:   v(channel.link),
  };

  // Build attachment map: wp:post_id → wp:attachment_url
  const attachmentMap = {};
  for (const item of items) {
    const type = v(item['wp:post_type']);
    if (type === 'attachment') {
      const wpId = v(item['wp:post_id']);
      attachmentMap[wpId] = {
        url:      v(item['wp:attachment_url']),
        filename: v(item['wp:post_name']) || v(item.title),
        mimeType: v(item['wp:attachment_metadata']?.mime_type) || '',
      };
    }
  }

  // Parse non-attachment items
  const contentItems = [];
  for (const item of items) {
    const type = v(item['wp:post_type']);
    if (type === 'attachment' || type === 'nav_menu_item' || type === 'revision') continue;
    if (!type) continue;

    const meta    = Array.isArray(item['wp:postmeta']) ? item['wp:postmeta'] : [];
    const thumbId = v(meta.find(m => v(m['wp:meta_key']) === '_thumbnail_id')?.['wp:meta_value'] ?? '');

    const categories = (Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []))
      .filter(c => c['@_domain'] === 'category')
      .map(c => v(c));
    const tags = (Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []))
      .filter(c => c['@_domain'] === 'post_tag')
      .map(c => v(c));

    const rawHtml   = v(item['content:encoded']);
    const rawExcerpt = v(item['excerpt:encoded']);
    const wpDate    = v(item['wp:post_date']).split(' ')[0] || '';

    contentItems.push({
      postType:    type,
      wpId:        v(item['wp:post_id']),
      title:       v(item.title),
      slug:        slugify(v(item['wp:post_name']) || v(item.title)),
      status:      mapStatus(v(item['wp:status'])),
      rawHtml,
      rawExcerpt,
      tags:        [...new Set([...categories, ...tags])].filter(Boolean),
      date:        wpDate,
      author:      v(item['dc:creator']),
      thumbId,     // WP attachment ID → resolve via attachmentMap
      pubDate:     v(item.pubDate),
    });
  }

  // Group by post type
  const postTypes = {};
  for (const item of contentItems) {
    if (!postTypes[item.postType]) postTypes[item.postType] = [];
    postTypes[item.postType].push(item);
  }

  return { site, postTypes, attachmentMap };
}

// ── buildImportPlan ───────────────────────────────────────────────────────
export function buildImportPlan(parsed) {
  const { site, postTypes, attachmentMap } = parsed;
  const mediaCount = Object.keys(attachmentMap).length;

  const types = Object.entries(postTypes).map(([type, items]) => ({
    postType:     type,
    collectionId: collectionId(type),
    count:        items.length,
    published:    items.filter(i => i.status === 'published').length,
    drafts:       items.filter(i => i.status === 'draft').length,
    schema:       schemaFor(type),
  }));

  return { site, types, mediaCount, attachmentCount: mediaCount };
}

// ── executeImport ─────────────────────────────────────────────────────────
// options: { selectedTypes: string[], downloadMedia: boolean, onDuplicate: 'skip'|'overwrite', podPath: string }
export async function executeImport(db, parsed, options) {
  const { selectedTypes, downloadMedia, onDuplicate } = options;
  const { postTypes, attachmentMap } = parsed;

  const results = {
    collections: [],
    imported:    0,
    skipped:     0,
    overwritten: 0,
    mediaOk:     0,
    mediaFailed: 0,
    errors:      [],
  };

  // ── 1. Ensure collections exist ─────────────────────────────────────────
  for (const type of selectedTypes) {
    const colId    = collectionId(type);
    const existing = db.getCollection(colId);
    if (!existing) {
      const label = type === 'post' ? 'Posts' : type === 'page' ? 'Pages'
        : type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
      db.db.prepare('INSERT INTO _collections (id, label, schema) VALUES (?, ?, ?)')
        .run(colId, label, JSON.stringify(schemaFor(type)));
      results.collections.push(colId);
    }
  }

  // ── 2. Download media (optional) ─────────────────────────────────────────
  // orbiterMediaId map: wpAttachmentId → orbiter media UUID
  const orbiterMediaId = {};
  if (downloadMedia) {
    for (const [wpId, att] of Object.entries(attachmentMap)) {
      if (!att.url) continue;
      try {
        const res  = await fetch(att.url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf  = Buffer.from(await res.arrayBuffer());
        const mime = res.headers.get('content-type')?.split(';')[0]?.trim()
                     || att.mimeType || 'application/octet-stream';
        const filename = att.url.split('/').pop().split('?')[0] || `media-${wpId}`;
        const now  = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        const id   = randomUUID();
        db.db.prepare(
          'INSERT OR IGNORE INTO _media (id, filename, mime_type, size, data, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(id, filename, mime, buf.length, buf, att.filename || filename, now);
        orbiterMediaId[wpId] = id;
        results.mediaOk++;
      } catch (err) {
        results.mediaFailed++;
        results.errors.push(`Media ${att.url}: ${err.message}`);
      }
    }
  }

  // ── 3. Import entries ────────────────────────────────────────────────────
  const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  for (const type of selectedTypes) {
    const colId = collectionId(type);
    const items = postTypes[type] ?? [];

    for (const item of items) {
      try {
        // Check for duplicate slug
        const existing = db.db
          .prepare('SELECT id FROM _entries WHERE collection_id = ? AND slug = ?')
          .get(colId, item.slug);

        if (existing && onDuplicate === 'skip') {
          results.skipped++;
          continue;
        }

        // Convert HTML → Markdown
        const bodyMd   = item.rawHtml   ? td.turndown(item.rawHtml)   : '';
        const excerptMd = item.rawExcerpt ? td.turndown(item.rawExcerpt) : '';

        // Resolve featured image
        const imageId = item.thumbId ? (orbiterMediaId[item.thumbId] ?? null) : null;

        const data = {
          title:   item.title || 'Untitled',
          body:    bodyMd,
          excerpt: excerptMd,
          tags:    item.tags,
          date:    item.date,
          author:  item.author,
          image:   imageId,
        };

        // Remove page-irrelevant fields
        if (type === 'page') {
          delete data.excerpt;
          delete data.tags;
          delete data.author;
          delete data.image;
        }

        const created = item.date || now;

        if (existing && onDuplicate === 'overwrite') {
          db.db.prepare(
            'UPDATE _entries SET data = ?, status = ?, updated_at = ? WHERE id = ?'
          ).run(JSON.stringify(data), item.status, now, existing.id);
          results.overwritten++;
        } else {
          const id = randomUUID();
          db.db.prepare(
            'INSERT INTO _entries (id, collection_id, slug, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(id, colId, item.slug, JSON.stringify(data), item.status, created, now);
          results.imported++;
        }
      } catch (err) {
        results.errors.push(`Entry "${item.slug}": ${err.message}`);
      }
    }
  }

  return results;
}
