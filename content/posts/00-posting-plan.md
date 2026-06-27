# Orbiter — Posting Plan (updated June 2026)

## Overview

This plan covers the release of Orbiter admin@0.3.64 and Desktop v0.2.0 features. Content is prepared in English (EN) and German (DE) where applicable.

## Key Highlights to Promote

1. **Calendar View** — visual month-grid for scheduled/published/draft entries
2. **Cross-Pod Import/Export** — copy collections + entries between pods via JSON or POD
3. **Desktop App v0.2.0** — universal macOS DMG, auto-update, backup
4. **Table Field** — mini-spreadsheet as a schema field type
5. **Single-file architecture** — everything in one `.pod` SQLite file
6. **No vendor lock-in** — MIT, self-hosted, works on shared hosting via FTP

---

## Posts

### 1. Dev.to — Long-form technical article
- **File**: `01-devto-en.md`
- **Angle**: "I built a CMS that fits in a single file" — architecture deep-dive + new features
- **Audience**: Web developers, indie hackers, Astro/SSG users
- **Length**: ~1500 words
- **Tags**: `opensource`, `webdev`, `cms`, `sqlite`

### 2. Dev.to — German version
- **File**: `02-devto-de.md`
- **Same content**, adapted for German dev community

### 3. Hacker News — Show HN submission
- **File**: `03-hackernews.md`
- **Format**: Title + short comment explaining what it is and why
- **Angle**: Single-file SQLite CMS for Astro, no cloud needed

### 4. LinkedIn — Professional post
- **File**: `04-linkedin-en.md`
- **Angle**: Shipping solo — calendar view, cross-pod copy, desktop auto-update in one release
- **Audience**: Tech leads, indie devs, startup founders
- **Length**: ~300 words

### 5. LinkedIn — German version
- **File**: `05-linkedin-de.md`

### 6. Twitter/X — Thread (5 tweets)
- **File**: `06-twitter-en.md`
- **Angle**: Visual thread — screenshot-worthy features, link to repo
- **Format**: Numbered tweets, each self-contained

### 7. Twitter/X — German thread
- **File**: `07-twitter-de.md`

### 8. Threads — Short post
- **File**: `08-threads-en.md`
- **Angle**: Quick visual hook — "your CMS is a single file" + feature list
- **Length**: ~150 words

### 9. Threads — German version
- **File**: `09-threads-de.md`

---

## Posting Schedule (suggested)

| Day | Platform | Post | Notes |
|-----|----------|------|-------|
| Day 1 (Mon) | Twitter/X | Thread EN | Morning, with screenshots |
| Day 1 (Mon) | Threads | Short post EN | Same day, afternoon |
| Day 2 (Tue) | Dev.to | Long article EN | Morning, cross-link Twitter |
| Day 2 (Tue) | Hacker News | Show HN | Afternoon (US time) |
| Day 3 (Wed) | LinkedIn | Professional post EN | Morning |
| Day 4 (Thu) | Twitter/X | Thread DE | German audience |
| Day 4 (Thu) | Threads | Short post DE | Same day |
| Day 5 (Fri) | Dev.to | Article DE | Cross-link to EN version |
| Day 5 (Fri) | LinkedIn | Post DE | |

---

## Campaign 2: Dual Render — Thought Leadership

### Posts

| # | File | Platform | Language |
|---|------|----------|----------|
| 12 | `12-dual-render-devto-en.md` | Dev.to | EN |
| 13 | `13-dual-render-devto-de.md` | Dev.to | DE |
| 14 | `14-dual-render-linkedin-en.md` | LinkedIn | EN |
| 15 | `15-dual-render-linkedin-de.md` | LinkedIn | DE |
| 16 | `16-dual-render-twitter-en.md` | Twitter/X (6 tweets) | EN |
| 17 | `17-dual-render-twitter-de.md` | Twitter/X (6 tweets) | DE |
| 18 | `18-dual-render-threads-en.md` | Threads | EN |
| 19 | `19-dual-render-threads-de.md` | Threads | DE |
| 20 | `20-dual-render-hackernews.md` | Hacker News | EN |

### Schedule (Week 2 — after Orbiter feature posts)

| Day | Platform | Post | Notes |
|-----|----------|------|-------|
| Day 1 (Mon) | Twitter/X | Dual Render Thread EN | 6 tweets, screenshot of diagram |
| Day 1 (Mon) | Threads | Dual Render short EN | Same day, afternoon |
| Day 2 (Tue) | Dev.to | Dual Render article EN | Thought leadership, link a83tech.com |
| Day 2 (Tue) | Hacker News | Dual Render HN | Link to a83tech.com |
| Day 3 (Wed) | LinkedIn | Dual Render post EN | Morning |
| Day 4 (Thu) | Twitter/X | Thread DE | German audience |
| Day 4 (Thu) | Threads | Short post DE | |
| Day 5 (Fri) | Dev.to + LinkedIn | DE versions | |

### Key message

"Don't be the summary. Be the source."

---

## Asset Checklist

