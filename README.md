# Orbiter

> Kreist um die Daten. Hält alles im Blick.

Portable single-file CMS for Astro — everything stored in one `.pod` file (SQLite).  
No cloud. No API keys. Copy the file — done.

---

## Packages

| Package | Description |
|---|---|
| `@orbiter/core` | SQLite engine — reads and writes `.pod` files |
| `@orbiter/integration` | Astro integration — bridges pod to `getCollection()` / `getEntry()` |
| `@orbiter/admin` | Admin UI — Phase 2 (Bridge) |

---

## Requirements

- **Node 22+** — use [nvm](https://github.com/nvm-sh/nvm) to manage versions
- **npm 10+**

```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal, then:
nvm install 22
nvm use 22
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/orbiter.git
cd orbiter

# 2. Use correct Node version
nvm use

# 3. Install dependencies
npm install

# 4. Seed the demo pod
npm run seed --workspace=apps/demo

# 5. Start dev server (localhost:8080)
npm run dev
```

---

## Architecture

All content lives in a single `.pod` file — a standard SQLite database.

```
orbiter/
├── packages/
│   ├── core/          @orbiter/core       — .pod engine
│   ├── integration/   @orbiter/integration — Astro bridge
│   └── admin/         @orbiter/admin      — Admin UI (Phase 2)
└── apps/
    └── demo/          Demo Astro site
```

### The .pod file contains:

| Table | Contents |
|---|---|
| `_meta` | Format version, site config |
| `_collections` | Schema definitions |
| `_entries` | All content entries (all collections) |
| `_versions` | Full version history per entry |
| `_media` | Binary assets as BLOB |
| `_users` | Auth, roles, sessions |
| `_settings` | Deploy webhooks, build config |

---

## Roadmap

| Phase | Name | Status |
|---|---|---|
| 01 | Ignition | ✅ Done |
| 02 | Bridge | 🔄 Next — Admin UI |
| 03 | Warp | ⏳ CLI, Deploy, Scheduling |
| 04 | Orbit | ⏳ PWA, E-Commerce, Public Launch |

---

## Using in your Astro project

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import orbiter from '@orbiter/integration';

export default defineConfig({
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
```

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'orbiter:collections';

const posts = await getCollection('posts');
---
```

---

*ABTEILUNG83 — Less Noise. Nice Data. No Bloat.*
