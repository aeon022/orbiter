# Threads — English (Campaign 3)

---

Orbiter CMS 0.3.78 just dropped. It started as a solo-dev CMS (your whole site in one SQLite file). Now it's ready for teams.

What's new:

🔐 **Collection permissions** — lock editor users to specific collections. Your client edits their pages. Not your settings.

✅ **Content validation** — required, min, max, regex per schema field. Drafts save freely. Publish is gated. Server enforces the same rules.

📊 **Quality dashboard** — published entries automatically scanned for missing body, image, SEO metadata. One panel, no manual audit.

🔄 **Schema migration** — rename a field across schema + all entry data in one atomic transaction.

🗂️ **Multi-pod** — link multiple .pod files, see stats for all your projects in one place.

🔒 **`orbiter encrypt`** — AES-256-GCM. Commit the encrypted pod to git. Decrypt in CI.

📡 **`orbiter sync`** — push or pull a pod via rsync in one command.

Plus: SvelteKit support, `<OrbiterImage>` Astro component, starter templates at init.

MIT, no cloud.
github.com/aeon022/orbiter
