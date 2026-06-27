# Hacker News — Show HN (Campaign 3)

## Title

Show HN: Orbiter – self-hosted CMS in a single SQLite file, now with encryption and team permissions

## Comment

Hey HN — I've been building Orbiter, a headless CMS for Astro (and now SvelteKit) where everything lives in a single `.pod` file (SQLite). No database server, no cloud, no monthly bill. The file is portable — copy it, email it, rsync it.

The latest release (0.3.78) adds the features needed for teams and production workflows:

**Content validation** — schema fields now support `required`, `min`, `max`, and `regex`. Drafts always save. Publish/Schedule is gated with an inline error banner. The server enforces the same rules via a 422 response, so the validation can't be bypassed via direct API calls.

**Collection permissions** — editor users can be restricted to specific collections. Stored as `allowed_collections` in pod meta, enforced as middleware on all entry routes.

**`orbiter encrypt`** — wraps the `.pod` file in AES-256-GCM (scrypt key derivation). Useful workflow: commit `content.pod.enc` to git, decrypt in CI with a secret env var. The plaintext pod never hits the repo.

**`orbiter sync`** — thin rsync wrapper: `orbiter sync --remote user@host:/path/content.pod [--pull]`. Push or pull with a single command.

**`orbiter status`** — pod health in the terminal: site name, file size, entry counts by status, last modified, user count.

**Multi-pod dashboard** — link multiple pod files and see their stats in one admin page. Useful for agencies running multiple client projects.

**Schema migration** — rename a field (including all entry data) in a single atomic transaction. Avoids the "update schema, manually fix JSON, hope you got everything" loop.

**SvelteKit support** — `@a83/orbiter-client` is a framework-agnostic client that opens the pod directly. Same API as the Astro virtual modules, but works in SvelteKit, Nuxt, or a plain Node script.

The project is MIT-licensed. GitHub: https://github.com/aeon022/orbiter
Docs: https://orbiter.sh/docs/
