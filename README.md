# Orbiter

<img src="https://orbiter.sh/og-card.png" alt="Orbiter — CMS in one file for Astro" width="100%" />

<br />

[![npm](https://img.shields.io/npm/v/@a83/orbiter-integration?color=8b7cf8&label=npm)](https://www.npmjs.com/package/@a83/orbiter-integration)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/built%20for-Astro%205-FF5D01?logo=astro&logoColor=white)](https://astro.build)

> Portable single-file CMS for Astro — everything in one `.pod` file.

Content, media, schema, config, users — all in one SQLite database. Copy the file and your entire site moves with it. No cloud. No API keys. No external services.

```
your-site/
├── astro.config.mjs
├── content.pod        ← your entire CMS lives here
└── src/pages/
    └── blog/
        └── [slug].astro
```

---

## Quick Start

The fastest way to try Orbiter is to clone this repository and run the demo app. You need **Node.js 20+** and **npm 10+**.

```bash
git clone https://github.com/aeon022/orbiter.git
cd orbiter
npm install
npm run seed   # creates apps/demo/demo.pod with sample content
npm run dev    # starts at http://localhost:8080
```

Open **http://localhost:8080/orbiter** and log in:

```
Username: admin
Password: admin
```

The demo includes Posts, Pages, Authors, Events, and Categories — all pre-filled with sample content and draft/published entries.

---

## Install

```bash
npm install @a83/orbiter-integration
```

Optional packages:

```bash
npm install @a83/orbiter-core      # direct DB access / scripting
npm install -g @a83/orbiter-cli    # orbiter init, add-user, export, pack, unpack
```

`@astrojs/node@^9` is required as the Astro adapter (targets Astro 5 — `@astrojs/node@^10` requires Astro 6):

```bash
npm install @astrojs/node@^9
```

---

## Setup

### 1. Configure Astro

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',   // required — admin UI needs SSR
  adapter: node({ mode: 'standalone' }),
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
```

Use `output: 'hybrid'` to pre-render your public pages while keeping the admin dynamic:

```js
export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  integrations: [orbiter({ pod: './content.pod' })],
});
```

### 2. Create the pod and admin user

```bash
npx @a83/orbiter-cli init my-site
```

Or create the pod manually:

```js
// scripts/setup.js
import { createPod, hashPassword } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';

const db = createPod('./content.pod', {
  site: { name: 'My Site', url: 'https://example.com', locale: 'en' }
});
const hash = await hashPassword('change-me');
db.insertUser(randomUUID(), 'admin', hash, 'admin');
db.close();
```

```bash
node scripts/setup.js
npx astro dev
# → admin at http://localhost:4321/orbiter
```

### 3. Read content in your pages

```astro
---
import { getCollection } from 'orbiter:collections';

const posts = await getCollection('posts');
---

<ul>
  {posts.map(post => (
    <li><a href={`/blog/${post.slug}`}>{post.data.title}</a></li>
  ))}
</ul>
```

```astro
---
import { getCollection, getEntry } from 'orbiter:collections';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const post = await getEntry('posts', Astro.params.slug);
---

<article>
  <h1>{post.data.title}</h1>
  <div set:html={post.data.body} />
