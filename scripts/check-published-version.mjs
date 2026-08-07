#!/usr/bin/env node
/**
 * Fails if a package's local version isn't strictly greater than what's
 * already published on npm. Prevents shipping source changes under an
 * already-published version number (see commit a94809f — a fix landed
 * without a version bump and silently sat unpublished).
 *
 * Usage:
 *   node scripts/check-published-version.mjs [dir]   # defaults to cwd
 *
 * Used both as each package's `prepublishOnly` hook (npm sets cwd to the
 * package dir) and from CI, passed an explicit packages/<name> dir.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const targetDir = resolve(process.argv[2] || process.cwd());
const pkgPath = join(targetDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

if (pkg.private) {
  console.log(`[version-guard] ${pkg.name ?? targetDir}: private, skipping`);
  process.exit(0);
}

function parseVersion(v) {
  const core = String(v).split(/[-+]/)[0];
  const parts = core.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isGreater(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

let publishedVersion;
try {
  const stdout = execFileSync('npm', ['view', pkg.name, 'version', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  publishedVersion = JSON.parse(stdout);
} catch (err) {
  let parsed = null;
  try { parsed = JSON.parse(String(err.stdout ?? '')); } catch { /* not JSON */ }

  if (parsed?.error?.code === 'E404') {
    console.log(`[version-guard] ${pkg.name}: not yet published on npm — first publish, OK`);
    process.exit(0);
  }

  console.error(`[version-guard] ${pkg.name}: failed to look up published version on npm`);
  console.error(String(err.stderr ?? err.message ?? err));
  process.exit(1);
}

const publishedStr = Array.isArray(publishedVersion) ? publishedVersion.at(-1) : publishedVersion;

if (!isGreater(parseVersion(pkg.version), parseVersion(publishedStr))) {
  console.error(
    `[version-guard] ${pkg.name}: local version ${pkg.version} is not greater than the published ${publishedStr}.\n` +
    `  Bump "version" in ${pkgPath} before publishing.`
  );
  process.exit(1);
}

console.log(`[version-guard] ${pkg.name}: OK (local ${pkg.version} > published ${publishedStr})`);
