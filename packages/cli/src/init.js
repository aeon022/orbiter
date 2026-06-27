/**
 * orbiter init
 * Scaffolds a new Astro + Orbiter project.
 *
 * Usage:
 *   orbiter init [project-name]
 */
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createPod, hashPassword } from '@a83/orbiter-core';
import { ask, askSecret, closeRl } from './prompt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = resolve(__dirname, '../templates');

const POD_TEMPLATES = {
  blog: [
    { id: 'posts', label: 'Posts', schema: {
        title:    { type: 'string',   label: 'Title',      required: true },
        body:     { type: 'richtext', label: 'Body' },
        excerpt:  { type: 'string',   label: 'Excerpt' },
        cover:    { type: 'image',    label: 'Cover image' },
        tags:     { type: 'array',    label: 'Tags' },
        author:   { type: 'relation', label: 'Author', collection: 'authors', multiple: false },
    }},
    { id: 'authors', label: 'Authors', schema: {
        title:  { type: 'string', label: 'Name',   required: true },
        bio:    { type: 'string', label: 'Bio' },
        avatar: { type: 'image',  label: 'Avatar' },
    }},
    { id: 'pages', label: 'Pages', schema: {
        title: { type: 'string',   label: 'Title', required: true },
        body:  { type: 'richtext', label: 'Body' },
    }},
  ],
  portfolio: [
    { id: 'projects', label: 'Projects', schema: {
        title:       { type: 'string',   label: 'Title',        required: true },
        body:        { type: 'richtext', label: 'Description' },
        cover:       { type: 'image',    label: 'Cover image' },
        url:         { type: 'url',      label: 'Live URL' },
        tags:        { type: 'array',    label: 'Tech stack' },
        year:        { type: 'number',   label: 'Year' },
        featured:    { type: 'boolean',  label: 'Featured' },
    }},
    { id: 'pages', label: 'Pages', schema: {
        title: { type: 'string',   label: 'Title', required: true },
        body:  { type: 'richtext', label: 'Body' },
    }},
  ],
  docs: [
    { id: 'docs', label: 'Docs', schema: {
        title:   { type: 'string',   label: 'Title',   required: true },
        body:    { type: 'richtext', label: 'Body' },
        section: { type: 'string',   label: 'Section' },
        order:   { type: 'number',   label: 'Order' },
    }},
    { id: 'changelog', label: 'Changelog', schema: {
        title:   { type: 'string',   label: 'Version', required: true },
        body:    { type: 'richtext', label: 'Changes' },
        date:    { type: 'date',     label: 'Date' },
    }},
  ],
};

export async function run(args) {
  console.log(`\n  ◆  Orbiter — Init\n`);

  // Project name
  const nameArg   = args[0] && !args[0].startsWith('-') ? args[0] : null;
  const name      = await ask('Project name', nameArg ?? 'my-orbiter-site');
  const targetDir = resolve(process.cwd(), name);

  if (existsSync(targetDir)) {
    console.error(`\n  ✕  Directory "${name}" already exists.\n`);
    closeRl();
    process.exit(1);
  }

  const siteName  = await ask('Site name', name);
  const locale    = await ask('Default locale', 'en');
  const tmplInput = await ask('Starter template [blog / portfolio / docs / blank]', 'blog');
  const template  = ['blog','portfolio','docs'].includes(tmplInput.trim().toLowerCase())
    ? tmplInput.trim().toLowerCase() : 'blog';

  console.log(`\n  Create admin user:\n`);
  const adminUser = await ask('Admin username', 'admin');
  const adminPw   = await askSecret('Admin password (min 8 chars)');
  if (adminPw.length < 8) {
    console.error('  ✕  Password must be at least 8 characters.');
    closeRl();
    process.exit(1);
  }

  const installDeps = await ask('Install dependencies? [y/n]', 'y');
  closeRl();

  // ── Create project structure ──────────────────────────
  console.log(`\n  Creating project…`);
  mkdirSync(join(targetDir, 'src/pages'),                      { recursive: true });
  mkdirSync(join(targetDir, 'public'),                         { recursive: true });
  mkdirSync(join(targetDir, '.github/workflows'),              { recursive: true });

  // package.json
  const pkgRaw = readFileSync(join(templatesDir, 'package.json'), 'utf8');
  writeFileSync(join(targetDir, 'package.json'), pkgRaw.replace('"{{name}}"', JSON.stringify(name)));

  // astro.config.mjs
  copyFileSync(join(templatesDir, 'astro.config.mjs'), join(targetDir, 'astro.config.mjs'));

  // tsconfig.json
  copyFileSync(join(templatesDir, 'tsconfig.json'), join(targetDir, 'tsconfig.json'));

  // src/content.config.ts (Content Layer)
  copyFileSync(join(templatesDir, 'content.config.ts'), join(targetDir, 'src/content.config.ts'));

  // src/pages/index.astro + posts/[slug].astro
  mkdirSync(join(targetDir, 'src/pages/posts'), { recursive: true });
  copyFileSync(join(templatesDir, 'index.astro'), join(targetDir, 'src/pages/index.astro'));
  copyFileSync(join(templatesDir, 'post.astro'),  join(targetDir, 'src/pages/posts/[slug].astro'));

  // .github/workflows/orbiter-build.yml
  copyFileSync(
    join(templatesDir, 'orbiter-build.yml'),
    join(targetDir, '.github/workflows/orbiter-build.yml'),
  );

  // .gitignore — pod must be committed so CI can read content
  writeFileSync(join(targetDir, '.gitignore'), [
    'node_modules',
    'dist',
    '.env',
  ].join('\n') + '\n');

  // ── Create .pod ───────────────────────────────────────
  console.log('  Creating pod…');
  const podPath = join(targetDir, 'content.pod');
  const db = createPod(podPath, {
    site: { name: siteName, locale },
  });

  // Seed collections based on starter template
  const seedCollections = POD_TEMPLATES[template] ?? POD_TEMPLATES.blog;
  const colStmt = db.db.prepare(
    `INSERT OR IGNORE INTO _collections (id, label, schema, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  );
  for (const col of seedCollections) colStmt.run(col.id, col.label, JSON.stringify(col.schema));

  // Create admin user
  const hash = await hashPassword(adminPw);
  db.insertUser(randomUUID(), adminUser, hash, 'admin');
  db.close();

  // ── Install deps ──────────────────────────────────────
  if (installDeps.toLowerCase() !== 'n') {
    console.log('  Installing dependencies…');
    try {
      execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
    } catch {
      console.warn('  ⚠  npm install failed — run it manually.');
    }
  }

  // ── Done ──────────────────────────────────────────────
  console.log(`
  ✓  Project created: ${targetDir}

  Next steps:
    cd ${name}
    npm run admin      # Admin panel → http://localhost:4322
    npm run dev        # Astro site  → http://localhost:4321

    (or run both at once: npm run dev:all)

  Login: ${adminUser} / (your password)
`);
}
