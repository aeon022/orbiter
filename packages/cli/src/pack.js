/**
 * orbiter pack
 * Re-inserts media files from a media/ directory back into the pod as BLOBs.
 * Restores a self-contained .pod from a git-unpacked repo.
 *
 * Usage:
 *   orbiter pack [--pod ./content.pod] [--media-dir ./media]
 */
import { resolve, join, basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { openPod } from '@a83/orbiter-core';

export async function run(args) {
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : fallback;
  };

  const podPath  = resolve(process.cwd(), get('--pod', './content.pod'));
  const mediaDir = resolve(process.cwd(), get('--media-dir', './media'));
  const podDir   = resolve(podPath, '..');
  const indexPath = join(podDir, 'media-index.json');

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }
  if (!existsSync(indexPath)) {
    console.error(`\n  ✕  media-index.json not found at ${indexPath}`);
    console.error(`     Run "orbiter unpack" first or check the path.\n`);
    process.exit(1);
  }

  console.log(`\n  ◆  Orbiter — Pack\n`);
  console.log(`     Pod:       ${podPath}`);
  console.log(`     Media dir: ${mediaDir}\n`);

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const db    = openPod(podPath);
  const stmt  = db.db.prepare('UPDATE _media SET data = ? WHERE id = ?');

  let packed  = 0;
  let missing = 0;

  const packAll = db.db.transaction(() => {
    for (const entry of index.media) {
      if (!entry.file) { missing++; continue; }
      const filePath = join(mediaDir, basename(entry.file));
      if (!existsSync(filePath)) {
        console.warn(`  ⚠  Missing file: ${entry.file} (id: ${entry.id})`);
        missing++;
        continue;
      }
      const data = readFileSync(filePath);
      stmt.run(data, entry.id);
      packed++;
    }
  });
  packAll();

  // Remove git-mode flag
  db.db.prepare("DELETE FROM _meta WHERE key = 'storage.mode'").run();
  db.close();

  console.log(`  ✓  ${packed} files packed into pod`);
  if (missing) console.log(`  ⚠  ${missing} files missing or skipped`);
  console.log(`  ✓  Pod is now self-contained\n`);
}