- [x] `screenshots/c2-01-dashboard-station.png` — Dashboard with calendar widget, Station mode
- [x] `screenshots/c2-02-calendar.png` — Calendar page, month grid with color-coded entries
- [x] `screenshots/c2-03-import-pod.png` — Import page, Pod/JSON tab
- [x] `screenshots/c2-04-station-dock-hud-tools.png` — Station mode with HUD + Tools open
- [x] `screenshots/c2-05-vision-hero.png` — Vision page hero with planet eclipse
- [x] `screenshots/c2-06-vision-diagram.png` — Dual Render diagram (Human/POD/Agent)
- [x] `screenshots/c2-vision-page.png` — Full vision page
- [ ] GIF/Video: Calendar navigation (prev/next/click day)
- [ ] GIF/Video: Vision page scroll effect
- [x] Repo link: https://github.com/aeon022/orbiter
- [x] Docs link: https://orbiter.sh/docs/
- [x] Vision link: https://orbiter.sh/vision
- [x] Dual Render link: https://a83tech.com

---

## To-Do

### Before posting

- [ ] Record GIF: Calendar page — click prev/next, click a day, show sidebar (QuickTime → trim in Preview)
- [ ] Record GIF: Vision page scroll — hero eclipse fades, roadmap scan glow, warp footer
- [ ] Deploy landing page (vision + OG card live on orbiter.sh)
- [ ] Verify OG card shows correctly: paste `https://github.com/aeon022/orbiter` in Twitter/LinkedIn preview
- [ ] Create Dev.to account if not existing
- [ ] Set up Dev.to series "Orbiter" for both articles
- [ ] Prepare Hacker News account (karma check — need enough to post)

### Campaign 1: Orbiter Features (Week 1)

- [ ] Day 1 Mon AM: Post Twitter thread EN (`06-twitter-en.md`) + attach `c2-02-calendar.png`, `c2-01-dashboard-station.png`
- [ ] Day 1 Mon PM: Post Threads EN (`08-threads-en.md`)
- [ ] Day 2 Tue AM: Publish Dev.to article EN (`01-devto-en.md`) + embed screenshots
- [ ] Day 2 Tue PM: Submit Hacker News (`03-hackernews.md`) — US afternoon timing
- [ ] Day 3 Wed AM: Post LinkedIn EN (`04-linkedin-en.md`) + attach `c2-01-dashboard-station.png`
- [ ] Day 4 Thu AM: Post Twitter thread DE (`07-twitter-de.md`)
- [ ] Day 4 Thu PM: Post Threads DE (`09-threads-de.md`)
- [ ] Day 5 Fri AM: Publish Dev.to article DE (`02-devto-de.md`)
- [ ] Day 5 Fri AM: Post LinkedIn DE (`05-linkedin-de.md`)

### Campaign 2: Dual Render (Week 2)

- [ ] Day 1 Mon AM: Post Twitter thread EN (`16-dual-render-twitter-en.md`) + attach `c2-06-vision-diagram.png`
- [ ] Day 1 Mon PM: Post Threads EN (`18-dual-render-threads-en.md`)
- [ ] Day 2 Tue AM: Publish Dev.to article EN (`12-dual-render-devto-en.md`) + embed `c2-05-vision-hero.png`, `c2-06-vision-diagram.png`
- [ ] Day 2 Tue PM: Submit Hacker News (`20-dual-render-hackernews.md`)
- [ ] Day 3 Wed AM: Post LinkedIn EN (`14-dual-render-linkedin-en.md`) + attach `c2-05-vision-hero.png`
- [ ] Day 4 Thu AM: Post Twitter thread DE (`17-dual-render-twitter-de.md`)
- [ ] Day 4 Thu PM: Post Threads DE (`19-dual-render-threads-de.md`)
- [ ] Day 5 Fri AM: Publish Dev.to article DE (`13-dual-render-devto-de.md`)
- [ ] Day 5 Fri AM: Post LinkedIn DE (`15-dual-render-linkedin-de.md`)

### After posting

- [ ] Monitor HN comments — respond within 1h if it gets traction
- [ ] Cross-link: add Dev.to article URL to LinkedIn/Twitter posts as comment
- [ ] Track: note which platform gets most engagement for next campaign
- [ ] Respond to Dev.to comments within 24h

---

## Campaign 3: Orbiter 0.3.78 — Team-Ready Release

### Key Highlights

1. **Content Validation** — required/min/max/regex per schema field, inline error banner, server safety net
2. **Collection Permissions** — editor users restricted to specific collections
3. **Content Quality Dashboard** — auto-audit: missing body, image, SEO across all published entries
4. **Schema Migration** — rename field + all entry data in one atomic transaction
5. **Multi-Pod Dashboard** — link multiple pods, stats in one place
6. **`orbiter encrypt`** — AES-256-GCM for git-safe pod storage
7. **`orbiter sync`** — rsync push/pull
8. **`orbiter status`** — pod health in terminal
9. **SvelteKit support** — `@a83/orbiter-client` framework-agnostic
10. **`<OrbiterImage>`** Astro component
11. **Starter templates** at `orbiter init` (blog / portfolio / docs)

