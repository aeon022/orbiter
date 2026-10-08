// Run: node --test packages/core/src/totp.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base32Encode, base32Decode, totpCode, verifyTotp, generateTotpSecret, totpUri, hashRecoveryCode, generateRecoveryCodes } from './totp.js';

test('RFC 6238 vector (SHA1, T=59s → 287082 for 6 digits)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(totpCode(secret, 59_000), '287082');
  assert.equal(totpCode(secret, 1111111109_000), '081804');
});

test('base32 roundtrip', () => {
  const s = generateTotpSecret();
  assert.equal(base32Encode(base32Decode(s)), s);
});

test('verifyTotp: window ±1, rejects other codes, blocks replay via `after`', () => {
  const s = generateTotpSecret(), t = 1_700_000_000_000;
  const step = Math.floor(t / 30000);
  assert.equal(verifyTotp(s, totpCode(s, t), { timeMs: t }), step);
  assert.equal(verifyTotp(s, totpCode(s, t - 30000), { timeMs: t }), step - 1);
  assert.equal(verifyTotp(s, totpCode(s, t + 90000), { timeMs: t }), null);
  assert.equal(verifyTotp(s, '000000x', { timeMs: t }), null);
  assert.equal(verifyTotp(s, totpCode(s, t), { timeMs: t, after: step }), null, 'same code twice');
});

test('uri + recovery codes', () => {
  assert.match(totpUri('ABC', 'bob'), /^otpauth:\/\/totp\/Orbiter%3Abob\?secret=ABC/);
  const codes = generateRecoveryCodes();
  assert.equal(new Set(codes).size, 8);
  assert.equal(hashRecoveryCode(' ABCDE-12345 '), hashRecoveryCode('abcde-12345'));
});