</article>
```

---

## How It Works

### The .pod file

A `.pod` file is a standard SQLite 3 database with a custom extension. Any SQLite tool can open it.

```
content.pod
├── _meta          → site config, locale, build webhook URL
├── _collections   → schema definitions (JSON per collection)
├── _entries       → all content from all collections
├── _versions      → full version history per entry
├── _media         → uploaded files stored as BLOBs
├── _users         → admin users (scrypt-hashed passwords)
└── _sessions      → active login sessions (auto-pruned)
```

```bash
# Inspect with any SQLite tool
sqlite3 content.pod ".tables"
sqlite3 content.pod "SELECT slug, status, updated_at FROM _entries ORDER BY updated_at DESC LIMIT 10"
```

### Virtual modules

| Module | Usage |
|--------|-------|
| `orbiter:collections` | Read published content in Astro pages (build-time) |
| `orbiter:db` | Access the pod path in admin routes (runtime) |

`orbiter:collections` is a **static snapshot** — it reads all published entries from the pod when Astro builds and inlines them as a JS module.

### Admin routes

The integration injects a complete admin UI under `/orbiter` via Astro's `injectRoute` API. Nothing is added to your `src/pages`.

| Route | Page |
|-------|------|
| `/orbiter` | Dashboard |
| `/orbiter/[collection]` | Collection list |
| `/orbiter/[collection]/[slug]` | Entry editor |
| `/orbiter/media` | Media library |
| `/orbiter/media/[id]` | Serve a media file (BLOB → HTTP) |
| `/orbiter/schema` | Schema editor |
| `/orbiter/settings` | Site settings + account |
| `/orbiter/users` | User management (admin only) |
| `/orbiter/build` | Build trigger |
| `/orbiter/import` | WordPress importer |
| `/orbiter/api/[collection]` | JSON API |
| `/orbiter/login` | Login |
| `/orbiter/logout` | Logout |
| `/orbiter/setup` | First-run setup wizard |
| `/orbiter/search` | Command palette search API |

---

## `orbiter:collections` API

```ts
// All published entries in a collection
getCollection(name: string): Promise<Entry[]>

// Single entry by slug
getEntry(collection: string, slug: string): Promise<Entry | null>

// All entries for a specific locale (slug--locale variants)
getLocaleCollection(name: string, locale?: string): Promise<Entry[]>

// Locale variant, falls back to base entry if variant doesn't exist
getLocaleEntry(collection: string, baseSlug: string, locale: string): Promise<Entry | null>

// Configured locales (from Settings → Language)
locale: string    // default locale, e.g. "en"
locales: string[] // all locales, e.g. ["en", "de", "fr"]
```

### Entry shape

```ts
{
  id:         string,          // UUID
  slug:       string,          // URL-safe identifier
  status:     'published',
  created_at: string,          // ISO datetime
  updated_at: string,          // ISO datetime
  data: {
    title:    string,
    body:     string,          // richtext → Markdown-rendered HTML
    image:    string,          // media field → UUID (use /orbiter/media/{id})
    tags:     string[],        // array field → string array
    author:   Entry,           // relation field → resolved Entry object
  }
}
```

### Media URLs

```astro
<img src={`/orbiter/media/${post.data.image}`} alt={post.data.title} />
```

### Relation fields

Relation fields are resolved at build time — the raw UUID array is replaced with full Entry objects:

```astro
{posts.map(post => (
  <div>
    <h2>{post.data.title}</h2>
    <p>by {post.data.author?.data?.name}</p>
    {post.data.categories?.map(cat => (
      <span>{cat.data.name}</span>
    ))}
  </div>
))}
```

---

## Schema Field Types

| Type | Input | Stored as |
|------|-------|-----------|
| `string` | Single-line text | `TEXT` |
| `richtext` | Block editor (Markdown) | `TEXT` |
| `number` | Numeric | `TEXT` |
| `url` | URL with validation | `TEXT` |
| `email` | Email with validation | `TEXT` |
| `date` | Date picker | `TEXT` (ISO date) |
| `datetime` | Date + time picker | `TEXT` (ISO datetime) |
| `select` | Dropdown | `TEXT` (option key) |
| `array` | Tag input | `TEXT` (JSON array) |
| `weekdays` | Weekday multi-select | `TEXT` (JSON array) |
| `media` | Media library picker | `TEXT` (media UUID) |
| `relation` | Entry picker | `TEXT` (JSON array of UUIDs) |

### Field definition

```js
{
  type:     'string',           // required
  label:    'Post Title',       // display name in editor
  required: true,

  // select fields:
  options:      ['news', 'event'],
  optionLabels: { news: 'News', event: 'Event' },

  // relation fields:
  collection: 'authors',
  multiple:   true,

  // conditional visibility:
  showWhen: 'category:event',   // show only when `category` equals `event`
}
```

---

## JSON API

Orbiter exposes a read-only JSON API for all collections:

```
GET /orbiter/api/[collection]
```

Returns all published entries as a JSON array.

**Authentication** (optional): add a Bearer token in Settings → API Token, then pass it as a header:

```bash
curl https://your-site.com/orbiter/api/posts
# or with token:
curl -H "Authorization: Bearer your-token" https://your-site.com/orbiter/api/posts
```

Response shape:

```json
[
  {
    "id": "uuid",
    "slug": "my-post",
    "status": "published",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-06-01T12:00:00Z",
    "data": {
      "title": "My Post",
      "body": "<p>...</p>"
    }
  }
]
```

---

## Git Sync Mode

For deployments where the filesystem is ephemeral (Netlify, Vercel, GitHub Pages), Orbiter provides a **Git sync mode**: media BLOBs are extracted from the pod to regular files, committed to git, and packed back in on each build.

### Commands

```bash
# Extract media BLOBs from pod to files (before git commit)
orbiter unpack --pod ./content.pod --out ./media

