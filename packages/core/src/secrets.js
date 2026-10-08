/**
 * Optional encryption at rest for credentials stored in _meta.
 *
 * Set ORBITER_SECRET in the server environment and the keys below are stored as
 * "enc:v1:<base64(iv|tag|ciphertext)>" (AES-256-GCM, key = scrypt(ORBITER_SECRET), the
 * meta key name is bound as AAD so a ciphertext can't be moved to another setting).
 * Without ORBITER_SECRET nothing changes: values stay plaintext, existing pods keep working.
 */
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export const SECRET_META_KEYS = new Set([
  'github.token', 'ai.api_key', 'media.github_token',
  'media.s3_access_key', 'media.s3_secret_key', 'email.smtp_pass', 'ftp.password', 'webhooks.urls',
]);

const PREFIX = 'enc:v1:';
const SALT   = Buffer.from('orbiter-secrets-v1');
let cached = { secret: null, key: null };

function deriveKey() {
  const secret = process.env.ORBITER_SECRET;
  if (!secret) return null;
  if (cached.secret !== secret) cached = { secret, key: scryptSync(secret, SALT, 32) };
  return cached.key;
}

export const secretsEnabled = () => !!process.env.ORBITER_SECRET;
export const isEncrypted    = (v) => typeof v === 'string' && v.startsWith(PREFIX);

export function encryptSecret(name, plain) {
  const key = deriveKey();
  if (!key) throw new Error('ORBITER_SECRET is not set');
  const iv = randomBytes(12);
  const c  = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(name));
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
}

/** Returns the plaintext, or null if there is no key / the key is wrong / the value was tampered with. */
export function decryptSecret(name, stored) {
  const key = deriveKey();
  if (!key) return null;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const d   = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    d.setAAD(Buffer.from(name));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Encrypt any still-plaintext secret in the pod. Returns the number of values migrated. */
export function migrateSecrets(db) {
  if (!secretsEnabled()) return 0;
  let n = 0;
  for (const k of SECRET_META_KEYS) {
    const row = db.db.prepare('SELECT value FROM _meta WHERE key = ?').get(k);
    if (row?.value && !isEncrypted(row.value)) { db.setMeta(k, row.value); n++; }
  }
  return n;
}
