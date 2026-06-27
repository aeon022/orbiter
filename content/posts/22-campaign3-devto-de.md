---
title: "Orbiter CMS ist jetzt team-ready — Validierung, Berechtigungen, Qualität und Verschlüsselung"
tags: opensource, webdev, cms, sqlite
canonical_url: https://github.com/aeon022/orbiter
cover_image: screenshots/c3-08-editor-validation-banner.png
---

# Orbiter CMS ist jetzt team-ready — Validierung, Berechtigungen, Qualität und Verschlüsselung

**Orbiter** ist ein Headless CMS für Astro (und jetzt auch SvelteKit), das alles in einer einzigen `.pod`-Datei speichert — eine SQLite-Datenbank. Kein Cloud-Account, kein Vendor Lock-in, keine Monatsrechnung.

Als ich anfing, das Projekt zu bauen, war die Zielgruppe der Solo-Dev oder die kleine Agentur. Seitdem hat sich Orbiter zu etwas entwickelt, das auch Teams wirklich nutzen können. Dieses Release fokussiert genau darauf: Content-Qualitätsgates, Benutzerberechtigungen, verschlüsselte Speicherung und Tools für mehrere Pods gleichzeitig.

Hier ist, was in admin@0.3.78 und cli@0.3.9 neu ist.

---

## Content-Validierung — schema-basierte Qualitätsgates

Jedes Feld im Schema kann jetzt Validierungsregeln tragen:

```json
{
  "excerpt": { "type": "string", "label": "Teaser", "max": 160, "required": true },
  "slug_override": { "type": "string", "regex": "^[a-z0-9-]+$" },
  "price": { "type": "number", "min": 0, "max": 9999 }
}
```

**Wann wird validiert:**
- **Drafts** — immer gespeichert, kein Gate
- **Publish / Schedule** — Client prüft required, min, max, regex; zeigt ein rotes Fehler-Banner in der Sidebar mit allen Verstößen
- **Server** — gleiche Regeln als Safety Net; gibt 422 + `{ errors }` zurück bei Verstößen

Die Server-seitige Prüfung verhindert, dass die Validierung durch direkte API-Calls umgangen werden kann.

---

## Collection-Berechtigungen — Editoren sehen nur, was sie sollen

Orbiter hat zwei Rollen: `admin` und `editor`. Bisher konnten Editoren alle Collections sehen. Jetzt kann man sie einschränken:

In **Settings → Users** bekommt jeder Editor-User einen "Collections"-Button. Ein Checkbox-Modal lässt auswählen, welche Collections er bearbeiten darf. Nicht angehakte Collections geben dem Editor einen 403 auf alle Entry-Routen.

Die erlaubten Collections werden als `user.{id}.allowed_collections` in der Pod-Meta gespeichert — kein Schema-Change nötig. Admins sind immer uneingeschränkt.

Damit ist Orbiter für Kundenprojekte nutzbar: Pod anlegen, Kunden-User anlegen, auf die `pages`-Collection einschränken. Der Kunde sieht nie die `redirects`- oder `settings`-Daten.

---

## Content-Quality-Dashboard — automatische Content-Audits

Ein neues Panel in der Dashboard-Sidebar aggregiert Qualitätsprobleme über alle veröffentlichten Einträge:

| Problem | Was geprüft wird |
|---|---|
| Kein Body | Body-Feld leer |
| Body zu kurz | Body unter 100 Zeichen |
| Kein Bild | Schema hat ein Bild-Feld, aber kein Bild gesetzt |
| Kein SEO-Title | `_seo.title` fehlt |
| Keine SEO-Description | `_seo.description` fehlt |

Das Panel zeigt Anzahlen pro Problemtyp mit Link zur vollständigen Issue-Liste. Ersetzt das manuelle "wo fehlt was"-Suchen durch einen einzigen Blick beim Dashboard-Öffnen.

---

## Schema-Migration — Felder umbenennen ohne Datenverlust

Ein Feld umzubenennen bedeutete bisher: Schema updaten, jedes Entry-JSON manuell fixen, hoffen dass man nichts übersehen hat. Jetzt gibt es eine dedizierte Route:

`POST /api/collections/posts/schema/rename-field` mit `{ from: "teaser", to: "excerpt" }` läuft als einzelne Transaktion — aktualisiert das Schema und schreibt die `data`-Spalte jedes Eintrags in der Collection atomar neu. Schlägt die Transaktion fehl, ändert sich nichts.

