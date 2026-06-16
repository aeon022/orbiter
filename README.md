# Orbiter

<img src="https://orbiter.sh/og-card.png" alt="Orbiter — CMS in one file for Astro" width="100%" />

<br />

[![npm](https://img.shields.io/npm/v/@a83/orbiter-integration?color=8b7cf8&label=npm)](https://www.npmjs.com/package/@a83/orbiter-integration)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/built%20for-Astro%206-FF5D01?logo=astro&logoColor=white)](https://astro.build)

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

You need **Node.js 20+** and **npm 10+**.

```bash
git clone https://github.com/aeon022/orbiter.git
cd orbiter
npm install
npm run seed   # creates apps/demo/demo.pod with sample content
```

Start the admin:

```bash
ORBITER_POD=$(pwd)/apps/demo/demo.pod npm run dev --workspace=packages/admin
```

Open **http://localhost:4322** and log in:

```
Username: admin
Password: admin
```

The demo includes Posts, Pages, Authors, Events, and Categories — all pre-filled with sample content and draft/published entries.

To also run the public demo site:

```bash
npm run dev   # → http://localhost:8080
```

---

## Standalone Admin (`packages/admin`)

The admin runs as a self-contained Hono server on port **4322** — independent from the Astro dev server. It only needs a `.pod` file.

### Prerequisites

```bash
npm install          # run from the repo root (installs all workspaces)
npm run seed         # creates apps/demo/demo.pod if it doesn't exist yet
```

### Start

**Development** (with `--watch`, reloads on changes to `src/`):

```bash
ORBITER_POD=$(pwd)/apps/demo/demo.pod npm run dev --workspace=packages/admin
```

**Production** (single run, no watch):

```bash
ORBITER_POD=$(pwd)/apps/demo/demo.pod npm start --workspace=packages/admin
```

> **Note:** Use an absolute path (`$(pwd)/...`). The server changes its working directory internally to `packages/admin/`, so relative paths resolve incorrectly.

Or run directly from the package directory:

```bash
cd packages/admin
ORBITER_POD=../../apps/demo/demo.pod npm run dev
```

### Open

```
http://localhost:4322
```

Automatically redirects to `/login.html`. Login:

```
Username: admin
Password: admin
```

### Run both servers in parallel (Admin + Demo Site)

Two terminals:

```bash
# Terminal 1 — Astro demo site (public)
npm run dev

# Terminal 2 — Standalone admin
ORBITER_POD=./apps/demo/demo.pod npm run dev --workspace=packages/admin
```

- Demo site: `http://localhost:8080`
- Admin:     `http://localhost:4322`

Both access the same `demo.pod`. Changes made in the admin are immediately visible in the demo site after a browser reload.

### Environment variables

| Variable        | Required | Default                                        | Description                              |
|-----------------|----------|------------------------------------------------|------------------------------------------|
| `ORBITER_POD`   | yes      | —                                              | Path to the `.pod` file                  |
| `PORT`          | no       | `4322`                                         | HTTP port                                |
| `ADMIN_ORIGIN`  | no       | `http://localhost:4321,http://localhost:4322`   | Allowed CORS origins (comma-separated)   |

### Test with a custom pod

```bash
node -e "
import('@a83/orbiter-core').then(({ createPod, hashPassword }) => {
  const db = createPod('./test.pod', { site: { name: 'Test' } });
  hashPassword('admin').then(h => { db.insertUser(crypto.randomUUID(), 'admin', h, 'admin'); db.close(); });
});
"

ORBITER_POD=./test.pod npm run dev --workspace=packages/admin
```

### Health check

```bash
curl http://localhost:4322/health
# → { "ok": true, "pod": "/path/to/content.pod" }
```

---

## Install

### Admin (recommended)

The standalone admin server — runs independently, no Astro required:

```bash
npm install @a83/orbiter-admin
```

### Astro integration

Required to read content in your Astro pages via `orbiter:collections`:

```bash
npm install @a83/orbiter-integration @astrojs/node@^10
```

> `@astrojs/node@^10` targets Astro 6 — use `@astrojs/node@^9` for Astro 5.

### Other packages

```bash
npm install @a83/orbiter-core      # direct DB access / scripting
npm install -g @a83/orbiter-cli    # orbiter init, add-user, export, pack, unpack
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
├── _meta          → site config, locale, build webhook URL, media backend config
├── _collections   → schema definitions (JSON per collection)
├── _entries       → all content from all collections
├── _versions      → full version history per entry
├── _media         → media metadata + optional BLOB data (see Media Backends)
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
| `/orbiter/rss/[collection].xml` | RSS 2.0 feed per collection |
| `/orbiter/sitemap.xml` | XML sitemap of all published entries |
| `/orbiter/login` | Login |
| `/orbiter/logout` | Logout |
| `/orbiter/setup` | First-run setup wizard |
| `/orbiter/search` | Command palette search API |

---

## `orbiter:collections` API

```ts
// All published entries in default locale
getCollection(name: string): Promise<Entry[]>

// Single entry by slug (default locale)
getEntry(collection: string, slug: string): Promise<Entry | null>

// All published entries for a specific locale
getLocaleCollection(name: string, locale: string): Promise<Entry[]>

// Entry for a specific locale, falls back to default locale if not translated
getLocaleEntry(collection: string, slug: string, locale: string): Promise<Entry | null>

// Preview a draft entry (requires preview token from Settings → API)
getPreviewEntry(collection: string, slug: string, token: string): Promise<Entry | null>

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

For external media (GitHub backend or linked URLs), `/orbiter/media/[id]` issues a `302` redirect to the CDN or original URL — no change needed in templates.

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

Each entry has a `locale` field in the database. The first locale in **Settings → Language → Locales** maps to the default (`locale = ''`), additional locales are stored as their language code (`'de'`, `'fr'`, etc.).

Configure locales in **Settings → Language** — the locale switcher appears automatically in the entry editor. Create translation variants from the locale tabs; the slug stays the same across all locales.

```astro
---
import { getCollection, getLocaleCollection, getLocaleEntry, locales } from 'orbiter:collections';

// Default locale only
const posts = await getCollection('posts');

// All German posts
const dePosts = await getLocaleCollection('posts', 'de');

// A specific entry in German, falls back to default locale if not translated
const post = await getLocaleEntry('posts', 'my-post', 'de');
---
```

Static paths for multilingual sites:

```astro
export async function getStaticPaths() {
  const posts = await getCollection('posts');          // default locale entries
  return posts.flatMap(post =>
    locales.map(loc => ({ params: { slug: post.slug, lang: loc } }))
  );
}

const { lang, slug } = Astro.params;
const post = await getLocaleEntry('posts', slug, lang); // falls back to default
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
All schema fields rendered as inputs. Richtext block editor with live Markdown preview, autosave, version history, draft/published toggle. Inline image blocks with float alignment (left/right/center/full). Video embedding (YouTube, Vimeo, mp4). Media picker with three tabs: Library (browse pod), From URL (server-side import from Dropbox/Drive/OneDrive), External link (store URL reference without fetching). Relation picker, conditional field visibility. Required field validation before save. Scheduled publishing (set `publish_at`) and content expiry (`unpublish_at`). Per-entry editorial comments with resolve/unresolve. Entry locking — warns when another user is already editing the same entry. Version history with restore per snapshot.

**Multilingual:** When locales are configured (Settings → Language), a locale tab bar appears below the editor toolbar. Each tab shows existing locale variants; dashed tabs are untranslated. Click a dashed tab to create that translation variant.

### Media library
Upload, browse, and manage files. Images, video, PDF, and any file type. Served at `/orbiter/media/[id]` — BLOB, disk file, or CDN redirect depending on configured backend. Folder categories, type filter, inline image and video preview, copy URL, alt text. Automatic image optimization on upload (resize + compress via sharp, configurable in Settings).

### Schema editor
Add, edit, delete, and reorder fields on any collection. Changes take effect immediately — no migration or restart needed. **Export schema** as JSON and **import** from file to copy schemas between collections or pods.

### Entries list
Trash (soft delete + restore + permanent delete), activity log, bulk actions (publish/draft/delete/restore), drag-to-sort, scheduled status tab. **CSV export and import** per collection for bulk content management. When locales are configured, locale filter tabs appear in the filter bar.

### Command palette
`⌘ K` / `Ctrl K` — fuzzy search across all content and navigation from any admin page.

### Themes

Three themes × two schemes (dark/light) × two layouts, switchable in Settings:

| Theme | Dark | Light |
|-------|------|-------|
| **Space** | Space station HUD — cyan + electric blue | Solar Command — ice blue |
| **Zen** | Japandi — slate, mauve, moss | Japandi light |
| **Catppuccin** | Mocha | Latte |

**Layouts:** Classic (sidebar + content grid) or **Station** (Space Station mode — floating magnification dock, HUD panel with stats/notes, frosted glass page headers). Layout and theme saved to `localStorage`.

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

Orbiter fires the webhook **automatically** whenever an entry transitions from draft to published. The same URL is also triggered manually via **Trigger build** in the dashboard.

Configure the webhook URL in **Settings → Build**.

**Netlify:** Site configuration → Build & deploy → Build hooks → Add build hook

**Vercel:** Project settings → Git → Deploy Hooks

**GitHub Actions:** Use `repository_dispatch` — add a small serverless proxy to inject the `Authorization` header before forwarding to GitHub's API.

---

## Media Backends

Orbiter supports four ways to store media, configured in **Settings → Media storage**:

| Backend | How it works | Best for |
|---------|-------------|----------|
| `blob` | File data stored as BLOB in the `.pod` file (default) | Small–medium sites |
| `local` | Files written to a directory on the server | Self-hosted VPS with persistent disk |
| `github` | Files uploaded via GitHub Contents API, served from jsDelivr CDN | Open-source sites, free global CDN |
| `link` | External URL stored — no data fetched or copied | Dropbox, Google Drive, Cloudinary, any public URL |

### GitHub backend

Files are served from `cdn.jsdelivr.net/gh/owner/repo@branch/path` — no egress costs, cached globally. Configure in Settings:

```
Media backend:  github
Repository:     owner/media-repo
Branch:         main
Directory:      media
GitHub token:   ghp_…  (can reuse the token from the GitHub section)
```

### External link (no backend required)

Use the **External link** tab in the image picker to store a URL reference without downloading anything. Works with Dropbox share links, Google Drive, OneDrive, Cloudinary, and any publicly accessible URL. Orbiter makes a `HEAD` request to detect the mime type, then stores only the URL. `/orbiter/media/[id]` issues a `302` redirect — no change needed in your templates.

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
│   │       ├── auth.js          ← hashPassword / verifyPassword / generateToken
│   │       └── media-backend.js ← BlobBackend / LocalBackend / GitHubBackend
│   │
│   ├── admin/                   ← @a83/orbiter-admin
│   │   ├── src/
│   │   │   ├── server.js        ← Hono server entry point (port 4322)
│   │   │   ├── middleware/      ← auth middleware
│   │   │   └── routes/          ← entries, media, collections, meta, build, auth
│   │   └── public/              ← vanilla JS + CSS admin UI (no build step)
│   │       ├── dashboard.html
│   │       ├── editor.html
│   │       ├── media.html
│   │       ├── settings.html
│   │       └── style.css
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

## Changelog

### June 2026 · v0.3.14 — Scheduled Publishing, Comments, RSS/Sitemap, Entry Locking & Email Notifications

**Scheduled publishing & content expiry**
- Set `publish_at` on any entry to schedule it — a 60-second server-side scheduler auto-publishes at the right time and fires the build webhook.
- Set `unpublish_at` on published entries to automatically revert them to draft at a future date.
- Both dates editable directly in the editor sidebar.

**Content comments**
- Per-entry editorial comment thread in the editor — post, resolve/unresolve, and delete comments.
- Comments are stored in the `_comments` table alongside the entry, never in the entry data.
- API: `GET/POST /{collection}/entries/{slug}/comments`, `PATCH /comments/{id}/resolve`, `DELETE /comments/{id}`.

**RSS feeds & XML sitemap** *(integration routes, injected automatically)*
- `GET /orbiter/rss/[collection].xml` — RSS 2.0 feed for any collection. Uses `site.name`, `site.url`, `site.description` from Settings.
- `GET /orbiter/sitemap.xml` — full XML sitemap across all published entries in all collections.
- No configuration needed — routes are injected when you add the integration.

**Schema export & import**
- Export the schema of any collection as a `.json` file (↓ Export schema button in the edit panel).
- Import a schema JSON file to repopulate the field list — useful for copying schemas between collections or pods.

**CSV import & export per collection**
- Export all entries of a collection as a CSV file (↓ CSV button on the entries list).
- Import entries from a CSV file (↑ CSV) — creates new entries or updates existing ones by slug.

**Entry locking**
- When an editor opens an entry, the server claims a lock via `POST /api/locks/{collection}/{slug}`.
- If another user is already editing, a yellow warning banner appears: "X is currently editing this entry."
- Lock refreshed every 60 s, expires after 90 s without a heartbeat, released on page close.

**Email notifications**
- Configure SMTP in Settings → Email notifications (host, port, user, pass, from, notify-to).
- Toggle "notify on publish" and "notify on comment" independently.
- Emails sent asynchronously via nodemailer — never blocks saves.

**Required field validation**
- Schema fields with `required: true` are validated in the editor before saving (non-autosave).
- Missing required fields show a blocking alert listing the field names.

**Image optimization**
- Uploaded images are automatically resized (default max 2400 px) and compressed (default quality 85) via `sharp`.
- Configurable per-pod in Settings → Image optimization.

### May 2025 — Media Backends, Build Webhook & External Links

**Build webhook**
- Webhook fires **automatically** when an entry transitions from draft to published — no manual trigger needed
- Same URL also available via the manual **Trigger build** button
- `build.last_triggered` timestamp updated on each fire

**Pluggable media backends**
- `blob` — default, BLOB in SQLite (unchanged)
- `local` — write files to a configurable directory on the server (`media.local_path`)
- `github` — upload via GitHub Contents API, serve from jsDelivr CDN (`cdn.jsdelivr.net/gh/...`)
- Configured in Settings → Media storage; stored in `_meta`, no restart needed
- `_media` schema migrated automatically: `data` column nullable, `url` + `path` columns added

**External link media**
- New **External link** tab in the image picker — stores a URL reference without fetching any data
- Works with Dropbox, Google Drive, OneDrive, Cloudinary, any public URL
- `HEAD` request on save detects mime type; `/orbiter/media/[id]` issues a `302` redirect

### May 2025 — Editor: Images, Video & Cloud Import

The block editor gains full rich-media embedding:

- **Inline image blocks** — insert images directly into the body. Alignment controls: float left, float right, center, full width. Text wraps naturally around floated images.
- **Media picker** — browse the library and insert with one click, or upload from disk on the spot.
- **Cloud URL import** — paste a share link from Dropbox, Google Drive, or OneDrive into the image picker. The server fetches the file server-side (bypassing CORS) and stores it in the pod. Any public image URL also works.
- **Video embedding** — paste a YouTube, Vimeo, Wistia, or direct `.mp4`/`.webm` URL. Video blocks render as responsive 16:9 embeds. Pasting a video URL anywhere in the editor auto-creates the block. Serialized as `::video[url]` in Markdown.
- **`/` block picker** — Image and Video entries added. Type `/img` or `/vid` to insert.

### March 2025 — Themes & Glass Layout

- **Three themes:** Space (dark: space station HUD / light: solar command ice blue), Zen (Japandi — slate, mauve, moss), Catppuccin (Mocha / Latte). Switchable live in Settings.
- **Glass layout** — frosted panels, backdrop blur, animated gradient orbs. Ships as the default. Classic grid layout still available.
- **Nav logo** — animated SVG planet replaces emoji in the standalone admin.

### January 2025 · v0.1.0 — First npm Release

- Published `@a83/orbiter-core`, `@a83/orbiter-integration`, `@a83/orbiter-admin`, `@a83/orbiter-cli` to npm.
- Block-based richtext editor with live Markdown preview, autosave, version history.
- Per-entry locale variants (`slug--locale` convention), `getLocaleCollection()` and locale fallback.
- Relation fields resolved at build time into full Entry objects.
- Multi-user auth — admin and editor roles, user management in the UI.
- WordPress WXR importer — runs in the browser, no CLI needed.
- Git sync mode — `orbiter pack` / `orbiter unpack` for static hosting (Netlify, Vercel, GitHub Pages).
- JSON API — `GET /orbiter/api/[collection]`, optional Bearer token.
- PWA — installable admin on mobile and desktop, service worker, offline page.

---

## Roadmap

| Phase | Name | Status |
|-------|------|--------|
| 01 | Ignition | ✅ Done — core DB, virtual modules, basic admin |
| 02 | Bridge | ✅ Done — full admin UI, media library, auth |
| 03 | Warp | ✅ Done — block editor, version history, themes, i18n, relations |
| 04 | Orbit | ✅ Done — multi-user, per-entry i18n, CLI, PWA, npm publish |
| 05 | Station | ✅ Done — S3 backend, external media links, docs site, auto-publish webhook |
| 06 | Horizon | ✅ Done — scheduled publishing, comments, RSS/sitemap, locking, email notifications |
| 07 | Cosmos  | 🔄 In progress — demo instance, outgoing webhooks, 2FA |

### v0.3.14 — released

**Scheduled publishing & content expiry** — `publish_at` / `unpublish_at` on every entry. Fires build webhook on schedule.

**Content comments** — per-entry editorial threads with resolve/unresolve. `_comments` table, full CRUD API.

**RSS feeds & sitemap** — `/orbiter/rss/[collection].xml` and `/orbiter/sitemap.xml` injected by the integration automatically.

**Schema export/import** — download schema as JSON, re-import into any collection or pod.

**CSV import/export** — bulk entry management per collection.

**Entry locking** — prevents silent overwrites when two editors open the same entry. 90-second lock with heartbeat.

**Email notifications** — nodemailer SMTP config in Settings, optional notify-on-publish and notify-on-comment emails.

**Required field validation** — blocks save (non-autosave) when `required: true` fields are empty.

**Image optimization** — sharp resize + compress on upload, configurable max-width and quality per pod.

### v0.3.1 — released

**S3-compatible media backend** — R2 (Cloudflare), Backblaze B2, AWS S3, MinIO. Config via Settings → Media.

**External media links** — store a URL reference without fetching the file. Third tab in the image picker.

**Auto-publish webhook** — fires automatically on `draft → published` transition, not just manual trigger.

**Documentation site** — full reference at [orbiter.sh/docs](https://orbiter.sh/docs), integrated into the landing page.

### Later

- **SSR / runtime mode** — `orbiter:collections` currently snapshots at build time; a runtime adapter for sites that need live content without rebuilding
- **SvelteKit / Next.js integration** — the virtual module concept is framework-agnostic; Astro is first, others follow
- **Orbiter Cloud** — hosted pod management for teams who don't want to self-host

---

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@a83/orbiter-core` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-core?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-core) | SQLite engine, pod management, auth utilities, media backends |
| `@a83/orbiter-admin` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-admin?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-admin) | Standalone Hono admin server (port 4322), vanilla JS + CSS UI |
| `@a83/orbiter-integration` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-integration?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-integration) | Astro integration, virtual modules, PWA |
| `@a83/orbiter-cli` | [![npm](https://img.shields.io/npm/v/@a83/orbiter-cli?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-cli) | `orbiter init`, `add-user`, `export`, `pack`, `unpack` |

---

**orbiter.sh** · MIT License · Built by [Abteilung83](https://abteilung83.at)
