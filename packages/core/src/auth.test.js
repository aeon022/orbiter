// Run: node --test packages/core/src/auth.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, needsRehash, checkApiKey, hashApiKey, hashApiToken, checkApiToken, safeEqual } from './auth.js';

function fakeDb(meta) {
  return {
    getMeta: (k) => meta[k] ?? null,
    setMeta: (k, v) => { meta[k] = v; },
  };
}

test('checkApiKey allows everything when api.requireKey is not set', () => {
  const db = fakeDb({});
  assert.equal(checkApiKey(db, null), true);
  assert.equal(checkApiKey(db, 'Bearer nonsense'), true);
});

test('checkApiKey rejects missing/invalid bearer when a key is required', () => {
  const db = fakeDb({ 'api.requireKey': '1', 'api.keys': JSON.stringify([{ id: 'k1', hash: hashApiKey('orb_real') }]) });
  assert.equal(checkApiKey(db, null), false);
  assert.equal(checkApiKey(db, 'Bearer wrong'), false);
});

test('checkApiKey accepts a hash-stored key and records a hit', () => {
  const meta = { 'api.requireKey': '1', 'api.keys': JSON.stringify([{ id: 'k1', hash: hashApiKey('orb_real'), hits: 0 }]) };
  const db = fakeDb(meta);
  assert.equal(checkApiKey(db, 'Bearer orb_real'), true);
  const stored = JSON.parse(meta['api.keys']);
  assert.equal(stored[0].hits, 1);
  assert.ok(stored[0].lastUsed);
});

test('checkApiKey accepts a legacy plaintext-stored key and migrates it to hash-only', () => {
  const meta = { 'api.requireKey': '1', 'api.keys': JSON.stringify([{ id: 'k1', key: 'orb_legacy', hits: 0 }]) };
  const db = fakeDb(meta);
  assert.equal(checkApiKey(db, 'Bearer orb_legacy'), true);
  const stored = JSON.parse(meta['api.keys']);
  assert.equal(stored[0].key, undefined, 'plaintext key should be dropped after migration');
  assert.equal(stored[0].hash, hashApiKey('orb_legacy'));
  // still works on the next request, now via the hash path
  assert.equal(checkApiKey(db, 'Bearer orb_legacy'), true);
});

test('safeEqual matches equal strings and rejects mismatches/length differences', () => {
  assert.equal(safeEqual('abc123', 'abc123'), true);
  assert.equal(safeEqual('abc123', 'abc124'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
  assert.equal(safeEqual(null, 'x'), false);
});

test('hashApiToken hashes once and is idempotent', () => {
  const h = hashApiToken('secret');
  assert.ok(h.startsWith('sha256:'));
  assert.equal(hashApiToken(h), h);
  assert.equal(hashApiToken(''), '');
});

test('checkApiToken: open when unset, hashed match, plaintext legacy migrates, draft-header spoof fails', () => {
  assert.deepEqual(checkApiToken(fakeDb({}), null), { required: false, ok: true });
  const meta = { 'api.token': hashApiToken('secret') };
  const db = fakeDb(meta);
  assert.equal(checkApiToken(db, 'Bearer secret').ok, true);
  assert.equal(checkApiToken(db, 'Bearer wrong').ok, false);
  assert.equal(checkApiToken(db, null).ok, false);
  assert.equal(checkApiToken(db, 'Bearer ' + meta['api.token']).ok, false, 'the stored hash must not work as a token');
  const legacy = { 'api.token': 'plain' };
  assert.equal(checkApiToken(fakeDb(legacy), 'Bearer plain').ok, true);
  assert.ok(legacy['api.token'].startsWith('sha256:'));
});

import { signPreviewToken, checkPreviewToken } from './auth.js';
test('preview tokens: bound to collection+slug, expire, master still accepted, garbage rejected', () => {
  const master = 'master-secret';
  const t = signPreviewToken(master, 'posts', 'hello');
  assert.equal(checkPreviewToken(master, t, 'posts', 'hello'), true);
  assert.equal(checkPreviewToken(master, t, 'posts', 'other'), false, 'other slug');
  assert.equal(checkPreviewToken(master, t, 'private', 'hello'), false, 'other collection');
  assert.equal(checkPreviewToken(master, signPreviewToken(master, 'posts', 'hello', -1), 'posts', 'hello'), false, 'expired');
  assert.equal(checkPreviewToken('different', t, 'posts', 'hello'), false, 'wrong master');
  assert.equal(checkPreviewToken(master, master, 'posts', 'anything'), true, 'legacy master token');
  assert.equal(checkPreviewToken(master, '', 'posts', 'hello'), false);
  assert.equal(checkPreviewToken('', t, 'posts', 'hello'), false);
});

test('password hashes: new format verifies, wrong password fails, carries its cost', async () => {
  const h = await hashPassword('correct horse');
  assert.match(h, /^scrypt:16:8:2:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(await verifyPassword('correct horse', h), true);
  assert.equal(await verifyPassword('wrong', h), false);
  assert.equal(needsRehash(h), false);
});

test('legacy salt:hash passwords still verify and are flagged for rehash', async () => {
  const { scryptSync } = await import('node:crypto');
  const salt = 'ab'.repeat(16);
  const legacy = `${salt}:${scryptSync('old pass', salt, 64).toString('hex')}`;
  assert.equal(await verifyPassword('old pass', legacy), true);
  assert.equal(await verifyPassword('nope', legacy), false);
  assert.equal(needsRehash(legacy), true);
});

test('password hashes: garbage and absurd parameters are rejected without work', async () => {
  assert.equal(await verifyPassword('x', ''), false);
  assert.equal(await verifyPassword('x', null), false);
  assert.equal(await verifyPassword('x', 'scrypt:99:8:2:aa:bb'), false);   // N=2^99 would exhaust memory
  assert.equal(await verifyPassword('x', 'scrypt:16:8:2:aa'), false);
  assert.equal(needsRehash('garbage'), false);
});
