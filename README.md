# Orbiter

<img src="og-card.png" alt="Orbiter — CMS in one POD, built for Astro" width="100%" />

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

### Option A — Scaffold a new project (recommended)

```bash
npx @a83/orbiter-cli init my-site
cd my-site
```

The CLI creates a project folder, a `.pod` file with sample collections, and starts the admin automatically.

Open **http://localhost:4322** and log in with `admin / admin`.

### Option B — Run the demo repo

```bash
git clone https://github.com/aeon022/orbiter.git
cd orbiter
npm install
npm run seed   # creates apps/demo/demo.pod with sample content
ORBITER_POD=$(pwd)/apps/demo/demo.pod npm run dev --workspace=packages/admin
```

Open **http://localhost:4322** — login: `admin / admin`.

The demo includes Posts, Pages, Authors, Events, and Categories — all pre-filled with sample content and draft/published entries.

To also run the public demo Astro site:

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

## Desktop App

The Orbiter desktop app wraps the admin server in a native macOS and Windows application — no terminal, no npm, no Node.js required.

### Install

**macOS** — Download `Orbiter-universal.dmg` from [GitHub Releases](https://github.com/aeon022/orbiter/releases) (läuft nativ auf Apple Silicon und Intel). Drag **Orbiter.app** to Applications, double-click to launch.

> **Gatekeeper-Hinweis:** Da Orbiter nicht mit einer Apple Developer ID signiert ist, zeigt macOS beim ersten Start eine Warnung oder meldet „App ist beschädigt". Workarounds:
> - **Rechtsklicken → Öffnen** im Finder (dann erscheint „Trotzdem öffnen")
> - **Systemeinstellungen → Datenschutz & Sicherheit → Trotzdem öffnen**
> - Bei „beschädigt"-Meldung: Quarantäne-Flag im Terminal entfernen:
>   ```bash
>   xattr -cr /Applications/Orbiter.app
>   ```

**Windows** — Download the `.exe` installer, run it, launch Orbiter from the Start menu.

### First launch — templates

On first launch, Orbiter asks whether to open an existing `.pod` or create a new one. When creating a new pod, you choose a **template**:

| Template | Collections | Demo content |
|----------|-------------|--------------|
| Blank | — | — |
| Blog | Posts, Post-Kategorien | 2 posts (1 published, 1 draft) |
| Portfolio | Projects, Projekt-Kategorien | 2 projects + 2 categories |
| Business | Pages, Services, Team | 2 pages, 2 services, 1 team member |
| Events | Events, Event-Kategorien | 2 events + 2 categories |
| Dossier | Dossiers | 1 pilot dossier (39 fields in 6 groups: Content, Research, Evidence, Meta, Provenance, Agent) |

Every template sets up an `admin / admin` user so you can log in immediately. Change the password in Account settings.

### Switching pods

**File → POD wechseln… (`⌘O`)** — opens a `.pod` file picker, restarts with the new pod.  
**File → Neuen POD erstellen…** — file picker + template chooser, then restart.

Both options are also available via the menu-bar / system tray icon (right-click).

### Backup

**File → POD sichern… (`⌘⇧S`)** — saves a timestamped copy of the active pod next to the original (e.g. `content-backup-2026-06-19.pod`). A confirmation dialog offers to reveal the file in Finder/Explorer.

### Auto-update

When a new version is released on GitHub, the desktop app downloads it automatically in the background. A dialog appears: "Update downloaded — restart to apply?" with a **Restart now** button. Updates are delivered via [GitHub Releases](https://github.com/aeon022/orbiter/releases) using `electron-updater`.

Check for updates manually: **Hilfe → Nach Updates suchen…**

### Build (from source)

```bash
cd apps/desktop
npm install
npm run dev          # run in Electron without packaging

# Build universal DMG (arm64 + x64)
cd apps/desktop && electron-builder --mac
```

> Built with Electron 42. The admin server runs inside a `utilityProcess.fork()` — no system Node.js needed. ASAR packaging bundles all dependencies. The macOS build is a universal binary that runs natively on both Apple Silicon and Intel Macs.

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

| Type | Input | Stored as | TypeScript type |
|------|-------|-----------|-----------------|
| `string` | Single-line text | `TEXT` | `string` |
| `richtext` | Block editor (Markdown) | `TEXT` | `string` |
| `boolean` | On/Off toggle | `TEXT` | `boolean` |
| `number` | Numeric | `TEXT` | `number` |
| `url` | URL with validation | `TEXT` | `string` |
| `email` | Email with validation | `TEXT` | `string` |
| `date` | Date picker | `TEXT` (ISO date) | `string` |
| `datetime` | Date + time picker | `TEXT` (ISO datetime) | `string` |
| `select` | Dropdown | `TEXT` (option key) | union of option values |
| `array` | Tag input | `TEXT` (JSON array) | `string[]` |
| `weekdays` | Weekday multi-select | `TEXT` (JSON array) | `string[]` |
| `image` | Image picker (upload or library) | `TEXT` (media UUID) | `string` |
| `file` | File picker — PDF, document, download | `TEXT` (media UUID) | `string` |
| `table` | Mini-spreadsheet — rows & columns | `TEXT` (JSON 2D array) | `string[][]` |
| `media` | Media library picker (any type) | `TEXT` (media UUID) | `string` |
| `relation` | Entry picker (cross-collection) | `TEXT` (JSON array of UUIDs) | `EntryType[]` |

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

  // field grouping (editor sidebar):
  group: 'Research',            // collapsible group header in the editor

  // table format:
  format: 'apa7',              // APA7 citation preview below the table
}
```

### Field notes

**`image` / `file` / `media`** — all store a media UUID. Resolve to a URL in Astro:

```astro
---
const imgUrl  = `/api/media/${entry.data.cover}/raw`;
const fileUrl = `/api/media/${entry.data.brochure}/raw`;
---
<img src={imgUrl} alt="" />
<a href={fileUrl}>Download PDF</a>
```

**`table`** — stored as `string[][]`. First row is the header. Table fields with `format: 'apa7'` render an APA7-formatted citation preview below the table (supports book, article, chapter, report, website):

```astro
---
const rows = entry.data.prices; // string[][]
const [header, ...body] = rows;
---
<table>
  <thead><tr>{header.map(h => <th>{h}</th>)}</tr></thead>
  <tbody>{body.map(r => <tr>{r.map(c => <td>{c}</td>)}</tr>)}</tbody>
</table>
```

**`relation`** — returns an array of entry IDs by default. Use `getEntry()` to resolve:

```astro
---
import { getCollection, getEntry } from 'orbiter:collections';
const posts = await getCollection('posts');
// Resolve relation:
const author = await getEntry('authors', post.data.author[0]);
---
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

### When to use it

Use Git sync mode when your hosting platform has an **ephemeral filesystem** — Netlify, Vercel, GitHub Pages, Cloudflare Pages. These platforms spin up fresh containers for each build; any file written at runtime is gone on the next deploy.

Git sync solves this by keeping the pod and its media files in your git repository. The admin runs on a persistent server (Railway, VPS, Coolify) and writes to the pod normally. Before committing, you extract media BLOBs to plain files. At build time on CI, you restore them.

> If your media library is large (hundreds of images, gigabytes), consider the [S3 or GitHub media backend](#s3) instead — they keep blobs out of the pod entirely and don't require git sync for media.

---

### Commands

```bash
# Extract media BLOBs from pod to files (run locally before git commit)
orbiter unpack --pod ./content.pod --out ./media

# Restore BLOBs from files back into pod (run on CI before astro build)
orbiter pack --pod ./content.pod --dir ./media
```

---

### Full workflow

```
Local machine (persistent server or laptop):
  1. Edit content in the Orbiter admin
  2. orbiter unpack --pod ./content.pod --out ./media
  3. git add content.pod media/ && git commit && git push

CI (GitHub Actions / Netlify build):
  4. git checkout  →  gets pod + media files
  5. orbiter pack --pod ./content.pod --dir ./media  →  restores BLOBs into pod
  6. npx astro build  →  reads pod via orbiter:collections, generates static output
  7. Deploy to Netlify / GitHub Pages / etc.
```

---

### GitHub Actions template

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
      - run: npx @a83/orbiter-cli pack --pod ./content.pod --dir ./media
      - run: npx astro build
      - uses: actions/deploy-pages@v4   # or peaceiris/actions-gh-pages
```

---

### Tradeoffs

| | Git sync | S3/GitHub backend |
|--|---------|------------------|
| Setup | Simple — just two CLI commands | Needs S3 bucket or GitHub repo |
| Pod stays small | No — blobs in pod (and in git history) | Yes — pod only has metadata |
| Works offline | Yes — everything in git | Needs network to serve media |
| Best for | Small sites, < 50 MB media total | Large or growing media libraries |

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

### Form inbox
**Tools → Inbox** — receives contact and booking form submissions from your Astro site via `POST /api/form/:formId`. Each form ID is a separate tab. Actions per submission: mark as read / done / confirmed / rejected / spam, reply by email (inline compose panel), delete. SMTP config in Settings → Email.

### Snippets
**Tools → Snippets** — built-in Astro code library. Snippets are generated from your live pod state: collection names, admin origin, and available schemas. Categories: Setup, Content, SEO, Forms, Events, Integration. Each card has a copy button. Press `g p` in Space Station mode.

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

### Editor field groups
Schema fields with a `group` property are rendered as collapsible sections in the editor sidebar. First two groups and groups containing APA7 fields auto-expand. Collections without groups render flat as before — fully backward compatible.

### APA7 citation preview
Table fields with `format: 'apa7'` display a formatted citation list below the table. Default headers: Author, Year, Title, Source, URL, Type. Supports book, article, chapter, report, and website formats. Preview updates live on every keystroke.

### Template import/export
Export collections as shareable JSON templates (`POST /api/templates/export`). Import template JSON files (`POST /api/templates/import`). List built-in templates with install status (`GET /api/templates/available`). Install a built-in template into an existing POD (`POST /api/templates/install/:id`). Settings UI with template buttons, export checkboxes, and import file picker. Automatic `nav.groups` configuration on template install.

**Installing a template is always additive, never destructive.** If a collection already exists, it is skipped — no data, schema, or entries are overwritten. Only missing collections are created.

To update a schema without losing entries, use **Schema → Import Schema** — this overwrites only the field definitions while all entries remain intact. Deleting a collection removes all its entries permanently.

| Action | Schema | Entries |
|--------|--------|---------|
| Install template (collection doesn't exist) | ✅ created | ✅ demo entries |
| Install template (collection exists) | ⏭ skipped | ⏭ skipped |
| Import schema (↑ Import Schema) | 🔄 overwritten | ✅ preserved |
| Delete collection + reinstall | ✅ created | ❌ **lost** |

### Navigation grouping & dock drawers
Collections support `nav.hidden` (hide from sidebar/dock) and `nav.groups` (group into drawer sections) meta keys. Sidebar renders collapsible nav groups with hover-to-peek. Dock in Station mode shows hexagon drawer items with triangle indicator; hover opens a popup with collection links and preview cards. Settings UI: per-collection visibility toggle and group assignment.

### AI Content Assistant
`/ai` slash command and toolbar button in the block editor. Summarize, translate, generate SEO text, adjust tone. Supports Ollama (local, free) or OpenAI/Anthropic API keys. Configurable in Settings → AI. Preset pills for common tasks. No cloud lock-in.

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

Orbiter supports four storage backends for media files, configured in **Settings → Media storage** (no restart required — stored in the pod).

| Backend | How it works | Best for |
|---------|-------------|----------|
| `blob` | File data stored as BLOB in the `.pod` file (default) | Small–medium sites, simplest setup |
| `local` | Files written to a directory on the server | Self-hosted VPS with persistent disk |
| `github` | Files uploaded via GitHub Contents API, served from jsDelivr CDN | Open-source sites, free global CDN |
| `s3` | Files uploaded to any S3-compatible bucket | Large media libraries, high traffic |
| `link` | External URL stored — no data fetched or copied | Dropbox, Google Drive, Cloudinary, any public URL |

### Large media libraries

If your site has hundreds of high-res images or your pod is growing into gigabytes, switch away from `blob`:

- **Self-hosted VPS** → use `local`. Files sit next to the pod on disk, served directly. Zero egress cost.
- **Open-source / public repo** → use `github`. Files go to a GitHub repo and are served from jsDelivr's global CDN for free.
- **Any serious production site** → use `s3` with Cloudflare R2 (free egress), Backblaze B2, or AWS S3. Pod stays small and portable; media scales independently.

Switching backends does not delete existing blobs — rows keep their `backend` column value. Use **Settings → Media storage → Migrate** to move existing blobs to the new backend (pulls each blob, pushes to target, nulls the blob column in the pod).

---

### `blob` (default)

No configuration. Files stored inline in the pod. Works everywhere, but pod size grows with every upload.

---

### `local`

```
Media backend:   local
Media path:      ./media   (relative to pod, or absolute)
```

Files written to the filesystem. Served via `/api/media/:id` (stream). Best for a VPS where you have a persistent disk — pair with a cron job or rsync for backup.

---

### `github`

```
Media backend:   github
Repository:      owner/media-repo
Branch:          main
Directory:       media
GitHub token:    ghp_…   (needs repo write scope)
```

On upload Orbiter pushes the file via GitHub Contents API. Files are served from `cdn.jsdelivr.net/gh/owner/repo@branch/path` — no egress cost, globally cached. 1 GB free for public repos.

---

### `s3`

Works with **Cloudflare R2**, **Backblaze B2**, **AWS S3**, **MinIO**, or any S3-compatible endpoint.

```
Media backend:       s3
S3 bucket:           my-media-bucket
S3 region:           auto          (use 'auto' for R2, your region for AWS)
S3 endpoint:         https://…r2.cloudflarestorage.com   (omit for AWS)
S3 access key ID:    …
S3 secret key:       …
S3 public URL:       https://cdn.mysite.com   (optional — for custom domain / public bucket)
```

If **S3 public URL** is set, media is served via a direct redirect to that URL (no proxying through Orbiter). Otherwise Orbiter fetches the object and streams it.

Cloudflare R2 has zero egress cost and a generous free tier — it's the recommended choice for most production deployments.

---

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

### June 2026 · admin@0.3.68 — Dossier template, field groups, APA7 citations, template system, nav grouping

- **Dossier POD template** — new "Dossier" template alongside Blog, Portfolio, Business, Events. Creates a `dossiers` collection with 39 fields organized in 6 groups (Content, Research, Evidence, Meta, Provenance, Agent). Includes a demo "Pilot-Dossier" entry. Available in the Desktop app "New POD" dialog and via the template install system.
- **Editor sidebar field groups** — schema fields with a `group` property render as collapsible sections in the editor sidebar. First two groups and groups with APA7 fields auto-expand. Backward compatible — collections without groups render flat as before.
- **APA7 citation system** — table fields with `format: 'apa7'` display APA7-formatted citation previews below the table. Default headers: Author, Year, Title, Source, URL, Type. Supports book, article, chapter, report, website formats. Live preview updates on every keystroke.
- **Template import/export system** — `POST /api/templates/export` (export collections as shareable JSON), `POST /api/templates/import` (import template files), `GET /api/templates/available` (list built-in templates with install status), `POST /api/templates/install/:id` (install into existing POD). Settings UI with built-in template buttons, export checkboxes, import file picker. Auto `nav.groups` configuration on template install.
- **Navigation grouping & dock drawers** — `nav.hidden` and `nav.groups` meta keys. Sidebar: collapsible nav groups with hover-to-peek. Dock (Station mode): hexagon drawer items with triangle indicator, hover popup with collection links and preview cards. Active state + breadcrumb update on SPA navigation. Settings UI: per-collection visibility toggle + group assignment.
- **Named categories with parent/child** — templates create named category collections (`post_categories`, `project_categories`, `event_categories`) with parent relationship instead of a generic `categories` collection.
- **AI Content Assistant** — `/ai` slash command + toolbar button in the block editor. Summarize, translate, generate SEO text, adjust tone. Supports Ollama (local, free) or OpenAI/Anthropic API keys. Preset pills for common tasks. Configurable in Settings → AI.
- **Keyboard navigation updates** — 1-9 keys cover all dock items including drawers. g-mode extended with dynamic collection shortcuts (first unused letter). Cheatsheet updated.
- **Dashboard collections panel** — matches height of "Recently edited", scrolls independently.
- **Dock visual updates** — 22px icons, .88 opacity, calendar icon (☰), hexagon drawer icon with triangle indicator (pulses on hover), darker labels.

---

### June 2026 · admin@0.3.66 · Desktop v0.2.2 — Simple Analytics, OG image picker, dashboard toggles

- **Simple Analytics** — privacy-friendly pageview tracking stored in the POD. No cookies, no fingerprinting, <500 bytes tracking script. Bot detection for GPTBot, ClaudeBot, Perplexity, etc. Admin page with daily chart, top pages, referrers, and human vs. agent traffic split. `POST/GET /api/hit` (public) + `GET /api/analytics` (auth). Period filter: 7d/30d/90d.
- **OG Image picker** — media picker modal in the SEO panel replaces the dropdown. Image preview + clear button. Reuses the existing media library modal.
- **Dashboard widget toggles** — enable/disable Calendar, Recently Edited, Collections, Notes & To-Do in Settings → Dashboard widgets. Stored in `_meta`.
- **Keyboard navigation** — added `g+k` (Calendar), `g+n` (Inbox), `g+y` (Analytics), `g+p` (Snippets). Cheatsheet updated.

---

### June 2026 · admin@0.3.64 — Calendar view, cross-pod copy, nodemailer security fix

- **Calendar view** — new `calendar.html` page with full month grid. Entries are color-coded: blue = scheduled, gold = expiring, green = published, grey = draft. Click a day to see entries in the detail sidebar; filter by status. Keyboard navigation: ← → to change month, T for today. Dashboard widget shows a mini calendar + upcoming scheduled/expiring entries with a "Full calendar →" link.
- **Cross-pod import/export** — new "Pod / JSON" tab on the Import page. Export all collections + entries as a JSON file (`GET /api/import/export-pod`). Import from a `.pod` file or previously exported JSON (`POST /api/import/pod`). Creates missing collections automatically. Skip or overwrite duplicate entries.
- **Nodemailer security fix** — updated `nodemailer` from `^8.0.10` to `^9.0.1` to address [GHSA-p6gq-j5cr-w38f](https://github.com/advisories/GHSA-p6gq-j5cr-w38f) (message-level raw option bypass).

---

### June 2026 · Desktop App v0.2.0 — Auto-update, universal DMG, backup

- **Auto-update** — `electron-updater` downloads new releases from GitHub in the background; restart dialog appears when download completes. Check manually via Hilfe → Nach Updates suchen…
- **Universal macOS DMG** — single `Orbiter-universal.dmg` runs natively on both Apple Silicon and Intel Macs (no "Intel Mac support ending" warning)
- **Backup** — File → POD sichern… (`⌘⇧S`) creates a timestamped `.pod` copy; dialog offers to reveal in Finder/Explorer

---

### June 2026 · admin@0.3.62 — File upload field, table field, image picker modal, dock stats

- **File upload field** (`file`) — new schema field type for PDFs and documents. Drop zone in the editor sidebar, browse from the media library, `entry.data.myFile` returns a media UUID. In the richtext block editor: 📎 toolbar button opens a Files tab; inserts a download block (`::file[uuid|filename]`).
- **Table field** (`table`) — standalone spreadsheet field in the entry sidebar. First row = header (`<th>`), body rows = data. Toolbar: + Row / + Col / − Row / − Col. Tab/Shift-Tab navigates between cells; Tab past the last cell adds a new row. Stored as `string[][]` directly in the entry JSON — no extra `JSON.parse` needed in Astro.
- **Image/file picker → centered modal** — the media picker was a bottom sheet that could be hidden by the macOS Dock. Replaced with a centered modal (max-width 720 px, max-height 72 vh) — always visible regardless of Dock position or screen size.
- **Dock hover card stats** — draft count bubble removed from the dock icon. The hover preview card now shows colored chips: published (green) · drafts (amber) · scheduled (blue).

---

### June 2026 · Desktop App v0.1.0 — macOS + Windows installer

Native desktop app — no terminal, no npm, no Node.js required.

- **Self-contained** — Electron 42 bundles the admin server via `utilityProcess.fork()`, ASAR archive
- **Pod picker on first launch** — open an existing `.pod` or create a new one; choice is remembered
- **Templates on first launch** — choose Blog, Portfolio, Business, or Events; each creates collections + demo entries so the admin is immediately populated
- **Pod switching** — File → POD wechseln… (`⌘O`) or via the tray / system tray context menu
- **macOS** — DMG with drag-to-Applications layout
- **Windows** — NSIS installer (x64); wizard with optional install directory
- **Stays alive when closed** — lives in the macOS menu bar tray / Windows system tray
- **Standard app menu** — macOS: Datei / Bearbeiten / Fenster menus, `⌘Q` to quit

---

### June 2026 · v0.3.58 — Form inbox, Built-in SEO, FTP deploy & Code snippets

**Form inbox** — `POST /api/form/:formId` accepts contact and booking submissions from any Astro site. New admin page under Tools → Inbox: read, reply by email, mark as confirmed/rejected/done/spam. Honeypot spam filter. SMTP reply panel.

**Built-in SEO** — permanent SEO section in the entry editor (meta title, description, OG image). No schema changes needed. Live SERP preview with character counter. Available as `entry.seo.title`, `entry.seo.description`, `entry.seo.ogImage` in `orbiter:collections`.

**FTP / FTPS deploy** — upload Astro `dist/` to shared hosting directly from the admin. Configure in Settings. Test connection button. Trigger manually or automatically after a build webhook.

**Code snippets** — new Tools → Snippets page with 11 copy-paste Astro snippets. Dynamically populated from your pod: collection names, admin URL, and schema. Categories: Setup, Content, SEO, Forms, Events, Integration. Keyboard shortcut `g p` in Space Station mode.

Packages: `@a83/orbiter-admin@0.3.58`.

---

### June 2026 · v0.3.47 — Station dock overhaul

**Command palette** — `⌘K` or `/` opens full-screen. Opens pre-loaded with the 7 most recent entries. Type to fuzzy-search. Type `>` to enter command mode: `ls`, `go`, `new`, `search`, `build`, `export`, `random`, `= <math>`. Command history (↑/↓). Output rendered inline.

**Vim keyboard navigation** — press `g` then a letter: `g d` dashboard, `g m` media, `g h` HUD, `g s` settings, `g b` build, `g c` schema, `g a` account, `1`–`9` jump to nth dock item. Animated `g ›` badge in status bar.

**Notification center** — bell in status bar. All saves, builds, and exports logged automatically. Dropdown with unread badge, timestamps, clear-all.

**HUD panel expanded** — Drafts section (last 10 drafts, editor links) and Activity feed (last 8 events, live on open). Toggle with `g h` or dock button.

**Zen / focus mode** (`⌘⇧F`) — hides dock and status bar for distraction-free writing. Persists in `localStorage`.

**Shortcut cheatsheet** (`?`) — two-column modal listing all shortcuts and palette commands. Also accessible via `?` button in status bar.

**Live build status** — status bar shows `◉ building…` with pulse while running, polls every 4 s until done.

**Breadcrumb** — status bar center shows `Collection › Entries` when inside a collection; clickable back.

**Left dock mode** — toggle dock to left sidebar. Magnification axis, popups, workspace overlay all adapt.

**Hover preview cards** — hovering a collection dock item shows a card (280 ms delay) with 3 recent entries + action row (new / view all / export).

**Polish** — active dock item ring + glow dot, Settings in dock next to Tools, `min-width` on dock items so labels never clip the border ring.

Packages: `@a83/orbiter-admin@0.3.47`.

---

### June 2026 · v0.3.20 — Multilingual (i18n) & Space Station mode

**Multilingual content (i18n)**
- New `locale TEXT NOT NULL DEFAULT ''` column in `_entries` — replaces the old `slug--locale` slug suffix convention.
- First locale in `site.locales` (Settings → Language) maps to `locale = ''` for backwards compatibility; additional locales stored as their language code.
- Locale tab bar in the editor: existing variants show as solid tabs, untranslated as dashed. Click a dashed tab to create that locale variant.
- Locale filter tabs on the entries list — one tab per configured locale.
- All admin API routes accept a `?locale=` query parameter (`GET`, `POST`, `PUT`, `DELETE`, restore, duplicate, status, bulk).
- New endpoint: `GET /api/collections/:id/entries/:slug/locales` — list all locale variants of an entry.
- `orbiter:collections` updated: `getCollection()` and `getEntry()` return default locale only; `getLocaleCollection(name, loc)` and `getLocaleEntry(collection, slug, loc)` use the locale column with automatic fallback.
- Automatic migration — existing pods gain the `locale` column and updated `UNIQUE(collection_id, slug, locale)` constraint on first start.

**Space Station mode**
- New layout option: floating magnification dock (macOS-style, icons scale on hover), HUD status panel (stats + scratchpad/to-do), frosted glass page headers with contextual action buttons.
- Toggle in Settings → Interface → Layout → Station.
- Mobile: dock collapses to a native-feeling bottom tab bar on screens ≤ 768 px.
- Settings page reflows into a two-column grid to reduce scrolling; Save button pinned in the glass header and repeated at the bottom.
- Packages: `@a83/orbiter-core@0.3.9`, `@a83/orbiter-admin@0.3.20`, `@a83/orbiter-integration@0.3.8`.

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
- Basic locale support via `slug--locale` slug convention (superseded in v0.3.20 by a dedicated `locale` column).
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
| 03 | Warp | ✅ Done — block editor, version history, themes, relations |
| 04 | Orbit | ✅ Done — multi-user, CLI, PWA, npm publish |
| 05 | Station | ✅ Done — S3 backend, external media, docs site, auto-publish webhook |
| 06 | Horizon | ✅ Done — scheduled publishing, comments, RSS/sitemap, locking, email notifications |
| 07 | Cosmos  | ✅ Done — Space Station mode, multilingual i18n, settings overhaul, station dock overhaul (v0.3.47) |
| 08 | Frontier | ✅ Done — CSRF protection (Origin/Referer validation + sameSite cookie) |
| 09 | Ground Control | ✅ Done — macOS desktop app, DMG installer, no terminal needed |
| 10 | Outpost | ✅ Done — Windows desktop app (NSIS installer, x64) |
| 11 | Transit | ✅ Done — runtime adapter (auto-enabled for `output: 'server'` / `'hybrid'`) |
| 12 | Launch Pad | ✅ Done — file upload field, table field, desktop auto-update, universal macOS DMG |
| 13 | Observatory | ✅ Done — calendar view, cross-pod import/export, nodemailer security fix |
| 14 | Signal | ✅ Done — Simple Analytics, OG image picker, dashboard widget toggles, keyboard nav |
| 15 | Beacon | ✅ Done — Form Builder UI, AI Content Assistant, Dossier template, template import/export, field groups, APA7 citations, nav grouping & dock drawers |

### Next up

| Priority | Feature | Notes |
|----------|---------|-------|
| 1 | **Windows app menu** | Test and fix menu behavior on Windows (builds work, untested on real Windows) |
| 2 | **Multi-POD Dashboard** | Manage multiple PODs from one desktop window |
| 3 | **Dashboard Drag & Drop** | Reorder widgets, custom layouts stored in POD |
| 4 | **Dual Render — llms.txt** | Auto-generate structured content map at `/llms.txt` during every Astro build |
| 5 | **Dual Render — Semantic Depth Fields** | New field types for marking content depth layers (surface/deep/machine) |
| 6 | **SvelteKit integration** | `@a83/orbiter-sveltekit` — same virtual module API as the Astro integration |

### v0.3.47 — released

**Station dock overhaul** — command palette with `>` command mode and recent entries, vim keyboard nav (`g`+letter), notification center, HUD drafts + activity feed, zen mode (`⌘⇧F`), cheatsheet (`?`), live build polling, breadcrumb, left dock, hover preview cards, math eval (`> = expr`), `> random`.

### v0.3.20 — released

**Multilingual (i18n)** — `locale` column in `_entries`, locale tab bar in editor, `?locale=` on all API routes, `getLocaleCollection()` / `getLocaleEntry()` updated in `orbiter:collections`. Automatic migration from slug--locale convention.

**Space Station mode** — floating magnification dock, HUD panel, glass page headers, settings two-column grid, mobile bottom tab bar.

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
