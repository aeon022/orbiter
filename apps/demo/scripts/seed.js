/**
 * seed.js
 * Creates demo.pod and populates it with:
 * - posts collection (3 entries)
 * - pages collection (3 entries)
 * - media (2 placeholder assets)
 *
 * Run: npm run seed --workspace=apps/demo
 */
import { createPod, hashPassword } from '@orbiter/core';
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

// ── Admin User ───────────────────────────────────────────

const adminPassword = await hashPassword('admin');
db.insertUser(randomUUID(), 'admin', adminPassword, 'admin');
console.log('  ✓ Admin user created (admin / admin)');

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
    categories: { type: 'relation', collection: 'post_categories', multiple: true, required: false, label: 'Categories' },
    tags:       { type: 'array',    required: false },
    image:      { type: 'media',    required: false },
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

// ── Categories ──────────────────────────────────────────
const categorySchema = JSON.stringify({
  name:        { type: 'string', required: true,  label: 'Name' },
  color:       { type: 'string', required: false, label: 'Color (hex)' },
  description: { type: 'string', required: false, label: 'Description' },
});

db.db.prepare(`INSERT OR IGNORE INTO _collections (id, label, schema) VALUES (?, ?, ?)`).run('event_categories', 'Event Categories', categorySchema);
db.db.prepare(`INSERT OR IGNORE INTO _collections (id, label, schema) VALUES (?, ?, ?)`).run('post_categories',  'Post Categories',  categorySchema);

const insertCat = db.db.prepare(`INSERT OR IGNORE INTO _entries (id, collection_id, slug, data, status) VALUES (?, ?, ?, ?, 'published')`);

const eventCatDefs = [
  { slug: 'design',   name: 'Design',   color: '#3d4fa8' },
  { slug: 'festival', name: 'Festival', color: '#1e6b50' },
  { slug: 'kultur',   name: 'Kultur',   color: '#9a6e30' },
  { slug: 'tech',     name: 'Tech',     color: '#8b2635' },
  { slug: 'vortrag',  name: 'Vortrag',  color: '#555577' },
  { slug: 'workshop', name: 'Workshop', color: '#2d6b8b' },
  { slug: 'zeichnen', name: 'Zeichnen', color: '#3d4fa8' },
];
const eventCatIds = {};
for (const cat of eventCatDefs) {
  const id = randomUUID();
  insertCat.run(id, 'event_categories', cat.slug, JSON.stringify({ name: cat.name, color: cat.color, description: '' }));
  eventCatIds[cat.slug] = id;
}

const postCatDefs = [
  { slug: 'design',       name: 'Design',        color: '#3d4fa8' },
  { slug: 'development',  name: 'Development',   color: '#1e6b50' },
  { slug: 'architecture', name: 'Architecture',  color: '#9a6e30' },
  { slug: 'tools',        name: 'Tools',         color: '#8b2635' },
];
const postCatIds = {};
for (const cat of postCatDefs) {
  const id = randomUUID();
  insertCat.run(id, 'post_categories', cat.slug, JSON.stringify({ name: cat.name, color: cat.color, description: '' }));
  postCatIds[cat.slug] = id;
}

console.log(`  ✓ Event categories seeded (${eventCatDefs.length}), Post categories seeded (${postCatDefs.length})`);

