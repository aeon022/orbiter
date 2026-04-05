# ORBITER CMS — Claude Code Context
**Letzte Aktualisierung:** 2026-03-27
**Status:** Phase 3 (Warp) — in Arbeit

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
│   ├── core/               # SQLite-Management (@a83/orbiter-core)
│   │   └── src/
│   │       ├── index.js    # exportiert OrbiterDB, createPod, openPod, hashPassword, verifyPassword, generateToken
│   │       ├── db.js       # class OrbiterDB (better-sqlite3 wrapper)
│   │       ├── pod.js      # createPod(), openPod() lifecycle helpers
│   │       └── auth.js     # hashPassword, verifyPassword, generateToken (Node crypto / scrypt)
│   ├── integration/        # Astro-Integration (@a83/orbiter-integration)
│   │   ├── src/
│   │   │   ├── index.js    # Vite virtual modules + injectRoute()
│   │   │   └── admin-utils.js  # Dark mode + Command palette JS (als String in orbiter:admin-utils)
│   │   ├── routes/         # Admin UI Routes (Astro files)
│   │   │   ├── AdminLayout.astro   # Shared Layout (Props: title, activeNav, breadcrumbs, collections, podInfo)
│   │   │   ├── login.astro         # /orbiter/login — Login-Seite
│   │   │   ├── logout.astro        # /orbiter/logout — Session löschen
│   │   │   ├── dashboard.astro     # /orbiter
│   │   │   ├── collection.astro    # /orbiter/[collection]
│   │   │   ├── editor.astro        # /orbiter/[collection]/[slug]
│   │   │   ├── media.astro         # /orbiter/media
│   │   │   ├── media-serve.astro   # /orbiter/media/[id]
│   │   │   ├── build.astro         # /orbiter/build
│   │   │   ├── settings.astro      # /orbiter/settings
│   │   │   └── search.astro        # /orbiter/search (JSON API)
│   │   └── styles/
│   │       └── admin.css   # Shared CSS (wird via orbiter:admin-css als String geladen)
│   └── admin/              # @a83/orbiter-admin — Placeholder, noch leer
│       └── src/index.js    # nur VERSION export
└── apps/
    └── demo/               # Demo-Site
        ├── astro.config.mjs  # output: 'server', port: 8080
        ├── demo.pod          # SQLite Datenbankdatei (in .gitignore)
        ├── scripts/
        │   └── seed.js       # Erstellt demo.pod mit Testdaten + Admin-User
        └── src/pages/index.astro
```

### .pod Datenbankschema
```sql
_meta         -- key, value (site.name, site.url, site.description, site.locale, format_version)
_collections  -- id, label, schema (JSON), created_at
_entries      -- id, collection_id, slug, status, data (JSON), created_at, updated_at
              -- UNIQUE(collection_id, slug)
