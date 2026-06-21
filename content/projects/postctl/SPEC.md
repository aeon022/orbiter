# postctl — Specification

## Overview

**postctl** is a TUI CLI tool written in Go that manages social media postings across Twitter/X, LinkedIn, and Threads. Posts are authored as Markdown files, imported into a local SQLite database, previewed in a terminal UI, and published via platform APIs — immediately or on a schedule.

## User Stories

### As a solo developer / indie hacker:
- I want to write posts as Markdown files in my repo
- I want to preview how a Twitter thread will look before posting
- I want to schedule posts for optimal timing across time zones
- I want to post the same content to multiple platforms with one command
- I want to see what I've posted and when
- I want character count validation before posting (280 chars per tweet)

### As an AI assistant:
- I want to create properly formatted Markdown posts
- I want to trigger posting via CLI commands
- I want to check post status and history

## Core Workflows

### 1. Import Workflow
```
Markdown files → postctl import → SQLite DB
                                    ↓
                              Posts with status "draft"
```

**Input**: Directory of `.md` files with YAML frontmatter
**Processing**:
- Parse frontmatter (platform, type, language, campaign, schedule, images)
- Parse body into tweets (split on `## Tweet N` headers)
- Detect reply section (`## Reply`)
- Validate: character count per tweet (≤280), image paths exist
- Generate deterministic ID from filename + platform
- Insert/update in SQLite (upsert on ID)

**Output**: Posts in DB with status `draft` or `scheduled` (if `schedule:` frontmatter present)

### 2. Preview Workflow
```
postctl (no args) → TUI
                      ↓
              Dashboard → Post list → Detail view
                                        ↓
                                   Tweet-by-tweet preview
                                   with char count + image indicators
```

### 3. Post Workflow
```
postctl post <id> → Load from DB → Validate → API Call → Update status
                                                ↓
                                          Upload images first
                                          Then post text with media IDs
                                          For threads: post sequentially,
                                          reply to previous tweet ID
```

**Thread posting sequence**:
1. Upload all images → get media IDs
2. Post Tweet 1 → get tweet ID
3. Post Tweet 2 as reply to Tweet 1 → get tweet ID
4. Post Tweet 3 as reply to Tweet 2 → ...
5. Post Reply tweet as reply to last tweet
6. Update DB: status = "posted", platform_id = first tweet ID

