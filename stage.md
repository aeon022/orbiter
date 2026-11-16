# stage.md — Verlauf / Tagebuch für die nächsten Sessions

> **Zweck:** Hier steht, was wir gemacht haben, in welchem Zustand das Projekt gerade ist und wie es weitergeht.
> **Zu Sessionbeginn lesen.** Am Sessionende ergänzen (Abschnitt „Verlauf" unten + „Aktueller Stand" oben aktualisieren).
> Diese Datei ist **versioniert** (im Repo). `SECURITY-TODO.md` und `PLUGIN-CONCEPT.md` bleiben dagegen privat (`.gitignore`) — die Verweise darauf in dieser Datei laufen nur lokal. Keine Secrets/Tokens hier eintragen.
> Sprache: Deutsch (User schreibt Deutsch). Code/Commits/Docs der Landing-Seite: Englisch.

---

## 0. Der Faden in 10 Zeilen (zuerst lesen)

- **Alles Geplante vom 2026-10-08 ist gebaut, getestet, gepusht und auf npm veröffentlicht** — bis auf den Patch **admin 0.3.89** (Dialog-Zentrierung, wartet auf Freigabe) (core 0.3.21, admin 0.3.88, integration 0.3.22, mcp 0.1.5, client 0.1.4, cli 0.3.15). Der Demo-Server läuft nicht mehr.
- **Als Nächstes (in dieser Reihenfolge):** (1) User-Klick-Durchgang → Funde nachliefern, (2) CVE-IDs der 6 Advisories prüfen (am 2026-10-14 angefragt, GitHub-Review bis 3 Werktage → ab Mo 2026-10-19 schauen) und Adrian Bescheid geben (Antwortentwurf liegt in mailctl-Drafts, Stand 14.10. ggf. schon gesendet), (3) CSP von Report-Only auf *enforcing* (erst Inline-Handler umbauen), (4) Obsidian-Plugin v1 + Web-Clipper über einen REST-Ingest-Endpunkt, (5) die fünf offenen Entscheidungen zum Plugin-System (`PLUGIN-CONCEPT.md`).
- **Bekannte offene UI-Kleinigkeit:** Auf der Schema-Seite wirken „Export schema", „+ Add field", „Rename field" und das Feld „Apply template…" im **dunklen** Modus weiß/hart (im hellen unauffällig). User wurde gefragt, ob angleichen — Antwort steht aus.
- **Offene Idee:** Titel der Editor-Karte („Details") pro Collection konfigurierbar machen (z. B. „Veranstaltungsdaten").
- Browser-Tests kann ich selbst (headless Chrome + Screenshots, siehe Verlauf 14); der User will trotzdem selbst klicken.
- Am Sessionende: diese Datei aktualisieren, committen, pushen; danach `claude_push` (siehe Abschnitt 7) — wenn der User es verlangt.

---

## 1. Aktueller Stand (Stand: 2026-10-14)

- Repo: `~/Sites/orbiter` (github.com/aeon022/orbiter), Branch `main`, **alles gepusht und veröffentlicht**, HEAD siehe `git log -1`.
- **Nichts ist uncommittet** außer den bekannten untracked Marketing-Dateien (`content/docs/`, `content/posts/*hackernews-human.md`, `content/posts/postctl_ready/`, `.claude/`) — gehören nicht zu den Orbiter-Fixes, nicht anfassen.
- Landing-Seite deployt automatisch bei Push auf `main` (GitHub Actions → `deploy/landing`). Der Changelog dort nennt die jetzt veröffentlichten Versionen.

### npm-Stand

**Veröffentlicht (Release 3, 2026-10-08):** core 0.3.21, admin 0.3.88, integration 0.3.22, mcp 0.1.5, client 0.1.4, cli 0.3.15. **Im Repo unveröffentlicht: admin 0.3.89** (Dialog-Zentrierung, siehe Verlauf 18; dazu die Admin-Fixes aus Verlauf 20). (Reihenfolge war: core zuerst, Sichtbarkeit abgewartet, dann der Rest.) Die Landing-Seite nennt diese Versionen im Changelog.

→ **Beim nächsten Release** wieder Runbook (Abschnitt 6) und die Versionen erst bumpen.

