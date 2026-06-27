# Learn Orbiter — Persönliche Referenz

> Stand: Juni 2026. Alle Features, APIs, Konzepte zum Nachschlagen.

---

## Was ist Orbiter?

Ein selbst-hostbares Headless CMS auf Basis von SQLite. Inhalte leben in einer einzigen `.pod` Datei (= SQLite DB). Kein externer DB-Server, kein Netzwerk nötig — die `.pod` kann auch im Git-Repo liegen.

**Zielgruppe:** Astro-Sites, aber framework-agnostisch via `orbiter-client`.

---

## Packages

| Package | npm | Rolle |
|---|---|---|
| `@a83/orbiter-core` | `0.3.12` | SQLite DB-Wrapper, `createPod`, `openPod`, `OrbiterDB` |
| `@a83/orbiter-admin` | `0.3.78` | Admin-SPA (Hono-Server + HTML/CSS/JS) |
| `@a83/orbiter-integration` | `0.3.13` | Astro-Integration, Virtual Modules, Content Layer Loader |
| `@a83/orbiter-cli` | `0.3.9` | CLI-Tool `orbiter` |
| `@a83/orbiter-client` | `0.1.1` | Framework-agnostischer Client (SvelteKit, Nuxt, …) |

---

## Pod-Format (SQLite-Tabellen)

```
_collections   id, label, schema (JSON), singleton, created_at
_entries       id, collection_id, slug, data (JSON), status, locale,
               publish_at, unpublish_at, created_at, updated_at, sort_order
_media         id, filename, mime, size, data (BLOB), alt, folder, url, path
_users         id, username, password (bcrypt), role (admin|editor)
_sessions      token, user_id, expires_at
_meta          key, value (beide TEXT)
_analytics     path, referrer, ua, lang, screen_w, is_bot, created_at
_versions      entry_id, data (JSON snapshot), created_at
_comments      entry_id, username, body, resolved, created_at
_form_configs  form_id, label, fields (JSON), settings (JSON)
_forms         form_id, data (JSON), status, ip, created_at
_locks         entry_id, user_id, locked_at
_webhooks      id, url, events (JSON), secret
```

**Entry-Status:** `draft` | `published` | `scheduled` | `trashed`

**Locale:** leerer String = Standard-Locale; Übersetzungen haben denselben `slug` + anderen `locale`.

---

## OrbiterDB — Methoden

```js
import { createPod, openPod } from '@a83/orbiter-core';

const db = createPod('./content.pod', { site: { name: 'MySite', locale: 'en' } });
const db = openPod('./content.pod');
```

### Collections
```js
db.getCollections()                              // → Collection[]
db.getCollection(id)                             // → Collection | null
db.createCollection(id, label, schema, singleton)
db.updateCollection(id, label, schema, singleton)
db.deleteCollection(id)
```

### Entries
```js
db.getEntries(collectionId, { status, locale })  // → Entry[]
db.getEntry(collectionId, slug, locale?)         // → Entry | null
db.getEntryLocales(collectionId, slug)           // → string[]
db.createEntry(collectionId, slug, data, status?, locale?)
db.updateEntry(collectionId, slug, { slug?, data, status, publish_at, unpublish_at, locale })
db.deleteEntry(collectionId, slug, locale?)      // → trash
db.restoreEntry(collectionId, slug, locale?)
db.permanentDeleteEntry(collectionId, slug, locale?)
db.getScheduledDue()                             // → entries where publish_at <= now
db.getExpiredDue()                               // → entries where unpublish_at <= now
db.restoreVersion(entryId, versionId)
```

### Media
```js
db.listMedia(folder?)                            // → MediaItem[]
db.getMediaItem(id)                              // → MediaItem | null
db.insertMedia(id, filename, mimeType, size, data, alt?, folder?, url?, path?)
db.deleteMedia(id)
```

### Meta
```js
db.getMeta(key)          // → string | null
db.setMeta(key, value)   // value wird als string gespeichert
```

