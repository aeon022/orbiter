# Orbiter Desktop — Konzept & Roadmap

**Ziel:** Orbiter als natürliche Desktop-App für Windows und macOS.  
Doppelklick → App startet → Browser-Fenster öffnet sich → fertig.  
Kein Terminal, kein npm, kein Node.js vorausgesetzt.

---

## Zielgruppe

Kleine Firmen, Selbstständige, Fotografen, Restaurants — Leute, die ihre eigene Website mit Astro pflegen wollen, aber keine Entwickler sind. Sie betreiben Shared Hosting (World4You, Strato, Hetzner), haben keinen VPS und keine Lust auf Docker.

**Voraussetzung heute:** Node.js installieren → npm install → Terminal → npm run admin  
**Ziel mit Desktop-App:** Installer herunterladen → Doppelklick → fertig.

---

## Technologie: Electron

### Warum Electron und nicht pkg/nexe?

| | Electron | pkg/nexe |
|---|---|---|
| Eigenes Browser-Fenster | ✅ (Chromium gebündelt) | ❌ (öffnet System-Browser) |
| System Tray | ✅ | per Shell möglich, aber ugly |
| Auto-Updater | ✅ electron-updater | manuell |
| Native Menus | ✅ | ❌ |
| Bundle-Größe | ~120–160 MB | ~30–50 MB |
| Pod-Picker Dialog | ✅ `dialog.showOpenDialog` | ❌ |
| Installer (.exe/.dmg) | ✅ electron-builder | pkg kann .exe, aber limitiert |

Electron ist die richtige Wahl, weil:
- Wir das Admin-UI **innerhalb der App** zeigen können (kein Browser-Fenster nötig)
- System Tray für "App läuft im Hintergrund" nativ unterstützt wird
- `electron-builder` fertige `.exe`-Installer (NSIS) und `.dmg`-Packages baut
- `electron-updater` Auto-Updates ohne App-Store ermöglicht

### Warum nicht Tauri?

Tauri wäre leichter (kein gebündeltes Chromium), braucht aber eine Rust-Toolchain für den Build. Das ist für uns als Team okay, aber komplizierter CI-Setup. Electron ist der pragmatische Weg.

---

## Architektur

```
apps/desktop/
├── package.json          # electron, electron-builder, electron-updater
├── electron.config.js    # electron-builder config (targets, icons, signing)
├── src/
│   ├── main.js           # Electron main process
│   │   ├── startet Hono-Server als Child Process (node packages/admin/src/server.js)
│   │   ├── öffnet BrowserWindow auf localhost:PORT
│   │   ├── System Tray (Icon + Menü: Show, Quit)
│   │   └── Pod-Picker Dialog (erster Start oder "Anderes Pod öffnen")
│   ├── preload.js        # contextBridge — minimale IPC surface
│   └── tray/
│       └── icon.png      # 22×22 macOS, 16×16 Windows
├── build/
│   ├── icon.icns         # macOS App-Icon
│   ├── icon.ico          # Windows App-Icon
│   └── background.png    # macOS DMG-Hintergrund (Orbiter space theme)
└── CONCEPT.md            # dieses Dokument
```

### Main-Process-Ablauf

```
App startet
  → Lade zuletzt verwendetes Pod aus electron-store
  → Wenn kein Pod gespeichert: zeige "Neues Pod erstellen / Vorhandenes öffnen" Dialog
  → Starte Hono-Server als Child Process:
      PORT=random  ORBITER_POD=/pfad/zur/datei.pod  node .../server.js
  → Öffne BrowserWindow → http://localhost:PORT
  → Tray-Icon anlegen
  → Minimierung → Fenster verstecken (App läuft weiter)
  → Quit → Server-Child-Process killen → App beenden
```

### Pod-Verwaltung

Ersatz für das Kommandozeilen-Argument `ORBITER_POD=...`:

- **Erster Start:** "Willkommen"-Dialog — "Neues Pod erstellen" (file save dialog) oder "Vorhandenes Pod öffnen" (file open dialog)
- **Podwechsel:** Tray-Menü → "Pod öffnen…" oder Menüleiste → File → Open Pod
- **Zuletzt verwendet:** `electron-store` speichert Pfad in `userData/config.json`
- **Pod-Name** im Tray-Tooltip und Fenster-Titel: `Orbiter — mein-projekt.pod`