### Posts

| # | File | Platform | Language |
|---|------|----------|----------|
| 21 | `21-campaign3-devto-en.md` | Dev.to | EN |
| 22 | `22-campaign3-devto-de.md` | Dev.to | DE |
| 23 | `23-campaign3-linkedin-en.md` | LinkedIn | EN |
| 24 | `24-campaign3-linkedin-de.md` | LinkedIn | DE |
| 25 | `25-campaign3-twitter-en.md` | Twitter/X (6 tweets) | EN |
| 26 | `26-campaign3-twitter-de.md` | Twitter/X (6 tweets) | DE |
| 27 | `27-campaign3-threads-en.md` | Threads | EN |
| 28 | `28-campaign3-threads-de.md` | Threads | DE |
| 29 | `29-campaign3-hackernews.md` | Hacker News | EN |

### Posting Schedule (Week 3)

| Day | Platform | Post | Notes |
|-----|----------|------|-------|
| Day 1 Mon AM | Twitter/X | Thread EN (`25`) | Tweet 2: attach `c3-08-editor-validation-banner.png` + `c3-09-users-permissions-modal.png` |
| Day 1 Mon PM | Threads | Short EN (`27`) | |
| Day 2 Tue AM | Dev.to | Long article EN (`21`) | cover: `c3-08-editor-validation-banner.png`; embed `c3-01-dashboard-quality.png`, `c3-05-pods.png`, `c3-11-cli-orbiter-status.png` |
| Day 2 Tue PM | Hacker News | Show HN (`29`) | US afternoon timing |
| Day 3 Wed AM | LinkedIn | Post EN (`23`) | Attach `c3-01-dashboard-quality.png` |
| Day 4 Thu AM | Twitter/X | Thread DE (`26`) | Tweet 2: attach `c3-08-editor-validation-banner.png` + `c3-09-users-permissions-modal.png` |
| Day 4 Thu PM | Threads | Short DE (`28`) | |
| Day 5 Fri AM | Dev.to | Article DE (`22`) | cover: `c3-08-editor-validation-banner.png`; Cross-link to EN |
| Day 5 Fri AM | LinkedIn | Post DE (`24`) | Attach `c3-01-dashboard-quality.png` |

### Asset Checklist

- [x] `screenshots/c3-01-dashboard-quality.png` — Dashboard quality panel (11 issues)
- [x] `screenshots/c3-02-analytics.png` — Analytics page
- [x] `screenshots/c3-03-schema-validation.png` — Schema editor
- [x] `screenshots/c3-04-users.png` — Users page
- [x] `screenshots/c3-05-pods.png` — Multi-pod dashboard (3 pods with stat cards)
- [x] `screenshots/c3-06-editor.png` — Editor with entry open
- [x] `screenshots/c3-07-media.png` — Media page
- [x] `screenshots/c3-08-editor-validation-banner.png` — Editor with red validation banner → **Tweet 2, cover_image Dev.to**
- [x] `screenshots/c3-09-users-permissions-modal.png` — Collection permissions modal → **Tweet 2**
- [x] `screenshots/c3-10-schema-validation-fields.png` — Schema field validation inputs
- [x] `screenshots/c3-11-cli-orbiter-status.png` — Terminal: `orbiter status` → **Tweet 5**
- [x] `screenshots/c3-12-cli-orbiter-encrypt.png` — Terminal: `orbiter encrypt/decrypt` → **Tweet 4**
- [x] `screenshots/c3-13-cli-orbiter-sync.png` — Terminal: `orbiter sync` → **Tweet 4**

### To-Do

- [x] Take new screenshots (quality panel, validation banner, permissions modal, pods page)
- [ ] Record terminal GIF: `orbiter status` + `orbiter encrypt` (optional, PNGs already done)
- [ ] Bump version numbers in posts to 0.3.78
- [ ] Day 1 Mon AM: Post Twitter thread EN (`25-campaign3-twitter-en.md`)
- [ ] Day 1 Mon PM: Post Threads EN (`27-campaign3-threads-en.md`)
- [ ] Day 2 Tue AM: Publish Dev.to article EN (`21-campaign3-devto-en.md`)
- [ ] Day 2 Tue PM: Submit Hacker News (`29-campaign3-hackernews.md`)
- [ ] Day 3 Wed AM: Post LinkedIn EN (`23-campaign3-linkedin-en.md`)
- [ ] Day 4 Thu AM: Post Twitter thread DE (`26-campaign3-twitter-de.md`)
- [ ] Day 4 Thu PM: Post Threads DE (`28-campaign3-threads-de.md`)
- [ ] Day 5 Fri AM: Publish Dev.to article DE (`22-campaign3-devto-de.md`)
- [ ] Day 5 Fri AM: Post LinkedIn DE (`24-campaign3-linkedin-de.md`)
- [ ] Monitor HN comments — respond within 1h if it gets traction