db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema) VALUES (?, ?, ?)
`).run(
  'events',
  'Events',
  JSON.stringify({
    title:                  { type: 'string',   required: true,  label: 'Event Name' },
    date_start:             { type: 'datetime', required: true,  label: 'Start' },
    date_end:               { type: 'datetime', required: false, label: 'Ende' },

    recurring:              { type: 'select',   required: false, label: 'Wiederholen',
                              options: ['none','daily','weekly','monthly_day','monthly_weekday','yearly'],
                              optionLabels: {
                                none: 'Einmalig',
                                daily: 'Täglich',
                                weekly: 'Wöchentlich',
                                monthly_day: 'Monatlich — Tag X',
                                monthly_weekday: 'Monatlich — Wochentag',
                                yearly: 'Jährlich',
                              } },
    recurring_interval:     { type: 'number',   required: false, label: 'Alle',
                              showWhen: 'recurring:!none',
                              unitSelect: 'recurring',
                              unitMap: {
                                daily: 'Tage', weekly: 'Wochen',
                                monthly_day: 'Monate', monthly_weekday: 'Monate', yearly: 'Jahre',
                              } },
    recurring_days:         { type: 'weekdays', required: false, label: 'An Wochentagen',
                              showWhen: 'recurring:weekly' },
    recurring_day_of_month: { type: 'number',   required: false, label: 'Tag des Monats',
                              showWhen: 'recurring:monthly_day' },
    recurring_month_pos:    { type: 'select',   required: false, label: 'Position',
                              options: ['1st','2nd','3rd','4th','last'],
                              optionLabels: { '1st':'1.', '2nd':'2.', '3rd':'3.', '4th':'4.', last:'Letzter' },
                              showWhen: 'recurring:monthly_weekday' },
    recurring_month_weekday:{ type: 'select',   required: false, label: 'Wochentag',
                              options: ['Mo','Di','Mi','Do','Fr','Sa','So'],
                              showWhen: 'recurring:monthly_weekday' },
    recurring_end_date:     { type: 'date',     required: false, label: 'Wiederholung bis',
                              showWhen: 'recurring:!none' },

    hero_image:             { type: 'media',    required: false, label: 'Hero Image' },
    preview_image:          { type: 'media',    required: false, label: 'Vorschaubild' },
    video_url:              { type: 'url',      required: false, label: 'Video URL' },

    price:                  { type: 'string',   required: false, label: 'Eintritt' },
    price_notes:            { type: 'string',   required: false, label: 'Preishinweis' },
    ticket_url:             { type: 'url',      required: false, label: 'Ticket URL' },
    ticket_provider:        { type: 'select',   required: false, label: 'Ticket-Anbieter',
                              options: ['custom','pretix','eventbrite','eventim','ticketmaster','tixfox','reservix'] },

    body:                   { type: 'richtext', required: false, label: 'Details' },
    categories:             { type: 'relation', collection: 'event_categories', multiple: true, required: false, label: 'Kategorien' },
    tags:                   { type: 'array',    required: false, label: 'Tags' },
  })
);

db.setMeta('setup.complete', '1');
db.setMeta('collection.event_categories.parent', 'events');
db.setMeta('collection.post_categories.parent',  'posts');
console.log('  ✓ Collections created (posts, pages, authors, events, event_categories, post_categories)');

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
      categories: [postCatIds['design']],
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
      categories: [postCatIds['architecture'], postCatIds['tools']],
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

// ── Events ───────────────────────────────────────────────

const events = [
  {
    slug:   'design-festival-2026',
    status: 'published',
    data: {
      title:          'Design Festival 2026',
      date_start:     '2026-05-15T10:00',
      date_end:       '2026-05-17T20:00',
      recurring:      'none',
      recurring_days: [],
      hero_image:     null,
      preview_image:  null,
      video_url:      '',
      body:           'Drei Tage Design, Talks und Workshops im Herzen der Stadt.',
      categories:     [eventCatIds['design'], eventCatIds['festival'], eventCatIds['kultur']],
    },
  },
  {
    slug:   'wochentlicher-sketch-club',
    status: 'published',
    data: {
      title:          'Wöchentlicher Sketch Club',
      date_start:     '2026-04-07T18:00',
      date_end:       '2026-04-07T20:00',
      recurring:      'weekly',
      recurring_days: ['Mon'],
      hero_image:     null,
      preview_image:  null,
      video_url:      '',
      body:           'Jeden Montag. Bleistift, Papier, Kaffee.',
      categories:     [eventCatIds['workshop'], eventCatIds['zeichnen']],
    },
  },
  {
    slug:   'orbiter-launch-talk',
    status: 'draft',
    data: {
      title:          'Orbiter Launch Talk',
      date_start:     '2026-06-01T19:00',
      date_end:       '2026-06-01T21:00',
      recurring:      'none',
      recurring_days: [],
      hero_image:     null,
      preview_image:  null,
      video_url:      'https://youtube.com/watch?v=example',
      body:           'Ein Abend über portable CMS-Architekturen und das .pod-Format.',
      categories:     [eventCatIds['tech'], eventCatIds['vortrag']],
    },
  },
];

for (const ev of events) {
  insertEntry.run(randomUUID(), 'events', ev.slug, JSON.stringify(ev.data), ev.status);
}

console.log(`  ✓ Events seeded (2 published, 1 draft)`);

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
  Collections: posts, pages, authors, events, event_categories, post_categories
  Posts:       ${posts.length} (2 published, 1 draft)
  Pages:       ${pages.length} (2 published, 1 draft)
  Events:      ${events.length} (2 published, 1 draft)
  Media:       2 placeholder assets
  Login:       admin / admin
────────────────────────────────

  Run: npm run dev
  Open: http://localhost:8080/orbiter
`);
