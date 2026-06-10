# ORBITER CMS — Claude Code Context
**Letzte Aktualisierung:** 2026-06-10
**Status:** Phase 3 (Warp) — fast abgeschlossen; i18n ausstehend

---

## 1. Vision & Philosophie

Orbiter ist ein **portables Headless CMS für Astro-Websites**.

Kernidee: Alle Inhalte, Medien und Konfiguration leben in einer einzigen SQLite-basierten `.pod`-Datei. Deployment = Datei kopieren. Kein Cloud-Zwang, keine API-Rate-Limits, keine externe Infrastruktur.

Inspiration: Keystatic (Astro-nativ, Schema-Definition) + PocketBase (Single-File, SQLite) — aber besser als beide für den Astro-Kontext.

**Zwei Zielgruppen:**
- **Redakteure:** Einfache, intuitive Oberfläche — Live Preview, Block Editor, Version History
- **Entwickler/Agenturen:** Einmal einrichten, an Kunden übergeben. Erweiterbar via Integrationen

**Design-Prinzip:** Komplexität wird von der Entwickler-Schicht absorbiert, nicht an Redakteure weitergegeben.

---

## 2. Technische Architektur

### Monorepo-Struktur
```
~/Sites/orbiter/
├── packages/
│   ├── core/               # @a83/orbiter-core v0.3.8 — SQLite-Management
│   │   └── src/
│   │       ├── index.js         # OrbiterDB, createPod, openPod, hashPassword, verifyPassword, generateToken
│   │       ├── db.js            # class OrbiterDB (better-sqlite3 wrapper)
│   │       ├── pod.js           # createPod(), openPod() lifecycle helpers
│   │       ├── auth.js          # hashPassword, verifyPassword, generateToken (Node crypto / scrypt)
│   │       └── media-backend.js # S3/R2/B2-Backend-Abstraktion
│   ├── integration/        # @a83/orbiter-integration v0.3.7 — Astro-Integration (schlank)
│   │   ├── src/
│   │   │   └── index.js    # Vite virtual modules + injectRoute()
│   │   └── routes/
│   │       ├── api-collection.js  # /orbiter/api/[collection] — read-only JSON API
│   │       ├── media-serve.astro  # /orbiter/media/[id] — Media-Serve
│   │       ├── rss-feed.js        # /rss.xml
│   │       └── sitemap.js         # /sitemap.xml
│   ├── admin/              # @a83/orbiter-admin v0.3.14 — Standalone Admin UI + Hono Server
│   │   ├── src/
│   │   │   ├── server.js        # Hono-Server, Port 4322, ORBITER_POD env var
│   │   │   ├── index.js         # VERSION export
│   │   │   ├── email.js         # E-Mail-Benachrichtigungen (nodemailer)
│   │   │   ├── wp-importer.js   # WordPress XML → Orbiter Import
│   │   │   ├── middleware/
│   │   │   │   └── auth.js      # requireAuth Middleware
│   │   │   └── routes/
│   │   │       ├── auth.js        # POST /api/auth/login, logout, /me
│   │   │       ├── account.js     # PATCH /api/account/password, /username
│   │   │       ├── collections.js # CRUD /api/collections
│   │   │       ├── entries.js     # CRUD /api/collections/:id/entries + versions, trash, lock
│   │   │       ├── media.js       # CRUD /api/media
│   │   │       ├── users.js       # CRUD /api/users (admin only)
│   │   │       ├── meta.js        # GET/PATCH /api/meta (site settings, _meta table)
│   │   │       ├── build.js       # POST /api/build (webhook trigger)
│   │   │       ├── search.js      # GET /api/search
│   │   │       ├── github.js      # GitHub deploy integration
│   │   │       ├── info.js        # GET /api/info (version, pod stats)
│   │   │       ├── import.js      # POST /api/import (CSV, WP-XML)
│   │   │       ├── comments.js    # CRUD /api/comments (content comments)
│   │   │       └── locks.js       # POST/DELETE /api/locks/:col/:slug (pessimistic locking)
│   │   └── public/
│   │       ├── style.css          # Globales Design-System (~2100 Zeilen)
│   │       ├── theme.js           # Inline theme engine (läuft in <head> vor erstem Paint)
│   │       ├── admin-utils.js     # Dark-Mode toggle, Command Palette
│   │       ├── sidebar.js         # xfce-Dock Sidebar-Logik
│   │       ├── router.js          # Client-seitiges Routing
│   │       ├── search.js          # Globale Suche (Cmd+K)
│   │       ├── xfce.js            # Space Station mode — Dock, HUD, Focus Mode
│   │       ├── dashboard.html     # / Dashboard
│   │       ├── editor.html        # /editor.html?col=&slug= — Block Editor
│   │       ├── entries.html       # /entries.html?col= — Entries-Liste
│   │       ├── collections.html   # Schema/Collections-Verwaltung
│   │       ├── media.html         # Media-Library
│   │       ├── users.html         # User-Verwaltung (Admin only)
│   │       ├── settings.html      # Site-Settings, Account, Notifications, UI
│   │       ├── schema.html        # Schema Export/Import
│   │       ├── build.html         # Build & Deploy
│   │       ├── import.html        # CSV/WP-Import
│   │       └── login.html         # Login
│   └── cli/                # @a83/orbiter-cli — CLI-Werkzeuge
└── apps/
    ├── demo/               # Demo-Site (Astro + orbiter-integration)
    │   ├── astro.config.mjs  # output: 'server', port: 8080
    │   ├── demo.pod          # SQLite (in .gitignore)
    │   └── scripts/seed.js   # Erstellt demo.pod mit Testdaten + Admin-User
    └── landing/            # Landing Page — orbiter.sh (Astro, statisch)
        ├── src/pages/index.astro
        ├── src/styles/landing.css
        └── public/screenshots/   # WebP-Screenshots für Landing
```

