/**
 * TOTP (RFC 6238, HMAC-SHA1, 6 digits, 30 s) with node:crypto only — compatible with
 * Google Authenticator, 1Password, Aegis, etc.
 */
import { createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;

export function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  let bits = 0, value = 0; const out = [];
  for (const ch of String(str).toUpperCase().replace(/[\s=-]/g, '')) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('invalid base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export function totpCode(secret, timeMs = Date.now(), digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 1000 / STEP)));
  const h = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, '0');
}

/**
 * Check a user-entered code, allowing ±1 step of clock drift.
 * Returns the matching time step (so the caller can reject replays: pass `after` = last accepted step), or null.
 */
export function verifyTotp(secret, code, { timeMs = Date.now(), after = 0 } = {}) {
  const given = Buffer.from(String(code ?? '').replace(/\s/g, ''));
  if (given.length !== 6) return null;
  const now = Math.floor(timeMs / 1000 / STEP);
  for (const step of [now, now - 1, now + 1]) {
    if (step <= after) continue;
    const expected = Buffer.from(totpCode(secret, step * STEP * 1000));
    if (timingSafeEqual(given, expected)) return step;
  }
  return null;
}

export function totpUri(secret, account, issuer = 'Orbiter') {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Recovery codes: shown once, stored as SHA-256 hashes (they are random, not guessable). */
export function generateRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => { const h = randomBytes(5).toString('hex'); return `${h.slice(0, 5)}-${h.slice(5)}`; });
}
export const hashRecoveryCode = (c) => createHash('sha256').update(String(c).trim().toLowerCase()).digest('hex');
