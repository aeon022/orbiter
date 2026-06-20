# LinkedIn — Dual Render (English)

---

**Half your website visitors will soon be AI agents. Are you building for them?**

Google SGE, ChatGPT, Perplexity — they're already reading your website. They don't need your CSS. They need your data.

The old web had one audience: humans. The new web has two. And most websites only serve one.

We call this **Dual Render** — one content source, two output layers:

🧑 **Human Layer**: CSS, typography, images, narrative flow — what visitors see

🤖 **Agent Layer**: /llms.txt content maps, structured JSON feeds, semantic depth metadata — what AI systems consume

Both from the same DOM. No duplication. No separate "API version." One build, two audiences.

What this means in practice:
→ Your content shows up in AI answers, not just search results
→ Agents cite your data instead of someone else's summary
→ You control the narrative in both layers

We're building this into Orbiter, an open-source CMS where everything lives in a single SQLite file. The stack: content in a POD → Astro builds → Dual Render output.

Coming: automatic /llms.txt generation, semantic depth fields in the editor, agent vs. human analytics.

The companies that build for both audiences first will define how AI talks about their industry. Everyone else gets summarized.

→ Dual Render: https://a83tech.com
→ Orbiter: https://github.com/aeon022/orbiter
→ Vision: https://orbiter.sh/vision

#ai #webdev #contentarchitecture #dualrender #opensource
