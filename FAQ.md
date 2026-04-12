# Orbiter — Frequently Asked Questions

## 1. Is editing available in production? Can it run on serverless platforms like Vercel or Workers? Can the database be switched to a remote SQLite like Turso?

### Editing in production

The admin UI at `/orbiter` is available in both development and production — there is no separate read-only production mode. Any authenticated user can create, update, and delete content regardless of the environment.

### Serverless deployment

| Platform                           | Support       | Notes                                                                                      |
| ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| **Node.js (VPS, Railway, Fly.io)** | Full          | Recommended; requires persistent filesystem                                                |
| **Netlify**                        | Partial       | Admin UI is effectively read-only — ephemeral FS means `.pod` changes are lost on redeploy |
| **Vercel**                         | Partial       | Same limitation as Netlify                                                                 |
| **Cloudflare Workers / Pages**     | Not supported | No native Node.js addon support (`better-sqlite3` cannot run in V8 isolates)               |

**Recommended pattern for static hosting:**

```
Orbiter Admin (VPS / Railway)
  └─ persistent .pod file
  └─ triggers build hook ──▶ Netlify / Vercel (static HTML only)
```

Run the Orbiter instance on a server with a real filesystem, and use a build webhook to push static output to a CDN.

### Switching the database to Turso or another remote SQLite

Not possible in the current architecture. Orbiter's data layer is hard-wired to `better-sqlite3`, a synchronous native Node.js addon. Turso, Cloudflare D1, PostgreSQL, MySQL, and other databases are not configurable without a complete rewrite of the database layer.

What you *can* do with the `.pod` file directly:

```bash
# Inspect content
sqlite3 content.pod "SELECT slug FROM _entries WHERE collection_id = 'posts'"

# Back up
cp content.pod content.pod.bak
```

The `.pod` file is a standard SQLite 3 database (just renamed) and can be opened with any SQLite client such as TablePlus, DB Browser for SQLite, or the `sqlite3` CLI.

---

## 2. Can it be integrated into existing templates?

Yes. Orbiter is an **Astro integration** and can be added to any existing Astro project.

**Install:**

```bash
npm install @a83/orbiter-core @a83/orbiter-integration @astrojs/node@^9
```

**Configure `astro.config.mjs`:**

```js
import orbiter from '@a83/orbiter-integration';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',   // or 'hybrid' for static pages + dynamic admin
  adapter: node({ mode: 'standalone' }),
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
```

**Virtual modules available in your Astro pages:**

| Module                | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `orbiter:collections` | Read-only snapshot of all collections and entries (build-time) |
| `orbiter:db`          | Path to the `.pod` file (runtime, admin routes only)           |

The setup wizard ships with five preset collection templates to get started quickly: **Posts, Pages, Events, Team, FAQ**.

> Orbiter is Astro-only. Next.js, SvelteKit, and other frameworks are not supported.

---

## 3. More details: FTP-friendly? How much can the sidebar be customized?

### FTP support

Orbiter is **not FTP-friendly**. All content, media, users, sessions, and schema are stored inside a single binary `.pod` file (SQLite). There are no individual markdown files, JSON files, or image files to transfer — even uploaded media is stored as BLOBs inside the database.

You *could* transfer the entire `.pod` file via FTP, but this is impractical for collaborative or incremental editing. For remote content management, use the web-based admin UI.

### Sidebar customization

The sidebar is rendered automatically from your collections. There is no hard limit on the number of entries.

**Structure:**

```
Content
  ├─ Dashboard
  ├─ Posts          (12)
  │   └─ Post Categories  (5)     ← child collection
  ├─ Events         (3)
  │   └─ Event Categories (8)     ← child collection
  └─ Pages          (4)
Assets
  └─ Media Library
System
  ├─ Schema
  ├─ Build
  └─ Settings
```

**Parent/child grouping** is configured per collection:

```js
// Example from seed script
db.setMeta('collection.post_categories.parent', 'posts');
db.setMeta('collection.event_categories.parent', 'events');
```

**Current limitations:**
- Sidebar is always visible for authenticated users — it cannot be hidden
- Entry order follows collection creation order; manual reordering is not supported
- Individual sidebar items cannot be renamed independently of the collection name

---

## 4. Is it multi-lingual?

Yes, on two levels.

### Admin UI language

The admin interface is fully translated in **English** and **German** (291 translation keys covering navigation, dashboard, editor, schema builder, media library, settings, build, import, and search). The language can be switched per user in Settings and is stored in a cookie.

Adding a new language (e.g. French) requires extending `/packages/integration/src/i18n.js`:

```js
fr: {
  nav_dashboard: 'Tableau de bord',
  nav_content: 'Contenu',
  // ... remaining keys
}
```

### Content locales

A comma-separated list of locale codes (e.g. `de,en,fr`) is configurable in **Settings → Languages**. This list is exported as the `locales` array via the `orbiter:collections` virtual module:

```js
// orbiter:collections
export const locales = ['de', 'en', 'fr'];
```

Orbiter does not enforce a per-entry locale field or manage translated variants of entries automatically. You use the `locales` array to build your own multi-language routing in Astro pages:

```astro
---
import { locales, collections } from 'orbiter:collections';
// build /en/blog, /de/blog, /fr/blog yourself
---
```

---

## Summary

| Question                           | Answer                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Edit in production?                | Yes — admin UI works in any environment                                     |
| Serverless (Vercel/Netlify)?       | Partial — admin edits are lost on redeploy; use a persistent server instead |
| Cloudflare Workers?                | Not supported                                                               |
| Switch to Turso / remote DB?       | Not possible without rewriting the data layer                               |
| Integrate into existing templates? | Yes — Astro only, install as integration                                    |
| FTP-friendly?                      | No — all content lives in a single binary `.pod` file                       |
| Sidebar entry limit?               | Unlimited; supports parent/child grouping                                   |
| Multi-lingual?                     | Admin UI: EN + DE; content locales: configurable                            |
