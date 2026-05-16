/**
 * seed.js
 * Creates demo.pod and populates it with:
 * - posts collection (3 entries)
 * - pages collection (3 entries)
 * - media (2 placeholder assets)
 *
 * Run: npm run seed --workspace=apps/demo
 */
import { createPod, openPod, hashPassword } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const podPath = resolve(__dirname, '../demo.pod');

// Preserve user-uploaded media before wiping the pod
let savedMedia = [];
if (existsSync(podPath)) {
  try {
    const oldDb = openPod(podPath);
    // Only restore real uploads — skip seed-generated demo placeholders
    savedMedia = oldDb.db.prepare(
      "SELECT id, filename, mime_type, size, data, alt, folder, created_at FROM _media WHERE folder != 'demo'"
    ).all();
    oldDb.close();
  } catch {}
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
    slug:   'orbiter-v0-2-0',
    status: 'published',
    data: {
      title:   'Orbiter v0.2.0 — Images, Video & Cloud Import',
      excerpt: 'The editor now supports inline image blocks with float alignment, YouTube/Vimeo video embedding, and direct import from Dropbox, Google Drive, and OneDrive.',
      body: `## What's new in v0.2.0

Orbiter's block editor gets a significant upgrade: full rich-media support directly inside the writing flow.

### Inline Image Blocks

Images are now first-class blocks in the editor. Insert one from the media library or upload on the spot — then control how text flows around it with alignment controls:

- **Float left** — text wraps around the right side
- **Float right** — text wraps around the left side
- **Center** — image sits between paragraphs
- **Full width** — edge-to-edge, no wrapping

This is the layout model you'd expect in a travel blog or editorial piece. The alignment is serialized as \`{.left}\`, \`{.right}\`, or \`{.full}\` in the underlying Markdown so it roundtrips cleanly.

### Video Embedding

Paste a YouTube, Vimeo, Wistia, or direct \`.mp4\` URL anywhere in the editor — the block is created automatically. Videos render in a responsive 16:9 player and are stored as \`::video[url]\` in the body field.

The block picker also has a new \`/vid\` shortcut if you prefer typing over pasting.

### Cloud URL Import

The media picker now has a **From URL** tab. Paste a share link from Dropbox, Google Drive, or OneDrive — the server fetches the file server-side (bypassing CORS) and stores it in the pod. Any public image URL works the same way.

This means you can keep assets in your existing cloud storage and pull them into Orbiter on demand, without installing a desktop sync client or managing API keys.

### Under the Hood

- New \`POST /api/media/import-url\` endpoint handles server-side fetching with automatic URL conversion for Dropbox and Google Drive share links.
- The image picker is now tabbed: **Library** and **From URL**.
- \`serialize()\` and \`parseMd()\` updated for both image alignment and video block syntax.

---

v0.2.0 is on npm now. Update with:

\`\`\`
npm install @a83/orbiter-admin@latest @a83/orbiter-integration@latest
\`\`\``,
      categories: [postCatIds['tools'], postCatIds['development']],
      tags:    ['orbiter', 'release', 'editor', 'v0.2.0'],
      author:  authorId,
    },
  },
  {
    slug:   'single-file-architecture',
    status: 'published',
    data: {
      title:   'Single-File Architecture: Why One File Changes Everything',
      excerpt: 'How a single .pod file solves portability, deployments, and infrastructure complexity for content sites.',
      body: `## The Premise

Everything your website needs — content, media, schema, config, users, sessions — lives in one SQLite file. Copy it anywhere and your entire site comes with it.

No database server to provision. No connection string to manage. No cloud account to sign up for. The file *is* the database.

\`\`\`
your-site/
├── astro.config.mjs
├── content.pod   ← your entire CMS
└── src/pages/
\`\`\`

## Why SQLite?

SQLite is the most widely deployed database engine in the world. It runs in-process — no separate process, no network socket, no authentication overhead. For a content site that gets built to static HTML, it handles millions of reads per day without a second thought.

The real advantages for a CMS:

**Zero configuration.** There is no connection string. No port. No credentials file. You open a SQLite database the same way you open any file.

**Transactional writes.** Full ACID compliance. Every save in the Orbiter admin is an atomic transaction — partial writes are impossible.

**Portable.** Copy the \`.pod\` file to move your entire site. It works on Linux, macOS, Windows, ARM — anywhere Node.js runs.

**Inspectable.** Open it with TablePlus, DBeaver, or the \`sqlite3\` CLI and query your content directly. No ORM required.

## The .pod Extension

A \`.pod\` file is a standard SQLite 3 database with a custom extension. The extension makes it easy to identify in your project and excludes it from glob patterns like \`**/*.json\`. Any SQLite tool can open it.

\`\`\`
sqlite3 content.pod "SELECT slug, status FROM _entries ORDER BY updated_at DESC LIMIT 5"
\`\`\`

## Portability in Practice

Moving a traditional CMS to a new server means:
- Export database dump
- Transfer files
- Configure new database connection
- Import dump
- Hope nothing breaks

Moving Orbiter:
\`\`\`
scp content.pod user@newserver:/var/www/my-site/
\`\`\`

That's it. The schema, the content, the media, the users — all of it moves in one file.

## When It's Not Enough

SQLite BLOB storage is convenient for content sites but not for thousands of high-res images. If your media library is in the gigabytes, this isn't the right tool. For a team of 1–10 with a normal content site, it is.`,
      categories: [postCatIds['architecture'], postCatIds['tools']],
      tags:    ['architecture', 'orbiter', 'cms', 'sqlite'],
      author:  authorId,
    },
  },
  {
    slug:   'wabi-sabi-interface-design',
    status: 'published',
    data: {
      title:   'The Art of Wabi-Sabi in Modern Interface Design',
      excerpt: 'On the beauty of imperfection, restraint, and transience in digital interfaces — and why polish alone is not enough.',
      body: `## What Is Wabi-Sabi?

Wabi-sabi is the Japanese worldview centered on the acceptance of transience and imperfection. Where Western aesthetics tend toward symmetry and permanence, wabi-sabi finds beauty in things that are incomplete, irregular, and worn.

In traditional Japanese art, this shows up as the deliberate crack in a tea bowl, the uneven glaze, the asymmetric composition. The imperfection is not a failure — it is the point.

## Restraint Over Polish

Modern interface design is obsessed with polish. Pixel-perfect spacing, smooth animations, every corner radius exactly 8px. The result is often interfaces that feel inert — technically correct but somehow lifeless.

Wabi-sabi suggests a different approach:

**Whitespace as breath.** Not empty space to fill, but space that lets the content breathe. The silence between words matters as much as the words.

**Typography over decoration.** A well-chosen typeface at the right size carries more character than a gradient or a drop shadow.

**Purposeful asymmetry.** Grids are tools, not laws. A layout that breaks slightly from perfect symmetry can feel more alive than one that doesn't.

## The Quiet Dignity of Purposeful Elements

Every element in an interface asks something of the user's attention. Wabi-sabi asks: does this element earn its place? If it doesn't carry meaning, it creates noise.

This is different from minimalism, which can be its own form of perfectionism — white, clean, empty as a statement. Wabi-sabi is not empty. It is *considered*. There may be texture, imperfection, a subtle grain. But nothing without purpose.

## Applying It

A few principles worth carrying into your next project:

1. **Let things be slightly unfinished.** The hand-drawn icon, the ink wash texture, the ragged edge — they signal that a human made this.
2. **Age gracefully.** Design for the content at month twelve, not month one. Will the layout hold when the article count is 200 instead of 3?
3. **Prefer subtlety.** Hover states that shift color by 10% instead of 40%. Transitions measured in milliseconds, not seconds.
4. **Find beauty in function.** A well-labelled form field, clear error messages, a breadcrumb that actually helps — these are wabi-sabi too.

The goal is not imperfection for its own sake. It is an interface that feels like it was made by someone who cared — not about appearance, but about the person using it.`,
      categories: [postCatIds['design']],
      tags:    ['design', 'japanese', 'ui', 'aesthetics'],
      author:  authorId,
    },
  },
  {
    slug:   'astro-content-collections',
    status: 'published',
    data: {
      title:   'Orbiter + Astro: getCollection() Backed by SQLite',
      excerpt: 'Using getCollection() and getEntry() with a portable SQLite database instead of the filesystem — and what that buys you.',
      body: `## The Same API, Different Backend

Astro's content collections API is elegant: \`getCollection()\`, \`getEntry()\`, typed schemas, frontmatter validation. It's a pleasure to use.

The default backend is the filesystem — Markdown files in \`src/content/\`. That works well until you need non-technical editors, media management, draft/publish workflow, or version history. Then you're reaching for a CMS.

Orbiter keeps the same API while replacing the filesystem backend with a portable SQLite database.

\`\`\`js
import { getCollection, getEntry } from 'orbiter:collections';

const posts = await getCollection('posts');
const post  = await getEntry('posts', 'hello-world');
\`\`\`

Same import shape. Same return shape. Different backend.

## How It Works

The Orbiter integration injects a Vite virtual module — \`orbiter:collections\` — at build time. When Astro resolves that import, it reads all published entries from the \`.pod\` file and inlines them as a JavaScript module.

The result is zero runtime overhead. Your content is baked into the build, not fetched on each request. A static site stays static.

\`\`\`js
// astro.config.mjs
import orbiter from '@a83/orbiter-integration';

export default defineConfig({
  output: 'server',
  integrations: [orbiter({ pod: './content.pod' })],
});
\`\`\`

One line. That's the entire integration.

## What You Get That Markdown Files Don't

**Media as BLOBs.** Images and files are stored directly in the pod — no \`public/\` folder management, no broken paths after deploy. They're served at \`/orbiter/media/[id]\`.

**Relation fields.** A post can have an \`author\` field that references an entry in the \`authors\` collection. Orbiter resolves those relations at build time, so your template gets the full author object — no extra fetch, no null checks for missing data.

\`\`\`astro
{posts.map(post => (
  <article>
    <h2>{post.data.title}</h2>
    <p>by {post.data.author?.data?.name}</p>
  </article>
))}
\`\`\`

**Version history.** Every save creates a snapshot. Roll back to any previous version of any entry directly in the admin. Markdown files give you git blame — Orbiter gives you a full history UI.

**Draft/publish workflow.** Entries have a status toggle. \`getCollection()\` returns only published entries. Drafts are invisible to the build until you publish them.

## The Trade-off

You lose some things compared to Markdown files:

- Content is not in git by default (though the \`orbiter pack/unpack\` commands can sync it)
- No pull-request-based editorial workflow
- Requires a Node.js runtime for the admin

For a solo developer or a small team that wants an editorial UI without provisioning a database server, the trade-off is usually worth it.`,
      categories: [postCatIds['development'], postCatIds['tools']],
      tags:    ['astro', 'collections', 'sqlite', 'cms'],
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

console.log(`  ✓ Posts seeded (4 published)`);

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

const makePlaceholderSvg = (label, bg = '#edeae3', fg = '#a09890') => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${bg}"/>`+
  `<text x="400" y="310" font-family="monospace" font-size="18" fill="${fg}" text-anchor="middle">${label}</text></svg>`
);

const insertMedia = db.db.prepare(`
  INSERT OR IGNORE INTO _media (id, filename, mime_type, size, data, alt, folder)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const heroSvg = makePlaceholderSvg('hero image');
insertMedia.run(randomUUID(), 'hero-main.svg', 'image/svg+xml', heroSvg.length, heroSvg, 'Hero image placeholder', 'demo');

const logoSvg = makePlaceholderSvg('logo mark', '#1a1510', '#9a6e30');
insertMedia.run(randomUUID(), 'logo-mark.svg', 'image/svg+xml', logoSvg.length, logoSvg, 'Orbiter logo mark', 'demo');

console.log(`  ✓ Media seeded (2 SVG placeholder assets)`);

// Restore user uploads saved before the wipe
if (savedMedia.length > 0) {
  const restoreMedia = db.db.prepare(`
    INSERT OR IGNORE INTO _media (id, filename, mime_type, size, data, alt, folder, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of savedMedia) {
    restoreMedia.run(row.id, row.filename, row.mime_type, row.size, row.data, row.alt ?? '', row.folder ?? '', row.created_at);
  }
  console.log(`  ✓ Restored ${savedMedia.length} existing media upload(s)`);
}

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
