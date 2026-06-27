# Twitter/X Thread — English (Campaign 3)

**Post thread without links. Add links as self-reply after last tweet.**

---

## Tweet 1 (Hook — NO links, NO hashtags)

Your CMS is a single SQLite file.

Now it's encrypted. Team-permissioned. Quality-audited. And syncable to any server with one command.

Just shipped Orbiter 0.3.78 🧵

## Tweet 2 (Validation + Permissions — attach dashboard screenshot)

Content gates that actually work:

→ Schema fields: required, min, max, regex
→ Drafts always save — no friction
→ Publish/Schedule: inline error banner, blocked until valid
→ Server enforces same rules via 422

Plus: editor users can be locked to specific collections only.

Your client edits Pages. Not your Settings.

## Tweet 3 (Quality Dashboard)

New dashboard panel: Content Quality

Every published entry scanned automatically:
→ Missing body
→ Body under 100 chars
→ No image
→ No SEO title
→ No SEO description

Counts by issue type, one glance when you open the dashboard.

Replaces the "go hunt for what's broken" workflow.

## Tweet 4 (Encrypt + Sync)

Pod encryption:

```bash
orbiter encrypt --pod ./content.pod
# → content.pod.enc

orbiter decrypt --in ./content.pod.enc
# → content.pod
```

AES-256-GCM, scrypt key derivation. Commit the .enc to git. Decrypt in CI with a secret.

And: `orbiter sync --remote user@host:/path/content.pod` for rsync push/pull.

## Tweet 5 (Schema Migration + Multi-Pod)

Two more things that save real time:

→ `orbiter status` — pod health in the terminal (entry counts, size, last modified)
→ Schema rename-field — atomic, migrates all entry data in one transaction
→ Multi-Pod dashboard — link multiple pods, see stats across all projects

## Tweet 6 (CTA — NO link here)

Also shipped:
→ SvelteKit support via @a83/orbiter-client
→ <OrbiterImage> Astro component (auto lazy, auto alt, auto dimensions)
→ Starter templates at init: blog / portfolio / docs

MIT. Self-hosted. No cloud.

Star it on GitHub — link in reply ↓

## Reply to Tweet 6 (links)

GitHub: github.com/aeon022/orbiter
Docs: orbiter.sh/docs

#opensource #webdev #cms #astro #sqlite #sveltekit
