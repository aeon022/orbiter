# stage.md — Verlauf / Tagebuch für die nächsten Sessions

> **Zweck:** Hier steht, was wir gemacht haben, in welchem Zustand das Projekt gerade ist und wie es weitergeht.
> **Zu Sessionbeginn lesen.** Am Sessionende ergänzen (Abschnitt „Verlauf" unten + „Aktueller Stand" oben aktualisieren).
> Diese Datei ist **versioniert** (im Repo). `SECURITY-TODO.md` und `PLUGIN-CONCEPT.md` bleiben dagegen privat (`.gitignore`) — die Verweise darauf in dieser Datei laufen nur lokal. Keine Secrets/Tokens hier eintragen.
> Sprache: Deutsch (User schreibt Deutsch). Code/Commits/Docs der Landing-Seite: Englisch.

---

## 1. Aktueller Stand (Stand: 2026-10-08, Abend)

- Repo: `~/Sites/orbiter` (github.com/aeon022/orbiter), Branch `main`, **alles gepusht**, HEAD siehe `git log -1`.
- **Nichts ist uncommittet** außer den bekannten untracked Marketing-Dateien (`content/docs/`, `content/posts/*hackernews-human.md`, `content/posts/postctl_ready/`, `.claude/`) — gehören nicht zu den Orbiter-Fixes, nicht anfassen.
- Landing-Seite deployt automatisch bei Push auf `main` (GitHub Actions → `deploy/landing`). Der Changelog dort nennt bereits die **noch nicht veröffentlichten** Versionen (siehe unten).

### npm-Stand

| Paket | live auf npm | im Repo (unveröffentlicht) |
|---|---|---|
| `@a83/orbiter-core` | 0.3.20 | **0.3.21** |
| `@a83/orbiter-admin` | 0.3.87 | **0.3.88** |
| `@a83/orbiter-integration` | 0.3.21 | **0.3.22** |
| `@a83/orbiter-mcp` | 0.1.4 | **0.1.5** |
| `@a83/orbiter-client` | 0.1.3 | **0.1.4** |
| `@a83/orbiter-cli` | 0.3.14 | **0.3.15** |

→ **Release geplant fürs Wochenende (10./11.10.2026), nachdem der User den Klick-Durchgang gemacht hat.** Runbook: Abschnitt 6.

### Sicherheits-Advisories (GitHub, alle veröffentlicht, CVE jeweils angefragt — IDs noch prüfen)

| GHSA | Thema | Fix in |
|---|---|---|
| GHSA-wv82-8593-g3c5 | Stored XSS im Inbox (Reporter Adrian Wilczek) | admin 0.3.82 |
| GHSA-w3h3-6g4r-hxc5 | Collection-Permission-Bypass singleton + export (Adrian) | admin 0.3.82 |
| GHSA-r4r2-gxr8-p3vc | Media Path Traversal (Adrian) | core 0.3.15 |
| GHSA-vvp4-5qxq-47r8 | Stored XSS über Medien (Content-Type) | admin 0.3.86, integration 0.3.21 |
| GHSA-7jg7-w84v-wg8m | SSRF beim Medien-Import per URL | admin 0.3.86 |
| GHSA-5h4q-fqfp-gq9w | Content API lieferte Drafts an Anonyme (offene API ohne Token) | integration 0.3.21 |