_versions     -- id, entry_id, data (JSON), created_at
_media        -- id, filename, mime_type, size, data (BLOB), alt, created_at
_users        -- id, username, password (scrypt salt:hash), role, created_at, last_login
_sessions     -- token, user_id (FK _users), expires_at, created_at
```

### Virtual Modules (Vite)
- `orbiter:collections` — statischer Snapshot für Build (`getCollection`, `getEntry`, `locale`, `locales`)
- `orbiter:db` — exportiert `podPath` (String) für direkten DB-Zugriff in Admin-Routes
- `orbiter:admin-utils` — Dark-Mode + Command-Palette JS als String (injiziert via `<script set:html={...} is:inline>`)

---

## 3. Auth-System

### Überblick
- Cookie-basierte Sessions: `orb_sess` (httpOnly, sameSite=lax, 7 Tage)
- Passwort-Hashing: Node.js `crypto.scrypt` mit Random-Salt → Format `salt:hash` (hex)
- Alle `/orbiter/*` Routen prüfen Session am Anfang des Frontmatter-Blocks

### Auth-Guard Pattern (in jeder geschützten Route)
```js
{ const _db = openPod(podPath); const _u = _db.checkSession(Astro.cookies.get('orb_sess')?.value ?? ''); _db.close(); if (!_u) return Astro.redirect('/orbiter/login'); }
```
- Media-Serve und Search geben `401` statt Redirect zurück
- Login/Logout haben keinen Guard

### OrbiterDB Auth-Methoden
```js
db.getUserByUsername(username)           // → user row | null
db.insertUser(id, username, hash, role)  // sync — hash vorher mit hashPassword() erzeugen
db.createSession(userId, token, expiresAt) // + prune expired + update last_login
db.checkSession(token)                   // → {id, username, role} | null
db.deleteSession(token)
```

### Auth-Utilities (@a83/orbiter-core)
```js
import { hashPassword, verifyPassword, generateToken } from '@a83/orbiter-core';
// oder:
import { hashPassword, verifyPassword, generateToken } from '@a83/orbiter-core/auth';

await hashPassword('plaintext')        // → 'salt:hash'
await verifyPassword('plain', stored)  // → boolean (timing-safe)
generateToken(32)                      // → 64-char hex string
```

### Seed-Login
```
username: admin
password: admin
```
Nach erstem `npm run seed` verfügbar. Passwort in Produktion sofort ändern.

---

## 4. Admin UI

### Routes & Auth
| URL | File | Auth |
|-----|------|------|
| `/orbiter/login` | login.astro | ❌ öffentlich |
| `/orbiter/logout` | logout.astro | ❌ öffentlich |
| `/orbiter` | dashboard.astro | ✅ Session-Guard |
| `/orbiter/[collection]` | collection.astro | ✅ Session-Guard |
| `/orbiter/[collection]/[slug]` | editor.astro | ✅ Session-Guard |
| `/orbiter/media` | media.astro | ✅ Session-Guard |
| `/orbiter/media/[id]` | media-serve.astro | ✅ → 401 |
| `/orbiter/build` | build.astro | ✅ Session-Guard |
| `/orbiter/settings` | settings.astro | ✅ Session-Guard |
| `/orbiter/search` | search.astro | ✅ → 401 JSON |

### AdminLayout.astro
Shared Layout-Komponente mit Props: `title`, `activeNav`, `breadcrumbs`, `collections`, `podInfo`.
Slots: `head` (für `<style>`), `topbar-right`, default.
Enthält Topbar mit Abmelden-Link und Dark-Mode-Toggle.

**Nutzung:** `settings.astro` und `build.astro` nutzen AdminLayout.
`dashboard.astro`, `editor.astro`, `collection.astro` haben CSS noch vollständig inline (Konsolidierung ausstehend).

### Design-System (Light Mode)
```css
--bg0: #f5f2ec   /* Main Background */
--bg1: #faf8f3   /* Sidebar */
--bg2: #ffffff   /* Panels/Cards */
--bg3: #edeae3   /* Badges/Chips */
--line: #e0dbd0  /* Borders */
--text: #3a3228
--heading: #1a1510
--gold: #9a6e30  /* Accent, Buttons, Active-States */
--jade: #1e6b50  /* Published Status */
--accent: #3d4fa8 /* Links */
--crimson: #8b2635 /* Error/Delete */
```
**Fonts:** DM Mono (UI/Code), Noto Serif JP (Headings/Content)

### CSS-Pattern (wichtig!)
Zwei Strategien im Einsatz:
1. **`AdminLayout.astro`** — `settings.astro` und `build.astro` nutzen die Komponente; page-spezifische Styles in eigenem `<style>`-Block **außerhalb** des `<AdminLayout>`-Tags (Astro hoists diese). Utility-Klassen wie `.field-input` müssen in der **Page** wiederholt werden, da Astro CSS-Scoping verhindert, dass Layout-Styles Slot-Content erreichen.
2. **Vollständig inline** — `dashboard.astro`, `editor.astro`, `collection.astro` haben den gesamten CSS-Block direkt in der Route.

### JS in Astro Routes (wichtig!)
Astro behandelt `<script>` Tags als ES-Module — `onclick="fn()"` findet Funktionen nicht.
**Fix:** Alle interaktiven Funktionen auf `window` setzen:
```js
window.setStatus = function(...) { ... }
window.changeBlockType = function(...) { ... }
```

---

## 5. Block Editor (editor.astro)

### Architektur
- `div#be-editor` (contenteditable-Blöcke) — visuelle Editing-Oberfläche
- `textarea#body-input` (hidden) — Markdown-Storage, wird bei jedem Block-Event via `syncToHidden()` synchronisiert
- Alle bestehenden Systeme (Autosave, Preview, FormData) lesen unverändert aus dem Hidden-Textarea

### Block-Typen
`p`, `h1`, `h2`, `h3`, `blockquote`, `pre`, `ul`, `ol`, `hr`

### Markdown-Shortcuts
Tippe am Anfang eines leeren Blocks: `# ` → h1, `## ` → h2, `### ` → h3, `> ` → blockquote, `- ` → ul, `---` → hr, `/` → Block-Picker

### Block-Picker
`/` öffnet den Picker. Pfeil-Tasten navigieren, Enter einfügen, Escape schließen.

### Toolbar
- B / I / `</>` → `beCmd('bold' | 'italic' | 'code')` via `document.execCommand` oder Code-Node
- H1 / H2 / H3 / Quote / List → `changeBlockType(type)`
- Divider → `insertHr()`

---

## 6. Editor — Save-Funktionalität

Der Editor (`editor.astro`) verarbeitet POST-Requests direkt im Frontmatter:

