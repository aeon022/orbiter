/**
 * orbiter backup
 * Creates a timestamped copy of a .pod file.
 *
 * Usage:
 *   orbiter backup [--pod <path>] [--out <dir>]
 */
import { resolve, basename, dirname } from 'node:path';
import { existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';

function parseArgs(args) {
  const opts = { pod: './content.pod', out: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pod' && args[i + 1]) opts.pod = args[++i];
    else if (args[i] === '--out' && args[i + 1]) opts.out = args[++i];
  }
  return opts;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function run(args) {
  const opts = parseArgs(args);
  const podPath = resolve(process.cwd(), opts.pod);

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }

  const name = basename(podPath, '.pod');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `${name}-backup-${ts}.pod`;
  const outDir = opts.out ? resolve(process.cwd(), opts.out) : dirname(podPath);
  const backupPath = resolve(outDir, backupName);

  if (opts.out) mkdirSync(outDir, { recursive: true });

  copyFileSync(podPath, backupPath);
  const size = statSync(backupPath).size;

  console.log(`\n  ◆  Orbiter — Backup\n`);
  console.log(`  Source:  ${podPath}`);
  console.log(`  Backup:  ${backupPath}`);
  console.log(`  Size:    ${formatSize(size)}`);
  console.log(`\n  ✓  Backup created.\n`);
}
