---
title: "Ein CMS, das in eine einzige Datei passt — was ist neu"
tags: opensource, webdev, cms, sqlite
canonical_url: https://github.com/aeon022/orbiter
cover_image: # TODO: Kalender-Screenshot einfügen
---

# Ein CMS, das in eine einzige Datei passt — was ist neu

**Orbiter** ist ein Headless-CMS für Astro, das alles — Content, Medien, Benutzer, Einstellungen — in einem einzigen POD speichert — einer SQLite-Datenbank. Kein Datenbank-Server, keine Cloud, kein Vendor Lock-in. Nur eine Datei, die man kopieren, sichern oder per E-Mail verschicken kann.

Ich baue Orbiter seit einigen Monaten solo und habe gerade v0.3.64 veröffentlicht. Hier ist, was neu ist.

## Kalenderansicht

Jedes CMS kann Beiträge planen. Wenige zeigen dir *visuell*, was wann kommt.

Orbiter hat jetzt eine eigene Kalenderseite — ein Monatsraster, in dem jeder Eintrag als farbiger Chip erscheint:

- **Blau** — geplant (wird zum `publish_at`-Zeitpunkt veröffentlicht)
- **Gold** — läuft ab (wird zum `unpublish_at`-Zeitpunkt depubliziert)
- **Grün** — veröffentlicht
- **Grau** — Entwurf

Klick auf einen Tag zeigt alle Einträge für dieses Datum in einer Sidebar. Filter nach Status. Tastatur-Navigation mit Pfeiltasten und `T` für heute.

Das Dashboard hat ebenfalls ein kompaktes Kalender-Widget bekommen — ein Mini-Monatsraster mit farbigen Dots und eine Liste der nächsten geplanten Einträge.

## Cross-Pod Import/Export

Ein POD ist portabel by Design, aber manchmal will man nur *Teile* eines Pods in einen anderen kopieren — ein Collection-Schema, bestimmte Einträge, oder alles.

Die Import-Seite hat jetzt einen **Pod / JSON**-Tab:

- **Export** — lädt alle Collections + Entries als einzelne JSON-Datei herunter
- **Import** — `.json`-Export oder rohe `.pod`-Datei droppen, Orbiter mergt es in den aktuellen Pod
- Fehlende Collections werden automatisch erstellt
- Bestehende Einträge können übersprungen oder überschrieben werden

Damit kann man:
- Einen Staging-Pod auf Produktion klonen
- Content zwischen Projekten teilen
- Bestimmte Collections sichern und wiederherstellen

API-Endpunkte: `GET /api/import/export-pod` und `POST /api/import/pod`.

## Desktop App v0.2.0

Die Electron-Desktop-App hat drei große Upgrades bekommen:

**Universal macOS Binary** — ein DMG, das nativ auf Apple Silicon und Intel Macs läuft. Kein "welchen Download brauche ich?" mehr.

**Auto-Update** — wenn eine neue Version auf GitHub Releases veröffentlicht wird, lädt die App sie im Hintergrund herunter und zeigt einen "Jetzt neu starten"-Dialog.

**Backup** — `Datei → POD sichern… (⌘⇧S)` erstellt eine Kopie des aktiven Pods mit Zeitstempel. Ein Dialog bietet an, die Datei im Finder zu zeigen.

## Tabellen-Feld

Ein neuer Schema-Feldtyp: `table`. Er rendert ein Mini-Spreadsheet direkt in der Entry-Sidebar — Header-Zeile, Datenzeilen, Zeilen/Spalten hinzufügen/entfernen, Tab-Navigation zwischen Zellen. Gespeichert als `string[][]` im Entry-JSON.

Perfekt für Preistabellen, Stundenpläne, Spezifikationen — alles, was tabellarisch ist, aber keine eigene Collection braucht.

## Der Stack

- **Astro**-Integration via Virtual Modules (`orbiter:collections`)
- **SQLite** (better-sqlite3) — der gesamte Pod ist eine Datei
- **Hono** — leichtgewichtiges HTTP-Framework für die Admin-API
- **Electron 42** — Desktop-App mit `utilityProcess.fork()`
- **Keine Cloud nötig** — läuft auf localhost, Deploy auf Shared Hosting via FTP

Alles MIT-lizenziert.

## Was kommt als Nächstes

- Windows App-Menü testen (Build funktioniert, braucht echtes Windows-Gerät)
- SvelteKit-Integration (`@a83/orbiter-sveltekit`)

---

**GitHub**: [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
**Docs**: [orbiter.sh/docs](https://orbiter.sh/docs/)
**Desktop Download**: [GitHub Releases](https://github.com/aeon022/orbiter/releases)

Wer statische Seiten mit Astro baut und ein CMS will, das nicht nach Hause telefoniert — probiert Orbiter aus. Feedback und Stars willkommen.
