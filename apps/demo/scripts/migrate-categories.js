/**
 * migrate-categories.js
 * 1. Creates a 'categories' collection with name/color/description schema
 * 2. Seeds it with example categories from existing event data
 * 3. Updates events schema: categories array → relation field
 * 4. Migrates existing category string values → category entry IDs
 *
 * Run: node apps/demo/scripts/migrate-categories.js
 */
import { openPod } from '@orbiter/core';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const podPath   = resolve(__dirname, '../demo.pod');

if (!existsSync(podPath)) {
  console.error('demo.pod not found — run npm run seed first');
  process.exit(1);
}

const db  = openPod(podPath);
const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

// ── 1. Create categories collection ──────────────────────────────────────────

const existing = db.getCollection('categories');
if (existing) {
  console.log('  · categories collection already exists — skipping creation');
} else {
  db.db.prepare(`INSERT INTO _collections (id, label, schema) VALUES (?, ?, ?)`)
    .run('categories', 'Categories', JSON.stringify({
      name:        { type: 'string', required: true,  label: 'Name' },
      color:       { type: 'string', required: false, label: 'Color (hex)' },
      description: { type: 'string', required: false, label: 'Description' },
    }));
  console.log('  ✓ categories collection created');
}

// ── 2. Collect unique category strings from existing events ───────────────────

const eventRows = db.db.prepare(`SELECT id, data FROM _entries WHERE collection_id = 'events'`).all();
const allStrings = new Set();

for (const row of eventRows) {
  const data = JSON.parse(row.data);
  const cats = data.categories;
  if (Array.isArray(cats)) cats.forEach(c => c && allStrings.add(c.trim()));
}

// ── 3. Insert category entries (idempotent by slug) ──────────────────────────

const slugify = str =>
  str.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';

// Default colors for auto-seeded categories
const defaultColors = ['#3d4fa8','#1e6b50','#9a6e30','#8b2635','#555577','#2d6b8b'];
let colorIdx = 0;

const nameToId = {};

// Any strings found in existing events
for (const name of allStrings) {
  const slug = slugify(name);
  const exists = db.db.prepare(`SELECT id FROM _entries WHERE collection_id = 'categories' AND slug = ?`).get(slug);
  if (exists) {
    nameToId[name] = exists.id;
    console.log(`  · category '${name}' already exists`);
  } else {
    const id    = randomUUID();
    const color = defaultColors[colorIdx++ % defaultColors.length];
    db.db.prepare(`INSERT INTO _entries (id, collection_id, slug, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, 'categories', slug, JSON.stringify({ name, color, description: '' }), 'published', now, now);
    nameToId[name] = id;
    console.log(`  ✓ category '${name}' created (${color})`);
  }
}

// If no categories existed, seed a few defaults
if (allStrings.size === 0) {
  const defaults = [
    { name: 'Musik',       color: '#3d4fa8' },
    { name: 'Ausstellung', color: '#1e6b50' },
    { name: 'Theater',     color: '#9a6e30' },
    { name: 'Workshop',    color: '#8b2635' },
    { name: 'Film',        color: '#555577' },
  ];
  for (const { name, color } of defaults) {
    const slug   = slugify(name);
    const exists = db.db.prepare(`SELECT id FROM _entries WHERE collection_id = 'categories' AND slug = ?`).get(slug);
    if (!exists) {
      const id = randomUUID();
      db.db.prepare(`INSERT INTO _entries (id, collection_id, slug, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(id, 'categories', slug, JSON.stringify({ name, color, description: '' }), 'published', now, now);
      nameToId[name] = id;
      console.log(`  ✓ default category '${name}' created (${color})`);
    }
  }
}

// ── 4. Update events schema: categories array → relation ──────────────────────

const eventsRow = db.db.prepare(`SELECT schema FROM _collections WHERE id = 'events'`).get();
if (!eventsRow) {
  console.error('events collection not found');
  db.close();
  process.exit(1);
}

const schema = JSON.parse(eventsRow.schema);
schema.categories = {
  type:       'relation',
  collection: 'categories',
  multiple:   true,
  required:   false,
  label:      'Kategorien',
};

db.db.prepare(`UPDATE _collections SET schema = ? WHERE id = 'events'`)
  .run(JSON.stringify(schema));
console.log('  ✓ events schema updated: categories → relation');

// ── 5. Migrate existing event entries: strings → IDs ─────────────────────────

let migrated = 0;
for (const row of eventRows) {
  const data = JSON.parse(row.data);
  const cats = data.categories;
  if (!Array.isArray(cats) || cats.length === 0) continue;

  const ids = cats
    .map(c => nameToId[c?.trim()] ?? null)
    .filter(Boolean);

  data.categories = ids;
  db.db.prepare(`UPDATE _entries SET data = ? WHERE id = ?`)
    .run(JSON.stringify(data), row.id);
  migrated++;
}
console.log(`  ✓ ${migrated} event entries migrated`);

db.close();
console.log('\n✓ Migration complete');
