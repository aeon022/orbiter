# Threads — Deutsch (Campaign 3)

---

Orbiter CMS 0.3.78 ist draußen. Gestartet als Solo-Dev-CMS (die ganze Site in einer SQLite-Datei). Jetzt bereit für Teams.

Was neu ist:

🔐 **Collection-Berechtigungen** — Editor-User auf bestimmte Collections einschränken. Der Kunde editiert seine Pages. Nicht deine Settings.

✅ **Content-Validierung** — required, min, max, regex pro Schema-Feld. Drafts speichern immer frei. Publish ist gesperrt bis valid. Server erzwingt dieselben Regeln.

📊 **Quality-Dashboard** — veröffentlichte Einträge werden automatisch auf fehlenden Body, Bild, SEO-Metadaten gescannt. Ein Panel, kein manueller Audit.

🔄 **Schema-Migration** — Feld in Schema + allen Entry-Daten in einer atomaren Transaktion umbenennen.

🗂️ **Multi-Pod** — mehrere .pod-Dateien verlinken, Stats für alle Projekte an einem Ort sehen.

🔒 **`orbiter encrypt`** — AES-256-GCM. Verschlüsselten Pod ins Git committen. In CI entschlüsseln.

📡 **`orbiter sync`** — Pod per rsync mit einem Befehl schieben oder ziehen.

Außerdem: SvelteKit-Support, `<OrbiterImage>` Astro-Komponente, Starter-Templates bei init.

MIT, kein Cloud-Account.
github.com/aeon022/orbiter
