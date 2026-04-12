# Orbiter

> Portable single-file CMS for Astro — everything in one `.pod` file.

Content, media, schema, config, users — all in one SQLite database. Copy the file and your entire site moves with it. No cloud. No API keys. No external services.

```
your-site/
├── astro.config.mjs
├── content.pod        ← your entire CMS lives here
└── src/
    └── pages/
        └── blog/
            └── [slug].astro
```

> **Status:** Active development — Phase 4 complete. Not yet published to npm.
> Use the demo to try it locally (see [Quick Start](#quick-start) below).

---

## Quick Start

The fastest way to try Orbiter is to clone this repository and run the demo app. You need **Node.js 20+** and **npm 10+** installed.

**Step 1 — Clone the repository**

```bash
git clone https://github.com/aeon022/orbiter.git
cd orbiter
```

**Step 2 — Install dependencies**

```bash
npm install
```

This installs everything for all packages and the demo app in one step (npm workspaces).

**Step 3 — Create the demo database**

```bash
npm run seed
```

This creates `apps/demo/demo.pod` — a pre-filled SQLite database with:
- Sample collections: Posts, Pages, Authors, Events, Event Categories, Post Categories
- Demo content entries (published + drafts)
- Two placeholder images in the media library
- One admin user: **admin / admin**

**Step 4 — Start the dev server**

```bash
npm run dev
```

The server starts at **http://localhost:8080**.

**Step 5 — Open the admin**

Go to **http://localhost:8080/orbiter** and log in:

```
Username: admin
Password: admin
```

You're in. Explore the dashboard, open a collection, edit an entry, upload a file, or try switching themes in Settings.

**Step 6 — View the frontend**

The demo site renders the content at **http://localhost:8080**. Browse posts and events to see the CMS content on a live Astro site.

---

## What is Orbiter?

Orbiter is a CMS that fits entirely into a single file. Most CMS tools depend on a hosted database, a separate API server, or a third-party cloud service. Orbiter uses SQLite — a single file on disk that contains everything.

**What that means in practice:**

- **Zero infrastructure.** No database server to run. No connection strings to configure. No cloud account required.
- **Fully portable.** Move your site to a new server by copying one file. Backup with `cp content.pod content.pod.bak`.
- **Self-contained.** Schema, content, media, users, sessions — everything in one place.
- **Inspectable.** Open the file with any SQLite tool and query your content directly.
- **Admin included.** A full admin UI at `/orbiter` — editor, media library, build trigger, settings, schema editor.

Orbiter is built for Astro. It integrates directly with Astro's content layer and provides a virtual module (`orbiter:collections`) that works like Astro's own `getCollection` and `getEntry` APIs.

---

## How It Works

### The .pod file

A `.pod` file is a standard SQLite database with a custom extension. The extension is purely cosmetic — any SQLite tool can open it.

When you add Orbiter to your Astro project, the integration reads from the `.pod` file at **build time** (to generate static pages) and at **runtime** (for the admin UI and media serving).

```
content.pod
├── _meta          → site config, locale, build webhook URL
├── _collections   → schema definitions (JSON per collection)
├── _entries       → all content from all collections
├── _versions      → full version history per entry
├── _media         → uploaded files stored as BLOBs
├── _users         → admin users (hashed passwords)
└── _sessions      → active login sessions (auto-pruned)
```

### Virtual modules

The integration provides two virtual modules:

| Module | Usage |
|--------|-------|
| `orbiter:collections` | Read published content in Astro pages (build-time) |
| `orbiter:db` | Access the pod path in admin routes (runtime) |

`orbiter:collections` is a **static snapshot** — it reads all published entries from the pod when Astro builds and inlines them as a JavaScript module. Your Astro pages import from it the same way you would from `astro:content`.

### Admin routes

The integration injects a complete admin UI under `/orbiter` using Astro's `injectRoute` API. No files are added to your `src/pages` directory.

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
| `/orbiter/login` | Login page |
| `/orbiter/logout` | Logout |
| `/orbiter/setup` | First-run setup wizard |
| `/orbiter/search` | Command palette search API |
| `/orbiter/manifest.webmanifest` | PWA manifest |
| `/orbiter/sw.js` | Service worker |
| `/orbiter/offline` | Offline fallback page |

---

## Installing in a New Astro Project

If you want to add Orbiter to your own Astro project (rather than the demo):

```bash
npm install @a83/orbiter-core @a83/orbiter-integration @astrojs/node@^9

# Optional — CLI for scaffolding and user management
npm install -g @a83/orbiter-cli
```

`@astrojs/node@^9` is the adapter for self-hosted Node.js deployments — it targets **Astro 5**. (`@astrojs/node@^10` requires Astro 6 and is not compatible.) See [Adapters & Deployment](#adapters--deployment) for alternatives (Netlify, Vercel, Docker).

> **Note:** Not yet published to npm. Until the first release, install from this repository using workspaces or `npm link`.

---

## Setting Up a New Project

### 0. Scaffold with the CLI (optional)

The fastest way to set up a new project:

```bash
npx @a83/orbiter-cli init my-site
```

This creates the project folder, `astro.config.mjs`, a `content.pod` with a default Posts collection, and an admin user — all in one command. Then skip to [Use content in your pages](#5-use-content-in-your-pages).

### 1. Create the pod file

Run this once to initialize your `.pod` and create an admin user:

```js
// scripts/setup.js
import { createPod, hashPassword } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';

const db = createPod('./content.pod', {
  site: {
    name:        'My Site',
    url:         'https://example.com',
    description: 'My Astro site powered by Orbiter',
    locale:      'en',
  }
});

const hash = await hashPassword('change-me');
db.insertUser(randomUUID(), 'admin', hash, 'admin');
db.close();
```

```bash
node scripts/setup.js
```

### 2. Configure Astro

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

> **`output: 'server'` is required.** The admin routes are server-rendered. See [Adapters & Deployment](#adapters--deployment) for all supported hosting options.

Alternatively, use `output: 'hybrid'` to pre-render your public pages while keeping the admin dynamic:

```js
export default defineConfig({
  output: 'hybrid',   // public pages static, admin routes SSR
  adapter: node({ mode: 'standalone' }),
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
```

In hybrid mode, your own Astro pages default to `prerender: true` (static). All Orbiter admin routes export `prerender = false` automatically — no extra configuration needed.

### 3. Define collections

Collections can be created in the **Schema** editor in the admin UI, or programmatically:

```js
import { openPod } from '@a83/orbiter-core';

const db = openPod('./content.pod');

db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema)
  VALUES (?, ?, ?)
`).run('posts', 'Posts', JSON.stringify({
  title:    { type: 'string',   required: true,  label: 'Title' },
  excerpt:  { type: 'string',   required: false, label: 'Excerpt' },
  body:     { type: 'richtext', required: false, label: 'Body' },
  tags:     { type: 'array',    required: false, label: 'Tags' },
  image:    { type: 'media',    required: false, label: 'Cover Image' },
  category: {
    type: 'select',
    required: true,
    options: ['news', 'tutorial', 'opinion'],
    optionLabels: { news: 'News', tutorial: 'Tutorial', opinion: 'Opinion' },
  },
}));

db.close();
```

### 4. Open the admin

Start your dev server:

```bash
npx astro dev
```

Go to **http://localhost:4321/orbiter** and log in with the credentials from step 1. Use the Schema editor to adjust field definitions, the Collection list to create entries, and the Editor to write content.

### 5. Use content in your pages

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'orbiter:collections';

const posts = await getCollection('posts');
// → array of all published entries, newest first
---

<ul>
  {posts.map(post => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.data.title}</a>
      <p>{post.data.excerpt}</p>
    </li>
  ))}
</ul>
```

```astro
---
// src/pages/blog/[slug].astro
import { getCollection, getEntry } from 'orbiter:collections';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map(post => ({ params: { slug: post.slug } }));
}

const { slug } = Astro.params;
const post = await getEntry('posts', slug);
---

<article>
  <h1>{post.data.title}</h1>
  <div set:html={post.data.body} />
</article>
```

---

## The `orbiter:collections` Virtual Module

This module is the bridge between your CMS and your Astro pages. It is generated at build time and contains a frozen snapshot of all published entries.

### API

```ts
// Get all published entries in a collection
getCollection(name: string): Promise<Entry[]>

// Get a single entry by slug
getEntry(collection: string, slug: string): Promise<Entry | null>

// Get all entries for a specific locale (slug--locale variants only)
// Pass no locale to get base entries (no locale suffix)
getLocaleCollection(name: string, locale?: string): Promise<Entry[]>

// Get a locale variant, falling back to the base entry if the variant doesn't exist
getLocaleEntry(collection: string, baseSlug: string, locale: string): Promise<Entry | null>

// Default locale (from Settings → Default Language)
locale: string   // e.g. "de"

// All configured locales (from Settings → All Languages)
locales: string[]  // e.g. ["de", "en"]
```

### Entry shape

```ts
{
  id:         string,   // UUID
  slug:       string,   // URL-safe identifier
  status:     'published',
  created_at: string,   // ISO datetime
  updated_at: string,   // ISO datetime
  data: {
    // all fields defined in this collection's schema
    title:   string,
    body:    string,    // richtext fields: Markdown-rendered HTML
    image:   string,    // media fields: UUID → use /orbiter/media/{id}
    tags:    string[],  // array fields: string array
    // relation fields: resolved to full Entry objects (not just IDs)
    author:  Entry,
    // ...
  }
}
```

### Media URLs

Media files are served from `/orbiter/media/[id]`. Build a full URL like this:

```astro
<img src={`/orbiter/media/${post.data.image}`} alt={post.data.image_alt} />
```

### Relation fields

Relation fields are **resolved at build time**. The raw value (an array of UUIDs) is replaced with the actual referenced Entry objects before the module is generated. You can access them directly:

```astro
---
const posts = await getCollection('posts');
---

{posts.map(post => (
  <div>
    <h2>{post.data.title}</h2>
    <!-- post.data.author is the full Author entry, not a UUID -->
    <p>by {post.data.author?.data?.name}</p>

    <!-- post.data.categories is an array of Category entries -->
    {post.data.categories?.map(cat => (
      <span style={`background:${cat.data.color}`}>{cat.data.name}</span>
    ))}
  </div>
))}
```

---

## Schema Field Types

Fields are defined as a JSON object on each collection. Each key is a field name; the value is a field definition object.

| Type | Input | Stored as |
|------|-------|-----------|
| `string` | Single-line text | `TEXT` |
| `richtext` | Block editor | Markdown `TEXT` |
| `number` | Numeric input | `TEXT` (as string) |
| `url` | URL input with validation | `TEXT` |
| `email` | Email input with validation | `TEXT` |
| `date` | Date picker | `TEXT` (ISO date) |
| `datetime` | Date + time picker | `TEXT` (ISO datetime) |
| `select` | Dropdown | `TEXT` (option key) |
| `array` | Tag input (comma-separated) | `TEXT` (JSON array) |
| `weekdays` | Weekday multi-select | `TEXT` (JSON array) |
| `media` | Media library picker | `TEXT` (media UUID) |
| `relation` | Entry picker from another collection | `TEXT` (JSON array of UUIDs) |

### Field definition options

```js
{
  // All fields support:
  type:     'string',          // required — field type (see table above)
  label:    'Post Title',      // optional — display name in the editor (defaults to the key name)
  required: true,              // optional — marks field as required in the editor

  // select fields also support:
  options:      ['news', 'event', 'review'],
  optionLabels: { news: 'News', event: 'Event', review: 'Review' },

  // relation fields also support:
  collection: 'authors',       // which collection to pick entries from
  multiple:   true,            // allow multiple selections (default: true)

  // Conditional visibility — show this field only when another field has a specific value:
  showWhen: 'category:event',  // syntax: 'fieldName:value'
}
```

### Full example schema

```js
{
  title:      { type: 'string',   required: true,  label: 'Post Title' },
  slug:       { type: 'string',   required: true,  label: 'URL Slug' },
  excerpt:    { type: 'string',   required: false, label: 'Short Summary' },
  body:       { type: 'richtext', required: false, label: 'Body' },
  author:     { type: 'relation', collection: 'authors', multiple: false, label: 'Author' },
  categories: { type: 'relation', collection: 'post_categories', label: 'Categories' },
  cover:      { type: 'media',    label: 'Cover Image' },
  tags:       { type: 'array',    label: 'Tags' },
  status_note:{ type: 'string',   showWhen: 'status:draft', label: 'Internal Note' },
  published_at: { type: 'datetime', label: 'Publish Date' },
  category:   {
    type: 'select',
    required: true,
    options: ['news', 'tutorial', 'opinion'],
    optionLabels: { news: 'News', tutorial: 'Tutorial', opinion: 'Opinion' },
  },
}
```

---

## Admin UI

### Dashboard

The dashboard shows:
- **Stats** — entry counts per top-level collection (published / draft)
- **Recent** — last edited entries across all collections
- **Notes** — a persistent scratchpad stored in `localStorage`
- **Todos** — a simple task list stored in `localStorage`
- **Deploy status** — last build trigger result + timestamp

### Collection list

Each collection has a list view showing all entries with their slug, status badge, last-updated date, and a quick-publish toggle. Click any row to open the editor. Use the **New entry** button to create a new entry (auto-generates a slug from the title field if one exists).

### Entry editor

The editor provides:
- **All defined fields** rendered as the appropriate input type
- **Richtext block editor** — Markdown-based with live split-pane preview. The preview renders Markdown to HTML using `marked` and updates as you type.
- **Autosave** — changes are saved automatically after a short debounce. A save indicator shows the last-saved timestamp.
- **Version history** — every save creates a version snapshot. Access past versions from the "Versions" panel in the editor sidebar.
- **Status toggle** — switch between `draft` and `published` directly in the editor toolbar.
- **Media picker** — for `media` fields: open the media library, search, and insert by UUID.
- **Relation picker** — for `relation` fields: search entries from the linked collection and select one or more.
- **Conditional fields** — fields with `showWhen` are hidden until the condition is met.

### Media library

Upload, browse, and manage files:
- **Supported formats** — images (PNG, JPG, GIF, WebP, SVG), PDF, video (MP4, WebM), and any other file type
- **Folder categories** — assign a folder name on upload; filter the grid by folder
- **Type filter** — filter by All / Images / Video / PDF / Other
- **Inline preview** — images and SVGs shown as thumbnails; videos show an inline `<video>` player
- **Copy URL** — copies the full absolute URL of the file to the clipboard
- **Alt text** — set on upload; stored with the asset in the pod
- **Storage** — files stored as BLOBs directly in the `.pod` file (no separate `/public` assets needed)

Files are served at `/orbiter/media/[id]` with a `Content-Type` header from the stored MIME type.

### Schema editor

Add, edit, and delete fields on any collection. Changes take effect immediately — no migration needed. Fields are stored as JSON in the `_collections` table.

- **Add field** — choose type, set label and options
- **Reorder fields** — drag-to-reorder (visual order only; does not affect data)
- **Delete field** — removes the field from the schema (does not delete existing data in entries)
- **Relation setup** — link a relation field to any other collection in the pod

### Settings

- **Site info** — name, URL, description
- **Language** — default locale (`locale`) and all supported locales (`locales`, comma-separated). These are exported from `orbiter:collections` for use in your Astro pages.
- **Admin language** — switch the admin UI between English and German. Stored in a cookie (`orb_locale`) and in the pod.
- **Interface theme** — Orbiter Zen (default, warm serif) or Space Enso (terminal, cool blue/cyan). See [Themes](#themes).
- **Build webhook** — paste a Netlify / Vercel / Cloudflare Pages webhook URL to enable the Build button.

### Command palette

`⌘ K` / `Ctrl K` opens a floating search palette. Type to fuzzy-search across all content entries and all navigation items. Works on every admin page.

### Setup wizard

On first launch (no collections exist), Orbiter redirects to `/orbiter/setup`. The wizard lets you:
- Choose an admin language before doing anything else
- Pick collection templates to pre-populate your schema (Posts, Pages, Events, Team, FAQ)
- Skip to the schema editor if you prefer to define everything manually

---

## Themes

Orbiter ships two visual themes, selectable in **Settings → Interface Theme**:

### Orbiter Zen (default)

Warm, minimal, calm. Inspired by Japanese editorial design.
- **Light:** warm off-white backgrounds, amber/gold accents, deep brown text
- **Dark:** deep charcoal backgrounds, muted amber accents
- **Typography:** Noto Serif JP for display headings, DM Mono for UI text

### Space Enso

Futuristic, precise, terminal-feel.
- **Light:** cool blue-tinted backgrounds, electric blue accents, deep navy text
- **Dark:** near-black with deep blue tones, neon cyan accents, subtle glow effects
- **Typography:** Space Mono throughout — a full monospace typeset

Both themes support **light and dark mode**, toggled with the `● dark` button in the topbar. Preferences are saved to `localStorage`. The theme class is applied to `<html>` before first paint to prevent flash.

Space Mono is lazy-loaded only when Space Enso is active — Orbiter Zen users load no extra fonts.

---

## The `.pod` File

A `.pod` is a standard SQLite 3 database with a renamed extension.

```bash
# Inspect with the sqlite3 CLI
sqlite3 content.pod ".tables"
sqlite3 content.pod "SELECT slug, status, updated_at FROM _entries ORDER BY updated_at DESC LIMIT 10"
sqlite3 content.pod "SELECT key, value FROM _meta"
```

Open with any SQLite GUI: TablePlus, DB Browser for SQLite, DBeaver, etc.

### Table reference

| Table | Contents |
|-------|----------|
| `_meta` | Key-value store for site config, build status, format version |
| `_collections` | One row per collection — `id`, `label`, `schema` (JSON) |
| `_entries` | All content from all collections — `id`, `collection_id`, `slug`, `data` (JSON), `status`, timestamps |
| `_versions` | Full JSON snapshots of each saved state per entry |
| `_media` | Uploaded files — `id`, `filename`, `mime_type`, `size`, `data` (BLOB), `alt`, `folder`, `created_at` |
| `_users` | Admin users — `id`, `username`, `password` (scrypt hash), `role`, timestamps |
| `_sessions` | Active sessions — `token`, `user_id`, `expires_at` |

### Backup and portability

```bash
# Full backup
cp content.pod content.pod.bak

# Move to a new server
scp content.pod user@server:/var/www/mysite/

# Restore
cp content.pod.bak content.pod
```

The `.pod` file is the complete source of truth. Nothing else needs to be moved.

### Querying content directly

Since everything is SQL, you can run ad-hoc queries without the admin:

```bash
# Count published entries per collection
sqlite3 content.pod "
  SELECT collection_id, COUNT(*) as total
  FROM _entries
  WHERE status = 'published'
  GROUP BY collection_id
"

# Export all post titles and slugs as CSV
sqlite3 -csv content.pod "
  SELECT slug, json_extract(data, '$.title'), status
  FROM _entries
  WHERE collection_id = 'posts'
"

# List all uploaded media
sqlite3 content.pod "
  SELECT filename, mime_type, ROUND(size / 1024.0, 1) || ' KB' as filesize, folder, created_at
  FROM _media
  ORDER BY created_at DESC
"
```

---

## Auth

Orbiter uses **cookie-based sessions**. Passwords are hashed with `scrypt` — Node.js built-in, no bcrypt dependency.

All `/orbiter/*` routes check for a valid `orb_sess` cookie. Unauthenticated requests redirect to `/orbiter/login`.

### Password utilities

```js
import { hashPassword, verifyPassword, generateToken } from '@a83/orbiter-core';

// Hash a password (returns a string with algorithm+params+hash+salt)
const hash = await hashPassword('my-password');

// Verify a password against a stored hash
const valid = await verifyPassword('my-password', hash); // → true / false

// Generate a random session token
const token = generateToken(); // → hex string
```

### Session lifecycle

1. User submits login form (`POST /orbiter/login`)
2. Orbiter verifies the password hash, generates a token, stores it in `_sessions` with an expiry
3. Token is set as an HTTP-only cookie (`orb_sess`)
4. On each request, the cookie is checked against `_sessions`. Expired sessions are pruned.
5. Logout deletes the session row and clears the cookie

### User roles

Two roles: `admin` and `editor`. Role is stored in `_users`.

| Feature | editor | admin |
|---------|--------|-------|
| Create / edit / delete entries | ✅ | ✅ |
| Manage media | ✅ | ✅ |
| Edit schema | ✅ | ✅ |
| Site settings | ✅ | ✅ |
| Manage users | ❌ | ✅ |

### Multi-user management

Admins can add and remove users at `/orbiter/users`. Each user has a username, hashed password, and role (`admin` or `editor`). Users cannot delete their own account.

Users can change their own username in **Settings → Account** (requires current password confirmation).

---

## Multilingual Entries (i18n)

Orbiter uses a `slug--locale` convention for multilingual content. The base entry has no suffix; locale variants append `--{locale}`:

```
my-post          ← default / primary entry
my-post--de      ← German variant
my-post--fr      ← French variant
```

### Creating locale variants

In the entry editor, a **locale switcher** appears at the top of the meta panel when locales are configured in Settings. Click a locale pill to jump to or create the variant. New locale variants are pre-filled with the primary entry's content so you only need to translate — not re-enter metadata.

### Configuring locales

In **Settings → Language**, set:
- **Default locale** — e.g. `en`
- **All locales** — comma-separated, e.g. `en, de, fr`

These values are exported from `orbiter:collections`:

```js
import { locale, locales } from 'orbiter:collections';
// locale  → "en"
// locales → ["en", "de", "fr"]
```

### Fetching locale content

```astro
---
import { getLocaleCollection, getLocaleEntry, locales } from 'orbiter:collections';

// All German entries (slug--de variants)
const posts = await getLocaleCollection('posts', 'de');

// A specific entry, German if it exists, otherwise falls back to base
const post = await getLocaleEntry('posts', 'my-post', 'de');
---
```

### Static paths for multilingual sites

```astro
---
import { getCollection, locales } from 'orbiter:collections';

export async function getStaticPaths() {
  const posts = await getCollection('posts');
  // Only base entries (no -- suffix)
  const basePosts = posts.filter(p => !p.slug.includes('--'));
  return basePosts.flatMap(post =>
    locales.map(loc => ({
      params: { slug: post.slug, lang: loc },
    }))
  );
}
---
```

---

## CLI

The `@a83/orbiter-cli` package provides three commands for project setup and content operations.

### `orbiter init`

Scaffold a new Astro + Orbiter project interactively:

```bash
npx @a83/orbiter-cli init my-site
```

Prompts for project name, site name, locale, admin credentials, and whether to run `npm install`. Creates:
- `package.json` with Astro + Orbiter dependencies
- `astro.config.mjs` pre-configured with the Node adapter
- `src/pages/index.astro` with a working content example
- `content.pod` with a default Posts collection and the admin user
- `.gitignore` (excludes `*.pod`)

### `orbiter add-user`

Add a user to an existing `.pod` without starting the dev server:

```bash
npx @a83/orbiter-cli add-user
npx @a83/orbiter-cli add-user --pod ./my-content.pod
```

Prompts for username, password, and role (`editor` or `admin`).

### `orbiter export`

Export published content to JSON or Markdown files:

```bash
# JSON (default)
npx @a83/orbiter-cli export --pod ./content.pod --out ./export

# Markdown (YAML frontmatter + body)
npx @a83/orbiter-cli export --pod ./content.pod --out ./export --format md

# Single collection
npx @a83/orbiter-cli export --pod ./content.pod --collection posts
```

Output structure mirrors the collection hierarchy:

```
export/
├── posts/
│   ├── my-first-post.json
│   └── getting-started.json
└── pages/
    └── about.json
```

---

## PWA (Progressive Web App)

The Orbiter admin is installable as a PWA on mobile and desktop. No configuration needed — it works automatically.

**What's included:**
- **Web App Manifest** at `/orbiter/manifest.webmanifest` — enables "Add to Home Screen" on iOS/Android and "Install" in Chrome/Edge
- **Service Worker** at `/orbiter/sw.js` — caches static assets (fonts, CSS, JS) for fast repeat loads; network-first for admin HTML pages
- **Offline page** at `/orbiter/offline` — shown when navigating to an admin page without a network connection
- **SVG icons** at `/orbiter/icon-192` and `/orbiter/icon-512`
- **Theme color** `#9a6e30` (gold) — used by the browser chrome on mobile

The service worker scope is `/orbiter/` — it does not affect your public site pages.

---

## Adapters & Deployment

### Why an adapter is required

Orbiter uses `better-sqlite3` — a native Node.js addon. It opens a file on disk, reads and writes synchronously, and has no network protocol. This means:

- **Works:** any environment that runs real Node.js with filesystem access
- **Does not work:** edge runtimes (Cloudflare Workers, Netlify Edge, Vercel Edge) — these are V8 isolates without native module support

### Supported adapters

| Adapter | Package | Mode | Notes |
|---------|---------|------|-------|
| **Node.js** | `@astrojs/node` | `standalone` or `middleware` | Recommended for self-hosting |
| **Netlify** | `@astrojs/netlify` | serverless functions | Use serverless, not edge |
| **Vercel** | `@astrojs/vercel` | serverless | Admin writes won't persist on ephemeral FS — see note |
| **Cloudflare Pages** | — | — | ❌ Not supported — no native Node.js |

### Node.js (recommended)

Install the adapter:

```bash
npm install @astrojs/node@^9
```

Orbiter requires **Astro 5**. Use `@astrojs/node@^9` — version 10+ targets Astro 6.

Configure:

```js
import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [orbiter({ pod: './content.pod' })],
});
```

Build and run:

```bash
npx astro build
node dist/server/entry.mjs
```

Host on any platform that runs Node.js:

| Platform | Notes |
|----------|-------|
| **VPS** (Hetzner, DigitalOcean, Linode) | Full control, persistent disk — ideal |
| **Railway** | Git push deploy, persistent volume for the `.pod` |
| **Render** | Web service with persistent disk |
| **Fly.io** | Docker-based, persistent volumes |
| **Docker** | Mount the `.pod` as a volume |

**Docker example:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npx astro build
EXPOSE 3000
CMD ["node", "dist/server/entry.mjs"]
```

```bash
# Mount .pod from host so it persists across container restarts
docker run -p 3000:3000 -v $(pwd)/content.pod:/app/content.pod my-orbiter-site
```

### Netlify

Orbiter works on Netlify Serverless Functions. The Netlify Edge runtime is **not supported**.

```bash
npm install @astrojs/netlify
```

```js
import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [orbiter({ pod: './content.pod' })],
});
```

> **Important:** Netlify's filesystem is read-only in deployed functions. The `.pod` file is deployed with the site at build time. This means the admin UI is **read-only on Netlify** — content you edit won't be saved back to disk.
>
> **Recommended pattern for Netlify:** run the Orbiter admin on a persistent server (VPS, Railway) and use Netlify only for the static frontend. The admin triggers a Netlify build hook when content is ready.

### Vercel

```bash
npm install @astrojs/vercel
```

```js
import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [orbiter({ pod: './content.pod' })],
});
```

> Same limitation as Netlify: Vercel serverless functions have an ephemeral filesystem. Admin writes don't persist. Use Vercel for static frontend only.

### Recommended architecture for static hosting (Netlify / Vercel)

```
┌─────────────────────────────┐     build hook     ┌──────────────────────┐
│  Orbiter Admin              │ ──────────────────▶ │  Netlify / Vercel    │
│  (VPS or Railway)           │                     │  (static frontend)   │
│                             │                     │                      │
│  /orbiter  ← edit content   │                     │  /        ← visitors │
│  content.pod  ← persists    │                     │  /blog/[slug]        │
└─────────────────────────────┘                     └──────────────────────┘
```

1. Run Orbiter on a Node.js server with a persistent `.pod` file
2. Edit content in the admin, click **Trigger build**
3. Netlify/Vercel fetches the repo + pod, runs `astro build`, deploys static HTML
4. Visitors hit the static CDN — fast, no server needed for public pages

---

## Build & Deploy

### Workflow

Orbiter is designed for **statically built Astro sites**. The typical workflow is:

1. Edit content in the admin (`/orbiter`)
2. Mark entries as `published`
3. Click **Trigger build** in the admin
4. Your hosting platform (Netlify, Vercel, Cloudflare Pages) rebuilds the site from the pod

At build time, Astro reads all published entries from the pod via `orbiter:collections` and renders static HTML.

| Action | Build needed? |
|--------|--------------|
| Publish a new entry | **Yes** — not visible until rebuild |
| Edit a published entry | **Yes** — changes won't go live until rebuild |
| Unpublish an entry | **Yes** — still live until rebuild |
| Upload media | Depends — if referenced by URL in content, **yes** |
| Change site name or locale | **Yes**, if used in the build |
| Change admin password | No |

### How the build trigger works

**1.** Click **Trigger build** in the admin dashboard.

**2.** The browser sends `POST /orbiter/build` to the Astro server.

**3.** The server reads `build.webhook_url` from `_meta` in the pod. If not set, an error is returned.

**4.** The server sends an empty `POST` to the webhook URL:

```
POST https://api.netlify.com/build/hook/your-hook-id
```

Orbiter acts as a proxy — the webhook URL never appears in browser network tools.

**5.** On success, `build.last_triggered` and `build.last_status` are written to `_meta`. The UI shows the timestamp.

Orbiter does not poll for build completion. Check your platform's dashboard for build logs.

### Configuring the webhook

**Netlify**

1. Netlify → your site → *Site configuration* → *Build & deploy* → *Build hooks* → *Add build hook*
2. Copy the hook URL
3. Orbiter admin → *Settings* → *Build & Deploy* → paste the URL

```
https://api.netlify.com/build/hook/abc123xyz
```

**Vercel**

1. Vercel → your project → *Settings* → *Git* → *Deploy Hooks* → create hook
2. Copy the URL
3. Paste in Orbiter Settings

```
https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
```

**Cloudflare Pages**

1. Cloudflare → Pages → your project → *Settings* → *Builds & deployments* → *Deploy hooks*
2. Copy the URL
3. Paste in Orbiter Settings

**GitHub Actions**

GitHub's `repository_dispatch` API requires an `Authorization` header that Orbiter does not add. Use a small serverless proxy (Netlify Function, Vercel Edge Function) to add the header before forwarding to GitHub.

---

## Repository Structure

```
orbiter/
├── apps/
│   └── demo/                    ← demo Astro site
│       ├── astro.config.mjs
│       ├── demo.pod             ← generated by npm run seed
│       ├── scripts/
│       │   └── seed.js          ← creates and populates demo.pod
│       └── src/
│           └── pages/           ← demo frontend pages
│
├── packages/
│   ├── core/                    ← @a83/orbiter-core
│   │   └── src/
│   │       ├── index.js         ← public API entry point
│   │       ├── db.js            ← OrbiterDB class (SQLite wrapper)
│   │       ├── pod.js           ← createPod / openPod
│   │       └── auth.js          ← hashPassword / verifyPassword / generateToken
│   │
│   ├── integration/             ← @a83/orbiter-integration
│   │   ├── src/
│   │   │   ├── index.js         ← Astro integration, virtual modules, injectRoute
│   │   │   ├── admin-utils.js   ← client-side JS (theme, dark mode, command palette)
│   │   │   ├── i18n.js          ← EN/DE translations
│   │   │   └── wp-importer.js   ← WordPress XML importer
│   │   ├── routes/
│   │   │   ├── AdminLayout.astro       ← shared layout (topbar, sidebar, dark mode)
│   │   │   ├── dashboard.astro
│   │   │   ├── collection.astro
│   │   │   ├── editor.astro            ← entry editor + locale switcher
│   │   │   ├── media.astro
│   │   │   ├── media-serve.astro
│   │   │   ├── schema.astro
│   │   │   ├── settings.astro          ← site settings + account
│   │   │   ├── users.astro             ← user management (admin only)
│   │   │   ├── build.astro
│   │   │   ├── login.astro
│   │   │   ├── logout.astro
│   │   │   ├── setup.astro
│   │   │   ├── import.astro
│   │   │   ├── search.astro
│   │   │   ├── manifest.astro          ← PWA manifest
│   │   │   ├── sw.astro                ← service worker
│   │   │   ├── offline.astro           ← offline fallback
│   │   │   ├── icon-192.js             ← PWA icon (192×192 SVG)
│   │   │   ├── icon-512.js             ← PWA icon (512×512 SVG)
│   │   │   └── SidebarCollections.astro
│   │   └── styles/
│   │       └── admin.css
│   │
│   └── cli/                     ← @a83/orbiter-cli
│       ├── bin/
│       │   └── orbiter.js       ← CLI entry point
│       ├── src/
│       │   ├── init.js          ← orbiter init
│       │   ├── add-user.js      ← orbiter add-user
│       │   ├── export.js        ← orbiter export
│       │   └── prompt.js        ← readline prompts (no deps)
│       └── templates/
│           ├── astro.config.mjs
│           ├── package.json
│           └── index.astro
│
└── package.json                 ← npm workspace root
```

### npm scripts (root)

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start Astro dev server for the demo app (port 8080) |
| `npm run seed` | Delete and recreate `demo.pod` with fresh demo data |
| `npm run build` | Build the demo app for production |
| `npm run build:all` | Build all packages |
| `npm run publish:core` | Publish `@a83/orbiter-core` to npm |
| `npm run publish:integration` | Publish `@a83/orbiter-integration` to npm |
| `npm run publish:cli` | Publish `@a83/orbiter-cli` to npm |
| `npm run publish:all` | Publish all three packages sequentially |

---

## Adding a New Admin Language

The admin UI ships with **English** and **German**. To add a new locale:

**1.** Add translations to `packages/integration/src/i18n.js`:

```js
export const translations = {
  en: { nav_dashboard: 'Dashboard', nav_content: 'Content', /* ... */ },
  de: { nav_dashboard: 'Dashboard', nav_content: 'Inhalt',  /* ... */ },
  fr: { nav_dashboard: 'Tableau de bord', nav_content: 'Contenu', /* ... */ },
};
```

**2.** Add the language pill to the settings page (`routes/settings.astro`) and the setup wizard (`routes/setup.astro`).

**3.** The `useTranslations(locale)` function will automatically pick it up.

---

## Publishing to npm

### Prerequisites

```bash
npm login
npm whoami   # confirm you're authenticated
```

### Version bump

```bash
npm version patch --workspace=packages/core
npm version patch --workspace=packages/integration
npm version patch --workspace=packages/cli
```

All packages follow [Semantic Versioning](https://semver.org). If you bump `@a83/orbiter-core`'s major version, update the peer dependency in `packages/integration/package.json` and `packages/cli/package.json`.

### Dry run

Always check what will be published before pushing:

```bash
npm pack --workspace=packages/core --dry-run
npm pack --workspace=packages/integration --dry-run
```

Verify: no secrets, no demo files, no `.pod` files.

### Publish

```bash
# Core first (integration and CLI depend on it)
npm publish --workspace=packages/core --access=public

# Then integration
npm publish --workspace=packages/integration --access=public

# Then CLI
npm publish --workspace=packages/cli --access=public

# Or all at once:
npm run publish:all
```

`--access=public` is required on first publish for scoped packages (`@a83/...`).

### After publishing

```bash
# Verify packages are live
npm info @a83/orbiter-core
npm info @a83/orbiter-integration
npm info @a83/orbiter-cli

# Tag the release
git tag v0.1.0
git push origin v0.1.0
```

### Release checklist

```
[ ] All three package versions bumped (core, integration, cli)
[ ] @a83/orbiter-core version in integration's and cli's package.json updated (major bumps only)
[ ] npm pack --dry-run is clean for all three (no secrets, no demo files, no .pod files)
[ ] npm whoami confirms correct account
[ ] git status is clean
```

---

## Roadmap

| Phase | Name | Status | Focus |
|-------|------|--------|-------|
| 01 | Ignition | ✅ Done | Core DB, virtual modules, basic admin routes |
| 02 | Bridge | ✅ Done | Full admin UI, media library, build trigger, auth |
| 03 | Warp | ✅ Done | Block editor, version history, themes, i18n, relation fields |
| 04 | Orbit | ✅ Done | Multi-user, i18n per-entry, CLI, PWA, npm publish prep |

**Phase 3 delivered:**
- Richtext block editor with live split-pane Markdown preview
- Version history — full JSON snapshot per save, per entry
- Admin light mode — complete light/dark support across all routes
- Two themes: Orbiter Zen + Space Enso (terminal typeset, blue/cyan)
- EN/DE i18n — cookie-based language switching, setup wizard language picker
- Relation field type — link entries across collections, resolved at build time
- Schema editor redesign — inline field management
- Command palette (`⌘ K`) — search content and navigation from any page
- Setup wizard with preset collection templates
- Media library — BLOB storage, folder categories, type filter, inline video preview
- Shared `AdminLayout` — unified topbar, sidebar, dark mode across all routes

**Phase 4 delivered:**
- Multi-user management — admin-only `/orbiter/users` (create, delete, role assignment)
- Account settings — username change with password confirmation
- Role-based sidebar — Users link visible to admins only
- i18n per entry — `slug--locale` convention, locale switcher in editor, pre-fill from primary
- `getLocaleCollection` and `getLocaleEntry` in `orbiter:collections` virtual module
- Locale badge in collection list for translated entries
- CLI (`@a83/orbiter-cli`) — `orbiter init`, `orbiter add-user`, `orbiter export`
- PWA — installable admin, service worker, offline page, SVG icons, manifest
- npm publish prep — all three packages pack-ready with correct `files` and exports

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@a83/orbiter-core` | 0.1.0 | SQLite engine — `OrbiterDB`, `createPod`, `openPod`, `hashPassword` |
| `@a83/orbiter-integration` | 0.1.0 | Astro integration — virtual modules, injected admin routes, admin UI, PWA |
| `@a83/orbiter-cli` | 0.1.0 | CLI — `orbiter init`, `orbiter add-user`, `orbiter export` |

---

*ABTEILUNG83 — Less Noise. Nice Data. No Bloat.*
