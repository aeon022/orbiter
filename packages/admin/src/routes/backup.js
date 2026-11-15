import { Hono } from 'hono';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createReadStream, existsSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { dirname, basename, join } from 'node:path';
import { randomBytes } from 'node:crypto';
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