```js
if (Astro.request.method === 'POST') {
  const form = await Astro.request.formData();
  // ... write to .pod via better-sqlite3
  return Astro.redirect(`/orbiter/${collectionId}/${newSlug}?saved=1`);
}
```

**Datum-Format:** `sqliteNow()` → `YYYY-MM-DD HH:MM:SS` (kein ISO-Format mit T und Z)
```js
const sqliteNow = () => new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
```

**Slug-Auto-Generierung:** Wird live aus dem Titel generiert, solange der Slug-Input nicht manuell bearbeitet wurde (`dataset.manual` Flag).

---

## 7. Demo-Seed (`apps/demo/scripts/seed.js`)

Erstellt `demo.pod` neu mit:
- **Admin-User:** admin / admin (Passwort mit scrypt gehashed)
- **Site-Meta:** name, url, description, locale
- **Collections:** posts (title, excerpt, body, tags, image), pages (title, body, seo_title, seo_desc), authors, events (mit Recurring-Schema)
- **Einträge:** 3 Posts, 3 Pages, 3 Events (je 2 published, 1 draft), 1 Author
- **Media:** 2 Placeholder-Assets (1×1 transparentes PNG als BLOB)
- **Versions:** 1 Snapshot pro published Post

```bash
npm run seed --workspace=apps/demo
```

---

## 8. Was funktioniert ✅

- Login/Logout mit Session-Cookies (scrypt Passwort-Hashing)
- Alle Admin-Routen durch Session-Guard geschützt
- Block Editor (contenteditable-Blöcke → Markdown → Hidden Textarea)
- Live Preview (Split + Preview Mode mit marked.js)
- Autosave (2s Debounce, X-Autosave Header)
- Cmd+S zum Speichern
- Media Upload/Serve/Delete (BLOBs in .pod)
- Build-Trigger via Webhook (POST)
- Settings speichern/lesen
- Dark Mode (localStorage-persisted)
- Command Palette (Strg+K)
- Filter-Pills (All/Published/Draft) in Collection-Liste
- Version History wird bei jedem Save angelegt
- `orbiter:collections` exportiert `locale` und `locales`
- Demo-Site läuft auf `localhost:8080`

---

## 9. Was noch fehlt / TODO

### Phase 3 — Warp (aktuell)
- [ ] Alle Routes auf AdminLayout migrieren (dashboard, editor, collection noch inline)
- [ ] Account-Settings im Admin (Passwort ändern, Username ändern)
- [ ] Mehrere User verwalten (nur Admin kann User anlegen/löschen)
- [ ] i18n: Mehrsprachige Einträge (pro Entry mehrere Locales)

### Phase 4 — Orbit
- [ ] CLI (`orbiter init`, `orbiter add-user`, `orbiter export`)
- [ ] PWA / Mobile Admin
- [ ] Public Launch / npm publish

---

## 10. Key-Learnings & Gotchas

1. **`output: 'server'` ist Pflicht** in `astro.config.mjs`
2. **Astro Script-Scope:** `<script>` = ES-Modul → `window.fn = function()` statt `function fn()`
3. **Astro CSS-Scoping:** Layout-`<style>` erreicht Slot-Content nicht → Utility-Klassen in Page wiederholen
4. **`<style>` vor `<AdminLayout>`** — Astro hoists diese korrekt in `<head>`; `slot="head"` auf `<style>` funktioniert nicht zuverlässig
5. **Favicon-Bug:** `href="data:image/svg+xml,<svg xmlns="..."` — innere Double-Quotes terminieren das href-Attribut → inner Quotes durch Single-Quotes ersetzen
6. **SQLite Datum:** Einheitlich `YYYY-MM-DD HH:MM:SS` via `sqliteNow()`, nicht `toISOString()`
7. **`_media` hat `data BLOB NOT NULL`** — Media-Dateien werden als BLOBs direkt in der .pod gespeichert
8. **Auth-Guard öffnet DB zweimal** — erst für Session-Check, dann für Route-Logik. Für ein lokales CMS akzeptabel.
9. **scrypt ist async** — `hashPassword` und `verifyPassword` sind async → `await` in Frontmatter verwenden

---

## 11. Entwicklungsumgebung

```bash
cd ~/Sites/orbiter
node --version  # v22.x (via nvm)

# Seed (löscht und erstellt demo.pod neu):
npm run seed --workspace=apps/demo

# Dev-Server:
npm run dev

# → http://localhost:8080/orbiter → Login: admin / admin

# DB direkt checken:
sqlite3 apps/demo/demo.pod "SELECT username, role FROM _users"
sqlite3 apps/demo/demo.pod "SELECT collection_id, slug, status FROM _entries"
```

**Git:** Repository auf GitHub unter `aeon022/orbiter`

---

*ABTEILUNG83 — Orbiter CMS*
*Less Noise. Nice Data. No Bloat.*