**Error handling**:
- If tweet N fails: mark post as "partial", store last successful tweet ID
- Retry: resume from the failed tweet (don't re-post successful ones)
- Rate limit hit: wait and retry with exponential backoff

### 4. Schedule Workflow
```
postctl schedule <id> "2026-06-23 09:00"
       ↓
  Update DB: status = "scheduled", scheduled_at = datetime
       ↓
  Scheduler daemon picks it up at the right time
       ↓
  Same as Post Workflow
```

**Scheduler**:
- Runs as background goroutine when TUI is open
- Also runs as `postctl daemon` for headless mode
- Checks every 30 seconds for due posts
- Posts in order of scheduled_at

### 5. Auth Workflow
```
postctl auth twitter
       ↓
  Open browser → Twitter OAuth consent page
       ↓
  Local HTTP server on :8753 catches callback
       ↓
  Exchange code for token
       ↓
  Store encrypted token in SQLite
```

## Markdown Format Spec

### Frontmatter Fields

| Field | Required | Type | Values | Default |
|-------|----------|------|--------|---------|
| `platform` | yes | string | `twitter`, `linkedin`, `threads`, `all` | — |
| `type` | yes | string | `thread`, `single`, `article` | — |
| `language` | no | string | ISO 639-1 (`en`, `de`) | `en` |
| `campaign` | no | string | freeform slug | — |
| `schedule` | no | datetime | ISO 8601 local | — |
| `images` | no | list | relative file paths | — |
| `tags` | no | list | hashtags without # | — |

### Body Format

**Single post** (LinkedIn, Threads):
```markdown
---
platform: linkedin
type: single
---

The entire post body goes here.
Multiple paragraphs supported.
```

**Thread** (Twitter):
```markdown
---
platform: twitter
type: thread
images:
  - screenshots/01-dashboard.png
---

## Tweet 1

First tweet content. No links here for algorithmic reach.

## Tweet 2

Second tweet. Attach image: screenshots/01-dashboard.png

## Tweet 3

Third tweet content.

## Reply

Links and hashtags go in the self-reply.
github.com/aeon022/orbiter

#opensource #webdev
```

**Rules**:
- `## Tweet N` splits into individual tweets
- `## Reply` is posted as a reply to the last tweet
- Image assignment: first image in `images:` list goes to Tweet 2, second to Tweet 3, etc. Or use `<!-- image: filename.png -->` inline
- Character count: ≤280 per tweet (URLs count as 23 chars per Twitter's t.co)
- Empty tweets are skipped

## Platform API Details

### Twitter/X v2

**Auth**: OAuth 2.0 with PKCE
```
GET https://twitter.com/i/oauth2/authorize
  ?client_id=...
  &redirect_uri=http://localhost:8753/callback
  &scope=tweet.read+tweet.write+users.read+offline.access
  &response_type=code
  &code_challenge=...
  &code_challenge_method=S256
  &state=...
```

**Post tweet**:
```
POST https://api.twitter.com/2/tweets
Authorization: Bearer <token>
Content-Type: application/json

{"text": "...", "media": {"media_ids": ["..."]}, "reply": {"in_reply_to_tweet_id": "..."}}
```

**Upload media** (v1.1 — still required):
```
POST https://upload.twitter.com/1.1/media/upload.json
Content-Type: multipart/form-data

media_data=<base64>
```

### LinkedIn v2

**Post**:
```
POST https://api.linkedin.com/v2/ugcPosts
Authorization: Bearer <token>

{
  "author": "urn:li:person:<id>",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {"text": "..."},
      "shareMediaCategory": "IMAGE",
      "media": [{"status": "READY", "media": "<asset-urn>"}]
    }
  },
  "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
}
```

**Image upload** (2-step):
1. Register: `POST /v2/assets?action=registerUpload` → get upload URL + asset URN
2. Upload: `PUT <upload-url>` with binary image data

### Threads (Meta Graph API)

**Create container**:
```
POST https://graph.threads.net/v1.0/<user_id>/threads
  ?media_type=TEXT
  &text=...
  &access_token=...
```

**Publish**:
```
POST https://graph.threads.net/v1.0/<user_id>/threads_publish
  ?creation_id=<container_id>
  &access_token=...
```

## Error Handling Strategy

| Error | Action |
|-------|--------|
| Rate limit (429) | Wait `retry-after` header, then retry |
| Auth expired (401) | Attempt token refresh, if fails prompt re-auth |
| Network error | Retry 3x with exponential backoff (1s, 4s, 16s) |
| Partial thread | Mark as "partial", store progress, allow resume |
| Invalid content | Validation error before API call, show in TUI |
| Image too large | Resize with Go image library before upload |

## Non-Goals (v1)

- No web dashboard
- No multi-user / team features
- No built-in image generation
- No automatic cross-posting (explicit per platform)

## Success Metrics

- Import 20 Markdown posts in <1 second
- Post a 6-tweet thread with 2 images in <10 seconds
- TUI renders at 60fps on standard terminal
- Single binary, <20MB, no runtime dependencies
- Works on macOS, Linux, Windows

---

## Future Features (v2+)

### `postctl generate`
AI generiert Posts aus einer URL oder einem Markdown-Artikel.
- Input: URL, Markdown-Datei, oder freier Text
- Output: Thread-Draft + LinkedIn-Post + Threads-Post als Markdown
- Nutzt Claude API, OpenAI API, oder Ollama (lokal)
- User reviewt und editiert vor dem Posten

### `postctl repurpose`
Nimmt einen bestehenden Post und konvertiert ihn für andere Plattformen.
- Dev.to Artikel → Twitter Thread + LinkedIn + Threads
- Twitter Thread → LinkedIn Langpost
- Passt Länge, Ton, Hashtags automatisch an

### `postctl analytics`
Engagement-Daten von den APIs nach dem Posten holen.
- Likes, Retweets, Impressions (Twitter)
- Reactions, Comments (LinkedIn)
- Beste Posting-Zeiten ermitteln
- Terminal-Dashboard mit Sparklines

### `postctl template`
Vorgefertigte Post-Strukturen.
- `postctl template launch` — Product Launch Announcement
- `postctl template feature` — Feature Update Thread
- `postctl template thought` — Thought Leadership Post
- Generiert Markdown-Datei mit Platzhaltern

---

## Monetarisierung

### postctl (Open Source, gratis)
Das CLI-Tool ist MIT-lizenziert. Baut Reputation und Community.

### postctl pro ($9/Monat oder $79/Jahr)
Premium-Features als bezahlte Erweiterung:
- **Analytics-Dashboard** — Engagement pro Post, beste Posting-Zeiten, Wachstum über Zeit
- **AI-Optimierung** — Claude/GPT rewritet Posts für maximale Reichweite (A/B-Vorschläge)
- **Team-Mode** — mehrere Leute posten unter einem Account, Approval-Workflow
- **Priority Support** — GitHub Issues mit SLA
- Implementierung: License Key in `~/.config/postctl/config.yaml`, Feature-Gates im Code

### postctl cloud (Future — $19/Monat)
Gehostete Version für Nicht-Entwickler.
- Web-UI statt Terminal
- Managed Scheduling (kein eigener Rechner muss laufen)
- Status: niedrige Priorität, nur wenn Nachfrage da ist

### Go Tutorial als Kurs ($49-79 einmalig)
Das Tutorial das wir parallel schreiben wird zum bezahlten Produkt:
- "Build a real CLI tool in Go" — Video-Serie
- postctl als Projekt-Basis, 7 Phasen
- Plattform: eigene Seite, Udemy, oder Lemon Squeezy
- Gratis-Teaser: erste 2 Phasen als Blog-Posts auf Dev.to

---

## Ökosystem-Vision

postctl ist Teil eines Content-Loops:

```
Orbiter (Create) → postctl (Distribute) → Analytics (Learn) → Orbiter (Improve)
```

1. Content in Orbiter schreiben (Blog Posts, Pages)
2. Posts als Markdown exportieren / generieren
3. postctl verteilt auf Twitter, LinkedIn, Threads
4. Analytics zeigt was funktioniert
5. Insights fließen in nächsten Content-Zyklus

Langfristig: `orbiter export --to-postctl` als Integration.

---

## Projekt-Setup

```
Repository: ~/Developing/Projects/postctl
Module:     github.com/aeon022/postctl
License:    MIT
```
