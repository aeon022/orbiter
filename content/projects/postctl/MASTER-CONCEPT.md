# postctl — Master Concept

## The Problem

Developers and indie hackers spend hours on social media distribution:
- Write a post in one format, manually rewrite for each platform
- Copy-paste between browser tabs, lose track of what was posted where
- No version control on posts — edits are lost
- Scheduling tools are web-based SaaS with monthly subscriptions
- AI assistants can't interact with Buffer/Hootsuite/Typefully directly
- No integration between content creation (CMS) and distribution

## The Solution

**postctl** — a terminal-native social media CLI that treats posts like code.

```
Write (Markdown) → Preview (TUI) → Distribute (API) → Learn (Analytics)
```

Posts live as Markdown files in your repo. You write them in your editor, preview them in the terminal, and publish them with a command. AI assistants can create, review, and publish posts by calling CLI commands — no browser automation needed.

## Core Principles

### 1. Markdown is the source of truth
Posts are `.md` files with YAML frontmatter. They live in your project repo, are version-controlled with git, and can be reviewed in PRs. No proprietary format, no cloud database.

### 2. Terminal-native, not browser-native
Your workflow stays in the terminal. No context-switching to a web app. The TUI gives you a dashboard, post preview, and scheduling — all without leaving your terminal.

### 3. AI-first automation
Every action is a CLI command. Claude, GPT, or any AI assistant can:
- `postctl import ./posts/` — import markdown posts
- `postctl post <id> --dry-run` — preview before posting
- `postctl post <id>` — publish to platforms
- `postctl schedule <id> "2026-07-01 09:00"` — schedule posts
- `postctl generate https://my-blog.com/article` — generate social posts from content

No Selenium, no Puppeteer, no browser automation. Direct API calls.

### 4. Single binary, zero infrastructure
`go install github.com/aeon022/postctl@latest` — done. No Docker, no Node.js, no Python, no database server. One binary, runs everywhere. SQLite for local state.

### 5. Part of the content ecosystem
postctl connects to Orbiter CMS:

```
┌──────────┐     ┌──────────┐     ┌───────────┐
│  Orbiter  │ ──→ │  postctl  │ ──→ │ Platforms │
│  (Create) │     │(Distribute)│    │(Twitter,  │
│           │     │           │     │ LinkedIn, │
│  POD file │     │ Markdown  │     │ Threads)  │
└──────────┘     └──────────┘     └───────────┘
       ↑                                │
       │         ┌───────────┐          │
       └──────── │ Analytics  │ ←───────┘
                 │  (Learn)   │
                 └───────────┘
```

## User Personas

### 1. Solo Developer / Indie Hacker
- Ships features, needs to announce them
- Already lives in the terminal
- Wants to spend 10 minutes on distribution, not 2 hours
- Doesn't want another $20/month SaaS
- **Tier**: Core (free)

### 2. Developer Advocate / Content Creator
- Posts 3-5 times per week across platforms
- Needs scheduling and analytics
- Wants AI to help repurpose content
- Willing to pay for productivity
- **Tier**: Pro ($9/month)

### 3. Go Learner
- Wants to learn Go with a real project
- Follows the tutorial, builds postctl step by step
- Might buy the full course
- **Tier**: Course ($49-79)

## Competitive Landscape

### Name Availability (checked 2026-06-21)

| Registry | Status |
|----------|--------|
| GitHub repos | **0 results** — name is free |
| npm | **not found** — name is free |
| PyPI | **not found** — name is free |
| Go pkg.go.dev | 4 internal subpackages in other projects (0 imports, 0 stars) — no conflict |
| Domain postctl.com | to be checked |

### SaaS Tools (Web-based)

| Tool | Price | Platforms | Limitation |
|------|-------|-----------|------------|
| Buffer | $6-120/mo | 8+ | Browser-only, no CLI, no AI integration |
| Hootsuite | $99+/mo | 10+ | Enterprise pricing, bloated |
| Typefully | $0-29/mo | Twitter, LinkedIn, Threads | Browser-only, no import |
| Later | $0-80/mo | 7+ | Instagram-focused |

### Open Source (Self-hosted Web)

| Tool | Stars | Language | Platforms | Limitation |
|------|-------|----------|-----------|------------|
| Brightbean | 1,900 | Python | 10+ | Web UI only, no CLI, heavy setup |
| TryPost | 286 | PHP/Laravel | 8 | Web UI, requires Laravel stack |
| DemandBird | 6 | TypeScript | 6 | Web UI, AI-native but early stage |

### CLI Tools