# Restore BLOBs from files back into pod (at build time)
orbiter pack --pod ./content.pod --dir ./media
```

### GitHub Actions template

A ready-made workflow template is included in the CLI:

```yaml
# .github/workflows/build.yml  (generated by orbiter init)
name: Build & Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: orbiter pack --pod ./content.pod --dir ./media
      - run: npx astro build
      - uses: actions/deploy-pages@v4   # or peaceiris/actions-gh-pages
```

### Workflow

```
1. Edit content in Orbiter admin
2. orbiter unpack  → extracts media to ./media/
3. git add content.pod media/ && git commit && git push
4. CI: orbiter pack → restores BLOBs, then astro build
5. Static output deployed to Netlify / GitHub Pages / etc.
```

This mode lets you use Orbiter with any static hosting while keeping your pod + media in git.

---

## WordPress Import

Import content from a WordPress WXR export directly in the admin:

1. In WordPress: **Tools → Export → All content** → download the `.xml` file
2. In Orbiter admin: **Import** → upload the WXR file
3. Choose which post types to import
4. Orbiter converts:
   - Post titles, slugs, dates, status (published/draft)
   - HTML body content → Markdown (via `turndown`)
   - Categories and tags → array fields
   - Featured images → downloaded and stored as BLOBs in the media library

No CLI required — the entire import runs in the browser via the admin UI.

---

## Multilingual (i18n)

Orbiter uses a `slug--locale` convention:

```
my-post          ← default / primary entry
my-post--de      ← German variant
my-post--fr      ← French variant
```

Configure locales in **Settings → Language** (`locale` + `locales`). The locale switcher appears automatically in the entry editor.

```astro
---
import { getLocaleCollection, getLocaleEntry, locales } from 'orbiter:collections';