### .pod Datenbankschema (aktuell)
```sql
_meta         -- key, value
              -- Keys: site.name, site.url, site.description, site.locale, site.locales,
              --       format_version, api.enabled, api.token, lock.* (Entry-Locks via _meta)

_collections  -- id, label, schema (JSON), singleton INTEGER, created_at

_entries      -- id, collection_id, slug, data (JSON), status, sort_order,
              -- deleted_at (soft delete / Trash), publish_at, unpublish_at,
              -- created_at, updated_at
              -- UNIQUE(collection_id, slug)

_versions     -- id, entry_id, data (JSON snapshot), created_at

_media        -- id, filename, mime_type, size, data (BLOB, nullable),
              -- alt, folder, url (externe URL), path, created_at

_users        -- id, username, password (scrypt salt:hash), role, created_at, last_login
_sessions     -- token, user_id (FK), expires_at, created_at
_audit        -- id, entry_id, username, action, created_at
_comments     -- id, entry_id, username, body, resolved INTEGER, created_at
```

Migrations werden via `try { ALTER TABLE ... } catch {}` beim Bootstrap automatisch angewendet.

### Virtual Modules (Astro-Integration)
- `orbiter:collections` — Build-Zeit-Snapshot: `getCollection`, `getEntry`, `locale`, `locales`
- `orbiter:db` — exportiert `podPath` für Custom-Routes im Astro-Projekt

---

## 3. Auth-System

- Cookie-basierte Sessions: `orb_sess` (httpOnly, sameSite=lax, 7 Tage)
- Passwort-Hashing: Node.js `crypto.scrypt` mit Random-Salt → `salt:hash` (hex)
- Standalone Admin: `requireAuth` Hono-Middleware auf alle `/api/*` Protected-Routes

### OrbiterDB Auth-Methoden
```js
db.getUserByUsername(username)           // → user row | null
db.getUsers()                            // → user rows (ohne password)
db.insertUser(id, username, hash, role)
db.deleteUser(id)
db.createSession(userId, token, expiresAt)
db.checkSession(token)                   // → {id, username, role} | null
db.deleteSession(token)
```

### Auth-Utilities (@a83/orbiter-core)
```js
import { hashPassword, verifyPassword, generateToken } from '@a83/orbiter-core';
await hashPassword('plaintext')        // → 'salt:hash'
await verifyPassword('plain', stored)  // → boolean (timing-safe)
generateToken(32)                      // → 64-char hex string
```

---

## 4. Admin UI (Standalone — packages/admin)

### Seiten & Routen
| Datei | URL | Beschreibung |
|-------|-----|--------------|
| `login.html` | `/login.html` | Login (public) |
| `dashboard.html` | `/dashboard.html` | Übersicht, Stats, Schnellzugriff |
| `entries.html` | `/entries.html?col=` | Entries-Liste einer Collection |
| `editor.html` | `/editor.html?col=&slug=` | Block Editor |
| `collections.html` | `/collections.html` | Schema/Collections-Verwaltung |
| `media.html` | `/media.html` | Media-Library |
| `users.html` | `/users.html` | User-Verwaltung (Admin only) |
| `settings.html` | `/settings.html` | Site-Settings, Account, Notifications, UI |
| `schema.html` | `/schema.html` | Schema Export/Import (JSON) |
| `build.html` | `/build.html` | Build-Trigger, GitHub-Deploy |
| `import.html` | `/import.html` | CSV / WordPress-XML Import |

