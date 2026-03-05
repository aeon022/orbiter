/**
 * seed.js
 * Creates demo.pod and populates it with sample content.
 * Run: npm run seed --workspace=apps/demo
 */
import { createPod } from '@orbiter/core';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const podPath = resolve(__dirname, '../demo.pod');

const db = createPod(podPath, {
  site: { name: 'Orbiter Demo', url: 'https://demo.orbiter.local' }
});

// Create posts collection
db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema)
  VALUES ('posts', 'Posts', '{"title":"string","excerpt":"string","tags":"array"}')
`).run();

// Seed entries
const posts = [
  {
    slug: 'wabi-sabi-interface-design',
    data: {
      title: 'The Art of Wabi-Sabi in Modern Interface Design',
      excerpt: 'On the beauty of imperfection and restraint in digital interfaces.',
      tags: ['design', 'japanese', 'ui'],
    },
  },
  {
    slug: 'single-file-architecture',
    data: {
      title: 'Single-File Architecture: Why One File Changes Everything',
      excerpt: 'How a single .pod file solves portability, deployments and infrastructure complexity.',
      tags: ['architecture', 'orbiter', 'cms'],
    },
  },
  {
    slug: 'astro-content-collections',
    data: {
      title: 'Orbiter + Astro Content Collections',
      excerpt: 'Using getCollection() and getEntry() backed by SQLite instead of the filesystem.',
      tags: ['astro', 'collections', 'dev'],
    },
  },
];

const insert = db.db.prepare(`
  INSERT OR IGNORE INTO _entries (id, collection_id, slug, data, status)
  VALUES (?, 'posts', ?, ?, 'published')
`);

for (const post of posts) {
  insert.run(randomUUID(), post.slug, JSON.stringify(post.data));
}

db.close();
console.log(`\n◆ Orbiter — demo.pod seeded`);
console.log(`  ${posts.length} posts ready`);
console.log(`  Run: npm run dev\n`);
