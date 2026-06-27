/**
 * orbiter sync
 * Push/pull a .pod file to/from a remote server via rsync.
 *
 * Usage:
 *   orbiter sync --remote user@host:/path/content.pod [--pod ./content.pod] [--pull]
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

function arg(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

export function run(args) {
  const remote  = arg(args, '--remote');
  const podArg  = arg(args, '--pod') ?? 'content.pod';
  const isPull  = args.includes('--pull');
  const podPath = resolve(process.cwd(), podArg);

  if (!remote) {
    console.error('\n  ✕  --remote is required: user@host:/path/to/content.pod\n');
    process.exit(1);
  }
  if (!isPull && !existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }

  const src = isPull ? remote : podPath;
  const dst = isPull ? podPath : remote;
  const dir = isPull ? '↓ pull' : '↑ push';

  console.log(`\n  ◆  Orbiter Sync — ${dir}\n  ${src}  →  ${dst}\n`);
  try {
    execSync(`rsync -avz --progress "${src}" "${dst}"`, { stdio: 'inherit' });
    console.log('\n  ✓  Sync complete.\n');
  } catch {
    process.exit(1);
  }
}
