# Orbiter CMS — AI Project Setup Prompt

Copy the prompt below and paste it into **Claude Code, ChatGPT, or Gemini** to scaffold a complete Astro blog with Orbiter CMS — collections, example content, pages, and a working admin UI — in one shot.

---

## The Prompt

```
You are scaffolding a new Astro blog site using Orbiter CMS (https://orbiter.sh).
Orbiter is a self-hosted CMS where all content, media, schema, and users live in a
single SQLite file called a .pod file. No database server. No cloud dependency.

Your task: set up a complete, working project from scratch — including a seed script
that creates collections and example content, and Astro pages that consume the data.

Follow every step below in order. Run commands as you go. Do not skip steps.

─────────────────────────────────────────────
STEP 1 — Create the Astro project
─────────────────────────────────────────────

Run:
  npm create astro@latest my-site -- --template minimal --install --no-git --yes
  cd my-site

─────────────────────────────────────────────
STEP 2 — Install Orbiter packages
─────────────────────────────────────────────

Run:
  npm install @a83/orbiter-admin @a83/orbiter-integration

Then add these scripts to package.json (merge into existing "scripts"):
  "admin":      "ORBITER_POD=$(pwd)/content.pod node node_modules/@a83/orbiter-admin/src/server.js",
  "admin:dev":  "ORBITER_POD=$(pwd)/content.pod node --watch node_modules/@a83/orbiter-admin/src/server.js"

Note for Windows: replace ORBITER_POD=$(pwd)/... with cross-env ORBITER_POD=%cd%/...
and install cross-env: npm install --save-dev cross-env

─────────────────────────────────────────────
STEP 3 — Configure astro.config.mjs
─────────────────────────────────────────────

Replace the entire contents of astro.config.mjs with:

  import { defineConfig } from 'astro/config';
  import orbiter from '@a83/orbiter-integration';

  export default defineConfig({
    integrations: [
      orbiter({ pod: './content.pod' })
    ]
  });

─────────────────────────────────────────────
STEP 4 — Write a seed script (seed.js)
─────────────────────────────────────────────

Create seed.js in the project root with the following content:

  import { createPod, hashPassword } from '@a83/orbiter-core';
  import { randomUUID } from 'node:crypto';

  const db = createPod('./content.pod', {
    site: {
      name:        'My Orbiter Blog',
      description: 'A blog powered by Orbiter CMS and Astro',
      locale:      'en',
    }
  });

  // ── Collections ──────────────────────────────────────────────────

  db.createCollection('posts', 'Blog Posts', {
    title:    { type: 'text',     label: 'Title',     required: true },
    excerpt:  { type: 'text',     label: 'Excerpt' },
    body:     { type: 'markdown', label: 'Body' },
    date:     { type: 'date',     label: 'Published' },
    cover:    { type: 'media',    label: 'Cover Image' },
    category: { type: 'select',   label: 'Category',  options: ['Tech', 'Design', 'Life'] },
  });

  db.createCollection('authors', 'Authors', {
    name:    { type: 'text', label: 'Name',    required: true },
    bio:     { type: 'text', label: 'Bio' },
    website: { type: 'text', label: 'Website' },
  });

  db.createCollection('pages', 'Pages', {
    title: { type: 'text',     label: 'Title', required: true },
    body:  { type: 'markdown', label: 'Content' },
  });

  // ── Example author ──────────────────────────────────────────────

  db.createEntry('authors', 'jane-doe', {
    name:    'Jane Doe',
    bio:     'Developer and writer. Builds things with Astro and Node.',
    website: 'https://example.com',
  }, 'published');

  // ── Example blog posts ──────────────────────────────────────────

  db.createEntry('posts', 'hello-orbiter', {
    title:    'Hello, Orbiter — Your CMS in One File',
    excerpt:  'Orbiter stores everything in a single .pod file. No servers, no cloud accounts. Here is how it works.',
    date:     '2025-05-01',
    category: 'Tech',
    body: `# Hello, Orbiter