---

## Roadmap

### Phase 1 — MVP (läuft lokal, kein Installer)
- [ ] `apps/desktop/` anlegen, `package.json` mit electron dependency
- [ ] `main.js`: Server als Child Process starten, BrowserWindow öffnen
- [ ] Pod-Picker: Dialog beim ersten Start
- [ ] Tray-Icon: Show / Quit
- [ ] `electron-store` für letzten Pod-Pfad
- [ ] Dev-Start: `npm run dev` in `apps/desktop/` startet Electron direkt

### Phase 2 — Paketierung
- [ ] `electron-builder` konfigurieren
- [ ] Icons: `.icns` (macOS), `.ico` (Windows)
- [ ] macOS: `.dmg` mit Drag-to-Applications
- [ ] Windows: NSIS-Installer `.exe` (silent + standard install)
- [ ] Signierung: macOS (code sign + notarisieren mit Apple Developer Account), Windows (optional, aber SmartScreen-Warning ohne Signing)
- [ ] GitHub Actions: Build-Pipeline — baut `.dmg` und `.exe` auf Push auf `main`

### Phase 3 — Auto-Update
- [ ] `electron-updater` einbauen — prüft GitHub Releases auf neue Version
- [ ] Update-Dialog im App-Menü: "Update verfügbar — jetzt installieren?"
- [ ] GitHub Release als Update-Server (kostenlos, kein eigener Server)

### Phase 4 — Polish
- [ ] Splash-Screen beim Start (Orbiter-Logo, bis Server ready)
- [ ] Server-Health-Check — warte bis Port erreichbar, dann BrowserWindow öffnen
- [ ] Fehler-Dialog wenn Server nicht startet (Port belegt, Pod-Datei nicht lesbar)
- [ ] "Über Orbiter" Dialog (Version, Links)
- [ ] macOS: App korrekt re-öffnen wenn Dock-Icon geklickt (activate event)
- [ ] Windows: Single-Instance lock (zweiter Start öffnet vorhandenes Fenster)

---

## Offene Fragen

**Server-Prozess — Child Process vs. gebündelt?**  
Option A: `child_process.fork()` den bestehenden `packages/admin/src/server.js` — simpel, nutzt vorhandenen Code ohne Änderungen.  
Option B: Admin-Server-Code direkt im Electron Main Process laufen lassen (kein Child Process, aber Electron und Hono laufen im selben Node) — schneller, aber keine Prozess-Isolation.  
→ **Empfehlung: Child Process** — einfacher zu debuggen, Server-Crashes bringen nicht die ganze App zum Absturz.

**Port-Wahl?**  
Fixen Port (4321) oder zufälligen freien Port suchen?  
→ Fixer Port ist simpler (keine IPC nötig um den Port zu übergeben), aber kann kollidieren wenn mehrere Instanzen oder anderer Server läuft. Random Port + `electron-store` Cache ist robuster.

**Astro / Frontend separat?**  
Erster Fokus: nur Admin-App. Das Astro-Projekt bleibt auf dem Rechner des Users und wird separat gebaut. FTP-Deploy aus der App heraus funktioniert bereits.

**Code-Signing Budget?**  
- macOS: Apple Developer Account ($99/Jahr) nötig für Notarisierung, sonst Gatekeeper-Warning
- Windows: Code-Signing-Zertifikat (ab ~$200/Jahr) nötig um SmartScreen zu umgehen  
→ Erstmal ohne Signing bauen/testen; Signing in Phase 2–3 wenn User-Feedback positiv.

---

## Paket-Größe Schätzung

| Komponente | Größe |
|---|---|
| Electron (Chromium + Node) | ~100 MB |
| Orbiter Admin + Core | ~15 MB (node_modules geminified) |
| Gesamt-Installer | ~120–140 MB |

Zum Vergleich: VS Code ~100 MB, Slack ~300 MB. Akzeptabel für Desktop-Software.

---

## Nächster Schritt

Phase 1 starten: `apps/desktop/package.json` + `src/main.js` — MVP das lokal läuft.
