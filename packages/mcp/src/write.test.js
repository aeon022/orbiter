// Run: node --test packages/mcp/src/write.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPod, openPod, hashApiKey, authenticateApiKey } from '@a83/orbiter-core';
import { createDraft, updateDraft } from './write.js';

function withPod(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'orb-mcp-'));
  try {
    const p = join(dir, 't.pod'); createPod(p);
    const db = openPod(p); db.createCollection('posts', 'Posts', { title: { type: 'text' } }, false);
    db.createCollection('private', 'Private', {}, false);
    try { fn(db); } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const ctx = { allowed: null, actor: 'mcp:test' };

test('create/update only touch drafts; published entries are off limits', () => withPod((db) => {
  createDraft(db, { collection: 'posts', slug: 'a', data: { title: 'A' } }, ctx);
  assert.equal(db.getEntry('posts', 'a').status, 'draft');
  updateDraft(db, { collection: 'posts', slug: 'a', data: { body: 'x' } }, ctx);
  assert.deepEqual(db.getEntry('posts', 'a').data, { title: 'A', body: 'x' });
  assert.throws(() => createDraft(db, { collection: 'posts', slug: 'a', data: {} }, ctx), /already exists/);
  db.updateEntry('posts', 'a', { slug: 'a', data: { title: 'A' }, status: 'published' });
  assert.throws(() => updateDraft(db, { collection: 'posts', slug: 'a', data: { title: 'hacked' } }, ctx), /only drafts/);
  assert.equal(db.getEntry('posts', 'a').data.title, 'A');
}));

test('validation: slug, collection, data shape, collection scope', () => withPod((db) => {
  assert.throws(() => createDraft(db, { collection: 'posts', slug: '../x', data: {} }, ctx), /slug/);
  assert.throws(() => createDraft(db, { collection: 'nope', slug: 'x', data: {} }, ctx), /not found/);
  assert.throws(() => createDraft(db, { collection: 'posts', slug: 'x', data: [] }, ctx), /object/);
  assert.throws(() => createDraft(db, { collection: 'private', slug: 'x', data: {} }, { ...ctx, allowed: ['posts'] }), /may not write/);
}));

test('authenticateApiKey: scope comes from the key; anonymous gets no scope; requireKey still enforced', () => withPod((db) => {
  db.setMeta('api.keys', JSON.stringify([
    { id: 'k1', label: 'rw', hash: hashApiKey('orb_rw'), scope: 'draft-write', collections: ['posts'] },
    { id: 'k2', label: 'ro', hash: hashApiKey('orb_ro') },
  ]));
  assert.deepEqual(
    (({ ok, scope, collections }) => ({ ok, scope, collections }))(authenticateApiKey(db, 'Bearer orb_rw')),
    { ok: true, scope: 'draft-write', collections: ['posts'] });
  assert.equal(authenticateApiKey(db, 'Bearer orb_ro').scope, 'read');
  assert.equal(authenticateApiKey(db, null).scope, null);
  assert.equal(authenticateApiKey(db, 'Bearer bogus').scope, null);
  db.setMeta('api.requireKey', '1');
  assert.equal(authenticateApiKey(db, null).ok, false);
  assert.equal(authenticateApiKey(db, 'Bearer orb_ro').ok, true);
}));

test('authenticateApiKey: expired keys are rejected, per-key rate limit returns 429', () => withPod((db) => {
  db.setMeta('api.keys', JSON.stringify([
    { id: 'old', label: 'old', hash: hashApiKey('orb_old'), expires: '2020-01-01' },
    { id: 'lim', label: 'lim', hash: hashApiKey('orb_lim'), rateLimit: 2 },
    { id: 'ok',  label: 'ok',  hash: hashApiKey('orb_ok'),  expires: '2999-01-01' },
  ]));
  assert.equal(authenticateApiKey(db, 'Bearer orb_old').ok, false);
  assert.equal(authenticateApiKey(db, 'Bearer orb_ok').ok, true);
  assert.equal(authenticateApiKey(db, 'Bearer orb_lim').ok, true);
  assert.equal(authenticateApiKey(db, 'Bearer orb_lim').ok, true);
  const third = authenticateApiKey(db, 'Bearer orb_lim');
  assert.equal(third.ok, false); assert.equal(third.status, 429);
}));
