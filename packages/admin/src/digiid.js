/**
 * Digi-ID (DigiByte): passwordless sign-in by signing a URI with a wallet key.
 *   digiid://<host><path>?x=<nonce>[&u=1]   → wallet POSTs { address, uri, signature } to https://<host><path>
 * The signature is a Bitcoin-style signed message ("DigiByte Signed Message:\n" + uri) by the key behind a legacy P2PKH
 * address ("D…", version 30). The host in the signed URI binds the proof to this site (a look-alike site cannot reuse it).
 * Verification recovers the public key from the compact signature and compares its address.
 */
import { createHash, randomBytes } from 'node:crypto';
import * as secp from '@noble/secp256k1';

const MAGIC = 'DigiByte Signed Message:\n';
const VERSION = 30; // 0x1e → addresses starting with "D"
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const sha256 = (b) => createHash('sha256').update(b).digest();
const hash160 = (b) => createHash('ripemd160').update(sha256(b)).digest();
const varint = (n) => (n < 253 ? Buffer.from([n]) : Buffer.concat([Buffer.from([253]), Buffer.from([n & 255, n >> 8])]));

export function base58check(payload) {
  const data = Buffer.concat([payload, sha256(sha256(payload)).subarray(0, 4)]);
  let n = BigInt('0x' + data.toString('hex')), out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of data) { if (b === 0) out = '1' + out; else break; }
  return out;
}
export const addressOf = (pubkey) => base58check(Buffer.concat([Buffer.from([VERSION]), hash160(pubkey)]));
export const looksLikeAddress = (a) => typeof a === 'string' && /^D[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a);

export function messageHash(message) {
  const m = Buffer.from(MAGIC), msg = Buffer.from(message);
  return sha256(sha256(Buffer.concat([varint(m.length), m, varint(msg.length), msg])));
}

/** true when `signature` (base64, 65 bytes) over `message` was made by the key behind `address`. */
export function verifySignature(address, message, signature) {
  try {
    if (!looksLikeAddress(address)) return false;
    const raw = Buffer.from(String(signature), 'base64');
    if (raw.length !== 65) return false;
    const header = raw[0];
    if (header < 27 || header > 34) return false;
    const recid = (header - 27) & 3, compressed = header >= 31;
    const sig = Buffer.concat([Buffer.from([recid]), raw.subarray(1)]);
    const pub = secp.recoverPublicKey(sig, messageHash(message), { prehash: false }); // 33 bytes compressed
    const key = compressed ? pub : secp.Point.fromBytes(pub).toBytes(false);
    return addressOf(key) === address;
  } catch { return false; }
}

// ── challenges (in memory, 5 minutes, one use) ────────────────────────────────
const TTL = 5 * 60 * 1000;
const challenges = new Map(); // nonce → { purpose, userId, host, secure, poll, status, address, createdAt }

export function newChallenge({ purpose, userId = null, host, secure }) {
  const now = Date.now();
  if (challenges.size > 2000) for (const [k, v] of challenges) if (now - v.createdAt > TTL) challenges.delete(k);
  if (challenges.size > 5000) return null;
  const nonce = randomBytes(16).toString('hex'), poll = randomBytes(24).toString('base64url');
  challenges.set(nonce, { purpose, userId, host, secure, poll, status: 'pending', address: null, createdAt: now });
  const uri = `digiid://${host}/api/digiid/callback?x=${nonce}${secure ? '' : '&u=1'}`;
  return { nonce, poll, uri };
}
export const getChallenge = (nonce) => { const c = challenges.get(nonce); return c && Date.now() - c.createdAt <= TTL ? c : null; };
export const dropChallenge = (nonce) => challenges.delete(nonce);

/** Checks a wallet callback body against the challenge; returns { ok, address, challenge } or { error }. */
export function checkCallback(body) {
  const { address, uri, signature } = body ?? {};
  if (typeof uri !== 'string' || uri.length > 400 || typeof signature !== 'string') return { error: 'Bad request' };
  let u; try { u = new URL(uri.replace(/^digiid:/, 'https:')); } catch { return { error: 'Bad URI' }; }
  const nonce = u.searchParams.get('x') ?? '';
  const ch = getChallenge(nonce);
  if (!ch || ch.status !== 'pending') return { error: 'Unknown or expired challenge' };
  if (u.host !== ch.host || u.pathname !== '/api/digiid/callback') return { error: 'URI does not belong to this site' };
  if ((u.searchParams.get('u') === '1') === ch.secure) return { error: 'Scheme mismatch' };
  if (!verifySignature(address, uri, signature)) return { error: 'Invalid signature' };
  return { ok: true, address, challenge: ch, nonce };
}
