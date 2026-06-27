# LinkedIn — Deutsch

---

**Orbiter CMS 0.3.78 — das Team-Release**

Orbiter hat als Solo-Dev-CMS angefangen. Eine Datei, ein User, ein Projekt. Das bleibt der Kern — aber das neueste Release bringt die Features, die man braucht, wenn mehr als eine Person am Content arbeitet.

Was neu ist:

🔐 **Collection-Berechtigungen**
Editor-User können jetzt auf bestimmte Collections eingeschränkt werden. Ideal für Kundenprojekte: Kunden auf ihre `pages`-Collection beschränken, die `settings` oder `redirects` sehen sie nie. Per User in einem einfachen Checkbox-Modal konfigurierbar.

✅ **Content-Validierung**
Schema-Felder unterstützen jetzt `required`, `min`, `max` und `regex`. Drafts speichern immer frei. Publish/Schedule zeigt ein inline Fehler-Banner mit allen Verstößen. Der Server erzwingt dieselben Regeln als Safety Net.

📊 **Content-Quality-Dashboard**
Das Dashboard zeigt jetzt ein Quality-Panel in der Sidebar: wie viele veröffentlichte Einträge keinen Body haben, zu kurz sind, kein Bild haben oder SEO-Metadaten fehlen. Ein Blick statt manuellem Audit.

🔄 **Schema-Migration**
Feld umbenennen — inkl. aller Entry-Daten — in einer atomaren Transaktion. Kein manuelles JSON-Flicken mehr.

🗂️ **Multi-Pod-Dashboard**
Mehrere Pod-Dateien verlinken und ihre Stats (veröffentlichte Einträge, Dateigröße, zuletzt geändert) an einem Ort sehen. Nützlich für Agenturen mit mehreren Kundenprojekten.

🔒 **`orbiter encrypt`**
`orbiter encrypt --pod ./content.pod` verpackt die Datei in AES-256-GCM. Die `.pod.enc` ins Git committen, in CI mit Secret-Variable entschlüsseln. Der Klartext-Pod berührt das Repo nie.

📡 **`orbiter sync`**
Pod per rsync schieben: `orbiter sync --remote user@host:/pfad/content.pod`. SSH-Keys, kein weiteres Setup.

📟 **`orbiter status`**
Ein Befehl zeigt: Site-Name, Dateigröße, Entry-Zählungen nach Status, zuletzt geändert, User-Anzahl.

Außerdem: SvelteKit-Support via `@a83/orbiter-client`, eine `<OrbiterImage>` Astro-Komponente mit Auto-width/height/alt und Starter-Templates bei `orbiter init` (blog / portfolio / docs).

MIT, selbst gehostet, kein Cloud-Account nötig.

GitHub: https://github.com/aeon022/orbiter
Docs: https://orbiter.sh/docs/

#opensource #webdev #cms #astro #sqlite #sveltekit #indiehacker