**Meta-Konventionen (ausgewählte Keys):**

| Key | Bedeutung |
|---|---|
| `site` | JSON: `{ name, locale }` |
| `site.url` | Öffentliche URL der Site |
| `build.webhook_url` | Netlify/Vercel Deploy-Hook |
| `build.last_triggered` | ISO-Timestamp letzter Trigger |
| `build.last_status` | `triggered` \| `building` \| `success` \| `failed` |
| `ftp.*` | FTP-Deploy-Einstellungen |
| `ai.provider` | `openai` \| `anthropic` \| `ollama` |
| `ai.model` | Model-Name |
| `templates.{collectionId}` | JSON-Array mit Entry-Templates |
| `user.{id}.allowed_collections` | JSON-Array mit erlaubten Collections (Editor) |
| `pods.linked` | JSON-Array mit Pfaden zu verlinkten Pods |
| `preview_url~{collectionId}` | Preview-URL-Template |
| `dashboard.show_*` | Widget-Toggles im Dashboard |

### Analytics
```js
db.trackPageview(path, { referrer, ua, lang, screenW, isBot })
db.getAnalytics({ days?, path? })  // → { total, humans, topPages, topReferrers, daily, devices, langs }
db.pruneAnalytics(days?)           // löscht Einträge älter als N Tage
```

### Users / Sessions
```js
db.getUsers()
db.insertUser(id, username, hashedPassword, role?)
db.deleteUser(id)
db.createSession(userId, token, expiresAt)
db.checkSession(token)             // → User | null
db.deleteSession(token)
```

### Sonstiges
```js
db.getComments(entryId)
db.createComment(entryId, username, body)
db.resolveComment(id, resolved?)
db.logAudit(entryId, username, action)
db.getAuditLog(entryId, limit?)
db.close()
```

---

## Schema — Feldtypen

Jede Collection hat ein `schema` Objekt: `{ fieldKey: FieldDef }`.

```js
const schema = {
  title: { type: 'string', label: 'Title', required: true },
  body:  { type: 'richtext', label: 'Body', min: 100 },
  tags:  { type: 'array',   label: 'Tags' },
};
```

| Typ | UI | Validierung |
|---|---|---|
| `string` | Einzeilig | min/max (Länge), regex |
| `richtext` | Block-Editor | min/max (Zeichenanzahl) |
| `number` | Zahl | min/max (Wert) |
| `boolean` | Checkbox | — |
| `date` | Datepicker | — |
| `datetime` | Datepicker + Zeit | — |
| `url` | URL-Input | min/max, regex |
| `email` | E-Mail | min/max, regex |
| `select` | Dropdown | options: string[] |
| `array` | Tag-Liste | — |
| `image` | Bild-Picker | — |
| `media` | Media-Picker | — |
| `file` | Datei-Upload | — |
| `relation` | Relation-Picker | collection, multiple |
| `table` | Tabellen-Editor | — |
| `weekdays` | Wochentage-Picker | — |

**FieldDef vollständig:**
```js
{
  type: string,
  label?: string,
  required?: boolean,
  min?: number,        // Länge (Text) oder Wert (number)
  max?: number,
  regex?: string,      // Regex-Pattern als String
  options?: string[],  // für select
  collection?: string, // für relation
  multiple?: boolean,  // für relation
  group?: string,      // Gruppe für Sidebar-Collapsible
  depth?: number,      // 0=visible, 1=collapsed, 2=deep, 3=hidden
}
```

**Validierung:**
- Client: beim Publish/Schedule — zeigt rotes Banner in der Sidebar
- Server: POST/PUT /api/collections/:id/entries — gibt 422 + `{ errors }` zurück
- Drafts: immer ohne Validierung speicherbar

---

## CLI — Alle Befehle

