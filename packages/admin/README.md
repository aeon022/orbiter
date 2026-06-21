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
| `ORBITER_POD`          | **yes**  | —       | Absolute path to the `.pod` file |
| `PORT`                 | no       | `4322`  | HTTP port |
| `ADMIN_ORIGIN`         | no       | `*`     | Allowed CORS origins (comma-separated) |
| `ORBITER_NO_TELEMETRY` | no       | —       | Set to `1` to disable the anonymous startup ping (version + node + platform, no personal data) |

---

## What's inside

### Dashboard
Entry counts per collection, recently updated entries, persistent scratchpad + to-do list, build webhook status and manual trigger.

### Entry editor
All schema fields rendered as inputs. Autosave, version history with restore, draft/published toggle, scheduled publish/unpublish.

**Rich-media block editor — toolbar buttons:**
- **Image** — inline image; float left / right / center / full width
- **Video** — YouTube, Vimeo, Wistia, or direct `.mp4`/`.webm` URL; responsive 16:9 embed
- **File / PDF** — 📎 inserts a download block (`::file[uuid|filename]`); opens Files tab in media picker
- **`/` block picker** — type `/` to open block type menu (heading, quote, code, table, image, video, file, hr, …)

**Block types in richtext:**

| Block | Syntax | Insert via |
|-------|--------|------------|
| Heading H1–H3 | `# text` | `/h1` … `/h3` |
| Paragraph | plain text | default |
| Blockquote | `> text` | `/quote` |
| Code block | ` ``` ``` ` | `/code` |
| Table | visual grid | `/table` |
| Horizontal rule | `---` | `/hr` |
| Image | media UUID | toolbar or `/img` |
| Video | embed URL | toolbar or `/vid` |
| File / PDF download | media UUID | 📎 toolbar |
| Callout | highlighted box | `/callout` |

**Media picker — three tabs:**
- **Library** — browse all uploaded files; filter by type
- **From URL** — paste a Dropbox, Google Drive, OneDrive, or any public URL; Orbiter fetches and stores the file server-side (bypasses CORS)
- **External link** — paste a URL to store a reference without downloading; great for Cloudinary, hosted assets, or large files you don't want to copy
- **Files** (📎 picker) — same as Library but filtered to non-image/video files

### Media library
Upload, browse, and manage files. Images, video, PDF, any file type. Folder categories, type filter, inline preview, copy URL, alt text. Configurable backend (see below).

### Schema editor
Add, reorder, and remove fields on any collection. Changes take effect immediately — no migration or restart needed.

| Field type | Input | Notes |
|------------|-------|-------|
| `string` | Single-line text | |
| `richtext` | Block editor | |
| `boolean` | On/Off toggle | |
| `number` | Numeric | |
| `url` / `email` | With validation | |
| `date` / `datetime` | Date picker | |
| `select` | Dropdown | Define `options` array in field config |
| `array` | Tag input (comma-separated) | Stored as JSON array |
| `weekdays` | Weekday multi-select | |
| `image` | Image picker | Upload or pick from media library |
| `file` | File picker — PDF, document, download | Upload or pick from library; no image preview |
| `table` | Mini-spreadsheet | First row = header; Tab navigates cells; + Row / + Col buttons |
| `media` | Media library picker (any file) | |
| `relation` | Entry picker (cross-collection) | Set `collection` in field config |

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
Three import sources available on the Import page:

| Tab | Format | What it does |
|-----|--------|------|
| WordPress | `.xml` (WXR) | Converts posts, pages, categories, tags, and featured images |
| Markdown | `.md` files | Parses YAML frontmatter, maps fields to a target collection |
| Pod / JSON | `.pod` or `.json` | Imports collections + entries from another Orbiter pod or a JSON export. Creates missing collections automatically. Skip or overwrite duplicates. |

Export the current pod as JSON via the **↓ Export as JSON** button on the Pod / JSON tab, or `GET /api/import/export-pod`.

