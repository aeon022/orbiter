---
title: "I built a CMS that fits in a single file — here's what's new"
tags: opensource, webdev, cms, sqlite
canonical_url: https://github.com/aeon022/orbiter
cover_image: # TODO: add calendar screenshot
---

# I built a CMS that fits in a single file — here's what's new

**Orbiter** is a headless CMS for Astro that stores everything — content, media, users, settings — in a single POD — one SQLite database. No database server, no cloud, no vendor lock-in. Just a file you can copy, back up, or email.

I've been building it solo for the past few months and just shipped v0.3.64. Here's what landed.

## Calendar View

Every CMS lets you schedule posts. Few let you *see* what's coming.

Orbiter now has a full calendar page — a month grid where every entry shows up as a color-coded chip:

- **Blue** — scheduled (will publish at `publish_at`)
- **Gold** — expiring (will unpublish at `unpublish_at`)
- **Green** — published
- **Grey** — draft

Click a day to see all entries for that date in a sidebar. Filter by status. Keyboard nav with arrow keys and `T` for today.

The dashboard also got a compact calendar widget — a mini month grid with dots for activity and a list of upcoming scheduled entries.

## Cross-Pod Import/Export

A POD is portable by design, but sometimes you need to copy *parts* of one pod into another — a collection schema, a set of entries, or everything.

The Import page now has a **Pod / JSON** tab:

- **Export** — downloads all collections + entries as a single JSON file
- **Import** — drop a `.json` export or a raw `.pod` file, and Orbiter merges it into the current pod
- Missing collections are created automatically
- Existing entries can be skipped or overwritten

This makes it easy to:
- Clone a staging pod to production
- Share content between projects
- Back up and restore specific collections

API endpoints: `GET /api/import/export-pod` and `POST /api/import/pod`.

## Desktop App v0.2.0

The Electron desktop app got three big upgrades:

**Universal macOS binary** — one DMG that runs natively on both Apple Silicon and Intel Macs. No more "which download do I need?"

**Auto-update** — when a new version is published to GitHub Releases, the app downloads it in the background and shows a "restart to apply" dialog. No manual download needed.

**Backup** — `File → POD sichern… (⌘⇧S)` creates a timestamped copy of the active pod. A dialog offers to reveal it in Finder.

## Table Field

A new schema field type: `table`. It renders a mini-spreadsheet directly in the entry sidebar — header row, data rows, add/remove rows and columns, Tab navigation between cells. Stored as `string[][]` in the entry JSON.

Use it for pricing tables, schedules, specifications — anything that's naturally tabular but doesn't need a full collection.

## The Stack

- **Astro** integration via virtual modules (`orbiter:collections`)
- **SQLite** (better-sqlite3) — the entire pod is one file
- **Hono** — lightweight HTTP framework for the admin API
- **Electron 42** — desktop app with `utilityProcess.fork()`
- **No cloud required** — runs on localhost, deploys to shared hosting via FTP

Everything is MIT-licensed.

## What's Next

- Windows app menu testing (builds work, needs real-device testing)
- SvelteKit integration (`@a83/orbiter-sveltekit`)

---

**GitHub**: [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
**Docs**: [orbiter.sh/docs](https://orbiter.sh/docs/)
**Desktop download**: [GitHub Releases](https://github.com/aeon022/orbiter/releases)

If you're building static sites with Astro and want a CMS that doesn't phone home, give Orbiter a try. Feedback and stars welcome.
