# Orbiter

> Portable single-file CMS for Astro.

Everything in one `.pod` file — content, media, schema, config, users. Copy the file and your entire site moves with it. No cloud. No API keys. No external services.

```
npm install @orbiter/core @orbiter/integration
```

> **Status:** Active development — Phase 3 (Warp). Not yet published to npm.
> See [Running the demo](#running-the-demo) to try it locally.

---

## How it works

Orbiter stores everything in a single SQLite database with a `.pod` extension.

```
your-site/
├── astro.config.mjs
├── content.pod        ← everything lives here
└── src/
    └── pages/
        └── blog/
            └── [slug].astro
```

The Astro integration connects your `.pod` to Astro's content layer and injects a full admin UI at `/orbiter`.

---

## Installation

```bash
npm install @orbiter/core @orbiter/integration
```

---

## Setup

### 1. Create a pod

Run this once to initialize your `.pod` file:

```js
// scripts/setup.js
import { createPod, hashPassword } from '@orbiter/core';
import { randomUUID } from 'node:crypto';

const db = createPod('./content.pod', {
  site: {
    name:   'My Site',
    url:    'https://example.com',
    locale: 'en',
  }
});

// Create an admin user
const hash = await hashPassword('change-me');
db.insertUser(randomUUID(), 'admin', hash, 'admin');

db.close();
```

```bash
node scripts/setup.js
```

### 2. Add to `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import orbiter from '@orbiter/integration';

export default defineConfig({
  output: 'server',   // required — admin UI needs SSR
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
```

> **`output: 'server'` is required.** Orbiter's admin routes are server-rendered.

### 3. Define collections

Collections are defined directly in the `.pod` via the admin UI, or programmatically:

```js
import { openPod } from '@orbiter/core';

const db = openPod('./content.pod');

db.db.prepare(`
  INSERT OR IGNORE INTO _collections (id, label, schema)
  VALUES (?, ?, ?)
`).run('posts', 'Posts', JSON.stringify({
  title:   { type: 'string',   required: true  },
  excerpt: { type: 'string',   required: false },
  body:    { type: 'richtext', required: false },
  tags:    { type: 'array',    required: false },
  image:   { type: 'media',    required: false },
}));

db.close();
```

### 4. Open the admin

Start your dev server and go to `/orbiter`:

```
http://localhost:4321/orbiter
```

Log in with the credentials you created in step 1. The admin gives you:

- Content editor with block editor, autosave, live preview
- Media library (files stored as BLOBs in the pod)
- Build trigger via webhook
- Site settings
- Version history per entry

---

## Using content in pages

Import from the `orbiter:collections` virtual module:

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'orbiter:collections';

const posts = await getCollection('posts');
// → array of published entries, sorted by updated_at desc
---

<ul>
  {posts.map(post => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.data.title}</a>
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

### Locales

```js
import { locale, locales } from 'orbiter:collections';

// locale  → 'de'
// locales → ['de', 'en']
```

Configured in Settings → Default Language / All Languages.

---

## Schema field types

| Type | Description |
|------|-------------|
| `string` | Single-line text input |
| `richtext` | Block editor → stored as Markdown |
| `array` | Comma-separated tags (stored as array) |
| `media` | Media library picker (stored as media ID) |
| `datetime` | Date + time picker |
| `date` | Date picker |
| `select` | Dropdown with defined options |
| `weekdays` | Weekday multi-select |
| `url` | URL input |
| `number` | Numeric input |

### Field options

```js
{
  title:      { type: 'string',  required: true,  label: 'Post Title' },
  category:   { type: 'select',  required: true,
                options: ['news', 'event', 'review'],
                optionLabels: { news: 'News', event: 'Event', review: 'Review' } },
  body:       { type: 'richtext' },
  image:      { type: 'media',   label: 'Cover Image' },

  // Conditional visibility
  event_date: { type: 'datetime', showWhen: 'category:event' },
}
```

---

## The `.pod` file

A `.pod` is a standard SQLite database. You can open it with any SQLite tool:

```bash
sqlite3 content.pod ".tables"
sqlite3 content.pod "SELECT slug, status FROM _entries"
```

| Table | Contents |
|-------|----------|
| `_meta` | Site config, format version |
| `_collections` | Schema definitions |
| `_entries` | All content (all collections) |
| `_versions` | Full version history per entry |
| `_media` | Binary assets as BLOBs |
| `_users` | Users, password hashes, roles |
| `_sessions` | Auth sessions (auto-pruned) |

**Deployment:** copy the `.pod` file. That's it.

```bash
# Move your entire site's content to a new server:
scp content.pod user@server:/var/www/mysite/
```

---

## Auth

Orbiter uses cookie-based sessions. Passwords are hashed with `scrypt` (Node built-in, no bcrypt dependency).

```js
import { hashPassword, verifyPassword, generateToken } from '@orbiter/core';

// Hash a password (async)
const hash = await hashPassword('my-password');

// Verify
const valid = await verifyPassword('my-password', hash); // true
```

All `/orbiter/*` routes are protected. Unauthenticated requests redirect to `/orbiter/login`.

---

## Running the demo

```bash
# Clone
git clone https://github.com/aeon022/orbiter.git
cd orbiter

# Install
npm install

# Create demo pod with seed data (admin / admin)
npm run seed

# Start dev server → http://localhost:8080
npm run dev
```

Open `http://localhost:8080/orbiter` and log in with `admin` / `admin`.

---

## Admin UI

### Themes

Orbiter ships two visual themes, selectable in **Settings → Interface Theme**:

| Theme | Description |
|-------|-------------|
| **Orbiter Zen** | Default — warm, minimal, calm. Noto Serif JP headings, DM Mono body. |
| **Space Enso** | Futuristic, cold. Space Mono throughout — full terminal typeset. Blue/cyan accents in both light and dark. |

Both themes support **light and dark mode**, toggled via the `● dark` button in the topbar. Preference is saved to `localStorage`. The theme class (`theme-space`) and dark class (`dark`) are applied to `<html>` at load time before first paint to prevent flicker.

Space Enso's Space Mono font is lazy-loaded only when that theme is active — no impact on Orbiter Zen users.

### Admin Language

The entire admin UI is available in **English and German** (EN / DE). Switch in **Settings → Admin Language**. The preference is stored in:

- Cookie `orb_locale` (read on every request — no database hit for the UI language)
- Pod meta key `admin.locale` (persisted across sessions)

The Setup Wizard also has a language switcher so you can pick your language before the first configuration.

To add a new locale, extend `packages/integration/src/i18n.js`:

```js
export const translations = {
  en: { nav_dashboard: 'Dashboard', /* ... */ },
  de: { nav_dashboard: 'Dashboard', /* ... */ },
  fr: { nav_dashboard: 'Tableau de bord', /* ... */ },
};
```

Then add the language pill to the settings and setup pages.

### Command Palette

`⌘ K` / `Ctrl K` opens the command palette — fuzzy search across all collections and navigation items. Works on any admin page.

### Setup Wizard

On first launch (no collections defined), Orbiter shows a guided setup wizard at `/orbiter/setup`. Choose from preset collection templates (Posts, Pages, Events, Team, FAQ) or skip to configure manually via Schema.

---

## Build & Deploy

### How the build trigger works

The Build button sends an HTTP `POST` to a webhook URL you configure in Settings. Full flow:

**1. Click "Trigger build"**

The button disables, the status indicator switches to "running". The browser sends `POST /orbiter/build` to the Astro server.

**2. Orbiter reads the webhook URL from the pod**

The server opens the `.pod` file and reads `build.webhook_url` from the `_meta` table. If no URL is configured, the request returns an error.

**3. Orbiter forwards an empty POST to the webhook**

```
POST https://api.netlify.com/build/hook/your-hook-id
```

A plain empty-body HTTP request — exactly what Netlify, Vercel, and Cloudflare expect. Orbiter acts as a proxy: Browser → Orbiter server → webhook.

> **Why not call the webhook directly from the browser?** The webhook URL is a secret — it would be visible in browser network tools. Routing through the server keeps it server-side only.

**4. The platform acknowledges**

The webhook service (e.g. Netlify) responds with `2xx`. Orbiter stores the timestamp and status in the pod:

```
_meta: build.last_triggered = "2026-04-01 14:23:11"
_meta: build.last_status    = "ok"
```

**5. Status feedback in the browser**

- Success: indicator turns green, timestamp shown
- Error: indicator turns red, error message shown, button re-enables

**What Orbiter does not do:**

Orbiter only triggers the build — it does not monitor it. There is no polling, no webhook callback, no build log view. Whether the build on Netlify/Vercel completed successfully is visible in that platform's own dashboard.

---

### Configuring the webhook URL

**Netlify**

1. Netlify Dashboard → your project → *Site configuration* → *Build & deploy* → *Build hooks*
2. *Add build hook* → give it a name (e.g. "Orbiter") → copy the hook URL
3. In Orbiter: *Settings → Build & Deploy → Webhook URL* → paste

```
https://api.netlify.com/build/hook/abc123xyz
```

**Vercel**

1. Vercel Dashboard → your project → *Settings* → *Git* → *Deploy Hooks*
2. Create hook → copy URL
3. In Orbiter: *Settings → Build & Deploy → Webhook URL* → paste

```
https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy
```

**Cloudflare Pages**

1. Cloudflare Dashboard → Pages → your project → *Settings* → *Builds & deployments* → *Deploy hooks*
2. Create hook → copy URL

```
https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxx
```

**GitHub Actions (self-hosted)**

You can trigger a GitHub Actions workflow via `repository_dispatch`:

```yaml
# .github/workflows/build.yml
on:
  repository_dispatch:
    types: [orbiter-build]
```

You'll need a small proxy endpoint (e.g. a Netlify Function or Vercel Edge Function) that adds the `Authorization` header GitHub requires — Orbiter sends no auth headers.

---

### When to trigger a build

Orbiter is a headless CMS for statically built sites (`astro build`). The build reads all `published` entries from the pod at build time and generates static HTML.

| Action | Build needed? |
|--------|--------------|
| Mark entry as `published` | **Yes** — not visible on the site otherwise |
| Edit a published entry | **Yes** — changes won't go live otherwise |
| Set entry back to `draft` | **Yes** — still live until rebuild |
| Upload media | No if referenced by URL; **Yes** if needed as a static asset |
| Change settings (site name, locale) | **Yes**, if used in the build |

---

## Publishing to npm

This section is for maintainers of the `@orbiter/*` packages. It documents exactly how to cut a release and publish both packages to the npm registry.

### Prerequisites

**1. npm account with access to the `@orbiter` scope**

If the scope doesn't exist yet, create it at [npmjs.com](https://www.npmjs.com) by registering an organization named `orbiter` (or use an existing account and set the packages to public).

**2. Log in locally**

```bash
npm login
```

This opens a browser window for authentication. Confirm with:

```bash
npm whoami
# → your-username
```

**3. Verify scope access**

```bash
npm access list packages @orbiter
```

If the `@orbiter` scope doesn't exist yet on the registry, the first `npm publish --access=public` will create it automatically.

---

### Versioning

Both packages follow [Semantic Versioning](https://semver.org):

| Change type | Example | Version bump |
|-------------|---------|--------------|
| Bug fix, no API change | Fix autosave crash | `patch` — `0.1.0` → `0.1.1` |
| New feature, backwards-compatible | New field type | `minor` — `0.1.0` → `0.2.0` |
| Breaking change | Renamed export, changed pod schema | `major` — `0.1.0` → `1.0.0` |

**Before publishing, update the version in both package files:**

```bash
# Bump patch version in both packages
npm version patch --workspace=packages/core
npm version patch --workspace=packages/integration
```

Or edit the `"version"` field in `packages/core/package.json` and `packages/integration/package.json` manually.

> `@orbiter/core` and `@orbiter/integration` are versioned independently but should generally be bumped together. The integration's `package.json` pins core as `"@orbiter/core": "^0.1.0"` — update this if you bump core's major version.

---

### What gets published

Use `npm pack --dry-run` to see exactly which files would be included before publishing:

```bash
npm pack --workspace=packages/core --dry-run
npm pack --workspace=packages/integration --dry-run
```

**`@orbiter/core` ships:**
```
src/index.js    ← entry point, re-exports everything
src/db.js       ← OrbiterDB class (SQLite wrapper)
src/pod.js      ← createPod / openPod
src/auth.js     ← hashPassword / verifyPassword / generateToken
package.json
```

**`@orbiter/integration` ships:**
```
src/index.js              ← Astro integration + virtual modules
src/admin-utils.js        ← client-side JS (theme, dark mode, command palette)
src/i18n.js               ← EN/DE translations, useTranslations()
routes/AdminLayout.astro  ← shared admin shell (locale-aware nav)
routes/dashboard.astro
routes/collection.astro
routes/editor.astro
routes/settings.astro
routes/login.astro
routes/logout.astro
routes/media.astro
routes/media-serve.astro
routes/build.astro
routes/schema.astro
routes/setup.astro
routes/search.astro
package.json
```

The `apps/demo` directory, test files, seed scripts, and `.pod` files are never included — the root `package.json` is `"private": true` and each package uses an explicit `"files"` allowlist.

---

### Publishing

**Dry run first — always:**

```bash
npm pack --workspace=packages/core --dry-run
npm pack --workspace=packages/integration --dry-run
```

Check the output. If anything unexpected appears, fix the `"files"` array in the relevant `package.json` before continuing.

**Publish core first** (integration depends on it):

```bash
npm publish --workspace=packages/core --access=public
```

The `--access=public` flag is required the **first time** you publish a scoped package (`@orbiter/...`). Scoped packages default to private on npm; this overrides that. On subsequent publishes it's optional but harmless to include.

**Then publish integration:**

```bash
npm publish --workspace=packages/integration --access=public
```

**Or publish both at once using the root script:**

```bash
npm run publish:all
```

This runs `publish:core` then `publish:integration` sequentially.

---

### After publishing

**Verify the packages are live:**

```bash
npm info @orbiter/core
npm info @orbiter/integration
```

**Tag the release in git:**

```bash
git tag v0.1.0
git push origin v0.1.0
```

Use the version number that matches what you just published. If core and integration have different versions, tag both:

```bash
git tag core-v0.1.0
git tag integration-v0.1.0
git push origin core-v0.1.0 integration-v0.1.0
```

---

### Fixing a bad publish

npm does not allow overwriting a published version. If you published something broken:

**Option A — patch release:**

Fix the code, bump to the next patch version (`0.1.1`), publish again.

**Option B — deprecate the bad version:**

```bash
npm deprecate @orbiter/core@0.1.0 "Critical bug — use 0.1.1"
```

This marks the version as deprecated in the registry. Users will see a warning when installing it. The version remains downloadable but npm will recommend the newer one.

**Option C — unpublish (time-limited):**

```bash
npm unpublish @orbiter/core@0.1.0
```

npm only allows unpublishing within **72 hours** of publish and only if the package has fewer than 300 downloads. After that window, you must use deprecation instead.

---

### Checklist before every release

```
[ ] Both package versions bumped
[ ] @orbiter/core version in integration's dependencies updated (if major bump)
[ ] npm pack --dry-run looks clean (no secrets, no demo files)
[ ] npm whoami confirms you're logged in with the right account
[ ] git status is clean — all changes committed
[ ] CHANGELOG or release notes updated (optional but recommended)
```

---

## Roadmap

| Phase | Name | Status | Focus |
|-------|------|--------|-------|
| 01 | Ignition | ✅ Done | Core DB, virtual modules, basic routes |
| 02 | Bridge | ✅ Done | Full admin UI, media, build trigger, auth |
| 03 | Warp | ✅ Done | Block editor, live preview, themes, i18n, admin light mode |
| 04 | Orbit | 🔄 Active | CLI, npm publish, PWA, public launch |

**Phase 3 (Warp) delivered:**
- Block editor with live split-pane preview (Markdown → HTML via `marked`)
- Version history per entry
- Admin light mode (full light/dark support across all routes)
- Theme system: Orbiter Zen + Space Enso (terminal typeset, blue/cyan accents)
- Full EN/DE i18n — cookie-based language switching, setup wizard language picker
- Schema editor redesigned (settings-style field rows, inline-style approach for Astro CSS scoping robustness)
- Command palette (`⌘ K`) across all admin pages
- Setup wizard with collection templates
- Media library with BLOB storage, alt text, copy-URL

---

## Packages

| Package | Description |
|---------|-------------|
| `@orbiter/core` | SQLite engine — OrbiterDB class, pod lifecycle, auth utilities |
| `@orbiter/integration` | Astro integration — virtual modules, injected admin routes |

---

*ABTEILUNG83 — Less Noise. Nice Data. No Bloat.*