```bash
# Neues Projekt anlegen
orbiter init [dir]
# → fragt: name, locale, template (blog|portfolio|docs), admin-user, install deps
# → erstellt: package.json, astro.config.mjs, src/content.config.ts,
#             src/pages/index.astro, src/pages/posts/[slug].astro,
#             .github/workflows/orbiter-build.yml, content.pod

orbiter add-user --pod ./content.pod
orbiter export --pod ./content.pod --out ./export --format json|md
                --collection posts --locale de --drafts
orbiter publish --pod ./content.pod --out ./site --theme orbit|canvas
orbiter backup  --pod ./content.pod --out ./backups
orbiter unpack  --pod ./content.pod --out ./media    # BLOBs → Dateien
orbiter pack    --pod ./content.pod --dir ./media    # Dateien → BLOBs
orbiter status  [pod-path]                           # Health-Übersicht
orbiter sync    --remote user@host:/path/c.pod --pod ./content.pod [--pull]
orbiter encrypt --pod ./content.pod [--out ./c.pod.enc] [--key $PASS]
orbiter decrypt --in  ./content.pod.enc [--out ./content.pod] [--key $PASS]
orbiter docs
orbiter help
```

**`orbiter sync`** nutzt `rsync -avz`. Push = local→remote (default), Pull = `--pull`.

**`orbiter encrypt`** Format: `ORBENC | version(1B) | salt(32B) | iv(12B) | authTag(16B) | ciphertext`. Key-Derivation: scrypt N=16384, r=8, p=1.

---

## Admin — Dev-Server

```bash
# Start
npm run admin        # Port 4399
orbiter-admin --pod ./content.pod --port 4399

# Beide gleichzeitig
npm run dev:all      # admin:4399 + astro:4321
```

**Station Mode (xfce/glass):** Separate UI mit HUD, Dock (position:fixed bottom:18px), Palette, Cheatsheet. Immer im Station Mode testen. Picker-Positionierung muss `getBoundingClientRect()` des Docks berücksichtigen.

**SPA-Router:** `router.js` intercepted Dock-Klicks. Seiten mit top-level `await` müssen aus `router.js` excluded werden.

---

## Admin — Seiten & Features

| Seite | URL | Feature |
|---|---|---|
| `dashboard.html` | `/` | Stats, recent entries, collections, calendar, quality panel, deploy |
| `entries.html` | `/entries.html?col=posts` | Entry-Liste, bulk-ops, templates |
| `editor.html` | `/editor.html?collection=posts&slug=foo` | Block-Editor, meta-fields, wikilinks |
| `schema.html` | `/schema.html` | Schema-Editor, field-migration |
| `media.html` | `/media.html` | Media-Library |
| `analytics.html` | `/analytics.html` | Analytics, devices, languages, AI crawlers |
| `build.html` | `/build.html` | Build-Trigger, FTP-Deploy |
| `settings.html` | `/settings.html` | Site, AI, Media, Locales, … |
| `users.html` | `/users.html` | User-Management, Collection-Permissions |
| `pods.html` | `/pods.html` | Multi-Pod Dashboard |
| `forms.html` | `/forms.html` | Form-Inbox |
| `collections.html` | `/collections.html` | Collection-Übersicht |

### Block-Editor Features
- Drag-to-reorder Blöcke
- Richtext, Code, H1-H4, Quote, Divider, Image, Video
- **Wikilinks:** `[[` → floating Picker → `[[Title|collection/slug]]`
- Focus-Mode
- Autosave
- Version History + Restore

### Entry-Editor Features
- Required-Validierung + min/max/regex beim Publish
- Scheduled Publishing (`publish_at`) + Content-Expiry (`unpublish_at`)
- Entry-Locking (Warnung wenn andere Person editiert)
- Per-Entry Comments mit Resolve
- Smart Suggestions (AI + regel-basiert)
- SEO-Felder (`_seo.title`, `_seo.description`)
- Entry Templates (speichern + anwenden)

### Bulk-Operationen (entries.html)
- Checkboxen → Bulk-Bar erscheint
- publish / unpublish / trash / restore / permanent delete / AI summarize

---

## Astro-Integration

```js
// astro.config.mjs
import orbiter from '@a83/orbiter-integration';
export default defineConfig({
  integrations: [orbiter({ pod: './content.pod' })],
});
```

