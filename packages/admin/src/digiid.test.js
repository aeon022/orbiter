// Run: node --test packages/admin/src/digiid.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import * as secp from '@noble/secp256k1';
import { addressOf, messageHash, verifySignature, looksLikeAddress, newChallenge, checkCallback } from './digiid.js';

secp.hashes.hmacSha256 = (k, ...m) => { const h = createHmac('sha256', k); m.forEach(x => h.update(x)); return h.digest(); };
secp.hashes.sha256 = (...m) => { const h = createHash('sha256'); m.forEach(x => h.update(x)); return h.digest(); };

function wallet(compressed = true) {
  const sk = secp.utils.randomSecretKey();
  const pub = secp.getPublicKey(sk, compressed);
  const sign = (msg) => {
    const rec = secp.sign(messageHash(msg), sk, { prehash: false, format: 'recovered' }); // [recid, r, s]
    return Buffer.concat([Buffer.from([27 + rec[0] + (compressed ? 4 : 0)]), Buffer.from(rec.subarray(1))]).toString('base64');
  };
  return { address: addressOf(pub), sign };
}

test('address format and signature roundtrip (compressed and uncompressed keys)', () => {
  for (const c of [true, false]) {
    const w = wallet(c);
    assert.ok(looksLikeAddress(w.address), w.address);
    const sig = w.sign('hello');
    assert.equal(verifySignature(w.address, 'hello', sig), true);
    assert.equal(verifySignature(w.address, 'hellx', sig), false, 'other message');
    assert.equal(verifySignature(wallet(c).address, 'hello', sig), false, 'other address');
  }
  assert.equal(verifySignature('Dgarbage', 'x', 'AAAA'), false);
});

test('callback: valid, wrong host, replay-safe status, tampered', () => {
  const w = wallet();
  const ch = newChallenge({ purpose: 'login', host: 'cms.example.at', secure: true });
  const ok = checkCallback({ address: w.address, uri: ch.uri, signature: w.sign(ch.uri) });
  assert.equal(ok.ok, true);
  const other = wallet();
  assert.equal(checkCallback({ address: w.address, uri: ch.uri, signature: other.sign(ch.uri) }).error, 'Invalid signature');
  const ch2 = newChallenge({ purpose: 'login', host: 'cms.example.at', secure: true });
  const wrongHost = ch2.uri.replace('cms.example.at', 'evil.example');
  assert.equal(checkCallback({ address: w.address, uri: wrongHost, signature: w.sign(wrongHost) }).error, 'URI does not belong to this site');
  const http = ch2.uri + '&u=1';
  assert.equal(checkCallback({ address: w.address, uri: http, signature: w.sign(http) }).error, 'Scheme mismatch');
});
