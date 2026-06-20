# Hacker News — Show HN

## Title

Show HN: Orbiter — A single-file CMS for Astro (SQLite, MIT, no cloud)

## URL

https://github.com/aeon022/orbiter

## Comment

I built a headless CMS for Astro that stores everything in a single POD — a SQLite database containing content, media (as BLOBs or S3 references), users, and settings. No database server, no cloud account, no Docker.

The workflow: run `npx @a83/orbiter-admin` locally (or use the Electron desktop app), edit content in a block editor, trigger an Astro build, and deploy the static `dist/` to any shared host via FTP. The POD is just a file — `cp`, `rsync`, email it.

Latest release (v0.3.64) adds:

- **Calendar view** — month grid showing scheduled, published, and draft entries with click-to-edit
- **Cross-pod import/export** — drop a `.pod` or JSON file to merge collections and entries between pods
- **Desktop auto-update** — Electron app checks GitHub Releases and downloads updates in the background
- **Table field** — mini-spreadsheet as a schema field type (stored as `string[][]`)

16 field types, block editor with slash commands, scheduled publishing, i18n, form inbox, media library with S3/R2 backends, CSV import/export, version history, and a Station dock mode that turns the admin into a desktop-OS-like interface.

Stack: Hono (API), better-sqlite3, Electron 42, Astro virtual modules. Everything MIT-licensed.

Docs: https://orbiter.sh/docs/
