# KI-CONTEXT.md — postctl

## Projekt

**postctl** — eine TUI CLI App in Go die Social Media Postings managed. Import aus Markdown, Scheduling, Multi-Plattform-Posting. Gleichzeitig ein Go-Tutorial für den Entwickler.

## Stack

| Komponente | Technologie | Warum |
|------------|-------------|-------|
| Sprache | Go 1.22+ | Schnell, Single Binary, Cross-Platform |
| TUI Framework | Bubbletea (charm.sh) | Standard Go TUI, Elm-Architektur |
| TUI Components | Bubbles + Lipgloss | Input, Liste, Tabs, Viewport, Styling |
| Twitter/X API | v2 REST API | OAuth 2.0 PKCE, Tweets + Media |
| LinkedIn API | v2 REST API | OAuth 2.0, ugcPosts + Images |
| Threads API | Meta Graph API | OAuth 2.0, seit 2024 public |
| Markdown Parser | goldmark | Standard Go Markdown Parser |
| YAML/Frontmatter | gopkg.in/yaml.v3 | Post-Metadata parsen |
| Config | Viper | Config File + ENV Support |
| Scheduling | robfig/cron | In-Process Cron Scheduler |
| HTTP Client | net/http (stdlib) | Kein Extra-Dependency nötig |
| DB | SQLite (modernc.org/sqlite) | Post-Status, Schedule, History — pure Go, kein CGO |
| CLI Framework | Cobra | Subcommands: `postctl post`, `postctl schedule`, `postctl list` |

## Verzeichnisstruktur

```
postctl/
├── main.go                    # Entry point
├── go.mod
├── go.sum
├── README.md
├── KI-CONTEXT.md              # Diese Datei
├── TUTORIAL.md                # Go-Lernpfad entlang des Projekts
│
├── cmd/                       # CLI Commands (Cobra)
│   ├── root.go                # Root command, global flags
│   ├── import.go              # `postctl import <dir>` — Markdown einlesen
│   ├── list.go                # `postctl list` — alle Posts anzeigen
│   ├── post.go                # `postctl post <id>` — sofort posten
│   ├── schedule.go            # `postctl schedule <id> <datetime>` — planen
│   ├── tui.go                 # `postctl` (ohne args) — TUI starten
│   └── auth.go                # `postctl auth <platform>` — OAuth Flow
│
├── internal/
│   ├── config/
│   │   └── config.go          # Viper Config laden/speichern
│   │
│   ├── markdown/
│   │   ├── parser.go          # Markdown + Frontmatter → Post struct
│   │   └── parser_test.go
│   │
│   ├── models/
│   │   ├── post.go            # Post, Tweet, Thread, Campaign structs
│   │   └── schedule.go        # ScheduledPost struct
│   │
│   ├── store/
│   │   ├── db.go              # SQLite Verbindung + Migrations
│   │   ├── posts.go           # CRUD für Posts
│   │   └── history.go         # Post-History (was wurde wann gepostet)
│   │
│   ├── platforms/
│   │   ├── platform.go        # Interface: Post(), Auth(), Upload()
│   │   ├── twitter.go         # Twitter/X v2 Implementation
│   │   ├── linkedin.go        # LinkedIn Implementation
│   │   ├── threads.go         # Threads/Meta Implementation
│   │   └── dry_run.go         # Dry-Run Implementation (kein echtes Posting)
│   │
│   ├── scheduler/
│   │   └── scheduler.go       # Cron-basierter Scheduler
│   │
│   └── tui/
│       ├── app.go             # Bubbletea App (Model, Update, View)
│       ├── tabs.go            # Tab-Navigation (Posts, Schedule, History)
│       ├── list.go            # Post-Liste mit Status-Farben
│       ├── detail.go          # Post-Detail-Ansicht mit Preview
│       ├── compose.go         # Neuen Post schreiben/bearbeiten
│       ├── schedule_view.go   # Schedule-Kalender
│       ├── styles.go          # Lipgloss Styling (Farben, Borders)
│       └── keys.go            # Keybindings
│
├── templates/                 # Beispiel-Markdown-Posts
│   └── example-thread.md
│
└── docs/
    ├── api-twitter.md         # Twitter API Setup Guide
    ├── api-linkedin.md        # LinkedIn API Setup Guide
    ├── api-threads.md         # Threads API Setup Guide
    └── architecture.md        # Architektur-Übersicht
```