Außerdem neu:
- `change-type` — Typ eines Felds ändern (Daten bleiben erhalten)
- `delete-field` — aus Schema entfernen, optional Daten aus Einträgen löschen

Im Schema-Editor gibt es den Button **"↔ Rename field"**, der nach altem und neuem Key fragt.

---

## Multi-Pod-Dashboard — mehrere Projekte verwalten

Wer Orbiter für mehrere Kunden oder Projekte betreibt, hatte bisher verschiedene Terminals und Browser-Tabs. Die neue `pods.html`-Seite ändert das.

Pod-Pfade in **Settings → Pods** eintragen. Pro verlinktem Pod gibt es eine Stat-Card:
- Site-Name
- Anzahl veröffentlichter Einträge
- Anzahl Collections
- Dateigröße
- Zuletzt geändert

`/api/pods` öffnet jeden Pod-File zum Anfragezeitpunkt (read-only) für aktuelle Stats. Kein Sync nötig.

---

## `orbiter encrypt` — git-sicherer Pod-Speicher

Die `.pod`-Datei ist SQLite. Wer sie in ein Git-Repo pusht, macht den Inhalt für alle Repo-Zugänge lesbar. `orbiter encrypt` löst das mit AES-256-GCM:

```bash
orbiter encrypt --pod ./content.pod          # → content.pod.enc, fragt Passphrase
orbiter decrypt --in ./content.pod.enc       # → content.pod

# Für CI/CD
orbiter encrypt --pod ./content.pod --key $ORBITER_KEY
```

Format: 67-Byte-Header (Magic + scrypt-Salt + IV + Auth-Tag) + Ciphertext. Der Auth-Tag sorgt dafür, dass eine falsche Passphrase sofort zu einem Fehler führt — keine partielle Entschlüsselung möglich.

Sinnvoller Workflow: `content.pod.enc` ins Repo committen. In CI mit Secret-Env-Variable entschlüsseln. Der Klartext-Pod berührt nie Git.

---

## `orbiter sync` — Pods per rsync schieben

```bash
orbiter sync --remote user@host:/path/to/content.pod         # push lokal → Server
orbiter sync --remote user@host:/path/to/content.pod --pull  # pull Server → lokal
```

Ein dünner Wrapper um `rsync -avz`. Einfach, zuverlässig, funktioniert mit SSH-Keys. Die Alternative zu S3 oder Git LFS für Pod-Transport.

---

## `orbiter status` — Pod-Health im Terminal

```
◆  content.pod

  Site      Meine Site  (de)
  File      232.0 KB  →  /pfad/zum/content.pod
  Modified  26.6.2026, 16:02:30
  Users     1

  Posts     4 published  ·  2 Drafts
  Pages     2 published  ·  1 Draft
  Authors   1 published
```

Ein Befehl, vollständiges Bild. Nützlich in CI, in Hooks oder als schnelle Sanity-Check.

---

## SvelteKit-Unterstützung — `@a83/orbiter-client`

Orbiter hat jetzt einen framework-agnostischen Client:

```bash
npm install @a83/orbiter-client
```

```ts
// SvelteKit +page.server.ts
import { createClient } from '@a83/orbiter-client';

export async function load() {
  const orb = createClient('./content.pod');
  return { posts: orb.getCollection('posts') };
}
```

Gleiche API wie die Astro Virtual Modules, funktioniert aber in SvelteKit, Nuxt, Express oder einem plain Node.js-Script. Der Client öffnet den Pod direkt — kein HTTP-Layer, kein Admin-Server nötig.

---

## `<OrbiterImage>` Astro-Komponente

```astro
import OrbiterImage from '@a83/orbiter-integration/OrbiterImage';
import { getMediaItem } from 'orbiter:media';

const photo = getMediaItem('abc123');

<OrbiterImage src={photo} />
```

Zieht `width`, `height` und `alt` automatisch aus dem Media-Item. Setzt `loading="lazy"` und `decoding="async"` als Default. Eliminiert den Boilerplate des manuellen Destructurings von Media-Items in `<img>`-Tags.

---

## Wo bekommst du es

```bash
npm install -g @a83/orbiter-cli
orbiter init mein-projekt

# oder Update bestehend
npm update @a83/orbiter-admin @a83/orbiter-integration @a83/orbiter-cli
```

GitHub: [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
Docs: [orbiter.sh/docs](https://orbiter.sh/docs)
