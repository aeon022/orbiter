# @a83/orbiter-core

SQLite persistence layer for [Orbiter CMS](https://orbiter.sh) — the `.pod` file engine.

[![npm](https://img.shields.io/npm/v/@a83/orbiter-core?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-core)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/aeon022/orbiter/blob/main/LICENSE)

---

A `.pod` file is a standard SQLite database. This package opens it, creates the schema, and exposes typed methods for everything Orbiter stores: collections, entries, media, users, sessions, and site config.

You rarely need this package directly — use [`@a83/orbiter-admin`](https://www.npmjs.com/package/@a83/orbiter-admin) for the full admin UI and [`@a83/orbiter-integration`](https://www.npmjs.com/package/@a83/orbiter-integration) to read content in Astro. `orbiter-core` is for scripting, migrations, or building custom tooling on top of the pod format.

---

## Install

```bash
npm install @a83/orbiter-core
```

Requires **Node.js 20+**. Uses [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) — a native module, so it needs a real Node.js environment with filesystem access.

---

## Quick start

```js
import { createPod, openPod, hashPassword } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';

// Create a new pod with site config
const db = createPod('./content.pod', {
  site: { name: 'My Site', url: 'https://example.com', locale: 'en' }
});

// Add an admin user
const hash = await hashPassword('my-password');
db.insertUser(randomUUID(), 'admin', hash, 'admin');
db.close();

// Open an existing pod
const db2 = openPod('./content.pod');
const entries = db2.getEntries('posts', { status: 'published' });
db2.close();
```

---

## API

### `createPod(path, options?)`

Creates a new `.pod` file at `path` with the Orbiter schema. Returns an `OrbiterDB` instance.

```js
const db = createPod('./content.pod', {
  site: {
    name:   'My Site',
    url:    'https://example.com',
    locale: 'en',
  }
});
```

### `openPod(path)`

Opens an existing `.pod` file. Applies any pending schema migrations automatically. Returns an `OrbiterDB` instance.

```js
const db = openPod('./content.pod');
```

---

## `OrbiterDB`

### Collections

```js
db.getCollections()                         // → Collection[]
db.getCollection(id)                        // → Collection | null
db.createCollection(id, label, schema)      // → void
db.updateCollection(id, label, schema)      // → boolean
db.deleteCollection(id)                     // → boolean
```

### Entries

```js
db.getEntries(collectionId, { status? })    // → Entry[]
db.getEntry(collectionId, slug)             // → Entry | null
db.createEntry(collectionId, slug, data, status)  // → id
db.updateEntry(collectionId, slug, { slug, data, status })  // → boolean
db.deleteEntry(collectionId, slug)          // → boolean
```

### Media

```js
db.listMedia(folder?)                       // → MediaMeta[] (no binary data)
db.getMediaItem(id)                         // → MediaItem | null (includes data/url/path)
db.insertMedia(id, filename, mimeType, size, data, alt?, folder?, url?, path?)
db.deleteMedia(id)                          // → void
```

### Users & sessions

```js
db.insertUser(id, username, passwordHash, role)
db.getUser(username)                        // → User | null
db.updatePassword(username, newHash)        // → boolean
db.updateUsername(id, newUsername)          // → boolean
db.insertSession(token, userId, expiresAt)
db.getSession(token)                        // → Session | null
db.deleteSession(token)
```

### Site config (`_meta`)

```js
db.getMeta(key)             // → string | null
db.setMeta(key, value)      // → void
```

Common keys: `site.name`, `site.url`, `site.locale`, `build.webhook_url`, `media.backend`.

### Version history

```js
// Versions are stored automatically on updateEntry.
// Access the raw table via db.db (the underlying better-sqlite3 instance):
db.db.prepare('SELECT * FROM _versions WHERE entry_id = ? ORDER BY created_at DESC').all(entryId)
```

### Raw SQLite access

```js
db.db   // → better-sqlite3 Database instance
db.close()
```

---

## Auth utilities

```js
import { hashPassword, verifyPassword, generateToken } from '@a83/orbiter-core/auth';

const hash    = await hashPassword('my-password')       // → string (scrypt)
const ok      = await verifyPassword('my-password', hash) // → boolean
const token   = generateToken()                          // → 64-char hex string
```

---

## Media backends

`getMediaBackend(db)` returns the configured backend based on `media.backend` in `_meta`:

```js
import { openPod, getMediaBackend } from '@a83/orbiter-core';

const db      = openPod('./content.pod');
const backend = getMediaBackend(db);

// Upload
await backend.upload(id, filename, mimeType, size, buffer, alt, folder);

// Get (returns { data, mimeType } for blob/local, { url, mimeType } for github)
const result = await backend.get(id);

// Delete (also removes from external storage if applicable)
await backend.delete(id);
db.close();
```

| Backend | `media.backend` value | Storage |
|---------|----------------------|---------|
| Blob (default) | `blob` | SQLite BLOB in `_media.data` |
| Local filesystem | `local` | Disk path in `_media.path` |
| GitHub + jsDelivr | `github` | GitHub Contents API → CDN URL in `_media.url` |

---

## Schema migrations

Migrations run automatically when `openPod()` or `createPod()` is called. The `_meta` table stores a `format_version` key. New columns are added with `ALTER TABLE … ADD COLUMN` wrapped in try-catch, so they're idempotent.

---

## The `.pod` format

```
content.pod                         ← SQLite 3 database
├── _meta          TEXT key/value   ← site config, media backend config
├── _collections   JSON schema      ← field definitions per collection
├── _entries       JSON data        ← all content, slug + status
├── _versions      JSON snapshots   ← version history per entry
├── _media         BLOB or URL ref  ← uploaded files or external links
├── _users         scrypt hashes    ← admin accounts
└── _sessions      tokens           ← active login sessions
```

The file is a standard SQLite 3 database. Inspect it with any SQLite tool:

```bash
sqlite3 content.pod ".tables"
sqlite3 content.pod "SELECT slug, status FROM _entries ORDER BY updated_at DESC LIMIT 10"
```

---

## Part of Orbiter

| Package | Description |
|---------|-------------|
| [`@a83/orbiter-core`](https://www.npmjs.com/package/@a83/orbiter-core) | **This package** — SQLite engine |
| [`@a83/orbiter-admin`](https://www.npmjs.com/package/@a83/orbiter-admin) | Standalone admin server (Hono, port 4322) |
| [`@a83/orbiter-integration`](https://www.npmjs.com/package/@a83/orbiter-integration) | Astro integration, `orbiter:collections` virtual module |
| [`@a83/orbiter-cli`](https://www.npmjs.com/package/@a83/orbiter-cli) | `orbiter init`, `add-user`, `export`, `pack`, `unpack` |

**[orbiter.sh](https://orbiter.sh)** · MIT · [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
