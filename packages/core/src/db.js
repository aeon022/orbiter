/**
 * OrbiterDB
 * Wraps a .pod (SQLite) file and exposes
 * typed methods for collections and entries.
 */
import Database from 'better-sqlite3';
import { resolve } from 'node:path';

export class OrbiterDB {
  /** @type {import('better-sqlite3').Database} */
  db;

  /** @param {string} podPath - path to the .pod file */
  constructor(podPath) {
    const resolved = resolve(podPath);
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.#bootstrap();
  }

  // ── Bootstrap core tables ──────────────────
  #bootstrap() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS _collections (
        id         TEXT PRIMARY KEY,
        label      TEXT NOT NULL,
        schema     TEXT NOT NULL,  -- JSON
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS _entries (
        id            TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL REFERENCES _collections(id),
        slug          TEXT NOT NULL,
        data          TEXT NOT NULL,  -- JSON
        status        TEXT NOT NULL DEFAULT 'draft',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(collection_id, slug)
      );

      CREATE TABLE IF NOT EXISTS _versions (
        id         TEXT PRIMARY KEY,
        entry_id   TEXT NOT NULL REFERENCES _entries(id),
        data       TEXT NOT NULL,  -- JSON snapshot
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS _media (
        id         TEXT PRIMARY KEY,
        filename   TEXT NOT NULL,
        mime_type  TEXT NOT NULL,
        size       INTEGER NOT NULL,
        data       BLOB NOT NULL,
        alt        TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Set format version if not present
    const existing = this.db
      .prepare("SELECT value FROM _meta WHERE key = 'format_version'")
      .get();

    if (!existing) {
      this.db
        .prepare("INSERT INTO _meta (key, value) VALUES ('format_version', '1')")
        .run();
    }
  }

  // ── Collections ────────────────────────────
  getCollections() {
    return this.db.prepare('SELECT * FROM _collections').all();
  }

  getCollection(id) {
    return this.db.prepare('SELECT * FROM _collections WHERE id = ?').get(id);
  }

  // ── Entries ────────────────────────────────
  getEntries(collectionId, { status } = {}) {
    const q = status
      ? this.db.prepare('SELECT * FROM _entries WHERE collection_id = ? AND status = ? ORDER BY updated_at DESC')
      : this.db.prepare('SELECT * FROM _entries WHERE collection_id = ? ORDER BY updated_at DESC');

    const rows = status
      ? q.all(collectionId, status)
      : q.all(collectionId);

    return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
  }

  getEntry(collectionId, slug) {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ?')
      .get(collectionId, slug);
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) };
  }

  // ── Meta ───────────────────────────────────
  getMeta(key) {
    const row = this.db.prepare('SELECT value FROM _meta WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  setMeta(key, value) {
    this.db.prepare('INSERT OR REPLACE INTO _meta (key, value) VALUES (?, ?)').run(key, String(value));
  }

  close() {
    this.db.close();
  }
}