Orbiter is a self-hosted CMS where your entire site lives in a single \`.pod\` file.
That means content, media, schema, users, and sessions — all in one place.

## Why One File?

A single file is the simplest possible deployment artifact. You back it up with \`cp\`.
You move it with \`scp\`. You version it with \`git\`. No database server to provision.
No cloud vendor to sign up with.

## How It Works

1. Run the Orbiter admin server alongside your Astro dev server
2. Create collections and add content in the admin UI (localhost:4322)
3. Astro reads published content at build time via the \`orbiter:collections\` virtual module
4. Deploy your static site — the pod file stays on your server

\`\`\`js
import { getCollection } from 'orbiter:collections';
const posts = await getCollection('posts');
\`\`\`

That is all it takes to read your content in an Astro page.`,
  }, 'published');

  db.createEntry('posts', 'astro-and-sqlite', {
    title:    'Why SQLite is the Right Database for Content Sites',
    excerpt:  'SQLite is fast, zero-config, and runs in-process. For content sites, it beats hosted databases in almost every metric.',
    date:     '2025-05-08',
    category: 'Tech',
    body: `# Why SQLite is the Right Database for Content Sites

When people hear "SQLite" they think toy database. In practice, SQLite handles
millions of reads per day without breaking a sweat — and for a content site
that gets built to static HTML, it never even sees production traffic.

## The Real Advantages

**Zero configuration.** No connection string. No port. No credentials. The database
is a file. You open it the same way you open any file.

**Transactional writes.** SQLite has full ACID compliance. Every save in the Orbiter
admin is an atomic transaction.

**Portable.** Copy the \`.pod\` file to move your entire site. Works on Linux, macOS,
Windows, ARM, anywhere Node.js runs.

## When It Is Not Enough

If you have dozens of concurrent editors hammering the same rows, or a media library
in the gigabytes, SQLite will hit its limits. For a team of 1–10, it is the right tool.`,
  }, 'published');

  db.createEntry('posts', 'deploying-to-railway', {
    title:    'Deploying Your Astro + Orbiter Site to Railway',
    excerpt:  'Railway gives you a persistent filesystem — perfect for the .pod file. Here is a step-by-step guide.',
    date:     '2025-05-15',
    category: 'Tech',
    body: `# Deploying to Railway

Railway is a great host for Orbiter because it provides a persistent filesystem
and a public domain out of the box. Here is how to deploy in 10 minutes.

## Prerequisites

- A Railway account (railway.app)
- Your project in a GitHub repository
- A \`.pod\` file with some content

## Steps

1. Push your project to GitHub
2. Create a new Railway project from your GitHub repo
3. Add an environment variable: \`ORBITER_POD=/app/content.pod\`
4. Mount a persistent volume at \`/app\` so the pod survives redeploys
5. Set the start command to: \`node node_modules/@a83/orbiter-admin/src/server.js\`

Your admin will be available at your Railway domain on port 4322.
Your Astro site rebuilds on every \`git push\`.

## Separating Admin and Frontend

For production, run the admin on a private Railway service and the Astro
frontend on Netlify or Vercel. The admin writes to the pod; Astro reads it
at build time via a webhook-triggered rebuild.`,
  }, 'published');

  // ── About page ──────────────────────────────────────────────────

  db.createEntry('pages', 'about', {
    title: 'About This Site',
    body: `# About

This site is built with [Astro](https://astro.build) and [Orbiter CMS](https://orbiter.sh).

Content is managed through the Orbiter admin interface — a standalone server that runs
alongside the Astro dev server. All content lives in \`content.pod\`, a single SQLite file.

## The Stack

- **Framework:** Astro
- **CMS:** Orbiter
- **Database:** SQLite (.pod file)
- **Hosting:** Your choice — static frontend, persistent server for the admin`,
  }, 'published');

  // ── Admin user ──────────────────────────────────────────────────

  const hashed = await hashPassword('admin');
  db.insertUser(randomUUID(), 'admin', hashed, 'admin');
  console.log('✓ Admin user created — username: admin  password: admin');

  db.close();
  console.log('✓ content.pod seeded successfully');

─────────────────────────────────────────────
STEP 5 — Run the seed script
─────────────────────────────────────────────

Run:
  node seed.js

Expected output:
  ✓ Admin user created — username: admin  password: admin
  ✓ content.pod seeded successfully

─────────────────────────────────────────────
STEP 6 — Create the project file structure
─────────────────────────────────────────────

Create the following files exactly as written below.

