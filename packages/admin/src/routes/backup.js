import { Hono } from 'hono';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createReadStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { dirname, basename, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openPod, getMediaBackend } from '@a83/orbiter-core';
import { requireAdmin } from '../middleware/auth.js';

// better-sqlite3 belongs to core; resolve it from there so it works however npm laid out node_modules.
const Database = createRequire(fileURLToPath(import.meta.resolve('@a83/orbiter-core')))('better-sqlite3');

export const backupRoutes = new Hono();
backupRoutes.use('*', requireAdmin);

const NEED_TABLES = ['_meta', '_collections', '_entries', '_media', '_users'];
const SECRET_PREFIX = 'enc:v1:';

/** Consistent copy of the pod (VACUUM INTO), without sessions. */
function snapshot(podPath, dest) {
  const src = new Database(podPath, { fileMustExist: true });
  try { src.pragma('wal_checkpoint(PASSIVE)'); src.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`); } finally { src.close(); }
  const c = new Database(dest);
  try { c.exec('DELETE FROM _sessions'); } finally { c.close(); }
}

// GET /api/backup — download the pod (a plain SQLite file) as content-<date>.pod
backupRoutes.get('/', (c) => {
  const tmp = join(tmpdir(), `orbiter-backup-${randomBytes(6).toString('hex')}.pod`);
  try { snapshot(c.get('podPath'), tmp); }
  catch (e) { rmSync(tmp, { force: true }); console.error('[backup]', e.message); return c.json({ error: 'Backup failed' }, 500); }
  markBackup(c.get('podPath'));
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  const rs = createReadStream(tmp);
  rs.on('close', () => rmSync(tmp, { force: true }));
  return new Response(Readable.toWeb(rs), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="content-${stamp}.pod"`,
      'Content-Length': String(statSync(tmp).size),
      'Cache-Control': 'no-store',
    },
  });
});

// ── automatic backups, status, size, moving media out of the pod ─────────────

const envInt = (k, d) => { const v = parseInt(process.env[k] ?? '', 10); return Number.isFinite(v) ? v : d; };
export const backupDir = (podPath) => process.env.ORBITER_BACKUP_DIR || join(dirname(podPath), 'backups');
const stampNow = () => new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');

function markBackup(podPath) {
  try { const db = openPod(podPath); db.setMeta('backup.last', new Date().toISOString()); db.close(); } catch {}
}

function listBackups(podPath) {
  const dir = backupDir(podPath);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.pod')).map(f => { const st = statSync(join(dir, f)); return { name: f, size: st.size, mtime: st.mtime.toISOString() }; })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
}

/** Write a backup into the backup folder (keeps ORBITER_BACKUP_KEEP per kind). Returns {name,size} or null when not due. */
export function runBackup(podPath, { force = false, kind = 'auto' } = {}) {
  const days = envInt('ORBITER_BACKUP_DAYS', 7);
  const dir = backupDir(podPath);
  const base = basename(podPath).replace(/\.pod$/, '');
  const mine = listBackups(podPath).filter(f => f.name.startsWith(`${base}-${kind}-`));
  if (!force && mine[0] && Date.now() - Date.parse(mine[0].mtime) < days * 86400e3) return null;
  mkdirSync(dir, { recursive: true });
  const name = `${base}-${kind}-${stampNow()}.pod`;
  snapshot(podPath, join(dir, name));
  for (const old of mine.slice(Math.max(0, envInt('ORBITER_BACKUP_KEEP', 4) - 1))) rmSync(join(dir, old.name), { force: true });
  markBackup(podPath);
  return { name, size: statSync(join(dir, name)).size };
}

/** Called once at startup: weekly (ORBITER_BACKUP_DAYS, 0 = off) copy of the pod next to it. */
export function startAutoBackup(podPath) {
  if (envInt('ORBITER_BACKUP_DAYS', 7) <= 0) return;
  const tick = () => { try { const r = runBackup(podPath); if (r) console.log(`[backup] ${r.name} (${(r.size / 1048576).toFixed(1)} MB)`); } catch (e) { console.warn('[backup]', e.message); } };
  setTimeout(tick, 30_000).unref();
  setInterval(tick, 6 * 3600e3).unref();
}

// GET /api/backup/status — size, last backup, automatic backups, media still inside the pod
backupRoutes.get('/status', (c) => {
  const podPath = c.get('podPath');
  const db = openPod(podPath);
  try {
    const blob = db.db.prepare('SELECT COUNT(*) n, COALESCE(SUM(LENGTH(data)),0) b FROM _media WHERE data IS NOT NULL').get();
    const wal = existsSync(`${podPath}-wal`) ? statSync(`${podPath}-wal`).size : 0;
    const days = envInt('ORBITER_BACKUP_DAYS', 7);
    return c.json({
      podBytes: statSync(podPath).size + wal,
      mediaInPodBytes: blob.b, mediaInPodCount: blob.n,
      mediaBackend: db.getMeta('media.backend') ?? 'blob',
      warnMb: envInt('ORBITER_POD_WARN_MB', 60),
      last: db.getMeta('backup.last') ?? null,
      auto: { days, keep: envInt('ORBITER_BACKUP_KEEP', 4), dir: backupDir(podPath) },
      files: listBackups(podPath).slice(0, 12),
    });
  } finally { db.close(); }
});

// POST /api/backup/run — back up now into the backup folder
backupRoutes.post('/run', (c) => {
  try { return c.json({ ok: true, ...runBackup(c.get('podPath'), { force: true, kind: 'manual' }) }); }
  catch (e) { console.error('[backup]', e.message); return c.json({ ok: false, error: 'Backup failed' }, 500); }
});

