# Twitter/X Thread — Deutsch (Campaign 3)

**Thread ohne Links posten. Links als Self-Reply nach dem letzten Tweet.**

---

## Tweet 1 (Hook — KEINE Links, KEINE Hashtags)

Dein CMS ist eine einzige SQLite-Datei.

Jetzt verschlüsselt. Mit Team-Berechtigungen. Automatisch quality-geprüft. Und mit einem Befehl auf jeden Server sync-bar.

Orbiter 0.3.78 ist draußen 🧵

## Tweet 2 (Validierung + Berechtigungen — anhängen: c3-08-editor-validation-banner.png + c3-09-users-permissions-modal.png)

Content-Gates die funktionieren:

→ Schema-Felder: required, min, max, regex
→ Drafts speichern immer — kein Friction
→ Publish/Schedule: Fehler-Banner, blockiert bis valide
→ Server erzwingt gleiche Regeln via 422

Plus: Editor-User können auf bestimmte Collections eingeschränkt werden.

Der Kunde editiert Pages. Nicht deine Settings.

## Tweet 3 (Quality Dashboard)

Neues Dashboard-Panel: Content Quality

Jeder veröffentlichte Eintrag wird automatisch gescannt:
→ Kein Body
→ Body unter 100 Zeichen
→ Kein Bild
→ Kein SEO-Title
→ Keine SEO-Description

Anzahlen pro Problemtyp — ein Blick beim Dashboard-Öffnen.

Ersetzt das "wo fehlt nochmal was"-Suchen.

## Tweet 4 (Encrypt + Sync)

Pod-Verschlüsselung:

```bash
orbiter encrypt --pod ./content.pod
# → content.pod.enc

orbiter decrypt --in ./content.pod.enc
# → content.pod
```

AES-256-GCM, scrypt Key-Derivation. `.enc` ins Git committen. In CI mit Secret-Variable entschlüsseln.

Und: `orbiter sync --remote user@host:/pfad/content.pod` für rsync Push/Pull.

## Tweet 5 (Schema-Migration + Multi-Pod)

Zwei weitere Zeitsparer:

→ `orbiter status` — Pod-Health im Terminal (Entry-Anzahlen, Größe, zuletzt geändert)
→ Schema rename-field — atomar, migriert alle Entry-Daten in einer Transaktion
→ Multi-Pod-Dashboard — mehrere Pods verlinken, Stats über alle Projekte auf einen Blick

## Tweet 6 (CTA — KEIN Link hier)

Außerdem:
→ SvelteKit-Support via @a83/orbiter-client
→ <OrbiterImage> Astro-Komponente (auto lazy, auto alt, auto Dimensionen)
→ Starter-Templates bei init: blog / portfolio / docs

MIT. Selbst gehostet. Kein Cloud-Account.

Star auf GitHub — Link in der Antwort ↓

## Antwort auf Tweet 6 (Links)

GitHub: github.com/aeon022/orbiter
Docs: orbiter.sh/docs

#opensource #webdev #cms #astro #sqlite #sveltekit
