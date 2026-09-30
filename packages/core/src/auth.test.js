// Run: node --test packages/core/src/auth.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkApiKey, hashApiKey, safeEqual } from './auth.js';

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
