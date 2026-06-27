# LinkedIn — English

---

**Orbiter CMS 0.3.78 — the team-ready release**

Orbiter started as a solo-dev CMS. A single file, a single user, one project. That's still the core — but the latest release adds the features you need when there's more than one person touching the content.

Here's what shipped:

🔐 **Collection Permissions**
Editor users can now be restricted to specific collections. Useful for client work: lock the client to their `pages` collection, they never see your `settings` or `redirects`. Configured per-user in a simple checkbox modal.

✅ **Content Validation**
Schema fields now support `required`, `min`, `max`, and `regex`. Drafts save freely. Publish/Schedule shows an inline error banner listing every violation. The server enforces the same rules as a safety net.

📊 **Content Quality Dashboard**
The dashboard sidebar now shows a quality panel: how many published entries are missing a body, too short, missing an image, or have no SEO metadata. One glance instead of a manual audit.

🔄 **Schema Migration**
Rename a field — including all entry data — in a single atomic transaction. No more manual JSON fixes.

🗂️ **Multi-Pod Dashboard**
Link multiple pod files and see their stats (published count, file size, last modified) in one place. Useful for agencies managing multiple client projects.

🔒 **`orbiter encrypt`**
`orbiter encrypt --pod ./content.pod` wraps the file in AES-256-GCM. Commit the `.pod.enc` to git, decrypt in CI with a secret. The plaintext pod never touches the repo.

📡 **`orbiter sync`**
Push or pull a pod via rsync: `orbiter sync --remote user@host:/path/content.pod`. SSH keys, no setup beyond what you already have.

📟 **`orbiter status`**
One command shows: site name, file size, entry counts by status, last modified, user count.

And: SvelteKit support via `@a83/orbiter-client`, an `<OrbiterImage>` Astro component with auto-width/height/alt, and starter templates at `orbiter init` (blog / portfolio / docs).

MIT, self-hosted, no cloud required.

GitHub: https://github.com/aeon022/orbiter
Docs: https://orbiter.sh/docs/

#opensource #webdev #cms #astro #sqlite #sveltekit #indiehacker
