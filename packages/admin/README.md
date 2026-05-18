# @a83/orbiter-admin

Standalone admin server for [Orbiter CMS](https://orbiter.sh) — a self-contained Hono HTTP server that reads and writes a `.pod` file.

[![npm](https://img.shields.io/npm/v/@a83/orbiter-admin?color=8b7cf8)](https://www.npmjs.com/package/@a83/orbiter-admin)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/aeon022/orbiter/blob/main/LICENSE)

---

Orbiter stores everything — content, media, schema, users — in a single `.pod` file (SQLite). This package is the admin interface: a Hono HTTP server that runs on its own port, independent from your Astro site.

```
content.pod  ←  shared file
     ↑                       ↑
@a83/orbiter-admin      @a83/orbiter-integration
writes content           reads at Astro build time
port 4322                your public site
```

Run the admin on a VPS or a separate service. The Astro site can be deployed anywhere — Netlify, Vercel, static hosting — as long as it can reach the same `.pod` file (same server, shared volume, or periodic rsync).

---

## Install

```bash
npm install @a83/orbiter-admin
```

Requires **Node.js 20+**.

---

## Start

```bash
ORBITER_POD=/absolute/path/to/content.pod npx @a83/orbiter-admin
```

Or add to `package.json`:

```json
{
  "scripts": {
    "admin": "orbiter-admin"
  },
  "dependencies": {
    "@a83/orbiter-admin": "latest"
  }
}
```

```bash
ORBITER_POD=/absolute/path/to/content.pod npm run admin
```

Opens at **[http://localhost:4322](http://localhost:4322)** — redirects to `/login.html`.

> **Use an absolute path** for `ORBITER_POD`. The server changes its working directory internally, so relative paths resolve incorrectly.

---

## Demo (from the monorepo)

```bash
git clone https://github.com/aeon022/orbiter.git
cd orbiter && npm install && npm run seed
ORBITER_POD=$(pwd)/apps/demo/demo.pod npm run dev --workspace=packages/admin
```

Login: `admin` / `admin`

---

## Environment variables

| Variable        | Required | Default | Description |
|-----------------|----------|---------|-------------|
| `ORBITER_POD`   | **yes**  | —       | Absolute path to the `.pod` file |
| `PORT`          | no       | `4322`  | HTTP port |
| `ADMIN_ORIGIN`  | no       | `*`     | Allowed CORS origins (comma-separated) |

---

## What's inside

### Dashboard
Entry counts per collection, recently updated entries, persistent scratchpad + to-do list, build webhook status and manual trigger.

### Entry editor
All schema fields rendered as inputs. Autosave, version history with restore, draft/published toggle.

**Rich-media block editor:**
- **Inline image blocks** — float left, right, center, or full width; text wraps naturally
- **Video blocks** — paste a YouTube, Vimeo, Wistia, or direct `.mp4`/`.webm` URL; renders as responsive 16:9 embed
- **`/` block picker** — type `/img` or `/vid` to insert
- **Relation picker** — pick entries from another collection

**Media picker — three tabs:**
- **Library** — browse all uploaded files
- **From URL** — paste a Dropbox, Google Drive, OneDrive, or any public URL; Orbiter fetches and stores the file server-side (bypasses CORS)
- **External link** — paste a URL to store a reference without downloading; great for Cloudinary, hosted assets, or large files you don't want to copy

### Media library
Upload, browse, and manage files. Images, video, PDF, any file type. Folder categories, type filter, inline preview, copy URL, alt text. Configurable backend (see below).

### Schema editor
Add, reorder, and remove fields on any collection. Changes take effect immediately — no migration or restart needed.

| Field type | Input |
|------------|-------|
| `string` | Single-line text |
| `richtext` | Block editor |
| `number` | Numeric |
| `url` / `email` | With validation |
| `date` / `datetime` | Date picker |
| `select` | Dropdown |
| `array` | Tag input |
| `media` | Media library picker |
| `relation` | Entry picker (cross-collection) |

### Settings
Site name, URL, locale, build webhook URL, media backend, GitHub sync, public API token, theme.

### Users
Create and manage admin/editor accounts (admin role only). Roles:

| Feature | editor | admin |
|---------|--------|-------|
| Create / edit / delete entries | ✅ | ✅ |
| Manage media | ✅ | ✅ |
| Edit schema | ✅ | ✅ |
| Site settings | ✅ | ✅ |
| Manage users | ❌ | ✅ |

### Import
WordPress WXR importer — upload the `.xml` export from WordPress Tools → Export; Orbiter converts posts, pages, categories, tags, and featured images.

---

## Build webhook

Configure a webhook URL in **Settings → Build**. Orbiter fires a `POST` to it:
- **Automatically** — whenever an entry transitions from draft to published
- **Manually** — via the **Trigger build** button on the dashboard

Works with Netlify build hooks, Vercel deploy hooks, and GitHub Actions `workflow_dispatch`.

---

## Media backends

Configure in **Settings → Media storage**. No restart required — stored in the pod.

| Backend | Where files go | Best for |
|---------|---------------|----------|
| `blob` | SQLite BLOB in the `.pod` file (default) | Small–medium sites |
| `local` | Directory on the server (`media.local_path`) | Self-hosted VPS with persistent disk |
| `github` | GitHub Contents API → jsDelivr CDN | Open-source projects, free global CDN |
| **External link** | URL stored, nothing fetched | Dropbox, Drive, Cloudinary, any public URL |

For the **GitHub backend**, files are served from `cdn.jsdelivr.net/gh/owner/repo@branch/path` — no egress cost, cached globally. Configure repo, branch, directory, and token in Settings.

For **External links**, use the External link tab in the image picker. Orbiter makes a `HEAD` request to detect mime type, then stores only the URL. `/orbiter/media/[id]` redirects — no change needed in templates.

---

## Themes

Three themes × two schemes (dark/light) × two layouts (classic/glass). Switchable live — preference saved to `localStorage`.

| Theme | Dark | Light |
|-------|------|-------|
| **Space** | Space station HUD — cyan + electric blue | Solar Command — ice blue |
| **Zen** | Japandi — slate, mauve, moss | Japandi light |
| **Catppuccin** | Mocha | Latte |

**Glass layout** (default) — frosted panels, backdrop blur, animated gradient orbs. Classic grid also available.

---

## Health check

```bash
curl http://localhost:4322/health
# {"ok":true,"pod":"/absolute/path/to/content.pod"}
```

---

## Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install @a83/orbiter-admin
EXPOSE 4322
CMD ["node", "node_modules/@a83/orbiter-admin/src/server.js"]
```

```bash
docker run -p 4322:4322 \
  -e ORBITER_POD=/data/content.pod \
  -v $(pwd)/content.pod:/data/content.pod \
  my-orbiter-admin
```

---

## Part of Orbiter

| Package | Description |
|---------|-------------|
| [`@a83/orbiter-core`](https://www.npmjs.com/package/@a83/orbiter-core) | SQLite engine, pod management, auth, media backends |
| [`@a83/orbiter-admin`](https://www.npmjs.com/package/@a83/orbiter-admin) | **This package** — standalone admin server |
| [`@a83/orbiter-integration`](https://www.npmjs.com/package/@a83/orbiter-integration) | Astro integration, `orbiter:collections` virtual module |
| [`@a83/orbiter-cli`](https://www.npmjs.com/package/@a83/orbiter-cli) | `orbiter init`, `add-user`, `export`, `pack`, `unpack` |

**[orbiter.sh](https://orbiter.sh)** · MIT · [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