// POST /api/backup/offload-media?limit=25 — move media stored inside the pod to the configured backend (local/s3/github)
backupRoutes.post('/offload-media', async (c) => {
  const podPath = c.get('podPath');
  const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') ?? '25', 10) || 25));
  const db = openPod(podPath);
  try {
    if ((db.getMeta('media.backend') ?? 'blob') === 'blob') return c.json({ ok: false, error: 'Choose a media backend first (Settings → Media: local folder, S3 or GitHub).' }, 400);
    const rows = db.db.prepare("SELECT * FROM _media WHERE data IS NOT NULL AND (path IS NULL OR path = '') AND (url IS NULL OR url = '') LIMIT ?").all(limit);
    const backend = getMediaBackend(db);
    const failed = []; let moved = 0;
    for (const r of rows) {
      try {
        db.db.prepare('DELETE FROM _media WHERE id = ?').run(r.id);
        await backend.upload(r.id, r.filename, r.mime_type, r.size, Buffer.from(r.data), r.alt, r.folder);
        db.db.prepare('UPDATE _media SET created_at = ?, focal_x = ?, focal_y = ? WHERE id = ?').run(r.created_at, r.focal_x, r.focal_y, r.id);
        moved++;
      } catch (e) {
        // put the original back untouched
        db.db.prepare('DELETE FROM _media WHERE id = ?').run(r.id);
        db.insertMedia(r.id, r.filename, r.mime_type, r.size, r.data, r.alt, r.folder, null, null);
        db.db.prepare('UPDATE _media SET created_at = ?, focal_x = ?, focal_y = ? WHERE id = ?').run(r.created_at, r.focal_x, r.focal_y, r.id);
        failed.push({ id: r.id, filename: r.filename, error: String(e.message).slice(0, 200) });
      }
    }
    const remaining = db.db.prepare("SELECT COUNT(*) n FROM _media WHERE data IS NOT NULL AND (path IS NULL OR path = '') AND (url IS NULL OR url = '')").get().n;
    return c.json({ ok: true, moved, failed, remaining });
  } finally { db.close(); }
});

// POST /api/backup/vacuum — shrink the pod file after media were moved out
backupRoutes.post('/vacuum', (c) => {
  const podPath = c.get('podPath');
  const before = statSync(podPath).size;
  const db = openPod(podPath);
  try { db.db.pragma('wal_checkpoint(TRUNCATE)'); db.db.exec('VACUUM'); } finally { db.close(); }
  return c.json({ ok: true, before, after: statSync(podPath).size });
});

// POST /api/backup/restore — multipart `file`: a .pod (SQLite). Validated, current pod kept as <pod>.before-restore-<ts>.
backupRoutes.post('/restore', async (c) => {
  const podPath = c.get('podPath');
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return c.json({ ok: false, error: 'No file provided' }, 400);

  const tmp = `${podPath}.restore-${randomBytes(4).toString('hex')}`;
  try {
    writeFileSync(tmp, Buffer.from(await file.arrayBuffer()));
    const fd = openSync(tmp, 'r'); const head = Buffer.alloc(16); readSync(fd, head, 0, 16, 0); closeSync(fd);
    if (head.toString('latin1') !== 'SQLite format 3\0') return c.json({ ok: false, error: 'Not a pod: expected a SQLite .pod file' }, 422);

    const warnings = [];
    let entries = 0;
    let t;
    try {
      t = new Database(tmp, { readonly: true });
      if (t.pragma('integrity_check', { simple: true }) !== 'ok') return c.json({ ok: false, error: 'The file is damaged (integrity check failed)' }, 422);
      const have = t.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
      const missing = NEED_TABLES.find(n => !have.includes(n));
      if (missing) return c.json({ ok: false, error: `Not a pod: table ${missing} is missing` }, 422);
      const admins = t.prepare("SELECT password FROM _users WHERE role = 'admin'").all();
      if (!admins.length) return c.json({ ok: false, error: 'The backup has no admin user: restoring it would lock you out' }, 422);
      if (admins.every(a => String(a.password).startsWith('$'))) warnings.push('The admin passwords in this backup are Lander (PHP) hashes and will not work in Orbiter. If you cannot sign in, reset the password with the CLI.');
      const noBlob = t.prepare("SELECT COUNT(*) n FROM _media WHERE data IS NULL AND path IS NOT NULL AND path != ''").get().n;
      if (noBlob) warnings.push(`${noBlob} media file(s) live as files next to the Lander install (not in the pod) and will not show here.`);
      const enc = t.prepare("SELECT COUNT(*) n FROM _meta WHERE value LIKE ?").get(SECRET_PREFIX + '%').n;
      if (enc && !process.env.ORBITER_SECRET) warnings.push('Some saved credentials are encrypted and need the same ORBITER_SECRET as the old server.');
      entries = t.prepare('SELECT COUNT(*) n FROM _entries WHERE deleted_at IS NULL').get().n;
    } catch {
      return c.json({ ok: false, error: 'The file is not a readable SQLite database' }, 422);
    } finally { try { t?.close(); } catch {} }

    // keep the current pod, then swap
    const dir = dirname(podPath), base = basename(podPath);
    const prev = `${base}.before-restore-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}`;
    snapshot(podPath, join(dir, prev));
    for (const old of readdirSync(dir).filter(f => f.startsWith(`${base}.before-restore-`)).sort().reverse().slice(3)) rmSync(join(dir, old), { force: true });
    renameSync(tmp, podPath);
    rmSync(`${podPath}-wal`, { force: true }); rmSync(`${podPath}-shm`, { force: true });
    return c.json({ ok: true, entries, warnings, previous: prev });
  } catch (e) {
    console.error('[restore]', e.message);
    return c.json({ ok: false, error: 'Restore failed' }, 500);
  } finally {
    if (existsSync(tmp)) rmSync(tmp, { force: true });
  }
});
