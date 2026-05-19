/**
 * OrbiterDB
 * Wraps a .pod (SQLite) file and exposes
 * typed methods for collections and entries.
 */
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const sqliteNow = () => new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

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
        singleton  INTEGER NOT NULL DEFAULT 0,
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
        folder     TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS _users (
        id         TEXT PRIMARY KEY,
        username   TEXT NOT NULL UNIQUE,
        password   TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'editor',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT
      );

      CREATE TABLE IF NOT EXISTS _sessions (
        token      TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES _users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS _audit (
        id         TEXT PRIMARY KEY,
        entry_id   TEXT NOT NULL,
        username   TEXT NOT NULL,
        action     TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migrations: add columns that didn't exist in older pods
    try { this.db.exec(`ALTER TABLE _media ADD COLUMN folder TEXT NOT NULL DEFAULT ''`); } catch {}
    try { this.db.exec(`ALTER TABLE _collections ADD COLUMN singleton INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { this.db.exec(`ALTER TABLE _entries ADD COLUMN sort_order INTEGER`); } catch {}
    try { this.db.exec(`ALTER TABLE _entries ADD COLUMN deleted_at TEXT`); } catch {}

    // Migration: make _media.data nullable, add url + path for external backends
    const mediaCols = this.db.prepare('PRAGMA table_info(_media)').all().map(c => c.name);
    if (!mediaCols.includes('url')) {
      this.db.exec(`
        BEGIN;
        CREATE TABLE _media_new (
          id         TEXT PRIMARY KEY,
          filename   TEXT NOT NULL,
          mime_type  TEXT NOT NULL,
          size       INTEGER NOT NULL,
          data       BLOB,
          alt        TEXT,
          folder     TEXT NOT NULL DEFAULT '',
          url        TEXT,
          path       TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO _media_new SELECT id, filename, mime_type, size, data, alt, folder, NULL, NULL, created_at FROM _media;
        DROP TABLE _media;
        ALTER TABLE _media_new RENAME TO _media;
        COMMIT;
      `);
    }

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
    if (status === 'trash') {
      const rows = this.db.prepare(
        'SELECT * FROM _entries WHERE collection_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC'
      ).all(collectionId);
      return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
    }
    const q = status
      ? this.db.prepare('SELECT * FROM _entries WHERE collection_id = ? AND status = ? AND deleted_at IS NULL ORDER BY COALESCE(sort_order,999999) ASC, updated_at DESC')
      : this.db.prepare('SELECT * FROM _entries WHERE collection_id = ? AND deleted_at IS NULL ORDER BY COALESCE(sort_order,999999) ASC, updated_at DESC');
    const rows = status ? q.all(collectionId, status) : q.all(collectionId);
    return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
  }

  getEntry(collectionId, slug) {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND deleted_at IS NULL')
      .get(collectionId, slug);
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) };
  }

  // ── Users ──────────────────────────────────
  getUserByUsername(username) {
    return this.db.prepare('SELECT * FROM _users WHERE username = ?').get(username) ?? null;
  }

  getUsers() {
    return this.db.prepare(
      'SELECT id, username, role, created_at, last_login FROM _users ORDER BY created_at ASC'
    ).all();
  }

  deleteUser(id) {
    this.db.prepare('DELETE FROM _users WHERE id = ?').run(id);
  }

  insertUser(id, username, hashedPassword, role = 'editor') {
    this.db.prepare(
      'INSERT INTO _users (id, username, password, role) VALUES (?, ?, ?, ?)'
    ).run(id, username, hashedPassword, role);
  }

  // ── Sessions ───────────────────────────────
  createSession(userId, token, expiresAt) {
    // Prune expired sessions on every login
    this.db.prepare("DELETE FROM _sessions WHERE expires_at < datetime('now')").run();
    this.db.prepare(
      'INSERT INTO _sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).run(token, userId, expiresAt);
    this.db.prepare(
      "UPDATE _users SET last_login = datetime('now') WHERE id = ?"
    ).run(userId);
  }

  checkSession(token) {
    if (!token) return null;
    return this.db.prepare(`
      SELECT u.id, u.username, u.role
      FROM _sessions s
      JOIN _users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token) ?? null;
  }

  deleteSession(token) {
    this.db.prepare('DELETE FROM _sessions WHERE token = ?').run(token);
  }

  // ── Meta ───────────────────────────────────
  getMeta(key) {
    const row = this.db.prepare('SELECT value FROM _meta WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  setMeta(key, value) {
    this.db.prepare('INSERT OR REPLACE INTO _meta (key, value) VALUES (?, ?)').run(key, String(value));
  }

  // ── Collections (write) ───────────────────────────
  createCollection(id, label, schema = {}, singleton = false) {
    this.db.prepare('INSERT INTO _collections (id, label, schema, singleton) VALUES (?, ?, ?, ?)').run(id, label, JSON.stringify(schema), singleton ? 1 : 0);
  }

  updateCollection(id, label, schema, singleton) {
    if (singleton !== undefined) {
      this.db.prepare('UPDATE _collections SET label = ?, schema = ?, singleton = ? WHERE id = ?').run(label, JSON.stringify(schema), singleton ? 1 : 0, id);
    } else {
      this.db.prepare('UPDATE _collections SET label = ?, schema = ? WHERE id = ?').run(label, JSON.stringify(schema), id);
    }
  }

  deleteCollection(id) {
    const entries = this.db.prepare('SELECT id FROM _entries WHERE collection_id = ?').all(id);
    for (const e of entries) {
      this.db.prepare('DELETE FROM _versions WHERE entry_id = ?').run(e.id);
    }
    this.db.prepare('DELETE FROM _entries WHERE collection_id = ?').run(id);
    this.db.prepare('DELETE FROM _collections WHERE id = ?').run(id);
  }

  // ── Entries (write) ────────────────────────────────
  createEntry(collectionId, slug, data, status = 'draft') {
    const id  = randomUUID();
    const now = sqliteNow();
    this.db.prepare(`
      INSERT INTO _entries (id, collection_id, slug, data, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, collectionId, slug, JSON.stringify(data), status, now, now);
    return id;
  }

  updateEntry(collectionId, slug, { slug: newSlug, data, status } = {}) {
    const entry = this.getEntry(collectionId, slug);
    if (!entry) return false;
    this.db.prepare('UPDATE _entries SET slug = ?, data = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(newSlug ?? slug, JSON.stringify(data ?? entry.data), status ?? entry.status, sqliteNow(), entry.id);
    return true;
  }

  deleteEntry(collectionId, slug) {
    const entry = this.getEntry(collectionId, slug);
    if (!entry) return false;
    this.db.prepare('UPDATE _entries SET deleted_at = ? WHERE id = ?').run(sqliteNow(), entry.id);
    return true;
  }

  restoreEntry(collectionId, slug) {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND deleted_at IS NOT NULL')
      .get(collectionId, slug);
    if (!row) return false;
    this.db.prepare('UPDATE _entries SET deleted_at = NULL, status = ? WHERE id = ?').run('draft', row.id);
    return true;
  }

  permanentDeleteEntry(collectionId, slug) {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ?')
      .get(collectionId, slug);
    if (!row) return false;
    this.db.prepare('DELETE FROM _versions WHERE entry_id = ?').run(row.id);
    this.db.prepare('DELETE FROM _entries WHERE id = ?').run(row.id);
    return true;
  }

  // ── Media ──────────────────────────────────────────
  listMedia(folder = null) {
    const sql = folder !== null
      ? 'SELECT id, filename, mime_type, size, alt, folder, url, created_at FROM _media WHERE folder = ? ORDER BY created_at DESC'
      : 'SELECT id, filename, mime_type, size, alt, folder, url, created_at FROM _media ORDER BY created_at DESC';
    return folder !== null ? this.db.prepare(sql).all(folder) : this.db.prepare(sql).all();
  }

  getMediaItem(id) {
    return this.db.prepare('SELECT * FROM _media WHERE id = ?').get(id) ?? null;
  }

  insertMedia(id, filename, mimeType, size, data, alt = null, folder = '', url = null, path = null) {
    this.db.prepare(
      'INSERT INTO _media (id, filename, mime_type, size, data, alt, folder, url, path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, filename, mimeType, size, data ?? null, alt, folder, url, path);
  }

  deleteMedia(id) {
    this.db.prepare('DELETE FROM _media WHERE id = ?').run(id);
  }

  // ── Audit log ──────────────────────────────────────
  logAudit(entryId, username, action) {
    this.db.prepare(
      'INSERT INTO _audit (id, entry_id, username, action) VALUES (?, ?, ?, ?)'
    ).run(randomUUID(), entryId, username, action);
  }

  getAuditLog(entryId, limit = 20) {
    return this.db.prepare(
      'SELECT id, username, action, created_at FROM _audit WHERE entry_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(entryId, limit);
  }

  close() {
    this.db.close();
  }
}