Was die Integration macht:
- Virtual Modules registrieren
- Media BLOBs unter `/orbiter/media/[id]` serven
- Read-only JSON API unter `/orbiter/api/[collection]`
- TypeScript-Typen in `orbiter-env.d.ts` schreiben

---

## Virtual Modules

### `orbiter:collections`
```ts
import { getCollection, getEntry, getCollections } from 'orbiter:collections';

const posts    = await getCollection('posts');          // Entry[]  (published)
const post     = await getEntry('posts', 'my-slug');   // Entry | null
const allCols  = await getCollections();               // Collection[]
```

Entry-Form: `{ slug, data: { title, body, … }, status, locale, … }`

### `orbiter:media`
```ts
import { getMedia, getMediaItem } from 'orbiter:media';

const all   = getMedia();           // OrbiterMediaItem[]
const item  = getMediaItem('abc');  // OrbiterMediaItem | null
```

`OrbiterMediaItem`: `{ id, filename, mime, size, width?, height?, alt?, url }`

### `orbiter:db`
```ts
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';
const db = openPod(podPath);
```

---

## Content Layer (Astro 5+)

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { orbiterLoader } from '@a83/orbiter-integration/loader';

export const collections = {
  posts: defineCollection({
    loader: orbiterLoader({ pod: './content.pod', collection: 'posts' }),
  }),
};
```

Dann in Seiten:
```astro
---
import { getCollection, getEntry } from 'astro:content';
const posts = await getCollection('posts');  // entry.id = slug
---
```

Live-Loader für SSR:
```ts
import { orbiterLiveLoader } from '@a83/orbiter-integration/loader';
defineCollection({ type: 'live', loader: orbiterLiveLoader({ pod, collection }) })
```

---

## `<OrbiterImage>` Komponente

```astro
import OrbiterImage from '@a83/orbiter-integration/OrbiterImage';
import { getMediaItem } from 'orbiter:media';

const photo = getMediaItem('abc123');

<OrbiterImage src={photo} alt="Beschreibung" />
<OrbiterImage src="/orbiter/media/abc123" width={800} height={600} alt="…" />
```

Props: `src` (string | MediaItem), `alt?`, `width?`, `height?`, `loading?` (default: `lazy`), `decoding?` (default: `async`), `class?`, `style?`, `sizes?`

Wenn `src` ein MediaItem ist: zieht `width`, `height`, `alt`, `url` automatisch raus.

---

## `@a83/orbiter-client` (Framework-agnostisch)

```ts
import { createClient } from '@a83/orbiter-client';
const orb = createClient('./content.pod');

orb.getCollections()                // → Collection[]
orb.getCollection('posts')          // → Entry[]  (published)
orb.getEntry('posts', 'my-slug')    // → Entry | null
orb.getMedia()                      // → MediaItem[]
orb.getMediaItem('abc')             // → MediaItem | null
```

**SvelteKit SSR:**
```ts
// +page.server.ts
export async function load() {
  const orb = createClient('./content.pod');
  return { posts: orb.getCollection('posts') };
}
```

**SvelteKit static:**
```ts
// +page.ts
export const prerender = true;
export async function entries() {
  const orb = createClient('./content.pod');
  return orb.getCollection('posts').map(p => ({ slug: p.slug }));
}
```

---

## Admin API — Wichtigste Endpoints

Alle unter `/api/` — Auth via Cookie `orb_sess`.

### Collections + Entries
```
GET  /api/collections
POST /api/collections
GET  /api/collections/:id
PUT  /api/collections/:id
DELETE /api/collections/:id

GET  /api/collections/:id/entries
POST /api/collections/:id/entries        { slug, data, status, locale }
GET  /api/collections/:id/entries/:slug
PUT  /api/collections/:id/entries/:slug  { data, status, publish_at, … }
DELETE /api/collections/:id/entries/:slug