| Tool | Stars | Language | Platforms | Limitation |
|------|-------|----------|-----------|------------|
| xmaster-cli | 6 | Rust | Twitter only | Single platform, no scheduling |
| **postctl** | **—** | **Go** | **Twitter, LinkedIn, Threads** | **—** |

### The Gap

**There is no serious CLI tool for multi-platform social media posting.**

- SaaS tools are browser-based, subscription-heavy, and can't be automated by AI
- Open-source tools are all web UIs requiring full server stacks
- The only CLI tool (xmaster-cli) supports only Twitter with 6 stars

**postctl fills this gap**: terminal-native, markdown-first, multi-platform, AI-automatable, single binary, freemium.

### Why postctl wins

| Feature | Buffer | Typefully | xmaster-cli | **postctl** |
|---------|--------|-----------|-------------|-------------|
| CLI / Terminal | ✗ | ✗ | ✓ | **✓** |
| Multi-platform | ✓ | partial | ✗ | **✓** |
| Markdown-first | ✗ | ✗ | ✗ | **✓** |
| AI-automatable | ✗ | ✗ | ✓ | **✓** |
| Git-versionable posts | ✗ | ✗ | ✗ | **✓** |
| Offline-first | ✗ | ✗ | ✓ | **✓** |
| Single binary | ✗ | ✗ | ✓ | **✓** |
| Free tier | limited | limited | ✓ | **✓** |
| Thread support | ✓ | ✓ | ✓ | **✓** |
| Scheduling | ✓ | ✓ | ✓ | **✓** |
| Analytics | ✓ | ✓ | ✗ | **Pro** |
| AI content gen | ✗ | ✓ (built-in) | ✗ | **Pro** |

## Revenue Model

### Phase 1: Build reputation (Month 1-3)
- Ship open-source Core
- Dev.to blog series (Go tutorial, free)
- Twitter threads about building in public
- Revenue: $0

### Phase 2: Monetize knowledge (Month 3-6)
- Launch Go course ($49-79)
- First Pro subscribers
- Target: 50 course sales + 20 Pro subscribers
- Revenue: ~$2,500-4,000 + $180/month recurring

### Phase 3: Scale Pro (Month 6-12)
- AI features (generate, repurpose)
- Analytics dashboard
- Target: 100 Pro subscribers
- Revenue: ~$900/month recurring + course long tail

### Phase 4: Ecosystem (Month 12+)
- Orbiter integration (`orbiter export --to-postctl`)
- postctl cloud for non-developers (if demand)
- Template marketplace
- Revenue: $2,000-5,000/month

## Technical Differentiators

### Why Go?
- **Single binary** — no runtime, no dependencies, no `npm install`
- **Cross-platform** — macOS, Linux, Windows from one codebase
- **Fast startup** — <50ms cold start (vs. Node.js 200ms+)
- **Concurrency** — goroutines for parallel platform posting
- **Small binary** — <20MB (vs. Electron 100MB+)

### Why SQLite?
- Same approach as Orbiter — one file, portable, no server
- Posts, schedule, history, auth tokens — all in `~/.config/postctl/postctl.db`
- Copy the file = backup everything

### Why Bubbletea?
- Elm architecture = predictable, testable UI
- Rich component library (Bubbles)
- Beautiful output (Lipgloss)
- Same TUI patterns used by GitHub CLI, Charm tools

## Content Strategy for postctl

### Launch Sequence
1. **Week -2**: "I'm building a CLI for social media in Go" tweet thread
2. **Week -1**: Dev.to article — Phase 1+2 of the Go tutorial (free teaser)
3. **Launch day**: 
   - GitHub repo goes public
   - Show HN post
   - Twitter thread with demo GIF
   - Dev.to launch article
4. **Week +1**: LinkedIn professional post + Threads
5. **Week +2**: Course announcement + early bird pricing

### Ongoing
- Weekly "build in public" tweet about postctl development
- Monthly Dev.to article (tutorial chapter or feature deep-dive)
- Every feature release: Twitter thread + LinkedIn post (via postctl itself — dogfooding)

## Success Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| GitHub stars | 200 | 500 | 1,500 |
| npm/go installs | 100 | 500 | 2,000 |
| Pro subscribers | — | 20 | 100 |
| Course sales | — | 50 | 150 |
| MRR | $0 | $180 | $900 |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Twitter API pricing changes | Multi-platform — not dependent on one API |
| Low developer adoption | Go tutorial as separate acquisition channel |
| Pro features not compelling enough | Ship analytics first — most requested feature |
| Time investment too high | Start with Core only, Pro later |
| AI tools make this obsolete | AI can use postctl as a tool — it's complementary, not competing |

## One-liner

**postctl: social media from the terminal — write in Markdown, post everywhere, track what works.**
