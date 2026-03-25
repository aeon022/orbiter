# ORBITER CMS — Claude Code Context
**Letzte Aktualisierung:** 2026-03-25
**Status:** Phase 2 (Bridge) — in Arbeit

---

## 1. Vision & Philosophie

Orbiter ist ein **portables Headless CMS für Astro-Websites**.

Kernidee: Alle Inhalte, Medien und Konfiguration leben in einer einzigen SQLite-basierten `.pod`-Datei. Deployment = Datei kopieren. Kein Cloud-Zwang, keine API-Rate-Limits, keine externe Infrastruktur.

Inspiration: Keystatic (Astro-nativ, Schema-Definition) + PocketBase (Single-File, SQLite) — aber besser als beide für den Astro-Kontext.

**Zwei Zielgruppen:**
- **Redakteure:** Brauchen eine einfache, intuitive Oberfläche — Live Preview, Block Editor, Version History, Mobile Admin
- **Entwickler/Agenturen:** Einmal einrichten, an Kunden übergeben. Erweiterbar via Integrationen

**Design-Prinzip:** Komplexität wird von der Entwickler-Schicht absorbiert, nicht an Redakteure weitergegeben.

---

## 2. Technische Architektur

### Monorepo-Struktur
```
~/Sites/orbiter/
├── packages/
│   ├── core/               # SQLite-Management (@orbiter/core)
│   │   └── src/
│   │       ├── index.js    # exportiert OrbiterDB, createPod, openPod
│   │       ├── db.js       # class OrbiterDB (better-sqlite3 wrapper)
│   │       └── pod.js      # createPod(), openPod() lifecycle helpers
│   ├── integration/        # Astro-Integration (@orbiter/integration)
│   │   ├── src/index.js    # Vite virtual modules + injectRoute()
│   │   ├── routes/         # Admin UI Routes (Astro files)
│   │   │   ├── AdminLayout.astro   # Shared Layout-Komponente (slot-basiert)
│   │   │   ├── dashboard.astro
│   │   │   ├── collection.astro
│   │   │   ├── editor.astro
│   │   │   ├── media.astro
│   │   │   └── settings.astro
│   │   └── styles/
│   │       └── admin.css   # Shared CSS (wird via orbiter:admin-css als String geladen)
│   └── admin/              # @orbiter/admin — Placeholder, Phase 2 noch leer
│       └── src/index.js    # nur VERSION export
└── apps/
    └── demo/               # Demo-Site
        ├── astro.config.mjs  # output: 'server', port: 8080
        ├── demo.pod          # SQLite Datenbankdatei (in .gitignore)
        ├── scripts/
        │   └── seed.js       # Erstellt demo.pod mit Testdaten
        └── src/pages/index.astro
```

### .pod Datenbankschema
```sql
_collections  -- id, label, schema (JSON), created_at
_entries      -- id, collection_id, slug, status, data (JSON), created_at, updated_at
              -- UNIQUE(collection_id, slug)
_versions     -- id, entry_id, data (JSON), created_at
_media        -- id, filename, mime_type, size, data (BLOB), alt, created_at
_meta         -- key, value (site.name, site.url, site.description, site.locale, format_version)
```

### Virtual Modules (Vite)
- `orbiter:collections` — statischer Snapshot für Build (`getCollection`, `getEntry`)
- `orbiter:db` — exportiert `podPath` (String) für direkten DB-Zugriff in Admin-Routes
- `orbiter:admin-css` — CSS-String aus `styles/admin.css`, eingebunden via `<style set:html={adminCss} />`

---

## 3. Admin UI

### Routes
| URL | File | Beschreibung |
|-----|------|--------------|
| `/orbiter` | dashboard.astro | Übersicht, Stats, Recent Entries |
| `/orbiter/[collection]` | collection.astro | Entry-Liste einer Collection |
| `/orbiter/[collection]/[slug]` | editor.astro | Content-Editor |
| `/orbiter/media` | media.astro | Media Library |
| `/orbiter/settings` | settings.astro | Site-Konfiguration |