## Markdown Post-Format

Posts werden als Markdown mit YAML-Frontmatter importiert:

```markdown
---
platform: twitter          # twitter | linkedin | threads | all
type: thread               # thread | single | article
language: en               # en | de
campaign: orbiter-v0365    # Kampagnen-Gruppierung
schedule: 2026-06-23T09:00  # Optional: geplanter Zeitpunkt
images:                     # Optional: Bilder-Pfade
  - screenshots/01-dashboard.png
  - screenshots/02-calendar.png
---

## Tweet 1

Content of first tweet...

## Tweet 2

Content of second tweet...

## Reply

Links go here...
```

## Datenmodell (SQLite)

```sql
CREATE TABLE posts (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL,     -- twitter, linkedin, threads
  type        TEXT NOT NULL,     -- thread, single, article
  language    TEXT DEFAULT 'en',
  campaign    TEXT,
  title       TEXT,
  content     TEXT NOT NULL,     -- JSON: einzelner Text oder Tweet-Array
  images      TEXT,              -- JSON: Pfade zu Bildern
  status      TEXT DEFAULT 'draft',  -- draft, scheduled, posted, failed
  scheduled_at TEXT,
  posted_at   TEXT,
  platform_id TEXT,              -- ID des Posts auf der Plattform
  error       TEXT,              -- Letzter Fehler
  source_file TEXT,              -- Original Markdown-Pfad
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE history (
  id          TEXT PRIMARY KEY,
  post_id     TEXT NOT NULL REFERENCES posts(id),
  action      TEXT NOT NULL,     -- posted, failed, retried, edited
  platform_id TEXT,
  error       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE auth_tokens (
  platform    TEXT PRIMARY KEY,
  token       TEXT NOT NULL,     -- Encrypted
  refresh     TEXT,
  expires_at  TEXT
);
```

## API Setup

### Twitter/X
- Developer Portal: developer.twitter.com
- App Type: "User authentication" mit OAuth 2.0 + PKCE
- Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- Rate Limit: 200 Tweets / 15 min (Free Tier: 1500/Monat)
- Media Upload: v1.1 `/media/upload` (chunked), dann v2 `/tweets` mit media_ids
- Free Tier reicht für ~50 Tweets/Tag

### LinkedIn
- Developer Portal: linkedin.com/developers
- App erstellen → Products → "Share on LinkedIn" + "Sign In with LinkedIn v2"
- OAuth 2.0 Scopes: `w_member_social`, `r_liteprofile`
- Rate Limit: 100 Posts/Tag
- Media: erst Image registrieren, dann Upload, dann Post mit URN

### Threads (Meta)
- Seit Juni 2024 öffentlich
- Meta Developer Portal → App erstellen → Threads API aktivieren
- OAuth 2.0, Scopes: `threads_basic`, `threads_content_publish`
- Rate Limit: 250 Posts / 24h
- Media: Container erstellen → publizieren (2-Step)

## TUI Screens

### 1. Dashboard (Startscreen)
```
┌─ postctl ──────────────────────────────────────────────┐
│  ● Posts  │  ◷ Schedule  │  ↺ History  │  ⚙ Settings   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  CAMPAIGNS                     STATS                   │
│  ┌─────────────────────┐      Posted:    12            │
│  │ ● orbiter-v0365     │      Scheduled:  8            │
│  │   5 posts, 2 posted │      Drafts:     5            │
│  │ ● dual-render       │      Failed:     0            │
│  │   9 posts, 0 posted │                               │
│  └─────────────────────┘      PLATFORMS                │
│                                ✓ Twitter  connected    │
│  NEXT UP                       ✓ LinkedIn connected    │
│  ◷ Mon 09:00  Twitter EN      ○ Threads  not auth'd   │
│  ◷ Mon 14:00  Threads EN                              │
│  ◷ Tue 09:00  Dev.to EN                               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  ↑↓ navigate  │  enter select  │  q quit  │  ? help   │
└────────────────────────────────────────────────────────┘
```

