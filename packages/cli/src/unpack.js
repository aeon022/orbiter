/**
 * orbiter unpack
 * Extracts media BLOBs from a .pod file into a media/ directory.
 * The pod is left with empty BLOB data (lean pod — suitable for git).
 * Run `orbiter pack` to restore a self-contained pod from the files.
 *
 * Usage:
 *   orbiter unpack [--pod ./content.pod] [--media-dir ./media]
 */
import { resolve, join, extname } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { openPod } from '@a83/orbiter-core';

const MIME_EXT = {
  'image/jpeg':      '.jpg',
  'image/png':       '.png',
  'image/gif':       '.gif',
  'image/webp':      '.webp',
  'image/svg+xml':   '.svg',
  'image/avif':      '.avif',
  'application/pdf': '.pdf',
  'video/mp4':       '.mp4',
  'video/webm':      '.webm',
  'video/ogg':       '.ogv',
};

function extFor(mimeType, filename) {
  if (MIME_EXT[mimeType]) return MIME_EXT[mimeType];
  const fromFilename = extname(filename);
  return fromFilename || '.bin';
}

export async function run(args) {
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : fallback;
  };

  const podPath  = resolve(process.cwd(), get('--pod', './content.pod'));
  const mediaDir = resolve(process.cwd(), get('--media-dir', './media'));

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }

  console.log(`\n  ◆  Orbiter — Unpack\n`);
  console.log(`     Pod:       ${podPath}`);
  console.log(`     Media dir: ${mediaDir}\n`);

  const db = openPod(podPath);
  const rows = db.db.prepare('SELECT id, filename, mime_type, size, alt, folder, created_at, data FROM _media').all();

  if (rows.length === 0) {
    console.log('  No media files in pod.\n');
    db.close();
    return;
  }

  mkdirSync(mediaDir, { recursive: true });

  const index = [];
  let extracted = 0;
  let skipped   = 0;

  for (const row of rows) {
    if (!row.data || row.data.length === 0) {
      skipped++;
      index.push({ id: row.id, filename: row.filename, mime_type: row.mime_type, size: row.size, alt: row.alt ?? '', folder: row.folder ?? '', created_at: row.created_at, file: null });
      continue;
    }
    const ext      = extFor(row.mime_type, row.filename);
    const outFile  = join(mediaDir, `${row.id}${ext}`);
    writeFileSync(outFile, row.data);
    index.push({
      id:         row.id,
      filename:   row.filename,
      mime_type:  row.mime_type,
      size:       row.size,
      alt:        row.alt ?? '',
      folder:     row.folder ?? '',
      created_at: row.created_at,
      file:       `media/${row.id}${ext}`,
    });
    extracted++;
  }

  // Strip BLOBs from pod (replace with empty buffer — lean pod for git)
  const strip = db.db.prepare('UPDATE _media SET data = ? WHERE id = ?');
  const empty = Buffer.alloc(0);
  const stripAll = db.db.transaction(() => {
    for (const row of rows) strip.run(empty, row.id);
  });
  stripAll();

  // Mark pod as git-mode
  db.setMeta('storage.mode', 'git');

  // Write media index alongside pod
  const podDir   = resolve(podPath, '..');
  const indexPath = join(podDir, 'media-index.json');
  writeFileSync(indexPath, JSON.stringify({ version: 1, media: index }, null, 2));

  db.close();

  console.log(`  ✓  ${extracted} files extracted to ${mediaDir}`);
  if (skipped) console.log(`  ⚠  ${skipped} files skipped (already empty)`);
  console.log(`  ✓  media-index.json written to ${indexPath}`);
  console.log(`  ✓  Pod is now lean (BLOBs stripped)\n`);
  console.log(`  To restore a self-contained pod: orbiter pack\n`);
}