### Design-System
```css
/* Light Mode (default) */
--bg0: #f5f2ec; --bg1: #faf8f3; --bg2: #ffffff; --bg3: #edeae3;
--line: #e0dbd0; --text: #3a3228; --heading: #1a1510;
--gold: #9a6e30;      /* Accent, Buttons, Active */
--jade: #1e6b50;      /* Published Status */
--accent: #3d4fa8;    /* Links */
--crimson: #8b2635;   /* Error/Delete */

/* Dark Mode (data-scheme="dark") + Themes: space (default), zen, catppuccin */
/* Space Station / xfce mode (data-style="xfce"): Glassmorphism dark UI */
--glass-bg, --glass-border, --glass-blur: eigene xfce-Variablen
```

**Fonts:** DM Mono (UI/Code), Noto Serif JP (Headings/Content), Space Grotesk (xfce Überschriften)

### Theme-System
Gesteuert via `localStorage`:
- `orb_theme`: `space` (default) | `zen` | `catppuccin`
- `orb_scheme`: `auto` | `dark` | `light`
- `orb_style`: `glass` (default) | `xfce` (Space Station mode)

`theme.js` setzt `html[data-theme]`, `html[data-scheme]`, `html[data-style]` vor dem ersten Paint.

### Space Station Mode (xfce / `data-style="xfce"`)
Alternativer Dark-Glassmorphism-Look mit:
- Floating Dock (Desktop: zentriert schwebend; Mobile: Bottom Tab Bar)
- Status Bar oben
- HUD-Panel (rechts, slide-in)
- Focus Mode (Schreibmodus)
- Vollständiges Mobile Layout (`@media (max-width: 640px)`)
- JS: `xfce.js`, `sidebar.js`; CSS: Block am Ende von `style.css`

---

## 5. Block Editor (`editor.html`)

- `div#be-editor` (contenteditable-Blöcke) — visuelle Editing-Oberfläche
- `textarea#body-input` (hidden) — Markdown-Storage, via `syncToHidden()` synchronisiert
- Autosave (2s Debounce), Cmd+S zum Speichern
- Live Preview (Split + Preview Mode, marked.js)
- Slug wird auto aus Titel generiert (`dataset.manual` Flag verhindert Überschreiben nach manuellem Edit)

**Block-Typen:** `p`, `h1`, `h2`, `h3`, `blockquote`, `pre`, `ul`, `ol`, `hr`

**Markdown-Shortcuts:** `# ` → h1, `## ` → h2, `### ` → h3, `> ` → blockquote, `- ` → ul, `---` → hr, `/` → Block-Picker

---

## 6. API-Überblick (Hono Server)

```
POST   /api/auth/login              public
POST   /api/auth/logout             public
GET    /api/auth/me                 public

GET    /api/collections             protected
POST   /api/collections             protected
PATCH  /api/collections/:id         protected
DELETE /api/collections/:id         protected

GET    /api/collections/:id/entries protected
POST   /api/collections/:id/entries protected
GET    /api/collections/:id/entries/:slug  protected
PATCH  /api/collections/:id/entries/:slug  protected
DELETE /api/collections/:id/entries/:slug  protected
POST   /api/collections/:id/entries/:slug/publish   protected
POST   /api/collections/:id/entries/:slug/unpublish protected
GET    /api/collections/:id/entries/:slug/versions  protected
POST   /api/collections/:id/entries/:slug/restore/:versionId protected

GET    /api/media                   protected
POST   /api/media                   protected
DELETE /api/media/:id               protected

GET    /api/users                   admin only
POST   /api/users                   admin only
DELETE /api/users/:id               admin only

PATCH  /api/account/password        protected
PATCH  /api/account/username        protected

GET/PATCH /api/meta                 protected

POST   /api/build                   protected
GET    /api/search                  protected
GET    /api/info                    protected

POST   /api/locks/:col/:slug        protected
DELETE /api/locks/:col/:slug        protected

GET    /api/collections/:id/entries/:slug/comments  protected
POST   /api/collections/:id/entries/:slug/comments  protected
PATCH  /api/comments/:id            protected (resolve)
DELETE /api/comments/:id            protected
```

---

## 7. Demo-Seed (`apps/demo/scripts/seed.js`)

```bash
npm run seed --workspace=apps/demo
# → erstellt apps/demo/demo.pod mit: admin/admin, Collections, Einträge, Media
```

---

## 8. Was funktioniert ✅

