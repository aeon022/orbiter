/**
 * Pod lifecycle helpers
 */
import { OrbiterDB } from './db.js';
import { randomUUID } from 'node:crypto';

/**
 * Create a new .pod file with optional seed data
 * @param {string} podPath
 * @param {{ site?: object }} options
 */
export function createPod(podPath, options = {}) {
  const db = new OrbiterDB(podPath);

  if (options.site) {
    const stmt = db.db.prepare(
      "INSERT OR REPLACE INTO _meta (key, value) VALUES (?, ?)"
    );
    for (const [key, value] of Object.entries(options.site)) {
      stmt.run(`site.${key}`, String(value));
    }
  }

  return db;
}

/**
 * Open an existing .pod file
 * @param {string} podPath
 */
export function openPod(podPath) {
  return new OrbiterDB(podPath);
}