- **Adrian Wilczek** (https://github.com/wilczekad) ist bei seinen drei als `finder` eingetragen und im Text mit Profil-Link genannt (so mit ihm abgemacht; siehe Memory `reference_security_advisory_credit`).
- CVE-IDs prüfen: `gh api repos/aeon022/orbiter/security-advisories/<GHSA> --jq .cve_id` (kommen von GitHub als CNA, meist 1–2 Tage).

---

## 2. Verlauf (Tagebuch)

### 2026-10-08 — der große Security- und Feature-Tag

Ausgangspunkt: User wollte bei den Security-Sachen weitermachen; drei Advisories (Adrians Report) waren noch Drafts.

1. **Advisories veröffentlicht** (Adrians drei), Credits geprüft, CVEs angefragt, Memory-Eintrag für die Credit-Vorgabe angelegt. Antwortmail an Adrian entworfen.
2. **Security-Audit (statisch, Code gelesen)** über admin/core/integration; Funde 1–8 → siehe Abschnitt 3. Fixes 1–4 sofort, 5–8 danach, jeweils mit Tests und echtem Server (curl-E2E).
3. **Release 1** (core 0.3.19, admin 0.3.86, integration 0.3.21, mcp 0.1.3) veröffentlicht + 3 weitere Advisories (XSS-Medien, SSRF, Draft-Leck) veröffentlicht, CVEs angefragt.
4. **Weitere Funde gefixt** (CSV-Route/Injection, CSRF-Referer, Login-Timing, WXR-SSRF, Desktop-Härtung, MCP-/Admin-`/health` ohne Pfad), Terminal-Theme (amber) gebaut, Settings-UI-Bugs (Style-Karten, Default-Mismatch, XFCE-Reload) und a11y (Fokus, reduced-motion) gefixt.
5. **`api.token` gehasht** (+ Draft-Leck in der offenen Content API entdeckt und gefixt).
6. **Release 2** (core 0.3.20, admin 0.3.87, mcp 0.1.4, cli 0.3.14) veröffentlicht.
7. **Roadmap-Features gebaut** (Reihenfolge laut User „sinnvoll"): Security-Check/`orbiter doctor`, verschlüsselte Secrets, MCP-Draft-Write-Keys, 2FA + Sessions, Key-Scopes/Expiry/Rate-Limit, signierte Webhooks, Version-Diff, Medien-Usage, Preview-Tokens, Review-Workflow, Bild-Varianten + Fokuspunkt, KI-Übersetzung.
8. **Plugin-System-Konzept** geschrieben (`PLUGIN-CONCEPT.md`, nichts gebaut), Basis-Security-Header + **Nonce-CSP im Report-Only-Modus** eingebaut.
9. Obsidian-Plugin-Idee des Users → auf die Roadmap gesetzt (Version 1 = Push als Entwurf).
10. Dieses `stage.md` angelegt und ins Git genommen.
11. **Plugin-Ideen** gesammelt (Abschnitt 11 in `PLUGIN-CONCEPT.md`) und die **Docs-Seite „Webhook recipes"** gebaut (`/docs/webhook-recipes`): Empfänger-Skript mit Signaturprüfung + Handler für Slack/Telegram, IndexNow, Cloudflare, Mastodon. Das Empfänger-Skript wurde gegen echte signierte Zustellungen getestet (Ping ignoriert, Publish erkannt, Fälschung ergibt 401).

---

## 3. Sicherheits-Findings und was daraus wurde

| # | Fund | Status |
|---|---|---|
| 1 | `POST /api/github/push` pushte die **komplette Pod** (Sessions, Hashes, Secrets) | gefixt: bereinigte Kopie (`scrubbedPodBase64` in `routes/github.js`) |
| 2 | Stored XSS über Uploads (beliebiger Content-Type, kein nosniff) | gefixt: `mediaResponseHeaders()` in core (nosniff, sandbox-CSP, Download für Nicht-Allowlist) |
| 3 | SSRF beim URL-Import (+ Rücklesen) | gefixt: `safeFetch` in `admin/src/net.js` (private IPs blockiert, Redirects geprüft, 50 MB). Env `ORBITER_ALLOW_PRIVATE_FETCH=1` für Dev |
| 4 | Login-Rate-Limit per `X-Forwarded-For` umgehbar | gefixt: `clientIp()` (XFF nur wenn TCP-Peer privat, dann rechtester Eintrag) |
| 5 | Editor-Rechte-Lecks (`ai/suggest`, Collection-Liste/Detail, `/info`, `/quality`) | gefixt (`allowedCollectionIds`, `userCanAccessCollection`) |
| 6 | Sessions überlebten Passwortwechsel | gefixt (`deleteUserSessions`) |
| 7 | Public Form/Hit ohne Limits, Mail-Flut | gefixt (`ratelimit.js`, Größenlimits, globales Mail-Limit) |
| 8 | Token nicht zeitkonstant, Form-Configs für Editoren | gefixt |
| – | Draft-Leck der Content API (kein Token ⇒ `?status=draft` für alle) | gefixt (GHSA-5h4q) |
| – | Webhook-URLs durch Editoren setzbar | gefixt (eigene Admin-Route) |
| – | `preview.token` im Klartext/Editor bekam maskierten Token | gefixt: kurzlebige, an Entry gebundene Tokens |
| – | Desktop: Server im LAN erreichbar, `openExternal` mit beliebigen URLs | gefixt (127.0.0.1, sandbox, nur http(s)) |
| – | Admin ohne Security-Header | gefixt (Basis-Header) + Nonce-CSP **Report-Only** |

**Bewusst nicht geändert:** `/api/widget/:collection` ignoriert `api.token` (Widgets laufen öffentlich im Browser, ein Token wäre sichtbar). Editoren dürfen weiter Build/FTP-Deploy auslösen. Editoren dürfen bereits veröffentlichte Einträge weiter bearbeiten, auch mit Review-Workflow (Gate gilt nur für den *Übergang* nach published/scheduled — in den Docs dokumentiert).

---

## 4. Was gebaut wurde (Feature-Katalog mit Fundorten)

- **Security-Check:** `packages/core/src/doctor.js` (`securityChecks`, `isTrackedByGit`), CLI `orbiter doctor` (`packages/cli/src/doctor.js`), Dashboard-Karte + `GET /api/security-check` (admin).
- **Verschlüsselte Secrets:** `packages/core/src/secrets.js` (AES-256-GCM, Env `ORBITER_SECRET`, opt-in, Migration beim Admin-Start; `SECRET_META_KEYS` inkl. `webhooks.urls`). `db.getMeta/setMeta` ver-/entschlüsseln transparent. Leeres Formular überschreibt verschlüsselte Werte nicht.
- **API-Keys:** `core/src/auth.js` → `authenticateApiKey` (Scope `read|draft-write`, `collections`, `expires`, `rateLimit` pro Minute in-memory), `api.token` gehasht (`sha256:`), Dialog in `settings.html`.
- **MCP Draft-Write:** `packages/mcp/src/write.js` (`create_draft`, `update_draft`; nie publish, nur Drafts), HTTP per Key-Scope, stdio mit `ORBITER_MCP_WRITE=1`.
- **2FA (TOTP) + Sessions:** `core/src/totp.js`, DB-Spalten (`_users.totp_*`, `_sessions.ip/ua`), Routen in `admin/src/routes/account.js` (+ Login in `auth.js`, Reset in `users.js`), UI in `account.html`/`login.html`/`users.html`. Replay-Schutz, 8 Recovery-Codes (Hash), pro-Konto-Limit.
- **Signierte Webhooks:** `admin/src/webhooks.js` + `routes/webhooks.js` (HMAC-SHA256, 3 Retries 5 s/30 s/5 min **in-process**, Log in Meta `webhooks.log`), UI in Settings. Events: `publish`, `delete`, `review`, `ping`.
- **Version-Diff:** Editor-History (Current + alle Snapshots, Diff/Restore); `restoreVersion` sichert den ersetzten Stand zuerst.
- **Medien:** `GET /api/media/usage` (used/unused/broken, editor-rechte-bewusst), Filter in `media.html`; Varianten `?w=&fmt=&ar=` (`core/src/media-variant.js`, sharp optional/injizierbar via `useSharp`, Cache 64 MB, max 2 parallel, 503 bei Überlast), Fokuspunkt (`_media.focal_x/y`, `PUT /api/media/:id`, Dialog).
- **Preview-Tokens:** `signPreviewToken/checkPreviewToken` (core), `GET /api/preview-token`, Editor-Knopf mintet beim Klick.
- **Review-Workflow:** Meta `workflow.review` (für alle lesbar, nur Admin schreibbar), Status `in_review`, Rolle `reviewer`, Gate `publishDenied()` in `routes/entries.js` (+ `canPublish` in `middleware/auth.js`), UI in Editor/Entries/Users/Settings.
- **KI-Übersetzung:** `POST /api/ai/translate` (`routes/ai.js`), Button in der Locale-Leiste; erstellt nur Drafts, überschreibt nie.
- **Theme „Terminal"** (amber/paper) in `style.css`.
- **Header/CSP:** Basis-Header in `server.js`; `admin/src/csp.js` (Nonce pro Request, `Content-Security-Policy-Report-Only`, Sammler `POST /csp-report`, Liste `GET /api/security-check/csp-reports`).
- **Landing:** Docs-Seiten `security`, `webhooks`; Abschnitte in `mcp`, `media`, `permissions` (#review), `i18n`, `editor`, `draft-preview`, `git-sync`; Roadmap (`vision.astro`) und Changelog (`index.astro`, Karte „Oct 2026 — Latest") laufend gepflegt.

---

## 5. Offen / nächste Schritte (in dieser Reihenfolge)

1. **User: Klick-Durchgang im Browser** — Checkliste steht in `SECURITY-TODO.md` (Abschnitt „KLICK-CHECKLISTE"). Station-Mode **und** Classic, dunkel + hell. Bisher ist *nichts* davon im Browser gesehen worden (nur curl/Unit-Tests).
2. **Release** (Abschnitt 6), danach `npm view` prüfen, CVE-IDs prüfen.
3. **CSP enforcing:** nach dem Klick-Durchgang die gesammelten Reports ansehen, ~93 Inline-Handler (editor.html 77, forms.html 10, graph.html 3, analytics/entries/schema je 1) in `addEventListener`/Delegation umbauen (Handler rufen globale Funktionen und enthalten teils JS-Ausdrücke → nicht mechanisch), dann Header auf `Content-Security-Policy` (enforcing) umstellen. Erst wenn Reports leer sind.
4. **Obsidian-Plugin v1 + Web-Clipper:** REST-Ingest-Endpunkt (Draft-Write-Key, Upsert per Slug über Frontmatter), Plugin (Push als Entwurf), README mit Sicherheitshinweis (Key liegt im Vault/`data.json` und wird ggf. mitgesynct → Draft-Only + Collection-Limit + Ablauf empfehlen). v2: Pull + Konflikterkennung. Bilder in v1 nur Links (Medien-Upload braucht heute Admin-Session).
5. **Plugin-Ideen-Reihenfolge** (aus `PLUGIN-CONCEPT.md` §11): D Webhook-Rezepte (erledigt) → C Clipper/Obsidian über denselben Ingest-Endpunkt → A JSON-LD-Builder als erstes Feld-Plugin → B Transforms erst nach Entscheidung.
5b. **Plugin-System** laut `PLUGIN-CONCEPT.md` — **fünf Entscheidungen des Users stehen aus** (Phase 1 zuerst? Server-Transforms überhaupt? Wer schreibt Plugins? Desktop? Strikte CSP vorab? — Letzteres läuft jetzt als Punkt 3).
6. Später/groß: Live-Collaboration, SvelteKit-Integration, Orbiter Cloud.
7. Kleinkram/Ideen: Webhook-Retries persistent machen (Queue statt Timer), Rate-Limit pro Key über mehrere Prozesse, „Passwort-Stärke"-Check in `orbiter doctor`, QR-Code für 2FA-Setup (aktuell nur Setup-Key zum Eintippen), `ping-worker` ist noch nicht gehostet (Cloudflare-Rate-Limit-Regel wäre der eigentliche Schutz).

---

## 6. Release-Runbook (so haben wir es zweimal gemacht, hat funktioniert)

Voraussetzungen: Arbeitsbaum sauber (`git status` ohne tracked Änderungen), Tests grün, Landing-Build grün, `npm whoami` → `aeon022`. **npm-Automation-Token läuft am 2026-11-05 ab** (Memory `reference_npm_token_expiry`).

1. `npm publish -w @a83/orbiter-core --access public`
2. **Warten, bis `npm view @a83/orbiter-core version` die neue Version zeigt** (dauert oft Minuten; Hintergrund-Loop `until … sleep 20` nutzen). Sonst scheitern Installs von admin/mcp/cli/integration wegen `^0.3.21`.
3. Danach: `npm publish -w @a83/orbiter-admin|orbiter-integration|orbiter-mcp|orbiter-client|orbiter-cli --access public`.
4. Prüfen: `npm view <paket> version` für alle sechs.
5. Landing ist bereits deployt (Changelog nennt die Versionen) — nach dem Publish stimmen die Angaben.
6. CVE-IDs der Advisories prüfen (siehe oben), ggf. in `SECURITY.md`/Changelog nachtragen.

**Fallen:** `npm publish` packt den **Arbeitsordner**, nicht den Commit → vorher tracked Änderungen stashen oder committen. Es gibt einen `prepublishOnly`-Versions-Guard (Commit `ab0db265`). Frühere Publishes hingen mal „staged" (siehe Commits `dc29bfbd`, `42175969`) — dann Version erneut bumpen.

---

## 7. Dev- und Testrezepte

- Tests: `node --test packages/core/src/{auth,secrets,totp,media-variant}.test.js packages/mcp/src/write.test.js packages/admin/src/{net,ratelimit,csp}.test.js` (aktuell 28 Tests, alle grün).
- **E2E gegen echten Admin** (so haben wir alles geprüft): Wegwerf-Pod per `createPod/openPod` (core) mit Admin + Editor (Editor auf eine Collection eingeschränkt) anlegen, Server mit `ORBITER_POD=… PORT=4455 ADMIN_ORIGIN=http://localhost:4455 node packages/admin/src/server.js` starten, per `curl` mit Cookie-Jar und `Origin`-Header testen (CSRF-Check verlangt passenden Origin bei POST/PUT/DELETE). Seed-Skripte lagen im Session-Scratchpad (nicht im Repo) — bei Bedarf neu schreiben, ist ~10 Zeilen.
- MCP-HTTP testen: `ORBITER_MCP_HTTP=1 PORT=4511 node packages/mcp/src/server.js`, Header `Accept: application/json, text/event-stream`, JSON-RPC `tools/list` / `tools/call`.
- Landing bauen: `cd apps/landing && npx astro build` (**immer vor dem Push**; geschweifte Klammern in `.astro`-Text müssen als `&#123; &#125;` geschrieben werden, sonst Build-Fehler — ist uns einmal passiert).
- Dev-Ports (Memory): Orbiter-Admin-Dev 4399, Blog 4322, Astro 4321.
- Syntaxcheck der Inline-Skripte in HTML-Dateien: Skript-Blöcke per Regex extrahieren und `node --check` (haben wir für alle geänderten Seiten gemacht).

---

## 8. Lektionen / Fallen aus dieser Session

- **zsh:** Globs mit `--include=*.js` schlagen fehl („no matches found") → Pattern quoten (`--include='*.js'`).
- Ein `cat > datei` ohne Stdin **hängt** den Befehl — nie ohne Heredoc aufrufen.
- **Arbeitsverzeichnis driftet** zwischen Bash-Aufrufen (`cd ..` wirkt in Folge-Calls nicht wie gedacht) → absolute Pfade oder explizit `cd /Users/gweiher/Sites/orbiter`.
- `curl -H Accept:application/json,text/event-stream` (ohne Quotes) wird gesplittet → in Anführungszeichen setzen.
- Die zsh-Meldung `compdef:153: _comps: assignment to invalid subscript range` ist harmloses Rauschen der Shell-Initialisierung.
- Hono: Middleware per `use()` gilt nur für **später registrierte** Handler → Reihenfolge beachten (Ursache des Singleton-Bugs aus Adrians Report; auch der CSV-Export wurde von `/:slug` verschluckt).
- Astro: `.astro`-Text mit `{…}` ist ein Ausdruck (siehe oben).
- Editor-`editor.html` (≈3.400 Zeilen) hat Feldtypen inline, keine Registry — Voraussetzung für Plugins (Phase 0 im Konzept).
- Das Pod-File enthält **alles** (Hashes, Sessions, Secrets). Der `orbiter init`-Workflow committet es absichtlich ins Git → Docs warnen, `orbiter doctor` meldet es, Secrets lassen sich mit `ORBITER_SECRET` verschlüsseln.

---

## 9. Arbeitsweise-Vorlieben des Users (aus dieser Session)

- Will **konkrete Umsetzung**, kurze klare Rückmeldungen; bei Mehrdeutigkeit lieber sinnvoll entscheiden und es sagen als mehrfach nachfragen.
- Veröffentlichen (npm, Advisories, Push) macht er bewusst — vorher kurz fragen, dann durchführen. „passt"/„ja"/„mach das" = Freigabe für den zuletzt vorgeschlagenen Schritt.
- Bevorzugt eine **sinnvolle Reihenfolge** („mach eine Reihenfolge, die arbeiten wir ab") und dass wir Dinge **abarbeiten**, ohne dass er jeden Schritt anstößt.
- Klick-Tests im Browser macht **er** (am Wochenende vor dem Release); ich kann keinen Browser bedienen und muss das offen sagen.
- Nutzt Station Mode (xfce/glass) — dort testen (Memory `user_station_mode`).
- Wichtig: ehrlich berichten, was **nicht** getestet wurde.

---

## 10. Begleitdateien

- `SECURITY-TODO.md` (gitignored) — Audit-Funde, Arbeitsreihenfolge, **Klick-Checkliste**, Release-Stand.
- `PLUGIN-CONCEPT.md` (gitignored) — Sicherheitskonzept fürs Plugin-System (nichts gebaut).
- `stage.md` — diese Datei (im Git).
- Memory-Index: `~/.claude/projects/-Users-gweiher-Sites-orbiter/memory/MEMORY.md` (u. a. Roadmap, Landing-Deploy, npm-Token-Ablauf, Advisory-Credit).