### 2. Post-Liste
```
┌─ Posts ────────────────────────────────────────────────┐
│  Filter: [All ▾]  Platform: [All ▾]  Lang: [All ▾]    │
├────────────────────────────────────────────────────────┤
│  ● orbiter-v0365 / Twitter EN                          │
│    "Your CMS is a single file..."                      │
│    thread · 5 tweets · 📎 2 images    ◷ Mon 09:00     │
│                                                        │
│  ○ orbiter-v0365 / LinkedIn EN                         │
│    "Shipped: Calendar view, cross-pod..."              │
│    single · 📎 1 image               ◷ Wed 09:00      │
│                                                        │
│  ○ dual-render / Twitter EN                            │
│    "Half your website visitors..."                     │
│    thread · 6 tweets · 📎 1 image    draft             │
├────────────────────────────────────────────────────────┤
│  p post now  │  s schedule  │  e edit  │  d delete     │
└────────────────────────────────────────────────────────┘
```

### 3. Post-Detail / Preview
```
┌─ Preview ──────────────────────────────────────────────┐
│  Twitter Thread · EN · orbiter-v0365                    │
│  Status: scheduled · Mon 2026-06-23 09:00 UTC          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Tweet 1/5                              [280 chars ✓]  │
│  ┌──────────────────────────────────────────────┐      │
│  │ Your CMS is a single file.                   │      │
│  │                                              │      │
│  │ No database server. No Docker. No cloud.     │      │
│  │                                              │      │
│  │ One SQLite file. Copy it. rsync it.          │      │
│  │                                              │      │
│  │ Just shipped v0.3.65 — what's new 🧵         │      │
│  └──────────────────────────────────────────────┘      │
│  📎 (no image)                                         │
│                                                        │
│  Tweet 2/5                              [245 chars ✓]  │
│  ┌──────────────────────────────────────────────┐      │
│  │ Calendar View                                │      │
│  │ Full month grid...                           │      │
│  └──────────────────────────────────────────────┘      │
│  📎 02-calendar.png                                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│  ←→ tweets  │  p post  │  s schedule  │  esc back     │
└────────────────────────────────────────────────────────┘
```

## Go-Konzepte die wir lernen (Tutorial-Pfad)

### Phase 1: Grundlagen (cmd/ + models/)
- Go Modules (`go mod init`)
- Packages und Imports
- Structs und Methoden
- Error Handling (`error` Interface, `fmt.Errorf`, `errors.Is`)
- Cobra CLI Commands
- JSON Marshal/Unmarshal

### Phase 2: Daten (store/ + markdown/)
- Interfaces definieren (`Platform`, `Store`)
- SQLite mit pure Go (kein CGO)
- File I/O (`os.Open`, `bufio.Scanner`)
- YAML Parsing
- Unit Tests (`go test`, Table-driven Tests)
- Slices, Maps, Iteration

### Phase 3: APIs (platforms/)
- HTTP Client (`net/http`)
- OAuth 2.0 Flow implementieren
- JSON API Requests/Responses
- Multipart File Upload
- Rate Limiting (`time.Ticker`)
- Goroutines für paralleles Posting
- Channels für Ergebnis-Kommunikation
- Context (`context.WithTimeout`)

### Phase 4: TUI (tui/)
- Bubbletea Elm-Architektur (Model → Update → View)
- Lipgloss Styling
- Key Handling
- Component Composition
- Viewport Scrolling
- Async Commands (tea.Cmd)

### Phase 5: Polish
- Config Management (Viper)
- Graceful Shutdown
- Logging (zerolog oder slog)
- Build Tags + Cross-Compilation
- Goreleaser für Releases

