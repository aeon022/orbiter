import { openPod } from '@a83/orbiter-core';
import { Marked } from 'marked';
import archiver from 'archiver';
import { themes, defaultTheme } from './themes/index.js';

const MIME_EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
  'application/pdf': '.pdf', 'video/mp4': '.mp4', 'video/webm': '.webm',
};

function extFor(mime, filename) {
  if (MIME_EXT[mime]) return MIME_EXT[mime];
  const m = (filename || '').match(/\.[^.]+$/);
  return m ? m[0] : '.bin';
}

function mediaFilePath(id, mime, filename) {
  return `media/${id}${extFor(mime, filename)}`;
}

// ── Schema field helpers ──────────────────────────────────

const TITLE_KEYS  = ['title', 'name'];
const BODY_KEYS   = ['body', 'content', 'text', 'description'];
const EXCERPT_KEYS = ['excerpt', 'teaser', 'summary', 'description', 'bio'];
const DATE_KEYS   = ['date', 'date_start', 'start_date', 'event_date'];
const IMAGE_KEYS  = ['image', 'hero', 'hero_image', 'preview_image', 'avatar', 'cover', 'thumbnail'];
const TAG_KEYS    = ['tags', 'keywords'];

function findField(schema, preferredKeys, typePredicate) {
  for (const key of preferredKeys) {
    if (schema[key] && (!typePredicate || typePredicate(schema[key]))) return key;
  }
  if (typePredicate) {
    for (const [key, def] of Object.entries(schema)) {
      if (typePredicate(def)) return key;
    }
  }
  return null;
}

function findTitleField(schema) {
  return findField(schema, TITLE_KEYS, d => d.type === 'string' && d.required) || findField(schema, TITLE_KEYS) || Object.keys(schema)[0] || 'title';
}
function findBodyField(schema) {
  return findField(schema, BODY_KEYS, d => d.type === 'richtext');
}
function findExcerptField(schema) {
  return findField(schema, EXCERPT_KEYS, d => d.type === 'string');
}
function findDateField(schema) {
  return findField(schema, DATE_KEYS, d => d.type === 'date' || d.type === 'datetime');
}
function findImageField(schema) {
  return findField(schema, IMAGE_KEYS, d => d.type === 'media' || d.type === 'image');
}
function findTagsField(schema) {
  return findField(schema, TAG_KEYS, d => d.type === 'array');
}

// Fields to display as metadata on entry detail pages
const SKIP_FIELD_TYPES = new Set(['richtext', 'table', 'relation', 'weekdays']);
const SKIP_VALUES = new Set(['none', 'false', '0', 'null', 'undefined']);