POST /api/collections/:id/entries/bulk   { action, slugs, locale }
     action: publish|unpublish|delete|restore|permanent|ai-summarize

POST /api/collections/:id/schema/rename-field   { from, to }
POST /api/collections/:id/schema/change-type    { field, type }
POST /api/collections/:id/schema/delete-field   { field, purgeData? }
```

### Build / Deploy
```
POST /api/build/trigger     → sendet webhook, speichert last_triggered
GET  /api/build/status      → { configured, lastTriggered, lastStatus }
POST /api/build/callback    → Netlify/Vercel incoming webhook → speichert status
```

### Media
```
GET  /api/media             → { items, folders }
POST /api/media             → upload (multipart/form-data)
PUT  /api/media/:id         → { alt, folder }
DELETE /api/media/:id
GET  /orbiter/media/:id     → BLOB/Redirect/URL
```

### Analytics
```
GET  /api/analytics?days=30[&path=/posts/foo]
POST /api/hit               → { path, referrer, ua, lang, screenW }
POST /api/analytics/prune   → { days: 90 }
```

### Quality
```
GET  /api/quality           → { total, byType, issues[] }
     issue: { col, colLabel, slug, type, label }
     types: no-body | short-body | no-image | no-seo-title | no-seo-desc
```

### Pods
```
GET  /api/pods              → [{ path, name, published, collections, fileSize, lastModified, current }]
PUT  /api/pods/linked       → { paths: string[] }
```

### Users + Permissions
```
GET  /api/users
POST /api/users             { username, password, role }
PUT  /api/users/:id         { role?, password? }
DELETE /api/users/:id
GET  /api/users/:id/permissions     → { allowed: string[] | null }
PUT  /api/users/:id/permissions     { allowed: string[] | null }
```

---

## Content Validation

Beim Publish/Schedule (nicht beim Draft-Save):

**Client** (`editor.html`):
- Prüft required, min/max, regex
- Zeigt rotes Banner in der Meta-Sidebar mit allen Fehlern
- Blockiert Save

**Server** (`entries.js`):
- `validateFields(schema, data)` auf POST/PUT wenn status=published|scheduled
- Gibt 422 + `{ error: 'Validation failed', errors: string[] }` zurück

---

## Wikilinks

**Syntax im Body:** `[[Title|collection/slug]]`

**Im Block-Editor:**
- `[[` tippen → floating Picker mit recent entries + Suche
- Pfeiltasten + Enter zum Auswählen, Escape zum Schließen
- Picker flippt nach oben wenn zu nah am xfce-Dock

**Rendering in Astro:**
```astro
---
const rendered = post.data.body.replace(
  /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
  (_, title, href) => `<a href="/${href}">${title}</a>`
);
---
<div set:html={rendered} />
```

---

## Entry Templates

- Im Editor-Sidebar: Namens-Input + "Save as template" Button
- Speichert alle Felder (außer slug, status, locale, publish_at, _seo)
- In `entries.html`: `⌗`-Button öffnet Template-Picker
- Gespeichert als `templates.{collectionId}` Meta-Key (JSON-Array)

---

## Collection-Permissions

- User-Rolle: `admin` (alles) | `editor` (eingeschränkbar)
- In `users.html`: "Collections"-Button per Editor → Checkbox-Modal
- Speichert `user.{id}.allowed_collections = JSON-Array` in Meta
- `null` (nicht gesetzt) = alle Collections erlaubt
- Middleware `requireCollectionAccess` prüft alle Entry-Routes

---

## Multi-Pod

- Admin läuft für einen Pod; andere Pods können verlinkt werden
- `PUT /api/pods/linked` speichert Pfade in `pods.linked` Meta-Key
- `GET /api/pods` öffnet jeden verlinkten Pod und gibt Stats zurück
- `pods.html` zeigt Stat-Cards mit published/collections/size/lastModified
- Pods können verlinkt und wieder entfernt werden

---

## Analytics

Tracked automatisch: path, referrer, user-agent, lang, screen_w, is_bot.

**AI Crawler Detection:** GPTBot, ClaudeBot, Perplexity, Bing Bot, CommonCrawl, etc. → Badge-Typen: `ai-crawler`, `ai-agent`, `search`, `rag-pipeline`, `bot`, `feed-reader`.

**Dashboard:** Top Pages (mit Entry-Titel), Top Referrers, Tages-Chart, Devices (mobile/tablet/desktop), Languages, AI & Crawlers-Panel.

**Page Drill-down:** Klick auf Seite → alle Stats gefiltert auf diesen Pfad.

**Prune:** löscht Daten älter als 90 Tage.

---

## Deploy-Workflow

### Lokale Entwicklung
```bash
npm run admin      # Port 4399 (Admin)
npm run dev        # Port 4321 (Astro)
npm run dev:all    # beides gleichzeitig
```

### npm Publish
```bash
# Core zuerst (integration + CLI hängen davon ab)
npm version patch --workspace=packages/core
npm version patch --workspace=packages/integration
npm version patch --workspace=packages/cli

npm publish --workspace=packages/core --access=public
npm publish --workspace=packages/integration --access=public
npm publish --workspace=packages/cli --access=public
npm publish --workspace=packages/client --access=public
```

### Checklist vor Release
- Versionen in allen packages bumped
- `npm pack --dry-run` clean (kein `.pod`, keine Secrets)
- OG-Card in `og-card.png` aktualisieren
- README Changelog-Eintrag
- Git-Tag pushen: `git tag v0.x.x && git push origin v0.x.x`

---

## Ports (lokal)

| Port | Was |
|---|---|
| 4321 | Astro dev server |
| 4322 | Blog-Admin (a83-blog) |
| 4399 | Orbiter Admin dev |

---

## Datei-Struktur (wichtigste Pfade)

```
packages/
  core/src/
    db.js              ← OrbiterDB Klasse, alle DB-Methoden
    index.js           ← createPod, openPod, hashPassword exports
  admin/
    src/
      server.js        ← Hono-App, alle Route-Registrierungen
      routes/          ← entries, collections, media, analytics, ai, build, …
      middleware/auth.js ← requireAuth, requireAdmin, requireCollectionAccess
    public/            ← HTML-Seiten (SPA)
      editor.html      ← Block-Editor + Meta-Panel
      entries.html     ← Entry-Liste + Bulk-Ops + Templates
      schema.html      ← Schema-Editor + Field-Migration
      analytics.html   ← Analytics-Dashboard
      pods.html        ← Multi-Pod-Übersicht
  integration/src/
    index.js           ← Astro-Integration, Virtual Modules
    loader.js          ← orbiterLoader, orbiterLiveLoader
    OrbiterImage.astro ← <OrbiterImage> Komponente
  cli/
    bin/orbiter.js     ← Command-Dispatch
    src/               ← init, status, sync, encrypt, backup, …
    templates/         ← Scaffolding-Templates für orbiter init
packages/client/       ← @a83/orbiter-client, createClient()
```

---

## Bekannte Eigenheiten

- **SPA-Router + top-level await:** Seiten mit `await` auf Top-Level müssen in `router.js` excluded werden, sonst leere Seite nach Dock-Klick.
- **Station Mode:** xfce Dock ist `position:fixed; bottom:18px` — Picker-Positionierung muss `getBoundingClientRect()` des Docks prüfen, nicht `window.innerHeight`.
- **`~` in Meta-Keys:** API übersetzt `~` → `.` (z.B. `preview_url~posts` → `preview_url.posts`) um URL-konforme Keys zu ermöglichen.
- **Blog bleibt separat:** `a83-blog` / `techblog` ist ein eigenes Projekt mit published npm package — nicht in Orbiter-Dev-Todos einschließen.
- **Landing Page:** Push auf `main` → GitHub Actions → `deploy/landing` Branch → Ubuntu/Plesk.
- **OG-Card:** `og-card.png` im Repo-Root, lokal aktualisieren (nicht extern hosten, GitHub cached externe URLs).