### Calendar
Full-page calendar view (`calendar.html`) showing all entries on a month grid. Entries are color-coded by status: blue = scheduled, gold = expiring, green = published, grey = draft. Click a day to see entries in the sidebar; filter by All / Scheduled / Published / Draft. Keyboard: ← → months, T = today.

The dashboard also shows a compact calendar widget with a mini month grid and upcoming scheduled/expiring entries.

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

## Space Station mode

A distinct admin layout — dark glassmorphism, floating magnification dock, and a full keyboard-driven interface. Enable in **Settings → Interface → Layout → Space Station**.

### Command palette  `⌘K` or `/`

Opens full-screen over any page. Shows the 7 most recent entries on open (no typing required). Type to fuzzy-search pages and collections.

**Command mode** — prefix with `>`:

| Command | Action |
|---------|--------|
| `> ls` | List all collections |
| `> go <page\|collection>` | Navigate |
| `> new <collection>` | Create new entry |
| `> search <term>` | Full-text search |
| `> build` | Trigger site build |
| `> export <col> [--md] [--drafts]` | Download collection |
| `> random` | Jump to a random published entry |
| `> = <expr>` | Evaluate a math expression (`2^10 * 3`) |
| `> info` | Pod & version info |
| `> help` | Show all commands |

Command history with ↑/↓. Output rendered inline in the palette.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `⌘K` / `/` | Open command palette |
| `?` | Shortcut cheatsheet |
| `⌘⇧F` | Zen / focus mode (hides dock + status bar) |
| `⌘⇧L` | Switch back to Glass mode |
| `1`–`9` | Jump to nth dock item |
| `g` + `d` | Dashboard |
| `g` + `k` | Calendar |
| `g` + `m` | Media |
| `g` + `u` | Users |
| `g` + `n` | Inbox |
| `g` + `y` | Analytics |
| `g` + `p` | Snippets |
| `g` + `c` | Schema |
| `g` + `b` | Build |
| `g` + `i` | Import |
| `g` + `s` | Settings |
| `g` + `a` | Account |
| `g` + `h` | Toggle HUD panel |

A `g ›` badge pulses in the status bar while waiting for the second key.

### Status bar

- **Left** — Orbiter logo, site name
- **Center** — page title; breadcrumb (`Collection › Entries`) when inside a collection
- **Right** — vim `g ›` indicator · bell (notification center) · `?` cheatsheet · `⌘` palette · last build time · username · logout · clock

Build indicator shows `◉ building…` with a pulse animation while a build runs, polling `/api/build/status` every 4 seconds.

### Notification center

Every save, build trigger, and export is logged automatically. Click the bell `○` in the status bar to open the dropdown. Unread count badge clears on open. "Clear all" resets the log.

### HUD panel  `g h`

Side panel with:
- **Pod** — file name, versions, collection count
- **Collections** — published/draft counts per collection
- **Drafts** — last 10 draft entries, clickable to editor
- **Activity** — last 8 events (saves, builds, exports) as a live timeline
- **Navigation** — all pages

### Dock

Floating bottom bar (or left sidebar — toggle in the Tools popup). Magnification effect on hover. Items:

- **Nav group** — Dashboard, Calendar, Media, Users
- **Collections group** — one item per collection; draft count badge; hover shows preview card with 3 recent entries and quick-action buttons
- **Workspace** — Notes scratchpad, To-do list
- **Tools** — Inbox, Analytics, Snippets, Schema, Build, Import (popup)
- **Settings** — direct link
- **HUD** — toggle button

### Hover preview cards

Hovering a collection dock item after 280 ms shows a card with the 3 most recent entries (title + date) and an action row: `+ new entry · ◫ view all · ↓ export`.

### Zen mode  `⌘⇧F`

Hides the dock and status bar entirely. Smooth CSS transition. Persists across reloads (stored in `localStorage`). A toast hint shows "Focus mode on — ⌘⇧F to exit" on enter.

---

## Themes

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
