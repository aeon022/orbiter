---
title: "Your next visitor isn't human — why your website needs two layers"
tags: webdev, ai, architecture, cms
canonical_url: https://a83tech.com
cover_image: # TODO: dual render diagram screenshot from orbiter.sh/vision
---

# Your next visitor isn't human — why your website needs two layers

Half of your website's "visitors" will soon be AI agents. Not bots scraping content — intelligent systems that search, compare, summarize, and answer questions using your data.

Google SGE. ChatGPT Browse. Perplexity. Claude. They're already reading your pages. And they don't care about your CSS.

## The problem

Today, websites are built for one audience: humans. Typography, color, layout, animation — all of it serves the human eye. But AI agents reading the same page get a soup of divs, classes, and presentation markup. They have to *reverse-engineer* the structure from the styling.

This worked when crawlers were simple. It breaks when the crawler is smarter than most of your readers.

## The shift: from blocking to building

The old approach was `robots.txt` — decide who's allowed in. The new approach is **Dual Render**: actively architect your content for both audiences.

One DOM. Two renderings. CSS-controlled semantic depth.

## How Dual Render works

Instead of maintaining two versions of your content (one for humans, one for machines), you build a single structured source and render it differently based on who's reading.

**Human Layer** — what your visitors see:
- CSS layout and typography
- Images, video, animation
- Narrative flow and visual hierarchy
- Progressive disclosure via scroll and interaction

**Agent Layer** — what AI systems consume:
- `/llms.txt` — a structured content map, like `sitemap.xml` but for LLMs
- `/feed.json` — your content as structured data, schema-aware
- Semantic depth metadata — paragraphs tagged as "surface" or "deep" so agents can choose their level of detail
- RAG-ready format — optimized for retrieval-augmented generation

Both layers come from the same source. No duplication. No sync issues. One build produces both.

## The stack

```
Content (CMS)  →  Build (SSG)  →  Dual Render
                                    ├── Human Layer
                                    └── Agent Layer
```

We're building this into [Orbiter](https://github.com/aeon022/orbiter), a single-file CMS for Astro. The content lives in one SQLite file (a POD). Astro builds the site. The output serves both audiences.

Coming soon:
- **`/llms.txt` auto-generation** at every build — no manual maintenance
- **Semantic depth fields** in the CMS — mark content as surface or deep
- **Agent analytics** — see what percentage of your readers are AI systems

## Why this matters now

If your content isn't structured for agents, you're invisible to the fastest-growing audience on the web. Not in 5 years — now.

The companies that build for both audiences first will own the narrative. Everyone else will be summarized by someone else's agent reading someone else's structured data.

## Try it

- **Dual Render concept**: [a83tech.com](https://a83tech.com)
- **Orbiter CMS**: [github.com/aeon022/orbiter](https://github.com/aeon022/orbiter)
- **Vision & Roadmap**: [orbiter.sh/vision](https://orbiter.sh/vision)

The web is splitting into two layers. Build for both.
