# Hacker News — Dual Render

## Title

Dual Render: Why your website needs a human layer and an agent layer

## URL

https://a83tech.com

## Comment

I've been thinking about how the web is splitting into two audiences — and building accordingly.

The idea: instead of treating AI agents as crawlers to block or ignore, actively architect your content for them. Same DOM, two renderings. CSS controls the human layer (visual, narrative). Structured endpoints (/llms.txt, /feed.json, semantic depth metadata) serve the agent layer.

We call it Dual Render. The concept page explains it in detail: https://a83tech.com

The practical implementation is happening inside Orbiter (https://github.com/aeon022/orbiter), an open-source CMS for Astro where everything lives in a single SQLite file. The roadmap includes:

- /llms.txt auto-generation during astro build — a curated content map for LLMs, no manual maintenance
- Semantic depth fields in the CMS — tag content as "surface" or "deep" so agents can choose their detail level
- Agent analytics — distinguish human vs. agent traffic, see what % of your readers are AI systems

The premise: if your content isn't structured for agents, you're invisible to the fastest-growing audience on the web. The companies that build for both audiences first will define how AI talks about their domain.

Vision page with the full roadmap and animated diagrams: https://orbiter.sh/vision
