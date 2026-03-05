/**
 * seed.js
 * Creates demo.pod and populates it with:
 * - posts collection (3 entries)
 * - pages collection (3 entries)
 * - media (2 placeholder assets)
 *
 * Run: npm run seed --workspace=apps/demo
 */
import { createPod } from '@orbiter/core';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const podPath = resolve(__dirname, '../demo.pod');

// Remove existing pod for a clean seed
if (existsSync(podPath)) {
  unlinkSync(podPath);
  console.log('  ✓ Removed existing demo.pod');
}

const db = createPod(podPath, {
  site: {
    name:        'Orbiter Demo',
    url:         'https://demo.orbiter.local',
    description: 'A demo site powered by Orbiter CMS',
    locale:      'de',
  }
});

// ── Collections ──────────────────────────────────────────

db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema) VALUES (?, ?, ?)
`).run(
  'posts',
  'Posts',
  JSON.stringify({
    title:   { type: 'string',   required: true },
    excerpt: { type: 'string',   required: false },
    body:    { type: 'richtext', required: false },
    tags:    { type: 'array',    required: false },
    image:   { type: 'media',    required: false },
  })
);

db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema) VALUES (?, ?, ?)
`).run(
  'pages',
  'Pages',
  JSON.stringify({
    title:    { type: 'string',   required: true },
    body:     { type: 'richtext', required: false },
    seo_title: { type: 'string',  required: false },
    seo_desc:  { type: 'string',  required: false },
  })
);

db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema) VALUES (?, ?, ?)
`).run(
  'authors',
  'Authors',
  JSON.stringify({
    name:  { type: 'string', required: true },
    bio:   { type: 'string', required: false },
    email: { type: 'string', required: false },
  })
);

console.log('  ✓ Collections created (posts, pages, authors)');

// ── Authors ──────────────────────────────────────────────

const authorId = randomUUID();

db.db.prepare(`
  INSERT OR IGNORE INTO _entries (id, collection_id, slug, data, status)
  VALUES (?, 'authors', ?, ?, 'published')
`).run(
  authorId,
  'gerwin-abteilung83',
  JSON.stringify({
    name:  'Gerwin — ABTEILUNG83',
    bio:   'Designer & Developer. Kreist um die Daten.',
    email: 'hello@abteilung83.at',
  })
);

console.log('  ✓ Author seeded');

// ── Posts ────────────────────────────────────────────────

const posts = [
  {
    slug:   'wabi-sabi-interface-design',
    status: 'published',
    data: {
      title:   'The Art of Wabi-Sabi in Modern Interface Design',
      excerpt: 'On the beauty of imperfection and restraint in digital interfaces.',
      body:    'Wabi-sabi is the Japanese worldview centered on the acceptance of transience and imperfection. In interface design, this means embracing whitespace, restraint, and the quiet dignity of purposeful elements.',
      tags:    ['design', 'japanese', 'ui'],
      author:  authorId,
    },
  },
  {
    slug:   'single-file-architecture',
    status: 'published',
    data: {
      title:   'Single-File Architecture: Why One File Changes Everything',
      excerpt: 'How a single .pod file solves portability, deployments and infrastructure complexity.',
      body:    'The premise is simple: everything your website needs — content, media, schema, config — lives in one SQLite file. Copy it anywhere and your entire site comes with it.',
      tags:    ['architecture', 'orbiter', 'cms'],
      author:  authorId,
    },
  },
  {
    slug:   'astro-content-collections',
    status: 'draft',
    data: {
      title:   'Orbiter + Astro Content Collections',
      excerpt: 'Using getCollection() and getEntry() backed by SQLite instead of the filesystem.',
      body:    'Astro\'s content collections API is elegant. Orbiter keeps that API intact while replacing the filesystem backend with a portable SQLite database.',
      tags:    ['astro', 'collections', 'dev'],
      author:  authorId,
    },
  },
];

const insertEntry = db.db.prepare(`
  INSERT OR IGNORE INTO _entries (id, collection_id, slug, data, status)
  VALUES (?, ?, ?, ?, ?)
`);

for (const post of posts) {
  insertEntry.run(randomUUID(), 'posts', post.slug, JSON.stringify(post.data), post.status);
}

console.log(`  ✓ Posts seeded (2 published, 1 draft)`);

// ── Pages ────────────────────────────────────────────────

const pages = [
  {
    slug:   'home',
    status: 'published',
    data: {
      title:     'Home',
      body:      'Welcome to Orbiter. The portable CMS for Astro.',
      seo_title: 'Orbiter — Portable CMS for Astro',
      seo_desc:  'Everything in one .pod file. No cloud. No complexity.',
    },
  },
  {
    slug:   'about',
    status: 'published',
    data: {
      title:     'About',
      body:      'Orbiter is built by ABTEILUNG83. Less Noise. Nice Data. No Bloat.',
      seo_title: 'About — Orbiter',
      seo_desc:  'The story behind Orbiter CMS.',
    },
  },
  {
    slug:   'kontakt',
    status: 'draft',
    data: {
      title:     'Kontakt',
      body:      'Erreichbar unter hello@abteilung83.at',
      seo_title: 'Kontakt — Orbiter',
      seo_desc:  '',
    },
  },
];

for (const page of pages) {
  insertEntry.run(randomUUID(), 'pages', page.slug, JSON.stringify(page.data), page.status);
}

console.log(`  ✓ Pages seeded (2 published, 1 draft)`);

// ── Media (placeholder) ──────────────────────────────────

// Create a minimal 1x1 transparent PNG as placeholder
// (real uploads will come via the admin UI in Phase 2)
const placeholder1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const insertMedia = db.db.prepare(`
  INSERT OR IGNORE INTO _media (id, filename, mime_type, size, data, alt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertMedia.run(
  randomUUID(),
  'hero-main.png',
  'image/png',
  placeholder1x1.length,
  placeholder1x1,
  'Hero image placeholder'
);

insertMedia.run(
  randomUUID(),
  'logo-mark.png',
  'image/png',
  placeholder1x1.length,
  placeholder1x1,
  'Orbiter logo mark'
);

console.log(`  ✓ Media seeded (2 placeholder assets)`);

// ── Version snapshots ────────────────────────────────────

// Seed one version entry for each published post
const publishedPosts = db.getEntries('posts', { status: 'published' });

const insertVersion = db.db.prepare(`
  INSERT INTO _versions (id, entry_id, data) VALUES (?, ?, ?)
`);

for (const post of publishedPosts) {
  insertVersion.run(randomUUID(), post.id, JSON.stringify(post.data));
}

console.log(`  ✓ Version snapshots created`);

// ── Summary ──────────────────────────────────────────────

db.close();

const podSize = (existsSync(podPath)
  ? readFileSync(podPath).length / 1024
  : 0
).toFixed(1);

console.log(`
────────────────────────────────
◆ Orbiter — demo.pod ready
  Path:        ${podPath}
  Size:        ${podSize} KB
  Collections: posts, pages, authors
  Posts:       ${posts.length} (2 published, 1 draft)
  Pages:       ${pages.length} (2 published, 1 draft)
  Media:       2 placeholder assets
────────────────────────────────

  Run: npm run dev
`);