const posts = await getLocaleCollection('posts', 'de');
const post  = await getLocaleEntry('posts', 'my-post', 'de'); // falls back to base
---
```

Static paths for multilingual sites:

```astro
export async function getStaticPaths() {
  const posts = await getCollection('posts');
  const base  = posts.filter(p => !p.slug.includes('--'));
  return base.flatMap(post =>
    locales.map(loc => ({ params: { slug: post.slug, lang: loc } }))
  );
}
```

---

## CLI

```bash
npm install -g @a83/orbiter-cli
```

| Command | Description |
|---------|-------------|
| `orbiter init [dir]` | Scaffold a new Astro + Orbiter project |
| `orbiter add-user` | Add a user to an existing pod |
| `orbiter export` | Export content to JSON or Markdown files |
| `orbiter unpack` | Extract media BLOBs from pod to files (Git sync) |
| `orbiter pack` | Restore media BLOBs from files into pod (Git sync) |

```bash
orbiter init my-site
orbiter add-user --pod ./content.pod
orbiter export --pod ./content.pod --out ./export --format md
orbiter unpack --pod ./content.pod --out ./media
orbiter pack   --pod ./content.pod --dir ./media
```

---

## Admin UI

### Dashboard
Entry counts per collection, recently edited entries, persistent scratchpad + todo list, build trigger status.

### Entry editor
All schema fields rendered as inputs, richtext block editor with live Markdown preview, autosave, version history, status toggle (draft / published), media picker, relation picker, conditional field visibility.

### Media library
Upload, browse, and manage files. Images, video, PDF, and any file type. Stored as BLOBs in the pod. Served at `/orbiter/media/[id]`. Folder categories, type filter, inline image and video preview, copy URL, alt text.

### Schema editor
Add, edit, delete, and reorder fields on any collection. Changes take effect immediately — no migration or restart needed.

### Command palette
`⌘ K` / `Ctrl K` — fuzzy search across all content and navigation from any admin page.

### Themes

Two visual themes, switchable in Settings:

| Theme | Style |
|-------|-------|
| **Orbiter Zen** | Warm, editorial — Noto Serif JP + DM Mono, amber accents |
| **Space Enso** | Terminal, futuristic — Space Mono throughout, cyan/blue accents |

Both support light and dark mode. Preference saved to localStorage.

### PWA
The admin is installable as a Progressive Web App on mobile and desktop. Service worker caches assets, offline page shown when disconnected.

---

## Auth

Cookie-based sessions. Passwords hashed with `scrypt` (Node.js built-in).

**Roles:**

| Feature | editor | admin |
|---------|--------|-------|
| Create / edit / delete entries | ✅ | ✅ |
| Manage media | ✅ | ✅ |
| Edit schema | ✅ | ✅ |
| Site settings | ✅ | ✅ |
| Manage users | ❌ | ✅ |

---

## Adapters & Deployment

Orbiter uses `better-sqlite3` — a native Node.js module. It requires a **real Node.js runtime with filesystem access**.

| Adapter | Supported | Notes |
|---------|-----------|-------|
| `@astrojs/node` | ✅ Recommended | Standalone or middleware mode |
| `@astrojs/netlify` | ⚠️ Read-only | Serverless FS is ephemeral — use Git sync for editing |
| `@astrojs/vercel` | ⚠️ Read-only | Same as Netlify |
| Cloudflare Workers | ❌ | No native Node.js support |

### Node.js (recommended)

```bash
npm install @astrojs/node@^9
npx astro build
node dist/server/entry.mjs
```

Works on: VPS (Hetzner, DigitalOcean), Railway, Render, Fly.io, Docker.

**Docker:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npx astro build
EXPOSE 3000
CMD ["node", "dist/server/entry.mjs"]
```

```bash
# Mount .pod as a volume so it persists across container restarts
docker run -p 3000:3000 -v $(pwd)/content.pod:/app/content.pod my-orbiter-site
```

### Recommended pattern for static hosting (Netlify / Vercel)

```
┌─────────────────────────────┐  build hook  ┌──────────────────────┐
│  Orbiter Admin              │ ────────────▶ │  Netlify / Vercel    │
│  (VPS or Railway)           │              │  (static frontend)   │
│  /orbiter  ← edit content   │              │  /  ← visitors       │
│  content.pod  ← persists    │              └──────────────────────┘
└─────────────────────────────┘
```

1. Run the Orbiter admin on a Node.js server with a persistent `.pod` file
2. Edit content, click **Trigger build**
3. Netlify/Vercel fetches the repo + pod, runs `astro build`, deploys static HTML

---

## Build Trigger

In the admin dashboard, **Trigger build** sends a `POST` to the webhook URL configured in **Settings → Build & Deploy**.

**Netlify:** Site configuration → Build & deploy → Build hooks → Add build hook

**Vercel:** Project settings → Git → Deploy Hooks

