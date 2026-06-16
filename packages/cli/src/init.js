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

  const siteName = await ask('Site name', name);
  const locale   = await ask('Default locale', 'en');

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

  // src/pages/index.astro
  copyFileSync(join(templatesDir, 'index.astro'), join(targetDir, 'src/pages/index.astro'));

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

  // Seed a default "posts" collection
  db.db.prepare(
    `INSERT OR IGNORE INTO _collections (id, label, schema, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run('posts', 'Posts', JSON.stringify({
    title: { type: 'string',   label: 'Title' },
    body:  { type: 'markdown', label: 'Body'  },
  }));

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
