---
title: "Orbiter CMS is now team-ready — validation, permissions, quality, and encryption"
tags: opensource, webdev, cms, sqlite
canonical_url: https://github.com/aeon022/orbiter
cover_image: screenshots/c3-08-editor-validation-banner.png
---

# Orbiter CMS is now team-ready — validation, permissions, quality, and encryption

**Orbiter** is a headless CMS for Astro (and now SvelteKit) that stores everything in a single `.pod` file — one SQLite database. No cloud, no vendor lock-in, no monthly bill.

When I started building it, the target was the solo dev or small agency. A single admin user, one site. Since then the project has grown into something that teams can actually use. This release focuses on exactly that: content quality gates, per-user permissions, encrypted storage, and tools to manage multiple pods at once.

Here's what landed in admin@0.3.78 and cli@0.3.9.

---

## Content Validation — schema-level quality gates

Every field in the schema can now carry validation rules:

```json
{
  "excerpt": { "type": "string", "label": "Excerpt", "max": 160, "required": true },
  "slug_override": { "type": "string", "regex": "^[a-z0-9-]+$" },
  "price": { "type": "number", "min": 0, "max": 9999 }
}
```

**What validates when:**
- **Draft saves** — always pass, no gate
- **Publish / Schedule** — client checks required, min, max, regex; shows an inline error banner in the sidebar listing all violations
- **Server** — same rules enforced as a safety net; returns 422 + `{ errors }` if anything fails

The server-side check means validation can't be bypassed by a rogue API call. The client-side check means writers get instant feedback without a round-trip.

---

## Collection Permissions — editors only see what they should

Orbiter has two roles: `admin` and `editor`. Previously, editors could see every collection. Now you can restrict them:

In **Settings → Users**, each editor user gets a "Collections" button. Click it and a checkbox modal lets you pick exactly which collections they can access. Uncheck a collection and the editor gets a 403 on any entry route for it.

The allowed list is stored as `user.{id}.allowed_collections` in pod meta — no schema changes needed. Admins are always unrestricted.

This makes Orbiter usable for client work: spin up one pod, add a client user, lock them to the `pages` collection. They never see your `redirects` or `settings` data.

---

## Content Quality Dashboard — automated content audits

A new panel on the dashboard sidebar aggregates quality issues across all published entries:

| Issue | What it checks |
|---|---|
| No body | Body field is empty |
| Body too short | Body under 100 characters |
| No image | Schema has an image field but no image set |
| No SEO title | `_seo.title` missing |
| No SEO description | `_seo.description` missing |

The panel shows counts per issue type with a link to a full issue list at `/api/quality`. This replaces the manual "go find what's broken" workflow with a one-glance health check every time you open the dashboard.

---

## Schema Migration — rename fields without data loss

Renaming a field used to mean: update the schema, manually fix every entry's JSON, hope you didn't miss any. Now there's a dedicated route:

`POST /api/collections/posts/schema/rename-field` with `{ from: "teaser", to: "excerpt" }` runs as a single transaction — updates the schema and rewrites the `data` column of every entry in the collection atomically. If the transaction fails, nothing changes.

Also added:
- `change-type` — update a field's type (data preserved as-is)
- `delete-field` — remove from schema, optionally purge from entry data

There's a **"↔ Rename field"** button in the schema editor UI that prompts for old/new key names.

---

## Multi-Pod Dashboard — manage multiple projects

If you run Orbiter for multiple clients or projects, you've been opening different terminals and different browser tabs. The new `pods.html` page changes that.

Add pod paths via **Settings → Pods**. For each linked pod, you get a stat card showing:
- Site name
- Published entry count
- Collection count
- File size
- Last modified timestamp

`/api/pods` opens each pod file at request time (read-only) to get fresh stats. No sync required.

---

## `orbiter encrypt` — git-safe pod storage

The `.pod` file is SQLite. If you push it to a git repo, the content is readable by anyone with access. `orbiter encrypt` wraps it in AES-256-GCM:

```bash
orbiter encrypt --pod ./content.pod          # → content.pod.enc, prompts for passphrase
orbiter decrypt --in ./content.pod.enc       # → content.pod

# For CI/CD
orbiter encrypt --pod ./content.pod --key $ORBITER_KEY
```

Format: a 67-byte header (magic + scrypt salt + IV + auth tag) followed by ciphertext. The auth tag means wrong passphrase = immediate error, no partial decryption.

Useful workflow: commit `content.pod.enc` to the repo. In CI, decrypt with a secret env var before building. The plaintext pod never touches git.

---

## `orbiter sync` — push/pull pods via rsync

```bash
orbiter sync --remote user@host:/path/to/content.pod         # push local → server
orbiter sync --remote user@host:/path/to/content.pod --pull  # pull server → local
```

A thin wrapper around `rsync -avz`. Simple, reliable, works with SSH keys. The alternative to setting up S3 or Git LFS for pod transport.

---

## `orbiter status` — pod health in the terminal

```
◆  content.pod

  Site      My Site  (en)
  File      232.0 KB  →  /path/to/content.pod
  Modified  26.6.2026, 16:02:30
  Users     1

  Posts     4 published  ·  2 drafts
  Pages     2 published  ·  1 draft
  Authors   1 published
```

One command, full picture. Useful in CI, in hooks, or just as a quick sanity check.

---

## SvelteKit support — `@a83/orbiter-client`

Orbiter now has a framework-agnostic client that works in any Node.js environment:

```bash
npm install @a83/orbiter-client
```

```ts
// SvelteKit +page.server.ts
import { createClient } from '@a83/orbiter-client';

export async function load() {
  const orb = createClient('./content.pod');
  return { posts: orb.getCollection('posts') };
}
```

Same API as the Astro virtual modules but works in SvelteKit, Nuxt, Express, or a plain Node script. The client opens the pod directly — no HTTP layer, no admin server required.

---

## `<OrbiterImage>` Astro component

```astro
import OrbiterImage from '@a83/orbiter-integration/OrbiterImage';
import { getMediaItem } from 'orbiter:media';

const photo = getMediaItem('abc123');

<OrbiterImage src={photo} />
```

Pulls `width`, `height`, and `alt` from the media item automatically. Adds `loading="lazy"` and `decoding="async"` by default. Eliminates the boilerplate of manually destructuring media items into `<img>` tags.

---

## `orbiter init` starter templates

```
Starter template [blog / portfolio / docs / blank]: blog
```

The init command now asks which starter template you want. Each pre-seeds a set of collections with typed schemas:

- **blog** — Posts (title, body, excerpt, cover, tags, author), Authors, Pages
- **portfolio** — Projects (title, body, cover, URL, tech stack, year, featured), Pages
- **docs** — Docs (title, body, section, order), Changelog

The generated project also includes `src/content.config.ts` wired to the Astro Content Layer API and a `src/pages/posts/[slug].astro` starter page.

---

## Deploy status in the dashboard

The deploy button now shows persistent status: `↑ triggered · 3m ago`, `✓ success · 2h ago`, `✕ failed · 5m ago`. The status survives page reloads because it's stored in pod meta.

Netlify and Vercel can now send their deploy status back to Orbiter via `POST /api/build/callback`. Set the URL in your platform's deploy notifications and the badge updates automatically.

---

## Where to get it

```bash
npm install -g @a83/orbiter-cli
orbiter init my-project

# or update existing
npm update @a83/orbiter-admin @a83/orbiter-integration @a83/orbiter-cli
```

GitHub: [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
Docs: [orbiter.sh/docs](https://orbiter.sh/docs)
