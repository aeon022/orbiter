/**
 * auth.js — Password hashing and session token utilities
 * Uses Node.js built-in crypto (no external deps)
 */
import { scrypt, randomBytes, timingSafeEqual, createHash, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * Hash a plaintext password with scrypt + random salt.
 * Returns a string in the format "salt:hash" (both hex-encoded).
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf  = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored "salt:hash" string.
 * Uses constant-time comparison to prevent timing attacks.
 * @param {string} password
 * @param {string} stored — "salt:hash" from hashPassword()
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const [salt, hash] = (stored ?? '').split(':');
  if (!salt || !hash) return false;
  try {
    const hashBuf = Buffer.from(hash, 'hex');
    const derived = await scryptAsync(password, salt, 64);
    return timingSafeEqual(hashBuf, derived);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically random session token (hex string).
 * @param {number} bytes — default 32 → 64 hex chars
 * @returns {string}
 */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

/**
 * Constant-time string equality — for comparing a request-supplied secret
 * (preview token, etc.) against a stored one without leaking its length/
 * prefix through response timing. Returns false on any length mismatch
 * (timingSafeEqual itself throws on that).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Short-lived preview tokens. The stored `preview.token` is a master secret; the admin hands the
 * editor's browser a token that only works for one collection+slug and expires (default 1 h),
 * so the master never travels in URLs and a restricted editor can't preview other collections.
 * checkPreviewToken also still accepts the master itself, so existing preview links keep working.
 */
export function signPreviewToken(master, collection, slug, ttlSec = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `${exp}.${createHmac('sha256', master).update(`${exp}|${collection}|${slug}`).digest('hex')}`;
}
export function checkPreviewToken(master, given, collection, slug) {
  if (!master || !given) return false;
  if (safeEqual(given, master)) return true;
  const [exp, sig] = String(given).split('.');
  if (!sig || !(Number(exp) > Date.now() / 1000)) return false;
  return safeEqual(sig, createHmac('sha256', master).update(`${exp}|${collection}|${slug}`).digest('hex'));
}

const TOKEN_PREFIX = 'sha256:';

/** Value to store for `api.token`: hashed, unless it already is (e.g. a form re-submitting the stored value). */
export function hashApiToken(value) {
  const v = String(value ?? '');
  return !v || v.startsWith(TOKEN_PREFIX) ? v : TOKEN_PREFIX + hashApiKey(v);
}

/**
 * Check the legacy single `api.token` against an Authorization header.
 * Returns { required, ok }: required=false when no token is configured (open API).
 * Plaintext values from older versions still match and are migrated to a hash on first use.
 */
export function checkApiToken(db, authHeaderValue) {
  const stored = db.getMeta('api.token') ?? '';
  if (!stored) return { required: false, ok: true };
  const bearer = (authHeaderValue ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return { required: true, ok: false };
  if (stored.startsWith(TOKEN_PREFIX)) {
    return { required: true, ok: safeEqual(stored, TOKEN_PREFIX + hashApiKey(bearer)) };
  }
  const ok = safeEqual(stored, bearer);
  if (ok) db.setMeta('api.token', hashApiToken(stored)); // migrate off plaintext
  return { required: true, ok };
}

/**
 * Hash an API key (already high-entropy, random) with plain SHA-256 — fast
 * on purpose, unlike hashPassword's deliberately slow scrypt for low-entropy
 * user passwords. Stored instead of the raw key so a leaked `.pod` file
 * (e.g. committed to git, per Orbiter's own workflow templates) doesn't
 * hand out working bearer tokens.
 * @param {string} key
 * @returns {string} hex digest
 */
export function hashApiKey(key) {
  return createHash('sha256').update(String(key)).digest('hex');
}

/**
 * Checks a request's Authorization header against `api.requireKey` /
 * `api.keys` in pod meta. Shared by the admin API-key routes, the Public
 * Content API (packages/integration), and orbiter-mcp's HTTP transport —
 * keep this the single implementation rather than re-copying it.
 *
 * Records store a `hash` (see hashApiKey) rather than the raw key. A record
 * from before this existed may still only have a plaintext `key`; it's
 * checked (by hashing on the fly) and then lazily migrated to `hash`-only
 * storage on first successful use, so existing issued keys keep working
 * without a forced re-issue.
 * @param {import('./db.js').OrbiterDB} db
 * @param {string} authHeaderValue
 * @returns {boolean}
 */
// Per-key requests/minute, in memory (per process; resets on restart).
const keyRate = new Map();
function keyWithinRate(id, perMinute) {
  const now = Date.now();
  let b = keyRate.get(id);
  if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + 60_000 }; keyRate.set(id, b); }
  return ++b.count <= perMinute;
}

export function checkApiKey(db, authHeaderValue) {
  return authenticateApiKey(db, authHeaderValue).ok;
}

/**
 * Like checkApiKey, but also reports what the presented key may do.
 * Returns { ok, scope, keyLabel, collections, status? } (status 401/429 when a presented key is expired / over its rate limit):
 *   scope 'read' | 'draft-write' for a matching key, null for an anonymous (keyless) caller;
 *   ok is true for anonymous callers only while api.requireKey is off.
 * `collections` (array | null) limits where a draft-write key may write.
 */
export function authenticateApiKey(db, authHeaderValue) {
  const bearer = (authHeaderValue ?? '').replace(/^Bearer\s+/i, '').trim();
  const open   = db.getMeta('api.requireKey') !== '1';
  if (!bearer) return { ok: open, scope: null };

  let keys;
  try { keys = JSON.parse(db.getMeta('api.keys') ?? '[]'); } catch { return { ok: open, scope: null }; }

  const bearerBuf = Buffer.from(hashApiKey(bearer), 'hex');
  const found = keys.find(k => {
    const storedHash = k.hash ?? (k.key ? hashApiKey(k.key) : null);
    if (!storedHash) return false;
    const storedBuf = Buffer.from(storedHash, 'hex');
    return storedBuf.length === bearerBuf.length && timingSafeEqual(storedBuf, bearerBuf);
  });
  if (!found) return { ok: open, scope: null };
  // Expired keys are dead, even when the API is otherwise open.
  if (found.expires && found.expires < new Date().toISOString().slice(0, 10)) return { ok: false, status: 401, scope: null };
  if (found.rateLimit && !keyWithinRate(found.id, found.rateLimit)) return { ok: false, status: 429, scope: null };

  if (found.key) {
    found.hash = found.hash ?? hashApiKey(found.key);
    found.preview = found.preview ?? (found.key.slice(0, 10) + '…');
    delete found.key; // migrate off plaintext storage
  }
  found.hits = (found.hits || 0) + 1;
  found.lastUsed = new Date().toISOString().split('T')[0];
  db.setMeta('api.keys', JSON.stringify(keys));
  return {
    ok: true,
    scope: found.scope === 'draft-write' ? 'draft-write' : 'read',
    keyLabel: found.label ?? found.id,
    collections: Array.isArray(found.collections) && found.collections.length ? found.collections : null,
  };
}