**GitHub Actions:** Use `repository_dispatch` — add a small serverless proxy to inject the `Authorization` header before forwarding to GitHub's API.

---

## Repository Structure

```
orbiter/
├── apps/
│   ├── demo/                    ← demo Astro site
│   │   ├── astro.config.mjs
│   │   ├── demo.pod             ← generated by npm run seed
│   │   └── scripts/seed.js
│   └── landing/                 ← orbiter.sh marketing site (Astro/static)
│
├── packages/
│   ├── core/                    ← @a83/orbiter-core
│   │   └── src/
│   │       ├── index.js         ← public API
│   │       ├── db.js            ← OrbiterDB (SQLite wrapper)
│   │       ├── pod.js           ← createPod / openPod
│   │       └── auth.js          ← hashPassword / verifyPassword / generateToken
│   │
│   ├── integration/             ← @a83/orbiter-integration
│   │   ├── src/
│   │   │   ├── index.js         ← Astro integration + virtual modules
│   │   │   ├── admin-utils.js   ← theme, dark mode, command palette
│   │   │   ├── i18n.js          ← EN/DE translations
│   │   │   └── wp-importer.js   ← WordPress XML importer
│   │   ├── routes/              ← all /orbiter/* admin pages
│   │   └── styles/admin.css
│   │
│   └── cli/                     ← @a83/orbiter-cli
│       ├── bin/orbiter.js
│       └── src/
│           ├── init.js
│           ├── add-user.js
│           ├── export.js
│           ├── pack.js          ← Git sync: restore BLOBs into pod
│           └── unpack.js        ← Git sync: extract BLOBs from pod
│
└── package.json                 ← npm workspace root
```

### Root scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start demo app dev server (port 8080) |
| `npm run seed` | Recreate `demo.pod` with fresh sample data |
| `npm run build` | Build the demo app |
| `npm run publish:core` | Publish `@a83/orbiter-core` to npm |
| `npm run publish:integration` | Publish `@a83/orbiter-integration` to npm |
| `npm run publish:cli` | Publish `@a83/orbiter-cli` to npm |
| `npm run publish:all` | Publish all three packages |

---

## Publishing

```bash
# Bump versions
npm version patch --workspace=packages/core
npm version patch --workspace=packages/integration
npm version patch --workspace=packages/cli

# Dry run first
npm pack --workspace=packages/core --dry-run
npm pack --workspace=packages/integration --dry-run

# Publish (core first — integration and CLI depend on it)
npm publish --workspace=packages/core --access=public
npm publish --workspace=packages/integration --access=public
npm publish --workspace=packages/cli --access=public
```

Release checklist:
- All three package versions bumped
- `npm pack --dry-run` is clean (no secrets, no `.pod` files)
- `git status` is clean
- Git tag pushed: `git tag v0.x.x && git push origin v0.x.x`

---

## Adding an Admin Language

The admin ships with **English** and **German**. To add a locale, add translations to `packages/integration/src/i18n.js` and add the language option to `routes/settings.astro` and `routes/setup.astro`.

---

## Roadmap

| Phase | Name | Status |
|-------|------|--------|
| 01 | Ignition | ✅ Done — core DB, virtual modules, basic admin |
| 02 | Bridge | ✅ Done — full admin UI, media library, auth |
| 03 | Warp | ✅ Done — block editor, version history, themes, i18n, relations |
| 04 | Orbit | ✅ Done — multi-user, per-entry i18n, CLI, PWA, npm publish |

Next up: Git sync improvements, demo instance, documentation site.

---

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@a83/orbiter-core` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-core?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-core) | SQLite engine, pod management, auth utilities |
| `@a83/orbiter-integration` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-integration?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-integration) | Astro integration, virtual modules, admin UI, PWA |
| `@a83/orbiter-cli` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-cli?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-cli) | `orbiter init`, `add-user`, `export`, `pack`, `unpack` |

---

**orbiter.sh** · MIT License · Built by [Abteilung83](https://abteilung83.at)