- Login/Logout mit Session-Cookies (scrypt)
- Block Editor + Live Preview + Autosave
- Media Upload/Serve/Delete (BLOB oder S3/R2/B2-Backend)
- Collections & Schema (inkl. Singleton, Drag-Sort, Export/Import)
- Alle Feldtypen: string, richtext, number, boolean, date, datetime, select, array, image, media, url, email, relation, weekdays
- Version History + Restore
- Trash (Soft Delete) + Restore
- Activity Log (`_audit`)
- Content Comments (resolve/unresolve)
- Entry Locking (pessimistisch, 90s TTL, via `_meta`)
- Scheduled Publishing (`publish_at`, `unpublish_at`)
- Content Expiry
- Required Field Validation
- Global Search (Cmd+K)
- CSV Export/Import + WordPress XML Import
- Schema Export/Import (JSON)
- RSS-Feed + Sitemap (via integration routes)
- E-Mail-Benachrichtigungen (nodemailer)
- GitHub Deploy Integration
- User-Verwaltung (Admin kann User anlegen/löschen)
- Account-Settings (Passwort + Username ändern)
- Dark Mode / Theme-System (space/zen/catppuccin × dark/light/auto)
- Space Station mode (xfce-dock): Glassmorphism-UI, Floating Dock, HUD, Focus Mode, Mobile Layout
- API-Token-Auth für Read-only-Zugriff von außen

---

## 9. Was noch fehlt / TODO

### Phase 3 — Warp (fast fertig)
- [ ] **i18n: Mehrsprachige Entries** — `locale`-Feld in `_entries`, `UNIQUE(collection_id, slug, locale)`, Locale-Switcher im Editor

### Phase 4 — Orbit
- [ ] CLI verbessern (`orbiter init`, `orbiter add-user`, `orbiter export`)
- [ ] Public Launch / npm publish

### Backlog (irgendwann)
- Runtime-Adapter für `orbiter:collections` (aktuell nur Build-Zeit)
- CSRF-Schutz (aktuell: SameSite=Lax als einziger Schutz)
- SvelteKit / Next.js Adapter
- Demo-Instanz (öffentlich erreichbar, auto-reset)

---

## 10. Key-Learnings & Gotchas

1. **`output: 'server'` ist Pflicht** in `astro.config.mjs` (Astro-Demo)
2. **CSS Grid min-width:** Grid-Kinder haben `min-width: auto` → brechen aus Container raus. Fix: `min-width: 0` auf Grid-Kinder.
3. **`overflow: hidden` vs `clip` in Grid:** `overflow: hidden` supprimiert automatische Mindestgröße (Grid-Zeile kollabiert auf 0). `overflow: clip` clipped visuell ohne diesen Effekt → für Glassmorphism-Cards in xfce verwenden.
4. **`overscroll-behavior: none` + `100dvh`** für korrekte Mobile-Viewport-Behandlung (kein Bounce in xfce).
5. **Entry Locks via `_meta`:** Keine eigene Tabelle — Lock-State wird als `lock.{col}.{slug}` Key in `_meta` gespeichert, mit `username|timestamp` als Value. Stale nach 90s.
6. **SQLite Datum:** Einheitlich `YYYY-MM-DD HH:MM:SS` via `sqliteNow()`, nicht `toISOString()`.
7. **Media BLOB nullable:** `_media.data` ist `BLOB` (nullable) — bei S3/R2-Backend bleibt `data = NULL`, stattdessen `url` und `path` befüllt.
8. **Landing Page Deploy:** `deploy/landing` Branch enthält nur statische Build-Artefakte (kein Source). Deploy-Workflow: `npm run build --workspace=apps/landing` → git worktree → force push.
9. **`loading="lazy"` in Puppeteer:** Lazy-Images werden in headless Screenshots nicht geladen. Fix: `img.loading = 'eager'` + alle `.reveal`-Elemente sichtbar setzen via JS vor dem Screenshot.

---

## 11. Entwicklungsumgebung

```bash
# Standalone Admin (Hauptentwicklung):
ORBITER_POD=apps/demo/demo.pod npm run dev --workspace=packages/admin
# → http://localhost:4322

# Demo-Site (Astro-Integration testen):
npm run seed --workspace=apps/demo  # demo.pod neu erstellen
npm run dev --workspace=apps/demo
# → http://localhost:8080/orbiter — Login: admin / admin

# Landing Page:
npm run dev --workspace=apps/landing
# → http://localhost:4321

# Landing Page deployen:
npm run build --workspace=apps/landing
git worktree add /tmp/deploy-landing deploy/landing
# contents von apps/landing/dist/ → worktree, dann:
git add -A && git commit -m "deploy: <hash>" && git push --force origin deploy/landing
git worktree remove /tmp/deploy-landing
```

**Git:** Repository auf GitHub unter `aeon022/orbiter`

---

*ABTEILUNG83 — Orbiter CMS*
*Less Noise. Nice Data. No Bloat.*