function formatFieldValue(val, type) {
  if (type === 'datetime' && typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (type === 'date' && typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return val;
}

function getDisplayFields(data, schema, { titleKey, bodyKey, imageKey, tagsKey, excerptKey }) {
  const skipKeys = new Set([titleKey, bodyKey, imageKey, tagsKey, excerptKey].filter(Boolean));
  const fields = [];
  for (const [key, def] of Object.entries(schema)) {
    if (skipKeys.has(key)) continue;
    if (SKIP_FIELD_TYPES.has(def.type)) continue;
    let val = data[key];
    if (val === null || val === undefined || val === '') continue;
    if (def.type === 'media' || def.type === 'image') continue;
    if (typeof val === 'string' && SKIP_VALUES.has(val.toLowerCase())) continue;
    if (def.type === 'number' && val === 0) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    val = formatFieldValue(val, def.type);
    fields.push({
      key,
      label: def.label || key,
      type: def.type,
      value: val,
    });
  }
  return fields;
}

// ── Media collection ──────────────────────────────────

function collectMediaIds(data, schema) {
  const ids = new Set();
  if (!data || !schema) return ids;
  for (const [key, def] of Object.entries(schema)) {
    const val = data[key];
    if (!val) continue;
    if (def.type === 'media' || def.type === 'image') {
      if (typeof val === 'string' && val.length > 8) ids.add(val);
    }
    if (def.type === 'richtext' && typeof val === 'string') {
      const re = /\/(?:api\/)?media\/([a-f0-9-]{36})/gi;
      let m;
      while ((m = re.exec(val)) !== null) ids.add(m[1]);
    }
  }
  return ids;
}

// ── Markdown ──────────────────────────────────

function createMarked(mediaMap, rootPrefix) {
  const marked = new Marked();
  marked.use({
    renderer: {
      image({ href, title, text }) {
        const re = /\/(?:api\/)?media\/([a-f0-9-]{36})(?:\/raw)?/;
        const m = href ? href.match(re) : null;
        if (m && mediaMap.has(m[1])) {
          href = (rootPrefix || '') + mediaMap.get(m[1]);
        }
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${href}" alt="${text || ''}"${titleAttr} loading="lazy">`;
      },
    },
  });
  return marked;
}

// ── Sitemap / Robots ──────────────────────────────────

function buildSitemap(siteUrl, pages) {
  const base = (siteUrl || '').replace(/\/+$/, '');
  const entries = pages.map(p => {
    const loc = base ? `${base}${p.path}` : p.path;
    const lastmod = p.updated ? new Date(p.updated).toISOString().slice(0, 10) : '';
    return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

function buildRobots(siteUrl) {
  const base = (siteUrl || '').replace(/\/+$/, '');
  return `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`;
}

// ── Public API ──────────────────────────────────

export function getPublishStats(podPath) {
  const db = openPod(podPath);
  const collections = db.getCollections();
  let totalEntries = 0;
  for (const col of collections) {
    totalEntries += db.getEntries(col.id, { status: 'published' }).length;
  }
  const mediaCount = db.listMedia().length;
  const siteName = db.getMeta('site.name') || '';
  const siteUrl = db.getMeta('site.url') || '';
  db.close();
  return { collections: collections.length, entries: totalEntries, media: mediaCount, siteName, siteUrl };
}

export async function generateStaticSite(podPath, { themeId } = {}) {
  const theme = themes[themeId || defaultTheme] || themes[defaultTheme];
  const db = openPod(podPath);

  const site = {
    name: db.getMeta('site.name') || 'My Site',
    url: db.getMeta('site.url') || '',
    description: db.getMeta('site.description') || '',
    locale: db.getMeta('site.locale') || 'en',
  };

  // Load collections with entries + detect parent/child relationships
  const rawCollections = db.getCollections();
  const parentOf = {};
  for (const col of rawCollections) {
    const parent = db.getMeta(`collection.${col.id}.parent`);
    if (parent) parentOf[col.id] = parent;
  }

  const collections = rawCollections.map(col => {
    const schema = col.schema ? (typeof col.schema === 'string' ? JSON.parse(col.schema) : col.schema) : {};
    const entries = db.getEntries(col.id, { status: 'published' });
    return { ...col, schema, entries, isChild: !!parentOf[col.id], parentId: parentOf[col.id] || null };
  }).filter(c => c.entries.length > 0);

  // Build parent → children map
  const childrenOf = {};
  for (const col of collections) {
    if (col.parentId) {
      if (!childrenOf[col.parentId]) childrenOf[col.parentId] = [];
      childrenOf[col.parentId].push({ id: col.id, label: col.label, entryCount: col.entries.length });
    }
  }

  // Nav only shows top-level collections (not child/taxonomy collections)
  const navCollections = collections.filter(c => !c.isChild);

  // Collect all referenced media IDs
  const allMediaIds = new Set();
  for (const col of collections) {
    for (const entry of col.entries) {
      for (const id of collectMediaIds(entry.data, col.schema)) {
        allMediaIds.add(id);
      }
    }
  }

  const mediaMap = new Map();
  const mediaItems = [];
  for (const id of allMediaIds) {
    const item = db.getMediaItem(id);
    if (!item) continue;
    const path = mediaFilePath(id, item.mime_type, item.filename);
    mediaMap.set(id, path);
    if (item.data) mediaItems.push({ path, data: item.data });
  }

  const marked = createMarked(mediaMap, '../../');

  const navSummaries = navCollections.map(c => ({ id: c.id, label: c.label, entryCount: c.entries.length }));
  const allSummaries = collections.map(c => ({ id: c.id, label: c.label, entryCount: c.entries.length }));

  const sitemapPages = [{ path: '/', updated: null }];
  const rootFor = (depth) => depth === 0 ? '' : '../'.repeat(depth);

  // ── Archive ──────────────────────────────────
  const archive = archiver('zip', { zlib: { level: 6 } });
  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
  });

  // style.css
  archive.append(theme.css(), { name: 'style.css' });

  // index.html
  const homeContent = theme.homepageHTML(site, navSummaries, rootFor(0));
  archive.append(theme.layoutHTML(site, homeContent, { title: '', description: site.description }, navSummaries, rootFor(0)), { name: 'index.html' });

  // Collection pages + entry pages
  for (const col of collections) {
    const titleKey = findTitleField(col.schema);
    const dateKey = findDateField(col.schema);
    const excerptKey = findExcerptField(col.schema);
    const imageKey = findImageField(col.schema);
    const bodyKey = findBodyField(col.schema);
    const tagsKey = findTagsField(col.schema);

    // Listing entries
    const listItems = col.entries.map(e => ({
      slug: e.slug,
      title: e.data[titleKey] || e.slug,
      date: (dateKey && e.data[dateKey]) || e.updated_at || e.created_at,
      excerpt: (excerptKey && excerptKey !== bodyKey) ? (e.data[excerptKey] || '') : '',
      readingTime: bodyKey ? theme.readingTime(e.data[bodyKey] || '') : '',
    }));

    const parentCol = col.parentId ? collections.find(c => c.id === col.parentId) : null;
    const colMeta = {
      ...col,
      _childCollections: childrenOf[col.id] || [],
      _parent: parentCol ? { id: parentCol.id, label: parentCol.label } : null,
    };
    const listContent = theme.collectionListHTML(site, colMeta, listItems, rootFor(1));
    archive.append(theme.layoutHTML(site, listContent, { title: col.label }, navSummaries, rootFor(1)), { name: `${col.id}/index.html` });
    sitemapPages.push({ path: `/${col.id}/`, updated: null });

    // Individual entries
    for (const entry of col.entries) {
      const title = entry.data[titleKey] || entry.slug;
      const body = bodyKey ? (entry.data[bodyKey] || '') : '';
      const renderedBody = body ? marked.parse(body) : '';
      const tags = tagsKey ? (entry.data[tagsKey] || []) : [];
      let heroImage = '';
      if (imageKey && entry.data[imageKey] && mediaMap.has(entry.data[imageKey])) {
        heroImage = rootFor(2) + mediaMap.get(entry.data[imageKey]);
      }

      const fields = getDisplayFields(entry.data, col.schema, { titleKey, bodyKey, imageKey, tagsKey, excerptKey });

      const entryData = {
        title,
        date: (dateKey && entry.data[dateKey]) || entry.updated_at || entry.created_at,
        tags: Array.isArray(tags) ? tags : [],
        heroImage,
        fields,
        readingTime: theme.readingTime(body),
      };

      const entryContent = theme.entryHTML(site, colMeta, entryData, renderedBody, rootFor(2));
      const ogImage = (heroImage && site.url) ? `${site.url.replace(/\/+$/, '')}/${mediaMap.get(entry.data[imageKey]) || ''}` : '';
      archive.append(theme.layoutHTML(site, entryContent, {
        title,
        description: (excerptKey && entry.data[excerptKey]) || '',
        canonical: site.url ? `${site.url.replace(/\/+$/, '')}/${col.id}/${entry.slug}/` : '',
        type: 'article',
        ogImage,
      }, navSummaries, rootFor(2)), { name: `${col.id}/${entry.slug}/index.html` });

      sitemapPages.push({ path: `/${col.id}/${entry.slug}/`, updated: entry.updated_at || entry.created_at });
    }
  }

  // Media files
  for (const item of mediaItems) {
    archive.append(item.data, { name: item.path });
  }

  // Sitemap + robots
  archive.append(buildSitemap(site.url, sitemapPages), { name: 'sitemap.xml' });
  archive.append(buildRobots(site.url), { name: 'robots.txt' });

  db.close();
  archive.finalize();
  return finished;
}
