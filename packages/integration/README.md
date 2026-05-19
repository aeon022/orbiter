# @a83/orbiter-integration

Astro integration for [Orbiter CMS](https://orbiter.sh) — reads content from a `.pod` file at build time and serves media at runtime.

[![npm](https://img.shields.io/npm/v/@a83/orbiter-integration?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-integration)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/aeon022/orbiter/blob/main/LICENSE)
[![Astro](https://img.shields.io/badge/built%20for-Astro%206-FF5D01?logo=astro&logoColor=white)](https://astro.build)

---

Orbiter stores everything — content, media, schema, users — in a single `.pod` file (SQLite). This integration makes that content available in your Astro pages via the `orbiter:collections` virtual module, and serves media files at `/orbiter/media/[id]`.

The admin UI runs separately as [`@a83/orbiter-admin`](https://www.npmjs.com/package/@a83/orbiter-admin). Both packages share the same `.pod` file — the admin writes, the integration reads.

---

## Install

```bash
npm install @a83/orbiter-integration @astrojs/node
```

> `@astrojs/node@^10` targets Astro 6 — use `@astrojs/node@^9` for Astro 5.

Requires **Node.js 20+** and **Astro 6+**.

---

## Setup

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
```

For static sites with server-rendered media routes, use `output: 'hybrid'`:

```js
export default defineConfig({
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
  integrations: [orbiter({ pod: './content.pod' })],
});
```

---

## Reading content

```astro
---
import { getCollection, getEntry } from 'orbiter:collections';

// All published entries in a collection
const posts = await getCollection('posts');

// Single entry by slug
const post = await getEntry('posts', Astro.params.slug);
---

<ul>
  {posts.map(post => (
    <li><a href={`/blog/${post.slug}`}>{post.data.title}</a></li>
  ))}
</ul>
```

`orbiter:collections` is a **static snapshot**: it reads all published entries from the pod when Astro builds, and inlines them as a JavaScript module. No runtime database access from the browser — the public site is fully static.

---

## `orbiter:collections` API

```ts
getCollection(name: string): Promise<Entry[]>
getEntry(collection: string, slug: string): Promise<Entry | null>

// Multilingual
getLocaleCollection(name: string, locale?: string): Promise<Entry[]>
getLocaleEntry(collection: string, baseSlug: string, locale: string): Promise<Entry | null>

locale:  string    // default locale, e.g. "en"
locales: string[]  // all configured locales, e.g. ["en", "de", "fr"]
```

### Entry shape

```ts
{
  id:         string,      // UUID
  slug:       string,      // URL-safe identifier
  status:     'published',
  created_at: string,      // ISO datetime
  updated_at: string,      // ISO datetime
  data: {
    title:    string,
    body:     string,      // richtext → Markdown-rendered HTML
    image:    string,      // media field → UUID
    tags:     string[],    // array field
    author:   Entry,       // relation → resolved Entry object
  }
}
```

### Dynamic routes

```astro
---
// src/pages/blog/[slug].astro
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

## Media

```astro
<img src={`/orbiter/media/${post.data.image}`} alt={post.data.title} />
```

`/orbiter/media/[id]` is an injected server route. It serves the file from whatever backend is configured:
- **blob** — reads BLOB from `_media.data` and streams it
- **local** — reads from disk at the stored path
- **github / external link** — issues a `302` redirect to the CDN or original URL

No change needed in your templates regardless of backend.

---

## Multilingual

Orbiter uses a `slug--locale` convention: `my-post--de`, `my-post--fr`.

```astro
---
import { getLocaleCollection, getLocaleEntry, locales } from 'orbiter:collections';

// All German posts
const posts = await getLocaleCollection('posts', 'de');

// German variant, falls back to base entry if not found
const post = await getLocaleEntry('posts', 'my-post', 'de');
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

## Relation fields

Relation fields are resolved at build time — UUID references are replaced with full Entry objects:

```astro
{posts.map(post => (
  <div>
    <h2>{post.data.title}</h2>
    <p>by {post.data.author?.data?.name}</p>
    {post.data.categories?.map(cat => <span>{cat.data.name}</span>)}
  </div>
))}
```

---

## JSON API

A read-only public API is injected at `/orbiter/api/[collection]`:

```bash
curl https://your-site.com/orbiter/api/posts
# or with a token configured in Settings:
curl -H "Authorization: Bearer your-token" https://your-site.com/orbiter/api/posts
```

Returns all published entries as a JSON array.

---

## Injected routes

The integration adds these routes to your Astro site (nothing added to `src/pages`):

| Route | Description |
|-------|-------------|
| `/orbiter/media/[id]` | Serve media (BLOB, disk, or CDN redirect) |
| `/orbiter/api/[collection]` | Read-only JSON API |

The full admin UI lives in [`@a83/orbiter-admin`](https://www.npmjs.com/package/@a83/orbiter-admin) — a separate Hono server on port 4322.

---

## Deployment

Orbiter uses `better-sqlite3` — a native Node.js module that needs **real filesystem access**. It does not run on edge runtimes or Cloudflare Workers.

| Environment | Works? | Notes |
|-------------|--------|-------|
| Node.js VPS / Docker | ✅ | Recommended |
| Railway / Render / Fly.io | ✅ | Mount `.pod` as a persistent volume |
| Netlify / Vercel | ⚠️ | Read-only after deploy — run admin separately |
| Cloudflare Workers | ❌ | No native Node.js support |

---

## Part of Orbiter

| Package | Description |
|---------|-------------|
| [`@a83/orbiter-core`](https://www.npmjs.com/package/@a83/orbiter-core) | SQLite engine, pod management, auth |
| [`@a83/orbiter-admin`](https://www.npmjs.com/package/@a83/orbiter-admin) | Standalone admin server (Hono, port 4322) |
| [`@a83/orbiter-integration`](https://www.npmjs.com/package/@a83/orbiter-integration) | **This package** — Astro integration |
| [`@a83/orbiter-cli`](https://www.npmjs.com/package/@a83/orbiter-cli) | `orbiter init`, `add-user`, `export`, `pack`, `unpack` |

**[orbiter.sh](https://orbiter.sh)** · MIT · [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