### Phase 6: Future Features
- `postctl generate` — AI-generierte Posts aus URL/Artikel
- `postctl repurpose` — Post für andere Plattformen konvertieren
- `postctl analytics` — Engagement-Daten von APIs holen
- `postctl template` — vorgefertigte Post-Strukturen
- License-Key-System für Pro-Features

## Projekt

```
Repository: ~/Developing/Projects/postctl
Module:     github.com/aeon022/postctl
License:    MIT (Core), proprietary (Pro Features)
```

## Befehle

```bash
# TUI starten
postctl

# Posts aus Markdown importieren
postctl import ./content/posts/

# Alle Posts auflisten
postctl list
postctl list --platform twitter --status draft

# Sofort posten
postctl post <id>
postctl post <id> --dry-run        # Preview ohne zu posten
postctl post <id> --platform twitter

# Scheduling
postctl schedule <id> "2026-06-23 09:00"
postctl schedule --list

# Auth
postctl auth twitter               # OAuth Flow starten
postctl auth linkedin
postctl auth threads
postctl auth --status              # Alle Verbindungen prüfen

# Kampagne posten
postctl campaign post orbiter-v0365 --dry-run
postctl campaign list

# Future (v2)
postctl generate https://dev.to/my-article
postctl repurpose <id> --to twitter,linkedin
postctl analytics --days 7
postctl template launch
```

## Config (`~/.config/postctl/config.yaml`)

```yaml
# API Keys
twitter:
  client_id: "..."
  client_secret: "..."
  
linkedin:
  client_id: "..."
  client_secret: "..."

threads:
  app_id: "..."
  app_secret: "..."

# Defaults
defaults:
  timezone: "Europe/Vienna"
  dry_run: false
  image_dir: "./screenshots"

# Database
db_path: "~/.config/postctl/postctl.db"
```

## Sicherheit

- API Tokens werden verschlüsselt in SQLite gespeichert (AES-256-GCM)
- Config-Datei enthält nur Client IDs/Secrets (keine User Tokens)
- OAuth Flow öffnet lokalen HTTP Server für Callback
- Tokens werden automatisch refreshed
- `--dry-run` Flag für sicheres Testen

## Skills / Voraussetzungen

- Go 1.22+ installiert (`brew install go`)
- Git
- Twitter Developer Account (Free Tier reicht)
- LinkedIn Developer App
- Meta Developer Account (für Threads)
- Terminal mit 256-Color Support (für TUI)

## Abgrenzung (v1)

- Kein Web-UI — rein Terminal-basiert (Cloud ist v2+ / Future)
- Kein eigener Content-Editor — Markdown ist der Editor
- Kein Team-Feature — Single-User Tool (Team ist Pro)
- Kein Image-Generator — Bilder werden extern erstellt

## USP — was postctl abhebt

- **Terminal-native** — passt in den Dev-Workflow, nicht Browser-Tab #47
- **Markdown-first** — Posts leben im Repo, versioniert, diffbar
- **AI-ready** — Claude/GPT können `postctl post <id>` direkt aufrufen
- **Single Binary** — `go install`, fertig. Kein Docker, Node, Python
- **Offline-first** — Posts schreiben ohne Internet, posten wenn online
- **Ökosystem** — Teil des Orbiter Content-Loops (Create → Distribute → Learn)

## Monetarisierung

| Tier | Preis | Features |
|------|-------|----------|
| **Core** (OSS) | gratis | Import, Post, Schedule, TUI, alle Plattformen |
| **Pro** | $9/mo oder $79/yr | Analytics, AI-Optimierung, Team-Mode |
| **Kurs** | $49-79 einmalig | "Build a CLI in Go" Video-Serie basierend auf postctl |

## Nächste Schritte

1. Repo erstellen: `~/Developing/Projects/postctl`
2. `go mod init github.com/aeon022/postctl`
3. Cobra Setup mit Root + Import Command
4. Markdown Parser für unser Post-Format
5. SQLite Store
6. TUI Grundgerüst (Dashboard)
7. Twitter OAuth + Posting
8. LinkedIn + Threads
9. Scheduler
