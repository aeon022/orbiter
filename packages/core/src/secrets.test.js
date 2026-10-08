// Run: node --test packages/core/src/secrets.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, isEncrypted } from './secrets.js';

test('encrypt/decrypt roundtrip, name-bound, wrong key fails', () => {
  process.env.ORBITER_SECRET = 'one';
  const enc = encryptSecret('ftp.password', 'hunter2');
  assert.ok(isEncrypted(enc));
  assert.ok(!enc.includes('hunter2'));
  assert.equal(decryptSecret('ftp.password', enc), 'hunter2');
  assert.equal(decryptSecret('ai.api_key', enc), null, 'moving ciphertext to another key must fail');
  process.env.ORBITER_SECRET = 'two';
  assert.equal(decryptSecret('ftp.password', enc), null, 'wrong secret must fail');
  delete process.env.ORBITER_SECRET;
  assert.equal(decryptSecret('ftp.password', enc), null, 'no secret → null');
});

import { createPod, openPod } from './pod.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateSecrets } from './secrets.js';

test('db: plaintext stays plaintext without ORBITER_SECRET, migrates + roundtrips with it, empty form value cannot wipe it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'orb-sec-'));
  try {
    const p = join(dir, 't.pod'); createPod(p);
    delete process.env.ORBITER_SECRET;
    let db = openPod(p); db.setMeta('ftp.password', 'pw1'); db.setMeta('site.name', 'S');
    assert.equal(db.db.prepare("SELECT value FROM _meta WHERE key='ftp.password'").get().value, 'pw1');
    process.env.ORBITER_SECRET = 'k';
    assert.equal(migrateSecrets(db), 1);
    const raw = db.db.prepare("SELECT value FROM _meta WHERE key='ftp.password'").get().value;
    assert.ok(isEncrypted(raw)); assert.equal(db.getMeta('ftp.password'), 'pw1'); assert.equal(db.getMeta('site.name'), 'S');
    delete process.env.ORBITER_SECRET;
    assert.equal(db.getMeta('ftp.password'), null);
    db.setMeta('ftp.password', '');
    assert.equal(db.db.prepare("SELECT value FROM _meta WHERE key='ftp.password'").get().value, raw, 'not wiped');
    db.close();
  } finally { delete process.env.ORBITER_SECRET; rmSync(dir, { recursive: true, force: true }); }
});

test('restoreVersion keeps the content it replaces as a new version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'orb-ver-'));
  try {
    const p = join(dir, 'v.pod'); createPod(p);
    const db = openPod(p);
    db.createCollection('posts', 'Posts', {}, false);
    db.createEntry('posts', 'a', { title: 'one' }, 'draft');
    db.updateEntry('posts', 'a', { slug: 'a', data: { title: 'two' } });           // snapshot: one
    const e = db.getEntry('posts', 'a');
    const v = db.db.prepare('SELECT id FROM _versions WHERE entry_id = ?').get(e.id);
    assert.ok(db.restoreVersion(e.id, v.id));
    assert.equal(db.getEntry('posts', 'a').data.title, 'one');
    const snaps = db.db.prepare('SELECT data FROM _versions WHERE entry_id = ?').all(e.id).map(r => JSON.parse(r.data).title);
    assert.ok(snaps.includes('two'), 'the replaced content must be recoverable');
    db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
