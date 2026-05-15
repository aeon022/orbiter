# @a83/orbiter-admin

Standalone admin UI for Orbiter CMS. A self-contained Node.js server — no Astro required.

---

## What it is

Orbiter stores everything in a single `.pod` file (SQLite). This package is the admin interface: a Hono HTTP server that reads and writes that file. It runs independently from your public site, on its own port or subdomain.

```
content.pod  ←  shared file
     ↑                  ↑
orbiter-admin      orbiter-integration
(this package)     (Astro, reads at build time)
```

---

## Start

```bash
ORBITER_POD=/absolute/path/to/content.pod npm start
```

Development (auto-reload on changes):

```bash
ORBITER_POD=/absolute/path/to/content.pod npm run dev
```

Opens at **http://localhost:4322**

> Use an absolute path. The server changes its working directory internally, so relative paths break.

---

## Demo

```bash
# From the monorepo root
npm run seed
ORBITER_POD=$(pwd)/apps/demo/demo.pod npm run dev --workspace=packages/admin
```

Login: `admin` / `admin`

---

## Env vars

| Variable        | Required | Default       | Description                              |
|-----------------|----------|---------------|------------------------------------------|
| `ORBITER_POD`   | yes      | —             | Absolute path to the `.pod` file         |
| `PORT`          | no       | `4322`        | HTTP port                                |
| `ADMIN_ORIGIN`  | no       | `localhost:4321,localhost:4322` | Allowed CORS origins (comma-separated) |

---

## What's inside

**Dashboard** — entry counts, recently edited content, notes, to-do list, build trigger.

**Collections** — browse and manage entries per collection.

**Editor** — all schema fields rendered as inputs, autosave, version history, draft/published toggle, media picker, relation picker.

**Media library** — upload, browse and manage files. Stored as BLOBs in the pod. Images, video, PDF, any file type.

**Schema** — add, reorder, and remove fields on any collection. Live changes, no restart.

**Settings** — site name, URL, locale, API token, build webhook, theme.

**Users** — manage admin users (admin role only).

**Import** — WordPress WXR importer.

---

## Themes

Three themes, two schemes (dark / light), two layouts (classic / glass).

| Theme       | Character                              |
|-------------|----------------------------------------|
| Space       | Dark: space station HUD — cyan + blue  |
|             | Light: solar command — ice blue        |
| Zen         | Japandi — slate, mauve, moss           |
| Catppuccin  | Mocha (dark) / Latte (light)           |

Glass layout is the default — frosted panels, backdrop blur, animated gradient background.

Preference saved to `localStorage`.

---

## Health check

```bash
curl http://localhost:4322/health
# {"ok":true,"pod":"/path/to/content.pod"}
```

---

## Part of Orbiter

| Package | Description |
|---------|-------------|
| `@a83/orbiter-core` | SQLite engine, pod management, auth |
| `@a83/orbiter-integration` | Astro integration, `orbiter:collections` virtual module |
| `@a83/orbiter-admin` | This package — standalone admin server |
| `@a83/orbiter-cli` | `orbiter init`, `add-user`, `export`, `pack`, `unpack` |

**orbiter.sh** · MIT · [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
