/**
 * orbiter doctor
 * Checks a pod for security problems and says how to fix them.
 *
 * Usage:
 *   orbiter doctor [pod-path]      exit code 1 if anything failed
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openPod, securityChecks, isTrackedByGit } from '@a83/orbiter-core';

const ICON = { ok: '✓', warn: '⚠', fail: '✕' };

export function run(args) {
  const podArg  = args.find(a => !a.startsWith('-')) ?? null;
  const podPath = resolve(process.cwd(), podArg ?? 'content.pod');
  if (!existsSync(podPath)) { console.error(`\n  ✕  Pod not found: ${podPath}\n`); process.exit(1); }

  const db = openPod(podPath);
  const findings = securityChecks(db, { gitTracked: isTrackedByGit(podPath) });
  db.close();

  console.log('\n  ◆  Orbiter Doctor\n');
  for (const f of findings) {
    console.log(`  ${ICON[f.level]}  ${f.message}`);
    if (f.fix && f.level !== 'ok') console.log(`       → ${f.fix}`);
  }
  const fails = findings.filter(f => f.level === 'fail').length;
  const warns = findings.filter(f => f.level === 'warn').length;
  console.log(`\n  ${fails} failed · ${warns} warning${warns === 1 ? '' : 's'}\n`);
  if (fails) process.exit(1);
}