────────────────────────────────
FILE: src/layouts/BaseLayout.astro
────────────────────────────────

  ---
  const { title, description = 'A blog powered by Orbiter CMS' } = Astro.props;
  ---
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #0d0d16;
        color: #e2e2ef;
        line-height: 1.6;
        min-height: 100vh;
      }
      a { color: #8b7cf8; text-decoration: none; }
      a:hover { text-decoration: underline; }
      code {
        font-family: ui-monospace, monospace;
        background: rgba(139,124,248,.12);
        border: 1px solid rgba(139,124,248,.2);
        border-radius: 4px;
        padding: 1px 5px;
        font-size: 0.875em;
      }
      .container { max-width: 760px; margin: 0 auto; padding: 0 20px; }
    </style>
  </head>
  <body>
    <slot />
  </body>
  </html>

────────────────────────────────
FILE: src/components/Header.astro
────────────────────────────────

  ---
  const { active } = Astro.props;
  ---
  <header>
    <div class="container">
      <a href="/" class="brand">⊙ My Blog</a>
      <nav>
        <a href="/"      class:list={['nav-link', { active: active === 'home'  }]}>Home</a>
        <a href="/blog"  class:list={['nav-link', { active: active === 'blog'  }]}>Blog</a>
        <a href="/about" class:list={['nav-link', { active: active === 'about' }]}>About</a>
      </nav>
    </div>
  </header>

  <style>
    header {
      border-bottom: 1px solid rgba(139,124,248,.15);
      padding: 16px 0;
      margin-bottom: 48px;
    }
    header .container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand {
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.04em;
      color: #e2e2ef;
    }
    nav { display: flex; gap: 24px; }
    .nav-link { color: #888aaa; font-size: 0.9rem; transition: color .15s; }
    .nav-link:hover, .nav-link.active { color: #e2e2ef; text-decoration: none; }
  </style>

────────────────────────────────
FILE: src/components/PostCard.astro
────────────────────────────────

  ---
  const { post } = Astro.props;
  const date = post.date ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  ---
  <article class="post-card">
    <div class="meta">
      {post.category && <span class="tag">{post.category}</span>}
      {date && <time datetime={post.date}>{date}</time>}
    </div>
    <h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
    {post.excerpt && <p class="excerpt">{post.excerpt}</p>}
    <a href={`/blog/${post.slug}`} class="read-more">Read more →</a>
  </article>

  <style>
    .post-card {
      border: 1px solid rgba(139,124,248,.15);
      border-radius: 12px;
      padding: 24px 28px;
      background: rgba(139,124,248,.04);
      transition: border-color .2s, background .2s;
    }
    .post-card:hover {
      border-color: rgba(139,124,248,.3);
      background: rgba(139,124,248,.07);
    }
    .meta { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .tag {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #8b7cf8;
      background: rgba(139,124,248,.12);
      border: 1px solid rgba(139,124,248,.2);
      border-radius: 99px;
      padding: 2px 10px;
    }
    time { font-size: 0.82rem; color: #666884; }
    h2 { font-size: 1.2rem; margin-bottom: 8px; }
    h2 a { color: #e2e2ef; }
    h2 a:hover { color: #8b7cf8; text-decoration: none; }
    .excerpt { color: #888aaa; font-size: 0.9rem; margin-bottom: 14px; }
    .read-more { font-size: 0.85rem; color: #8b7cf8; font-weight: 500; }
  </style>

────────────────────────────────
FILE: src/pages/index.astro
────────────────────────────────

  ---
  import BaseLayout from '../layouts/BaseLayout.astro';
  import Header from '../components/Header.astro';
  import PostCard from '../components/PostCard.astro';
  import { getCollection } from 'orbiter:collections';

  const allPosts = await getCollection('posts');
  const recent = allPosts
    .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
    .slice(0, 3);
  ---
  <BaseLayout title="My Orbiter Blog">
    <Header active="home" />
    <main class="container">
      <section class="hero">
        <h1>Welcome to My Blog</h1>
        <p>Built with Astro and Orbiter CMS. All content lives in one <code>.pod</code> file.</p>
        <a href="/blog" class="cta">Read all posts →</a>
      </section>

      {recent.length > 0 && (
        <section class="recent">
          <h2>Recent Posts</h2>
          <div class="post-list">
            {recent.map(post => <PostCard post={{ ...post.data, slug: post.slug }} />)}
          </div>
        </section>
      )}
    </main>
  </BaseLayout>

  <style>
    .hero { text-align: center; padding: 64px 0 48px; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 14px; }
    .hero p { color: #888aaa; margin-bottom: 24px; font-size: 1.1rem; }
    .cta {
      display: inline-block;
      background: rgba(139,124,248,.15);
      border: 1px solid rgba(139,124,248,.3);
      color: #8b7cf8;
      border-radius: 8px;
      padding: 10px 24px;
      font-weight: 500;
      transition: background .2s;
    }
    .cta:hover { background: rgba(139,124,248,.25); text-decoration: none; }
    .recent h2 { font-size: 1.3rem; margin-bottom: 20px; color: #888aaa; }
    .post-list { display: flex; flex-direction: column; gap: 16px; }
  </style>

────────────────────────────────
FILE: src/pages/blog/index.astro
────────────────────────────────

  ---
  import BaseLayout from '../../layouts/BaseLayout.astro';
  import Header from '../../components/Header.astro';
  import PostCard from '../../components/PostCard.astro';
  import { getCollection } from 'orbiter:collections';

  const posts = await getCollection('posts');
  const sorted = posts.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  ---
  <BaseLayout title="Blog">
    <Header active="blog" />
    <main class="container">
      <h1>Blog</h1>
      <p class="lead">{sorted.length} {sorted.length === 1 ? 'post' : 'posts'}</p>
      <div class="post-list">
        {sorted.map(post => <PostCard post={{ ...post.data, slug: post.slug }} />)}
      </div>
    </main>
  </BaseLayout>

  <style>
    h1 { font-size: 2rem; margin-bottom: 6px; }
    .lead { color: #666884; margin-bottom: 28px; }
    .post-list { display: flex; flex-direction: column; gap: 16px; }
  </style>

────────────────────────────────
FILE: src/pages/blog/[slug].astro
────────────────────────────────

  ---
  import BaseLayout from '../../layouts/BaseLayout.astro';
  import Header from '../../components/Header.astro';
  import { getCollection, getEntry } from 'orbiter:collections';

  export async function getStaticPaths() {
    const posts = await getCollection('posts');
    return posts.map(post => ({ params: { slug: post.slug } }));
  }

  const { slug } = Astro.params;
  const post = await getEntry('posts', slug);
  if (!post) return Astro.redirect('/blog');

  const date = post.data.date
    ? new Date(post.data.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  ---
  <BaseLayout title={post.data.title} description={post.data.excerpt}>
    <Header active="blog" />
    <main class="container">
      <a href="/blog" class="back">← Back to blog</a>

      <article>
        <div class="meta">
          {post.data.category && <span class="tag">{post.data.category}</span>}
          {date && <time datetime={post.data.date}>{date}</time>}
        </div>

        <h1>{post.data.title}</h1>
        {post.data.excerpt && <p class="excerpt">{post.data.excerpt}</p>}

        <div class="body" set:html={post.data.body?.replace(/\n/g, '<br>') ?? ''} />
      </article>
    </main>
  </BaseLayout>

  <style>
    .back { color: #666884; font-size: 0.875rem; display: block; margin-bottom: 28px; }
    .back:hover { color: #8b7cf8; }
    .meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .tag {
      font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
      color: #8b7cf8; background: rgba(139,124,248,.12); border: 1px solid rgba(139,124,248,.2);
      border-radius: 99px; padding: 2px 10px;
    }
    time { font-size: 0.82rem; color: #666884; }
    h1 { font-size: 2rem; margin-bottom: 12px; line-height: 1.25; }
    .excerpt { color: #888aaa; font-size: 1.05rem; margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid rgba(139,124,248,.1); }
    .body { color: #c8c8df; line-height: 1.8; }
    .body h1, .body h2, .body h3 { color: #e2e2ef; margin: 28px 0 12px; }
    .body p { margin-bottom: 18px; }
    .body a { color: #8b7cf8; }
    .body strong { color: #e2e2ef; }
    .body ul, .body ol { padding-left: 24px; margin-bottom: 18px; }
    .body li { margin-bottom: 6px; }
    .body pre, .body code { font-family: ui-monospace, monospace; font-size: 0.875em; }
    .body pre {
      background: rgba(139,124,248,.08); border: 1px solid rgba(139,124,248,.15);
      border-radius: 8px; padding: 16px 20px; overflow-x: auto; margin-bottom: 18px;
    }
  </style>

────────────────────────────────
FILE: src/pages/about.astro
────────────────────────────────

  ---
  import BaseLayout from '../layouts/BaseLayout.astro';
  import Header from '../components/Header.astro';
  import { getEntry } from 'orbiter:collections';

  const page = await getEntry('pages', 'about');
  ---
  <BaseLayout title="About">
    <Header active="about" />
    <main class="container">
      {page
        ? <div class="body" set:html={page.data.body?.replace(/\n/g, '<br>') ?? ''} />
        : <p>About page not found.</p>
      }
    </main>
  </BaseLayout>

  <style>
    .body { color: #c8c8df; line-height: 1.8; }
    .body h1 { font-size: 2rem; color: #e2e2ef; margin-bottom: 20px; }
    .body h2 { font-size: 1.3rem; color: #e2e2ef; margin: 28px 0 10px; }
    .body p { margin-bottom: 16px; }
    .body a { color: #8b7cf8; }
    .body ul { padding-left: 20px; margin-bottom: 16px; }
    .body strong { color: #e2e2ef; }
  </style>

─────────────────────────────────────────────
STEP 7 — Start the development servers
─────────────────────────────────────────────

Open two terminal windows:

Terminal 1 — Astro dev server (localhost:4321):
  npm run dev

Terminal 2 — Orbiter admin server (localhost:4322):
  npm run admin

─────────────────────────────────────────────
STEP 8 — Verify everything works
─────────────────────────────────────────────

Check these URLs in your browser:

  http://localhost:4321/          → Homepage with 3 recent posts
  http://localhost:4321/blog      → Full blog listing
  http://localhost:4321/blog/hello-orbiter  → First blog post
  http://localhost:4321/about     → About page from the CMS

  http://localhost:4322/          → Orbiter admin (login: admin / admin)

In the admin you can:
- Edit the seeded posts and see changes after Astro hot-reloads
- Add new entries to any collection
- Upload images to the media library
- Change the admin theme (Space / Zen / Catppuccin, glass or classic layout)
- Create new collections with custom schemas

─────────────────────────────────────────────
STEP 9 — Clean up the seed script
─────────────────────────────────────────────

The seed script is no longer needed. Delete it:
  rm seed.js

─────────────────────────────────────────────
EXPECTED PROJECT STRUCTURE
─────────────────────────────────────────────

  my-site/
  ├── astro.config.mjs         ← Orbiter integration wired in
  ├── package.json             ← includes "admin" and "admin:dev" scripts
  ├── content.pod              ← SQLite database with all content (gitignore this for now)
  └── src/
      ├── layouts/
      │   └── BaseLayout.astro
      ├── components/
      │   ├── Header.astro
      │   └── PostCard.astro
      └── pages/
          ├── index.astro      ← homepage
          ├── about.astro      ← about (from CMS)
          └── blog/
              ├── index.astro  ← listing
              └── [slug].astro ← post detail

─────────────────────────────────────────────
TROUBLESHOOTING
─────────────────────────────────────────────

Problem: "Cannot find module '@a83/orbiter-core'"
→ Make sure you ran npm install first. Run: npm install @a83/orbiter-integration @a83/orbiter-admin

Problem: "Cannot open database" when starting the admin
→ ORBITER_POD must be an absolute path. The npm run admin script uses $(pwd) automatically.
  If you are on Windows, use cross-env and %cd% instead of $(pwd).

Problem: Posts do not appear on the Astro site
→ Entries must have status 'published' to appear via orbiter:collections.
  Check the seed script — all createEntry calls use 'published' as the last argument.
  You can also verify in the admin at localhost:4322.

Problem: "Port 4322 is already in use"
→ Another Orbiter admin instance is running. Kill it: lsof -ti:4322 | xargs kill

─────────────────────────────────────────────
NOTES
─────────────────────────────────────────────

- The .pod file is a plain SQLite database. Open it with TablePlus, DBeaver,
  or DB Browser for SQLite to inspect or query your content directly.

- orbiter:collections is a Vite virtual module injected by @a83/orbiter-integration.
  It snapshots all published entries at build/dev time. Changes in the admin
  trigger a Vite hot-module reload automatically.

- The admin runs completely independently of Astro. You can run just the admin
  against any .pod file, or just Astro to build a static site from an existing pod.

- For production, add content.pod to .gitignore and back it up separately,
  or use the orbiter pack/unpack git-sync mode to version media alongside code.

- GitHub: https://github.com/aeon022/orbiter
- Docs:   https://orbiter.sh
- License: MIT
```
