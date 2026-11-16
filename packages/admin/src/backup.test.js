// Run: node --test packages/admin/src/backup.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPod } from '@a83/orbiter-core';
import { runBackup } from './routes/backup.js';

test('automatic backups are private: folder 0700, files 0600 (not readable through the web server)', { skip: process.platform === 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'orb-bk-')); const pod = join(dir, 'x.pod'); createPod(pod);
  const r = runBackup(pod, { force: true });
  assert.ok(r, 'backup written');
  const bdir = join(dir, 'backups');
  assert.equal(statSync(bdir).mode & 0o077, 0, 'folder must not be accessible to group/others');
  for (const f of readdirSync(bdir)) assert.equal(statSync(join(bdir, f)).mode & 0o077, 0, f + ' must be owner-only');
});
