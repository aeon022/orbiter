/**
 * auth.js — Password hashing and session token utilities
 * Uses Node.js built-in crypto (no external deps)
 */
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
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