### Sicherheits-Advisories (GitHub, alle veröffentlicht, CVE erst am 2026-10-14 angefragt (vorher nie, "Request CVE"-Button war offen); GitHub-Review bis 3 Werktage — Stand 2026-10-14 alle sechs ohne ID)

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
11. **Roadmap erweitert** (Agent Proposals, Semantic Search, Verifiable Content, Claims, Freshness, POSSE, Privacy-Tools, Open POD Spec) und **Editor-Layout umgebaut**: Custom Fields wandern aus der Sidebar in eine **einklappbare „Details“-Karte** (Titel „Details“ statt „Fields“ — User-Wunsch nach anderem Namen; Alternativen waren Fieldsets/Properties) im Hauptbereich (zwischen Titel und Body, 2 Spalten, Zustand pro Collection in localStorage `orb_fields_collapsed_<collection>`); Collections ohne `body` blenden Block-Toolbar aus. Zusätzlich gefunden/gefixt: Validierungs-Banner beim Veröffentlichen wurde nie angezeigt (Selektor `.meta-panel-inner` existiert nicht). Logik per jsdom getestet, **optisch noch nicht gesehen** (steht in der Klick-Checkliste).
12. **Station-Mode-Bug:** Dock-Popups (`.xfce-tools-popup`, auch Collection-Drawer) hatten kein `max-height`/`overflow` → lange Listen liefen aus dem Bildschirm und scrollten nicht. Gefixt (CSS + `fitLeftPopup()` in `xfce.js`). (Die Test-Collections „Shelf 1–16“/„Library“ in der Demo-Pod wurden danach wieder entfernt.)
13. **Schema-Seite im Station-Mode:** Dokument war `overflow:hidden` (Seite definiert `html,body,.app {height:100%; overflow:hidden}`, im Station-Mode gibt es aber keine App-Shell mit eigenem Scrollbereich) → alles unter dem Dock unerreichbar. Gefixt in `schema.html` (Dokument scrollt, Collections-Liste sticky mit eigenem Scroll). Gefunden anhand eines Screenshots des Users; danach per headless Chrome verifiziert (Dokument scrollt, Save/Delete erreichbar).
14. **Echter Browser für Tests:** `puppeteer-core` + lokales Chrome (`/Applications/Google Chrome.app`) funktioniert headless; Skripte lagen im Scratchpad (`pp/shot.cjs` Screenshot+Scroll-Messung, `pp/sweep.cjs` Scroll-Check aller Seiten im Station-Mode, `pp/probe.cjs` Popups). Damit können optische Checks selbst gemacht werden (Screenshot per Read ansehen). Station-Mode wird per `localStorage.orb_style='xfce'` erzwungen, Login per `fetch('/api/auth/login')` im Seitenkontext. Demo-Pod: `scratchpad/demo/seed.mjs` (Posts mit Body+Gruppen, Events ohne Body, Notes, Authors), Server `ORBITER_POD=… PORT=4399`. Dock-Drawer entstehen aus Meta `nav.groups` (JSON `{Gruppe:[ids]}`), nicht aus `parent`. **Ergebnisse des Browser-Checks:** alle 19 Admin-Seiten scrollen im Station-Mode (Graph bewusst Vollbild-Canvas); Editor-Innenscroll ok; Dock-Popups (16 Einträge, niedriges Fenster) bleiben im Fenster und scrollen; die „Details“-Karte sieht bei Posts und Events gut aus.
15. **Release 3 veröffentlicht** (alle sechs Pakete, siehe npm-Stand) und `claude_push` ausgeführt (committet/pusht `~/.claude` — `projects/`, `history.jsonl`, `settings.json` — nach github.com/aeon022/claude-sync, privat; die Shell-Funktion steht in `~/.config/zsh/converters.zsh`, Gegenstück `claude_pull`). Der Demo-Server (Port 4399) wurde beendet, Shelves/Library-Testdaten aus der Demo entfernt.
16. **Release 3 bestätigt:** nach der Registry-Verzögerung (Minuten) zeigte `npm view` alle sechs Pakete mit den neuen Versionen; CVE-IDs aller sechs Advisories noch `pending`.
17. **Landing-Review mit echtem Browser (Vision zuerst):** Funde und Fixes — (a) Roadmap-Links (`.rm-desc a`) waren Standard-Blau auf dunkel → Akzentfarbe; (b) 46 Roadmap-Einträge = ~7.000 px: neue Filterleiste (Coming up / Shipped / All, Standard „Coming up"), Fortschrittsbalken, Deep-Links (`#shipped`, `#all`, `#<item-id>`), `#`-Anker pro Titel, alles als Progressive Enhancement (ohne JS alles sichtbar); (c) Reihenfolge war falsch (neue „Next"-Einträge hinter den „Future"-Einträgen) → sortiert shipped → next → future; (d) Überschrift „30 features shipped" war veraltet → 59 (30 gebündelte + 29 weitere Einträge, zählt das Skript beim Build); (e) mobil weitete sich die Seite (decorative Planet-/Orbit-Layer, Manifesto-Grid mit breitem `<pre>`) → `html{overflow-x:clip}` + `minmax(0,1fr)`; (f) doppelt escaptes `&amp;` im Feature-Titel „Mac & Windows", schwarzes Quadrat-Icon + winziges CLI-Icon ersetzt; (g) Nav-Pill zu transparent (0.7 → 0.88). **Neu/fancy:** „On the horizon"-Karten (3 animierte CSS-Mini-Visuals: Diff-Accept, Such-Ring, Hash-Kette; `prefers-reduced-motion` respektiert; Pointer-Glow), „◈ Machine view" (Dialog mit der Roadmap als JSON — die Dual-Render-Idee live, mit Copy). **Wichtige Falle:** per JS erzeugte Elemente tragen nicht Astros Scope-Attribut → deren Styles mit `:global()` schreiben.
18. **Dialog-Bug im Admin gefunden:** Der Reset `* { margin:0 }` entfernt bei modalen `<dialog>` die Auto-Margins → sie säßen oben links. Fix: `dialog { margin:auto }` in `style.css` (betrifft Key-Dialog, Diff-Dialog, Fokuspunkt-Dialog; per Browser-Test zentriert). **admin 0.3.89 im Repo, noch NICHT veröffentlicht.**
19. **Landing: Suche, Feed, Tour, Abstimmen:** (a) `public/search.js` — Command-Palette (`/` oder ⌘K), selbstständig (injiziert eigene Styles), lädt `/search-index.json`; (b) `apps/landing/scripts/postbuild.mjs` (npm-`postbuild`-Hook) erzeugt aus `dist/` den Suchindex (Docs, Roadmap-Einträge, Changelog, Home-Abschnitte) und die Feeds `changelog.xml` (Atom) + `changelog.json` (JSON Feed); Changelog-Karten haben jetzt `id` + `data-date`; (c) **Interaktive Tour** (`src/components/Tour.astro`, Daten `src/data/tour.json`, Bilder `public/tour/`): 8 echte Station-Mode-Screenshots einer Demo-Pod („Studio Nordlicht“) mit Hotspots (Tooltips, Tastatur ←/→, Autoplay pausiert bei Hover/Fokus); Generator liegt unter `apps/landing/scripts/tour/` (README dort); (d) Roadmap: „Weigh in on GitHub ↗“ pro offenem Eintrag (vorbefülltes Issue, Label `roadmap`) + „Suggest an idea“ — es wurden **keine Issues angelegt**. **Ehrlicher Stand:** Abstimmen = Kommentar/Issue bei GitHub, kein eigenes Backend.
20. **Admin-Funde durch die Tour-Screenshots (alle in admin 0.3.89, unveröffentlicht):** Account-Seite lud `xfce.js` doppelt → zwei überlagerte Docks (explizites Script entfernt, `sidebar.js` lädt es); Account-Layout nicht zentriert; Sessions zeigten rohe User-Agent-Strings → „Chrome on macOS“; Settings: API-Keys-/Webhook-Zeilen waren in der 220-px-Spalte gequetscht (Revoke abgeschnitten) → `setting-row-wide`; Status `in_review` zeigte den Unterstrich → „in review“; native Controls (Checkboxen, Datepicker) blieben hell auf dunkel → `color-scheme`; Details-Karte: `richtext`-Felder jetzt als Textarea statt Einzeiler; Dashboard: „Collections“-Karte ausblenden versteckte auch Content-Quality + Security-Check (und ließ einen leeren Rahmen) → nur die Karte wird ausgeblendet.
21. **GitHub-Check (nach Adrians Annahme):** Adrians Credit bei allen drei Advisories `accepted`; alle sechs Advisories veröffentlicht, CVE-IDs noch `pending` (GitHub braucht oft 1–3 Tage), Adrians drei haben **keinen CVSS-Vektor** (nur Schweregrad high/medium) → ggf. nachtragen. Private Vulnerability Reporting = an, Secret Scanning + Push-Protection = an. **Fund:** Workflow „Security Audit“ schlug bei jedem Push fehl, 9 offene Dependabot-Alerts (u. a. proxy-addr **critical**, basic-ftp, MCP-SDK, sharp, source-map-js). Behoben (Commit 6e97a69e): gezielte Updates (proxy-addr 2.0.8, MCP-SDK 1.32.1, source-map-js 1.2.2, http-cache-semantics 4.3.0), **basic-ftp ^6.2.2** in admin+desktop (API-Oberfläche geprüft, **keine echte FTP-Übertragung getestet**), sharp 0.35.5 überall inkl. `overrides` für miniflare (dev-only, pinnt exakt 0.35.4). Rest: `sprintf-js` (moderate, kein Upstream-Fix, dev/optional via electron-builder). Audit-Workflow danach grün. Offene Dependabot-PRs #6/#7/#8 sind damit überholt (schließen sich selbst bzw. manuell schließen). Lock-Datei-Diff ist groß, weil npm das Layout neu schreibt — Versionen geändert wurden nur die genannten. **admin 0.3.89 enthält jetzt auch basic-ftp 6 → vor dem Publish den FTP-Deploy einmal real testen.**
22. **Plugin-Ideen** gesammelt (Abschnitt 11 in `PLUGIN-CONCEPT.md`) und die **Docs-Seite „Webhook recipes"** gebaut (`/docs/webhook-recipes`): Empfänger-Skript mit Signaturprüfung + Handler für Slack/Telegram, IndexNow, Cloudflare, Mastodon. Das Empfänger-Skript wurde gegen echte signierte Zustellungen getestet (Ping ignoriert, Publish erkannt, Fälschung ergibt 401).
23. **Browser-Smoke-Tests + CI** (`tests/e2e/{harness,admin,landing}.mjs`, `.github/workflows/smoke-tests.yml`; Jobs unit/admin-browser/landing-browser, grün auf `1a3e94c3`). Fand echten Bug: Pods-Seite ohne Dock/Suche (behoben, `router.js` schließt `/pods.html` aus). Außerdem: sprachabhängige On/Off- und Wochentag-Labels im Editor; vier neue Roadmap-Items (Public Sandbox Demo, Snapshots, `npm create orbiter`, Browser Regression Suite).
24. **A11y-/Performance-Runde** (axe-core + Lighthouse): axe meldet auf Landing (Home, Vision, Docs) und Admin (alle Seiten, Station-Mode, dunkel + hell) keine critical/serious-Verstöße mehr. Umgesetzt: Feldbeschriftungen (Editor-`aria-label`, generische Benennung in `sidebar.js`), Landmarks (`main`, `banner`, Dock als `navigation`, eindeutige Nav-Labels), sr-only `h1` im Admin, Tabellenköpfe, Kontrast (Admin-Paletten `--muted`/`--accent`, Primary-Button per `color-mix`, Landing-Footer/Cookie/Vision-Chips), unterstrichene Links im Fließtext, fokussierbare scrollbare Bereiche. **Echter Fund:** `<body>`-Opacity-Animation (`page-fade-in`) verhinderte, dass Chrome FCP/LCP für die Startseite meldet (Lighthouse `NO_FCP`) → Animation entfernt. Lighthouse (mobil, lokal): Home 98/100/100/100, Vision 100 überall, Docs Performance 100. Offen: Bilder der Startseite ausliefern (~297 KiB sparbar), render-blockierendes `search.js` auf Docs, Startseite ~43.000 px hoch. Neu: axe-Checks in beiden Smoke-Tests (CI installiert `axe-core` neben `puppeteer-core`). Nicht geprüft: andere Admin-Themes (Zen/Catppuccin/Amber) und Classic-Style per axe.
25. **Website-Ideenrunde** (Live-Demo bewusst ausgelassen): Landing→Vision-Blitz repariert (der Blitz lag im `<body>`, das gleichzeitig ausgeblendet wurde; jetzt kein Body-Fade, heller Blitz + Ankunftsblitz auf Vision via `sessionStorage.orb_warp`). Docs: Copy-Button und npm/pnpm/yarn/bun-Umschalter an Codeblöcken (`public/docs-code.js`, Wahl in `localStorage.orb_pm`), „Last updated" aus Git-Log + „Edit this page on GitHub" (Deploy-Workflow checkt jetzt mit `fetch-depth: 0` aus), neue Seite `/docs/disclosure` (Responsible Disclosure, Danke an Adrian Wilczek, alle sechs Advisories) + `/.well-known/security.txt` (Expires 2027-10-01, danach erneuern!). Startseite: ältere Releases (ab der 6. Karte) und Vergleichstabelle starten eingeklappt, Deep-Links/Suche klappen sie auf; Screenshots mit 800-px-`srcset`. Suche: Filter-Chips All/Docs/Roadmap/Changelog (↑↓/Enter gab es schon). `prefers-reduced-motion` schaltet Animationen auf Landing, Docs und Vision ab. Neuer Smoke-Test-Check dafür; axe läuft jetzt auch auf `/docs/disclosure/` und `/docs/cli/`.
26. **Startseite aufgeräumt** (Mini-Roadmap, alles erledigt): R1 Changelog auf eigene Seite `/changelog/` (Karten in `src/data/updates.html`, Home zeigt die 3 neuesten gekürzt, Feeds/Suche/`postbuild.mjs` ziehen von dort) · R2 Doppelungen raus (Abschnitt „From install to published content" gestrichen) · R3 „More screens" + „Write. Insert. Arrange." in ein eingeklapptes `<details id="more-details">` unter der Tour · R4 Features: 8 sichtbar, Rest hinter „Show all N features" · R5 neue Reihenfolge: Hero → Metrics → Press → Hosting → How it works → Tour → Features → Ownership → Tradeoffs → Station → AI-Setup → Vergleich → Preise → FAQ → Changelog-Streifen → CTA → Showcase → Vision · R6 Station-Mode ohne Nebenbilder, AI-Setup ohne die drei Karten · R7 Nav auf 7 Punkte (Station/AI-Setup raus; Abschnitte bleiben per Suche/Link erreichbar). Höhe Desktop 23.000 → ~15.000 px, mobil 34.000 → ~20.000 px. Deep-Links in eingeklappte Teile öffnen sie (`reveal()` in `index.astro`). Offen: Press+Hosting noch zwei Streifen, Station-Mode-Abschnitt noch ~1.300 px, Preise/FAQ bewusst offen gelassen. Nicht geprüft: echter Browser-Klickdurchgang der neuen Struktur.
27. **FTP-Deploy lud eine `.pod` hoch (Vorfall, 2026-10-13):** Ein Gemini-Agent hat `ftp.local_path` auf einen Ordner mit der `.pod` gesetzt → `runFtpDeploy` lud sie per `uploadFromDir` ungefiltert auf den Server (Pod enthält Passwort-Hashes, API-Keys, FTP-Passwort). **Fix (admin, unveröffentlicht, ungetestet gegen echten FTP):** `findPodFiles()` in `packages/admin/src/routes/deploy.js` scannt den Upload-Ordner rekursiv nach `*.pod`/`-wal`/`-shm`/`-journal` und bricht mit Fehlermeldung ab. Offen: (a) auf dem betroffenen Server die Pod löschen und **alle Secrets rotieren** (Admin-Passwort, API-Keys, FTP-Passwort), (b) `github.js`-Deploy auf dasselbe Risiko prüfen, (c) Test in `deploy.test.js` ergänzen, (d) admin-Patch bumpen/veröffentlichen.
28. **CVE-Nachfrage von Adrian (2026-10-14):** Adrian fragte, ob die CVE-IDs vergeben sind. Prüfung: bei allen sechs `cve_id` null. Ursache: die CVEs waren **nie angefragt** worden (Button „Request CVE" auf der Advisory-Seite war noch offen; die API zeigt den Anfragestatus nicht, nur die vergebene ID). Der User hat sie am 14.10. bei allen sechs angefordert (Timeline: „requested a CVE now"), GitHub prüft bis 3 Werktage. Antwort an Adrian als Entwurf in mailctl (ehrlich: Versäumnis, heute angefragt); der erste, überholte Entwurf mit gleichem Betreff muss manuell gelöscht werden. Nichts am Code geändert.

29. **Admin-Abhängigkeiten (2026-11-05, Branch `fix/admin-deps`, Commit 1b94006b, gepusht):** `fast-xml-parser` fehlte als Dependency von admin (import in `wp-importer.js`; audiocd-astro brauchte Workaround) → `^5.5.9`. Sicherheitsupdates: `@hono/node-server` ^1.14.4 → ^2.1.6 (GHSA-rmxm-3fg6-px4f betrifft alle < 2.1.3; `serve()`/`serveStatic()` unverändert), `archiver` ^7 → ^8 (kein Default-Export mehr: `import { ZipArchive } from 'archiver'`, `new ZipArchive({ zlib: { level: 6 } })` in `publish/generator.js`), `basic-ftp` ^6.2.2 → ^6.2.6; in `apps/desktop` hono/basic-ftp mitgezogen. Version admin bleibt 0.3.89 (schon im Repo, npm hat 0.3.88). Tests 30/30; ZIP-Export (`unzip -t` ok), `parseWXR`, FTP-Deploy gegen lokalen ftp-srv inkl. `.pod`-Sperre, Admin lokal gestartet (health/login 200, API ohne Login 401). Rest-Audit: archiver 8 → readdir-glob 3.0.0 → minimatch < 11.0.1 (GHSA-g3hv-75wg-m249, moderate, kein Fix; admin nutzt nur `append()`). Nicht geprüft: Desktop/Electron-Start, FTP mit TLS gegen echten Server. **Stand 2026-11-06:** Merge nach main und Publish 0.3.89 macht Gerwin – auf origin/main und npm noch nicht sichtbar (latest 0.3.88). Danach in audiocd-astro auf ^0.3.89 heben und Workaround-devDependency entfernen.
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

0. **admin 0.3.89 veröffentlichen** (Gerwin): `fix/admin-deps` nach main mergen, Runbook Abschnitt 6, npm-Token-Ablauf 2026-11-05 beachten (ggf. neuen Token anlegen). Danach Changelog-Karte für 0.3.89 auf der Landing.
1. **Klick-Durchgang im Browser (User)** — Checkliste in `SECURITY-TODO.md` („KLICK-CHECKLISTE"), Station-Mode **und** Classic, dunkel + hell. Bereits mit headless Chrome geprüft: Schema-Seite, Editor-Details-Karte (Posts/Events), Dock-Popups, Scrollen aller Seiten im Station-Mode. **Noch ungesehen:** Account (2FA/Sessions), Key-Dialog, Webhooks-UI, Review-Workflow-UI, Diff-Dialog, Media-Fokuspunkt/Filter, Terminal-Theme überall, Desktop-App. Funde werden als Fixes nachgeliefert (Release ist schon draußen → nächster Patch-Release).
2. **Advisories:** CVE-IDs am 2026-10-14 bei allen sechs angefragt, noch keine ID → ab 2026-10-19 prüfen (`gh api repos/aeon022/orbiter/security-advisories/<GHSA> --jq .cve_id`); sobald Adrians drei vergeben sind, ihm kurz schreiben. Adrians drei haben noch keinen CVSS-Vektor (nur Schweregrad) → ggf. nachtragen. Offen auch: Schema-Seite im dunklen Modus (weiße Buttons) angleichen? (Frage an User offen.)
3. **CSP enforcing:** nach dem Klick-Durchgang die gesammelten Reports ansehen, ~93 Inline-Handler (editor.html 77, forms.html 10, graph.html 3, analytics/entries/schema je 1) in `addEventListener`/Delegation umbauen (Handler rufen globale Funktionen und enthalten teils JS-Ausdrücke → nicht mechanisch), dann Header auf `Content-Security-Policy` (enforcing) umstellen. Erst wenn Reports leer sind.
4. **Obsidian-Plugin v1 + Web-Clipper:** REST-Ingest-Endpunkt (Draft-Write-Key, Upsert per Slug über Frontmatter), Plugin (Push als Entwurf), README mit Sicherheitshinweis (Key liegt im Vault/`data.json` und wird ggf. mitgesynct → Draft-Only + Collection-Limit + Ablauf empfehlen). v2: Pull + Konflikterkennung. Bilder in v1 nur Links (Medien-Upload braucht heute Admin-Session).
5. **Plugin-Ideen-Reihenfolge** (aus `PLUGIN-CONCEPT.md` §11): D Webhook-Rezepte (erledigt) → C Clipper/Obsidian über denselben Ingest-Endpunkt → A JSON-LD-Builder als erstes Feld-Plugin → B Transforms erst nach Entscheidung.
5b. **Plugin-System** laut `PLUGIN-CONCEPT.md` — **fünf Entscheidungen des Users stehen aus** (Phase 1 zuerst? Server-Transforms überhaupt? Wer schreibt Plugins? Desktop? Strikte CSP vorab? — Letzteres läuft jetzt als Punkt 3).
6. Später/groß: Live-Collaboration, SvelteKit-Integration, Orbiter Cloud.
7. Kleinkram/Ideen: Webhook-Retries persistent machen (Queue statt Timer), Rate-Limit pro Key über mehrere Prozesse, „Passwort-Stärke"-Check in `orbiter doctor`, QR-Code für 2FA-Setup (aktuell nur Setup-Key zum Eintippen), `ping-worker` ist noch nicht gehostet (Cloudflare-Rate-Limit-Regel wäre der eigentliche Schutz).
8. **To-do aus der Ideenrunde:** Release-Automation per GitHub Action (npm-Provenance, Git-Tags/GitHub-Releases — Tags fehlen seit v0.3.74; npm-Token läuft 2026-11-05 ab), `security.txt` + Danke-Seite für Reporter, Dependabot-Gruppierung, CVSS-Vektoren für Adrians drei Advisories (erst mit ihm abstimmen), Übergabe-Fallstudie (Studio Nordlicht), echter FTP-Transfertest für basic-ftp 6 vor Veröffentlichung von admin 0.3.89, veraltete Dependabot-PRs #6/#7/#8 schließen (braucht OK), Changelog-Karte für admin 0.3.89, Startseiten-Bilder/Render-Blocking (Eintrag 24), axe auch für andere Admin-Themes.
9. **Website, bewusst noch nicht:** Live-Demo (Sandbox), Übergabe-Fallstudie (Studio Nordlicht, braucht Inhalt), Showcase mit echten Kundenseiten (braucht Zustimmung), DE/EN-Landing, Hell-/Dunkel-Umschalter (Landing ist bewusst dunkel), „gilt ab Version"-Stempel pro Docs-Seite (braucht Daten pro Seite), Roadmap-RSS (Items haben keine Daten), Changelog-Vergleich zur Vorversion (Git-Tags fehlen seit v0.3.74 → mit Release-Automation lösen), `security.txt` vor 2027-10-01 erneuern.

---

## 6. Release-Runbook (so haben wir es dreimal gemacht, hat funktioniert)

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
- **Browser-Check (headless Chrome):** `npm i puppeteer-core` in einem Scratch-Ordner, `executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`, `headless: 'new'`; Station-Mode per `evaluateOnNewDocument(() => localStorage.setItem('orb_style','xfce'))`, Login per `fetch('/api/auth/login')` im Seitenkontext, Screenshot speichern und mit Read ansehen. Scroll prüfen: `document.scrollingElement.scrollHeight` vs. `innerHeight` und `window.scrollTo`.
- **Session abschließen:** `claude_push` (Shell-Funktion in `~/.config/zsh/converters.zsh`) committet/pusht `~/.claude` (`projects/`, `history.jsonl`, `settings.json`) nach github.com/aeon022/claude-sync (privat); Gegenstück `claude_pull` bzw. `dev_start` vor dem Arbeiten. Läuft ~2 Minuten (LFS-Upload), deshalb im Hintergrund laufen lassen.
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
- **npm-Registry-Verzögerung:** direkt nach `npm publish` zeigt `npm view` noch die alte Version (Minuten). Erst core abwarten, dann den Rest; am Ende alle Pakete gegenprüfen (Hintergrund-Schleife mit `until … sleep 30`).
- **CSP Report-Only meldet Inline-Handler erst beim Auslösen** (Klick) — ein stummer Seitenaufruf erzeugt keine Reports.
- `rm -f pfad*` mit Glob bricht in zsh eine `&&`-Kette ab, wenn nichts passt → Dateien einzeln nennen.
- Python-Heredocs: Anführungszeichen im Text (z. B. „Webhook recipes" mit ASCII-`"`) können den String beenden → mit `'''`/`<<'PYEOF'` und ohne ASCII-Quotes im Text arbeiten, Ergebnis immer prüfen (ein Mal wurde so eine Änderung nicht geschrieben).
- Hintergrund-Tasks melden sich per Benachrichtigung; „failed exit 144" nach `pkill` ist nur das Beenden des Servers.
- Editor-`editor.html` (≈3.400 Zeilen) hat Feldtypen inline, keine Registry — Voraussetzung für Plugins (Phase 0 im Konzept).
- Das Pod-File enthält **alles** (Hashes, Sessions, Secrets). Der `orbiter init`-Workflow committet es absichtlich ins Git → Docs warnen, `orbiter doctor` meldet es, Secrets lassen sich mit `ORBITER_SECRET` verschlüsseln.

---

## 9. Arbeitsweise-Vorlieben des Users (aus dieser Session)

- Will **konkrete Umsetzung**, kurze klare Rückmeldungen; bei Mehrdeutigkeit lieber sinnvoll entscheiden und es sagen als mehrfach nachfragen.
- Veröffentlichen (npm, Advisories, Push) macht er bewusst — vorher kurz fragen, dann durchführen. „passt"/„ja"/„mach das" = Freigabe für den zuletzt vorgeschlagenen Schritt.
- Bevorzugt eine **sinnvolle Reihenfolge** („mach eine Reihenfolge, die arbeiten wir ab") und dass wir Dinge **abarbeiten**, ohne dass er jeden Schritt anstößt.
- Klick-Tests im Browser macht **er** gern selbst; ich kann zusätzlich mit headless Chrome Screenshots/Messungen machen (siehe Verlauf 14) und muss offen sagen, was ich nur so und was ich gar nicht gesehen habe.
- Nutzt Station Mode (xfce/glass) — dort testen (Memory `user_station_mode`).
- Wichtig: ehrlich berichten, was **nicht** getestet wurde.

---

## 10. Begleitdateien

- `SECURITY-TODO.md` (gitignored) — Audit-Funde, Arbeitsreihenfolge, **Klick-Checkliste**, Release-Stand.
- `PLUGIN-CONCEPT.md` (gitignored) — Sicherheitskonzept fürs Plugin-System (nichts gebaut).
- `stage.md` — diese Datei (im Git).
- Memory-Index: `~/.claude/projects/-Users-gweiher-Sites-orbiter/memory/MEMORY.md` (u. a. Roadmap, Landing-Deploy, npm-Token-Ablauf, Advisory-Credit).

### 2026-11-14 — Themes + Mobile (unveröffentlicht, uncommittet)
- **Space** = missionctl-Palette (`#0a0a0f`/`#111118`, Grün `#00d97e`-nah, Indigo, Violett, Amber; hell = weiß/`#f5f5f7`). Catppuccin (echte Mocha/Latte-Rollen), Terminal (gedimmtes Amber), neu **Paper** (Whiteboard/Schwarz-Weiß). Palettenblock in `style.css` ist generiert (Muster dunkel → @media hell → explizit).
- Glass/Station: Blobs und `saturate()` stark reduziert, Karten opaker (weniger Glühen).
- **Station ist Default** (`theme.js`, `sidebar.js`, `settings.html`).
- Mobile-Fixes: Dashboard im Station-Mode war auf ~65 px gequetscht (Grid-Area `ws` fehlte); Editor: schwebender „Save · Publish"-Button, Toolbar scrollt.
- Offen: Users-Tabelle (Aktionen nur per Scroll), Calendar/Analytics-Kleinigkeiten ≤ 640 px, Glass/Classic-Sweep noch nicht ausgewertet, Tablet nicht geprüft.
- **Schrift-Regression gefunden/gefixt:** Beim Neugenerieren der Paletten waren `--sans/--mono/--serif/--display/--radius` verloren gegangen (Body fiel auf „Times"). Jetzt Tokens `--f-*` in `style.css`; Terminal = komplett Mono (JetBrains Mono), Catppuccin = JetBrains Mono, Zen = dezente Serif für Titel. Neue Einstellung **Font** (Theme-Standard / Sans / Mono, `localStorage.orb_font`, `html[data-font]`).
- Test-Server: Pod-Kopie im Scratchpad, Login `admin` / `testpass123`; mit nvm-Node 22 starten (Homebrew-Node passt nicht zum SQLite-Modul).
- **Schrift:** Inter/Space Grotesk/DM Mono raus → IBM Plex Sans/Mono (UI), JetBrains Mono (Terminal/Catppuccin), Noto Serif JP (Zen). Fonts lädt `theme.js` einmal für alle Seiten; Seiten-Links nur noch Noto Serif JP.
- **Terminal hell:** neutrales Grau, Akzent graphit, Amber nur Highlight.
- **Responsive:** Sweep Handy + Tablet × Station/Glass/Classic ohne echten Seiten-Überlauf (Dashboard-Seitenspalte stapelt ≤ 900 px, Settings-Zeilen einspaltig, Filter-Tabs umbrechen). Offen: Classic/Collections misst 559 px Dokumentbreite, optisch ok (Tabelle scrollt in der Karte) — Ursache unklar. Querformat nur im Editor (Terminal) angesehen.
- **10 Themes** (`style.css`, generiert aus Datenliste): Space (wieder ruhiges Blau/Türkis), **missionctl** (exakte Seitenfarben: Grün/Indigo/Violett/Amber), Zen, Catppuccin, Terminal, Paper, Nord, Gruvbox, Dracula, Tokyo Night — je hell + dunkel. Picker in `settings.html` datengetrieben (`THEMES`-Array).
- **Eigene Farben:** Accent/Background/Text-Picker (`localStorage.orb_custom`, angewandt von `theme.js` → `window.orbApplyCustom`, Flächen per `color-mix` abgeleitet).
- **Classic/Glass auf dem Handy:** untere Tab-Leiste (`.mobile-tabbar` aus `sidebar.js`: Home/Calendar/Media/Settings/Menü → Drawer), kompakte Kopfzeile, 40-px-Touch-Ziele, 16-px-Eingabefelder (kein iOS-Zoom). Tablet 641–900 px: Drawer + größere Ränder.
- Raster-Check 10 Themes × hell/dunkel (Station, Entries-Seite): alle lesbar, Statusfarben/Buttons/Tabellen in jedem Theme ok; Gruvbox hell entsättigt. Testhinweis: Entries-URL braucht `?col=posts` (nicht `collection=`) — frühere Entries-Handy-Checks liefen deshalb auf dem leeren Zustand und sind zu wiederholen.

### 2026-11-14 — Security-Audit (Teil 1, nur Befunde, nichts gefixt) + CVE-Status
- **CVE-IDs:** alle 6 GHSAs `cve_id` leer (API-Stand 2026-11-14); Anfrage laut Notiz 14.10. (31 Tage). Adrians drei haben keinen CVSS-Vektor (vvp4/7jg7 haben einen). GitHub-Doku: Review „bis 72 h", GitHub kann Rückfragen stellen. Nächste Schritte: Advisory-Seiten im Browser prüfen (Button „Request CVE" noch offen = nie angefragt), Mail von GitHub prüfen, CVSS-Vektoren ergänzen, sonst GitHub Support.
- **Fund 1 (mittel, bestätigt per curl):** Editoren dürfen `ai.ollama_url`, `ai.provider`, `ai.model`, `site.url`, `format_version`, `preview_url.*` schreiben (nicht in `ADMIN_ONLY_KEYS`, `routes/meta.js`). Folgen: SSRF/Prompt-Abfluss über `ai.ollama_url`, `preview_url.*` mit `javascript:` landet in `href` des Editor-Preview-Links (Admin-Klick → XSS, im Browser nicht verifiziert).
- **Fund 2:** hono 4.13.12 (<4.13.16, 5 Advisories, u. a. RegExpRouter überspringt Wildcard-Middleware bei kodiertem Zeilenumbruch) — 11 Bypass-Probes gaben alle 401, trotzdem bumpen. nodemailer <10.1.4, zod <4.6.6 (mcp), fast-xml-parser, archiver→minimatch ebenfalls. astro/vite/undici/body-parser/qs nur in apps/demo+landing.
- Noch nicht auditiert: Medien-Upload, Import (WXR/CSV), Integration-API-Routen, Templates-Import, SQL-Aufbau in core, Desktop, MCP-Write, Scrypt-Parameter.
- **Gefixt (ungepusht, uncommittet):** Fund 1 → `routes/meta.js` (`ai.provider/model/ollama_url`, `site.url`, `format_version` admin-only schreibbar, lesbar bleiben provider/model/site.url/format_version; `preview_url.*` nur Admin + nur `http(s)://` oder `/…`), zusätzlich Schutz im Editor (`editor.html`, kein `javascript:` im Preview-Link, deckt alte Pods ab). hono 4.13.12 → 4.13.18 (`^4.13.16` in admin + desktop, Lockfile). Tests: 6/6 grün (`node --test`). CVE-To-do liegt in taskctl (fällig 2026-11-16).
- **Audit Teil 2 — neue Funde (nichts gefixt):**
  - **HOCH, live bestätigt:** Stored XSS Editor → Admin: `PUT /api/account/username` ohne Zeichenprüfung + `users.html` rendert `${u.username}` unescaped in `innerHTML` → Skript läuft, sobald ein Admin „Users" öffnet (kein Klick). Gleiche Klasse im Code (nicht live getestet): `dashboard.html` ~589 (`e.title`, `e.label`, `e.collection`, `e.slug` unescaped, obwohl `escHtml` in der Datei existiert), `calendar.html` ~255 (`ev.title` im Attribut + Text), evtl. `pods.html`, `analytics.html` (Labels). Fix: `escHtml` überall, Username auf `[A-Za-z0-9._-]` begrenzen, CSP scharf schalten.
  - **mittel:** kein globales Body-Limit — `POST /api/media` (`formData()`) lädt jede Größe in den Speicher, jeder eingeloggte Nutzer; Fix `bodyLimit`.
  - **niedrig:** `POST /api/users` und `PUT /api/users/:id` erzwingen keine Mindestlänge fürs Passwort (Konto-Wechsel schon: 8). scrypt mit Node-Defaults (N=16384), OWASP empfiehlt N≥2^17 — Hash-Format trägt keine Parameter, Migration beim Login nötig. GitHub-Actions nur per Tag gepinnt (`@v4`, `softprops/action-gh-release@v2`, `peaceiris/actions-gh-pages@v4`), nicht per SHA. `/api/search/recent` filtert `deleted_at` nicht (Papierkorb-Einträge in „Recently edited").
  - **geprüft, ok:** kein per Template-String interpoliertes SQL mit Nutzereingaben (Analytics-`days` geklemmt), Medien-Folder-Traversal (resolve-Check + `safeFolder`), MCP-Schreiben nur Drafts mit Größen-/Slug-Limit, Import admin-only, Content-API gibt ohne Token nie Drafts.
- **XSS-Fix + Upload-Limit (2026-11-14, ungepusht/uncommittet):** `window.orbEsc` in `theme.js`; escaped in `users`, `dashboard` (Upcoming), `calendar`, `collections`, `pods`, `snippets`, `settings` (Username/Collection-Label), `editor` (Mitwirkende, KI-Vorschläge, Treffer-Links), `entries` (Slug/Locale in Attributen). Server: Slugs ohne `< > " ' \` \\` und Steuerzeichen (`slugInvalid` in `routes/entries.js`), Usernamen `^[\p{L}\p{N}._@+-]{2,64}$` (`routes/users.js`, `routes/account.js`), Passwort ≥ 8 auch beim Anlegen, `bodyLimit` (5 MB, Upload/Import/Templates/Pods 100 MB, `ORBITER_MAX_UPLOAD_MB`). Test `src/validation.test.js`. **Bestehende Pods:** schon gespeicherte Usernamen/Slugs/Settings-Werte werden nicht bereinigt — UI escaped sie jetzt, aber auf Altlasten prüfen (`_users.username`, `_entries.slug`, `_meta` `preview_url.*`).
- **Deps:** hono 4.13.18, nodemailer ≥ 10.1.4, zod ≥ 4.6.6, fast-xml-parser ^5.12 (admin/integration). Rest von `npm audit` nur apps/demo+landing bzw. AWS-SDK-intern (low). Alle Tests grün (32).
- **Audit-Rest erledigt (2026-11-15):** `analytics.html` – `currentPath` (aus Beacon-Daten, Klick auf Zeile) und `l.lang` waren unescaped → `esc()`; `/api/search/recent` filtert `deleted_at`; Template-Import (`/api/templates/import`, admin-only) lehnt Slugs mit `<>"'`\`/Steuerzeichen ab; GitHub-Actions per Commit-SHA gepinnt (`# v4`-Kommentar, `.github/workflows/*`).
- **Noch offen im Audit:** Desktop-App, scrypt-Parameter (Hash `salt:hash` ohne Parameter, wird auch von Lander/PHP verifiziert → Migration muss beide Seiten umfassen, N=2^17 braucht `maxmem`), Build-Webhook-`fetch` ohne safeFetch (nur Admin-URL).
- **Lander** (`~/Sites/lander`, uncommittet): Orbiter-Oberfläche per 3-Wege-Merge nachgezogen (10 Themes, Fonts, Custom Colors, Responsive/Tab-Leiste, XSS-Fixes); Lander-Branding/-Blöcke erhalten. Siehe `~/Sites/lander/stage.md`.

## 2026-11-15 — Release 0.3.94, Lander-Verknüpfung
- admin 0.3.94 veröffentlicht (Settings in Sektionen, Zoom/no-cache, Dock-Hexagon, Sicherheitsfixes seit 0.3.92); `api.kuin.at` auf 0.3.94 (Backup vorher), audiocd-Dock auf 0.3.93.
- Landing: neue Seite `/lander`, Doku `/docs/lander` (Sidebar „Deployment"), Changelog-Karte „Lander, Security, 10 Themes, Settings". README verlinkt Lander. Lander-Repo (privat): README verlinkt Orbiter, GitHub-Beschreibung + Homepage gesetzt. Kein Wiki angelegt (Orbiter-Wiki ist aktiviert, aber leer/nicht initialisiert).
- Offen: kuin-at/a83-next/techblog Commits, CVE-IDs (taskctl 2026-11-16), scrypt-Parameter, CSP noch Report-Only.

## 2026-11-15 — Backup/Restore in Orbiter (unveröffentlicht)
- `packages/admin/src/routes/backup.js`: `GET /api/backup` (VACUUM INTO, ohne Sitzungen), `POST /api/backup/restore` (Validierung, Kopie `<pod>.before-restore-*`, letzte 3). Settings → Pod: Download/Restore, zeigt Dateigröße. `server.js` Mount + große Body-Grenze.
- Getestet (Test-Server 4399, Node 22): Download, Restore (Entries zurück), kaputte/fremde Dateien 422, Editor 403, ohne Login 401, UI-Durchlauf. Nicht getestet: großer Pod, Server mit ORBITER_SECRET, Lander-Pod → Orbiter.
- Offen: admin-Version bumpen (Version-Guard), veröffentlichen, Landing (Docs `/docs/backup`, Changelog-Karte) erst danach pushen.

## 2026-11-15 — Auto-Backup, Pod-Größe, Medien auslagern, scrypt (unveröffentlicht)
- core 0.3.22: `hashPassword` → `scrypt:16:8:2:salt:hash` (OWASP 64 MiB), Legacy `salt:hash` verifiziert weiter, `needsRehash`, absurde Parameter abgelehnt. admin 0.3.96: Upgrade beim Login, DUMMY_HASH mit aktuellen Kosten (kein Timing-Leck), admin dependsOn core ^0.3.22 (importiert `needsRehash`).
- admin: `routes/backup.js` → Auto-Backup (`startAutoBackup`, ORBITER_BACKUP_DAYS/KEEP/DIR), `GET /status`, `POST /run`, `POST /offload-media`, `POST /vacuum`; Settings-Pod-Karte (Status, Jetzt sichern, Medien auslagern), Dashboard-Hinweis (Größe > ORBITER_POD_WARN_MB, kein Backup).
- Getestet (Testserver 4399): Status, Auto-Backup nach 30 s, Run-now, Offload mit `local`-Backend (4 Dateien, alle weiter ausgeliefert, Pod 319→184 KB per VACUUM), Editor 403, Passwort-Upgrade legacy→neu per Login, falsches Passwort 401, UI. Nicht getestet: S3/GitHub-Offload (keine Zugangsdaten), großer Pod, Passenger/Plesk (Speicher für scrypt 64 MiB).
- Bewusst NICHT gemacht: CSP von Report-Only auf aktiv. Die Admin-Seiten nutzen überall Inline-Skripte/-Handler; Enforcement bräuchte Nonces/Hashes für alle (großer Umbau).
- Offen: Version-Guard ok (core+admin gebumpt), veröffentlichen (core zuerst, dann admin), Landing pushen, api.kuin.at aktualisieren (Backup vorher).

## 2026-11-15 (Nacht) — Dependabot, Desktop-Audit, CSP-Messung
- Dependabot (37 offen): `npm audit fix --package-lock-only` (Lockfile innerhalb Semver, 124 Pakete angehoben), `npm ci` + 35 Tests + Admin-Start grün; electron 42.11.10 → 42.11.18. Übrig: 8 moderate (archiver→readdir-glob→minimatch: Admin nutzt nur `archive.append`, kein glob → nicht ausnutzbar; electron-builder-Kette: nur Build-Werkzeug). Gepusht.
- Desktop-App-Audit (`apps/desktop/src/main.js`, 649 Zeilen): gut: `contextIsolation`, `nodeIntegration:false`, `sandbox`, minimaler Preload (nur `isDesktop`/`platform`), kein IPC, zufälliger Loopback-Port, `will-navigate`/`setWindowOpenHandler` nur http(s) an den Browser. Befund 1 (behoben im Code, nicht veröffentlicht): **jedes neue POD hatte admin/admin** → jetzt zufälliges Startpasswort, einmal im Dialog angezeigt. Docs/README erst nach Desktop-Release anpassen (aktuelle App ist noch admin/admin). Offen/Hinweis: kein `setPermissionRequestHandler` (Standard erlaubt alle Anfragen für localhost; wegen `clipboard`-Rechten nicht blind sperren, erst in der App testen); `http://localhost` statt `127.0.0.1` (lokaler Fremdprozess könnte auf `::1` lauschen; sehr niedrig); macOS-App ungesigniert (`afterSign: null`) → Auto-Update auf macOS braucht Signatur.
- CSP erzwingen (Messung): ~95 Inline-Handler (`onclick="…"`: editor.html 79, forms 10, graph 3, 3 weitere) plus ein paar in JS-generierten Strings; Nonce-Infrastruktur steht (`csp.js`). Machbar, aber der Editor braucht dafür Umbau auf `addEventListener`/Delegation mit vollem Test aller Editor-Aktionen → eigene Sitzung, nicht nebenbei.
- Lander 0.3.0 veröffentlicht (Release + ZIP), danach Update-Hinweis im Admin (read-only), Posteingang eingeblendet, `public_cache_seconds`.

## 2026-11-15 — Deutsche Admin-Oberfläche (admin 0.3.97), Lander 0.3.1/0.3.2 (signiertes Update)
- `packages/admin/public/i18n.js` + `i18n-de.js` (≈600 Einträge + Regex-Regeln), `theme.js` lädt sie bei `orb_lang=de`; Einstellungen → Admin-Sprache lädt neu. Per Puppeteer geprüft (Dashboard, Einstellungen, Einträge, Editor, Medien, Benutzer). Nicht übersetzt: dynamisch erzeugte Texte, die nicht im Dictionary stehen; Docs/Landing bleiben Englisch.
- Lander: signierter Ein-Klick-Updater (Ed25519, Schlüssel `~/.lander-signing/release.key`, siehe Lander/stage.md), echter Test 0.3.1 → 0.3.2 über GitHub erfolgreich. Landing: Changelog-Karten, /lander-Changelog, Docs „Update".
- Offen: CSP-Enforcement (≈95 Inline-Handler), Desktop-Release mit Zufallspasswort, Cve-IDs prüfen (Task 2026-11-22).

## 2026-11-16 — CSP erzwungen (admin 0.3.98)
- Alle 95 Inline-Handler → `data-on-<event>="fn(args)"`, ausgewertet von einem eval-freien Dispatcher in `theme.js` (Capture-Phase, Bubbling nachgebildet; `orbH.*` für Sonderfälle, `@` = JSON aus `data-args`). `csp.js` sendet jetzt `Content-Security-Policy` (Env `ORBITER_CSP=report` = zurück auf Report-Only). i18n-Skripte werden per `createElement` geladen (strict-dynamic blockt `document.write`).
- Geprüft (Puppeteer, 4399): alle Seiten EN+DE ohne Verletzung; alle Handler-Funktionen existieren; Klicks Vorschau/Bild-Picker/Overlay-Schließen/Titel-Wachstum funktionieren. Nicht einzeln durchgeklickt: jede übrige Editor-Aktion (Tabellen, Video, AI-Vorschläge).
- Lander hat keine CSP (statisches Apache-HTML, keine Nonces) und behält Inline-Handler.

## 2026-11-16 — Digi-ID Login (admin 0.3.99)
- `src/digiid.js` (Signatur-Prüfung: Bitcoin-Message-Format mit Präfix „DigiByte Signed Message:\n", Public-Key-Recovery mit `@noble/secp256k1`, Adresse = P2PKH Version 30; Challenges im Speicher, 5 min, einmalig, Host+Pfad+Scheme in der signierten URI), `src/routes/digiid.js` (public: challenge/callback/status; Konto: Liste, Verknüpfen und Entfernen nur mit Passwort), Tabelle `_digiid` (Pod, per `CREATE IF NOT EXISTS`). UI: Login-Seite (Knopf + QR), Konto-Seite (Karte), `public/qrcode.js` (qrcode-generator, MIT) + `public/digiid.js`.
- Verhalten: Digi-ID-Login = voller Login ohne TOTP-Zusatzcode (wie Passkey). Passwort bleibt Rückfall. Nur Legacy-Adressen „D…" (kein Segwit/Bech32 – Header 35+ werden abgewiesen).
- Getestet: Unit-Tests (`node --test src/digiid.test.js`: Roundtrip mit komprimiertem/unkomprimiertem Schlüssel, falsche Adresse/Nachricht/Host/Scheme), Ende-zu-Ende gegen den Testserver mit simulierter Wallet (Verknüpfen, Status, Login + Cookie, Replay, unbekannte Adresse 403, Entfernen), Login-Seite im Browser ohne CSP-Verstoß. **Nicht getestet: echte DigiByte-Wallet** (Format nach den Referenz-Implementierungen, nicht gegen eine echte Signatur geprüft).
- Lander: noch offen (braucht GMP-basierte secp256k1-Bibliothek).

## 2026-11-16 — Dependabot und CI repariert (admin 0.3.104)
- **Dependabot-Alert #293 (minimatch, DoS, < 11.0.1)**: `archiver` zog über `readdir-glob` minimatch 10.2.6; der Admin nutzte archiver nur für den ZIP-Export → direkt `zip-stream` (`publish/generator.js`, Einträge nacheinander über eine Promise-Kette), `archiver` entfernt. Build-Werkzeuge (`app-builder-lib`, `@electron/universal`) per `overrides` + devDependency `minimatch@11.0.1` (`$minimatch`). `npm audit`: 0 Schwachstellen. `npm ci` (workspace und komplett) in einer sauberen Kopie ok; electron-builder `--mac --dir` läuft durch, `makeUniversalApp`/`app-builder-lib` laden. Fallstrick: overrides greifen in npm 11 bei bestehender Lock nicht → Lock-Eintrag des geschachtelten Pakets löschen und `node_modules` neu installieren.
- **5 Dependabot-PRs (#7, #8, #10, #11, #15: source-map-js, proxy-addr, fast-uri, body-parser, qs)**: alle Zielversionen stehen schon im Lockfile auf main (npm audit fix vom 15.11.) → als überholt geschlossen.
- **Smoke-Tests waren seit 15.11. rot** (10/12): (1) Test erwartete noch Report-Only-CSP → jetzt: erzwungen, Nonce, kein `unsafe-inline`, plus neuer Test «keine Inline-Handler auf irgendeiner Admin-Seite»; (2) axe: `.btn-primary` weiß auf Akzent im Dunkelmodus nur 4,42:1 (Hover mit `opacity .88`) → Akzent 70 % + Schwarz, Hover dunkler statt blasser. Lokal 13/13.
- Achtung lokal: `npm install` baut better-sqlite3 für Electron (ABI 146); danach `npm rebuild better-sqlite3` mit Node 22.

## 2026-11-16 — Komplett-Audit (admin 0.3.105, Lander 0.5.6)
- **Fund (hoch, behoben): Auto-Backup war weltlesbar.** `runBackup` legte `backups/*.pod` mit Standardrechten 644 neben dem Pod ab; auf api.kuin.at liegt der Ordner im Web-Root, `https://api.kuin.at/backups/content-auto-2026-11-15_1725.pod` lieferte 90 MB (Passwort-Hashes, SMTP-Passwort) — vom 15.11. 18:25 bis 16.11. ~16:40 abrufbar. Sofort `chmod 700/600` auf dem Server (403). Code: `snapshot()` chmod 600, Ordner 700 (+ Test `backup.test.js`). Lander: Pod/Backups/Rollback 600 (data/.htaccess sperrt zusätzlich). Empfehlung an Nutzer: Passwörter der 2 kuin-Benutzer und SMTP-Passwort ändern.
- GitHub: Lander jetzt mit Dependabot-Alerts + Sicherheits-Updates, Secret Scanning + Push Protection, privates Schwachstellen-Melden, SECURITY.md. Orbiter: 0 Alerts, 0 PRs. Keine Secrets in der Git-Historie (4 Repos geprüft).
- Pina/kuin-at: `npm audit fix` (astro, @astrojs/node, devalue) → 0; Pina baut. kuin-at-Deploy mit neuer Lock **nicht** ausgeführt (deploy.sh macht kein `npm ci`).
- Offen: api.kuin.at liefert `package.json`, `app.js`, `*.bak*`, `package-lock.json` statisch aus (Info-Leck, niedrig; braucht nginx-Regel oder Docroot-Umzug); CVE-IDs; Desktop-Release; Lander ohne CSP.