### AdminLayout.astro
Shared Layout-Komponente mit Props: `title`, `activeNav`, `breadcrumbs`, `collections`, `podInfo`.
Enthält den kompletten CSS-Block (Tokens, Reset, Layout, Sidebar, Topbar etc.) sowie `<slot />` für den Hauptinhalt.
**Achtung:** Aktuell nicht von allen Routen genutzt — `dashboard.astro` und `editor.astro` haben CSS noch vollständig inline, `collection.astro` nutzt `orbiter:admin-css` via Virtual Module.

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
--crimson: #8b2635 /* Error/Delete (definiert, noch nicht aktiv genutzt) */
```
**Fonts:** DM Mono (UI/Code), Noto Serif JP (Headings/Content)

### CSS-Pattern (wichtig!)
Es gibt drei Strategien im Mix:
1. **`orbiter:admin-css` via Virtual Module** — `collection.astro` importiert den CSS-String und injiziert ihn mit `<style set:html={adminCss} />` + lokaler `<style>` Block für route-spezifische Styles
2. **Vollständig inline** — `dashboard.astro`, `editor.astro`, `settings.astro` haben den gesamten CSS-Block direkt in der Route
3. **`AdminLayout.astro`** — hat den CSS als Slot-basiertes Layout (noch nicht von allen Routes adoptiert)

**Ziel:** Langfristig alle Routes auf `AdminLayout.astro` umstellen.

### JS in Astro Routes (wichtig!)
Astro behandelt `<script>` Tags als ES-Module — `onclick="fn()"` findet Funktionen nicht.
**Fix:** Alle Funktionen auf `window` setzen:
```js
window.fmt = function(...) { ... }
window.setStatus = function(...) { ... }
```

---

## 4. Editor — Save-Funktionalität

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

**Toolbar-Buttons:** Selektion geht beim Button-Klick verloren → Fix via `lastSel` der bei `mouseup/keyup/selectionchange/focus` gespeichert wird + `onmousedown="event.preventDefault()"` auf alle Buttons.

**Slug-Auto-Generierung:** Wird live aus dem Titel generiert, solange der Slug-Input nicht manuell bearbeitet wurde (`dataset.manual` Flag).

---

## 5. Demo-Seed (`apps/demo/scripts/seed.js`)

Erstellt `demo.pod` neu mit:
- **Site-Meta:** name, url, description, locale
- **Collections:** posts (title, excerpt, body, tags, image), pages (title, body, seo_title, seo_desc), authors (name, bio, email)
- **Einträge:** 3 Posts (2 published, 1 draft), 3 Pages (2 published, 1 draft), 1 Author
- **Media:** 2 Placeholder-Assets (1×1 transparentes PNG als BLOB)
- **Versions:** 1 Snapshot pro published Post

```bash
npm run seed --workspace=apps/demo
```

---

## 6. Was funktioniert ✅

- Demo-Site läuft auf `localhost:8080`
- `demo.pod` mit Seed-Daten (posts, pages, authors, media)
- Alle 5 Admin-Routes erreichbar unter `/orbiter`
- Light Mode Design konsistent
- Editor speichert via POST ins `.pod` file
- Save Draft + Publish Buttons funktionieren
- New Entry (slug `new`) funktioniert
- Version History wird bei jedem Save angelegt
- Cmd+S zum Speichern
- Slug-Auto-Generierung aus Titel
- Toolbar Bold/Italic/H2/H3/Quote/Code funktionieren
- `output: 'server'` in Demo-Config (für dynamische Routes)
- `AdminLayout.astro` als wiederverwendbare Layout-Basis vorhanden

---

## 7. Was noch fehlt / TODO

### Phase 2 — Bridge (aktuell)
- [ ] Settings speichern (liest aus .pod, schreibt aber nicht zurück)
- [ ] Media Upload implementieren (Tabelle + BLOB-Storage vorhanden)
- [ ] Filter-Pills (All/Published/Drafts) in Collection-Liste funktional machen
- [ ] Favicon (404 Error in Console)
- [ ] Alle Routes auf `AdminLayout.astro` umstellen (statt CSS-Duplikation)

### Phase 3 — Warp
- [ ] Block Editor (statt Textarea)
- [ ] Live Preview
- [ ] Build-Trigger & Webhooks
- [ ] i18n Konfiguration
- [ ] Autosave

---

## 8. Key-Learnings & Gotchas

1. **`output: 'server'` ist Pflicht** in `astro.config.mjs` — ohne das schlägt jede dynamische Route mit `GetStaticPathsRequired` fehl
2. **Astro Script-Scope:** `<script>` = ES-Modul → `window.fn = function()` statt `function fn()`
3. **CSS in injected Routes:** Drei Varianten im Einsatz (inline, virtual module, AdminLayout) — Ziel ist Konsolidierung auf AdminLayout
4. **SQLite Datum:** Einheitlich `YYYY-MM-DD HH:MM:SS` via `sqliteNow()`, nicht `toISOString()`
5. **Virtual Module Pattern:** `resolveId()` + `load()` in Vite Plugin für `orbiter:*` Module
6. **`_media` hat `data BLOB NOT NULL`** — Media-Dateien werden als BLOBs direkt in der .pod gespeichert

---

## 9. Entwicklungsumgebung

```bash
cd ~/Sites/orbiter
node --version  # v22.x (via nvm)
npm run dev --workspace=apps/demo  # oder: cd apps/demo && npm run dev
# → localhost:8080

# Seed neu erstellen:
npm run seed --workspace=apps/demo

# DB direkt checken:
sqlite3 apps/demo/demo.pod "SELECT collection_id, slug, status, updated_at FROM _entries"
```

**Git:** Repository auf GitHub unter `aeon022/orbiter`
**Commits:** Phase-basiert, nach stabilen Checkpoints

---

## 10. Ursprüngliches Konzept (Referenz)

Ursprünglich als "AstroPod" konzipiert, dann umbenannt zu "Orbiter".
Vorläufer: "Starbase Eleven (S11)" — hatte ähnliche Ziele aber Dateisystem-basiertes Content-Layer (kein Single-File).

Entscheidung für Single-SQLite-File wegen:
- Echte Portabilität (eine Datei = komplette Website)
- Medien eingebettet als BLOBs
- Kein Sync zwischen Repo und Content nötig
- Versionierung eingebaut in der DB

---

*ABTEILUNG83 — Orbiter CMS*
*Less Noise. Nice Data. No Bloat.*
