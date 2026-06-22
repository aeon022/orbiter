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

      CREATE TABLE IF NOT EXISTS _comments (
        id          TEXT PRIMARY KEY,
        entry_id    TEXT NOT NULL,
        username    TEXT NOT NULL,
        body        TEXT NOT NULL,
        resolved    INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS _forms (
        id         TEXT PRIMARY KEY,
        form_id    TEXT NOT NULL,
        data       TEXT NOT NULL,  -- JSON of submitted fields
        status     TEXT NOT NULL DEFAULT 'new',  -- new | read | done | spam
        ip         TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS _analytics (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        path       TEXT NOT NULL,
        referrer   TEXT,
        ua         TEXT,
        lang       TEXT,
        screen_w   INTEGER,
        is_bot     INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_path ON _analytics(path);
      CREATE INDEX IF NOT EXISTS idx_analytics_date ON _analytics(created_at);

      CREATE TABLE IF NOT EXISTS _form_configs (
        form_id    TEXT PRIMARY KEY,
        label      TEXT NOT NULL DEFAULT '',
        fields     TEXT NOT NULL DEFAULT '[]',
        settings   TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migrations: add columns that didn't exist in older pods
    try { this.db.exec(`ALTER TABLE _media ADD COLUMN folder TEXT NOT NULL DEFAULT ''`); } catch {}
    try { this.db.exec(`ALTER TABLE _collections ADD COLUMN singleton INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { this.db.exec(`ALTER TABLE _entries ADD COLUMN sort_order INTEGER`); } catch {}
    try { this.db.exec(`ALTER TABLE _entries ADD COLUMN deleted_at TEXT`); } catch {}
    try { this.db.exec(`ALTER TABLE _entries ADD COLUMN publish_at TEXT`); } catch {}
    try { this.db.exec(`ALTER TABLE _entries ADD COLUMN unpublish_at TEXT`); } catch {}

    // Migration: add locale column + change UNIQUE constraint to (collection_id, slug, locale)
    const entryCols = this.db.prepare('PRAGMA table_info(_entries)').all().map(c => c.name);
    if (!entryCols.includes('locale')) {
      this.db.pragma('foreign_keys = OFF');
      this.db.exec(`
        BEGIN;
        CREATE TABLE _entries_new (
          id            TEXT PRIMARY KEY,
          collection_id TEXT NOT NULL REFERENCES _collections(id),
          slug          TEXT NOT NULL,
          locale        TEXT NOT NULL DEFAULT '',
          data          TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'draft',
          sort_order    INTEGER,
          deleted_at    TEXT,
          publish_at    TEXT,
          unpublish_at  TEXT,
          created_at    TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(collection_id, slug, locale)
        );
        INSERT INTO _entries_new
          SELECT id, collection_id, slug, '', data, status, sort_order,
                 deleted_at, publish_at, unpublish_at, created_at, updated_at
          FROM _entries;
        DROP TABLE _entries;
        ALTER TABLE _entries_new RENAME TO _entries;
        COMMIT;
      `);
      this.db.pragma('foreign_keys = ON');
    }

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
  getEntries(collectionId, { status, locale } = {}) {
    if (status === 'trash') {
      const rows = this.db.prepare(
        'SELECT * FROM _entries WHERE collection_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC'
      ).all(collectionId);
      return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
    }
    let sql = 'SELECT * FROM _entries WHERE collection_id = ? AND deleted_at IS NULL';
    const args = [collectionId];
    if (status) { sql += ' AND status = ?'; args.push(status); }
    if (locale !== undefined) { sql += ' AND locale = ?'; args.push(locale); }
    sql += ' ORDER BY COALESCE(sort_order,999999) ASC, updated_at DESC';
    return this.db.prepare(sql).all(...args).map(r => ({ ...r, data: JSON.parse(r.data) }));
  }

  getEntry(collectionId, slug, locale = '') {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND locale = ? AND deleted_at IS NULL')
      .get(collectionId, slug, locale);
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) };
  }

  /** Returns all locale versions of a given slug (non-deleted). */
  getEntryLocales(collectionId, slug) {
    return this.db
      .prepare('SELECT locale, status, updated_at FROM _entries WHERE collection_id = ? AND slug = ? AND deleted_at IS NULL')
      .all(collectionId, slug);
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
  createEntry(collectionId, slug, data, status = 'draft', locale = '') {
    const id  = randomUUID();
    const now = sqliteNow();
    this.db.prepare(`
      INSERT INTO _entries (id, collection_id, slug, locale, data, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, collectionId, slug, locale, JSON.stringify(data), status, now, now);
    return id;
  }

  updateEntry(collectionId, slug, { slug: newSlug, data, status, publish_at, unpublish_at, locale } = {}) {
    const entry = this.getEntry(collectionId, slug, locale ?? '');
    if (!entry) return false;
    // Snapshot current state before overwriting
    this.db.prepare('INSERT INTO _versions (id, entry_id, data, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), entry.id, entry.data ? JSON.stringify(entry.data) : '{}', sqliteNow());
    // Keep only the 20 most recent versions
    this.db.prepare(`
      DELETE FROM _versions WHERE entry_id = ? AND id NOT IN (
        SELECT id FROM _versions WHERE entry_id = ? ORDER BY created_at DESC LIMIT 20
      )
    `).run(entry.id, entry.id);
    const pa  = publish_at   !== undefined ? publish_at   : (entry.publish_at   ?? null);
    const ua  = unpublish_at !== undefined ? unpublish_at : (entry.unpublish_at ?? null);
    this.db.prepare('UPDATE _entries SET slug = ?, data = ?, status = ?, publish_at = ?, unpublish_at = ?, updated_at = ? WHERE id = ?')
      .run(newSlug ?? slug, JSON.stringify(data ?? entry.data), status ?? entry.status, pa, ua, sqliteNow(), entry.id);
    return true;
  }

  restoreVersion(entryId, versionId) {
    const ver = this.db.prepare('SELECT * FROM _versions WHERE id = ? AND entry_id = ?').get(versionId, entryId);
    if (!ver) return false;
    const now = sqliteNow();
    this.db.prepare('UPDATE _entries SET data = ?, updated_at = ? WHERE id = ?').run(ver.data, now, entryId);
    return true;
  }

  getScheduledDue() {
    const rows = this.db.prepare(
      "SELECT * FROM _entries WHERE status = 'scheduled' AND publish_at <= datetime('now') AND deleted_at IS NULL"
    ).all();
    return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
  }

  getExpiredDue() {
    const rows = this.db.prepare(
      "SELECT * FROM _entries WHERE status = 'published' AND unpublish_at IS NOT NULL AND unpublish_at <= datetime('now') AND deleted_at IS NULL"
    ).all();
    return rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
  }

  deleteEntry(collectionId, slug, locale = '') {
    const entry = this.getEntry(collectionId, slug, locale);
    if (!entry) return false;
    this.db.prepare('UPDATE _entries SET deleted_at = ? WHERE id = ?').run(sqliteNow(), entry.id);
    return true;
  }

  restoreEntry(collectionId, slug, locale = '') {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND locale = ? AND deleted_at IS NOT NULL')
      .get(collectionId, slug, locale);
    if (!row) return false;
    this.db.prepare('UPDATE _entries SET deleted_at = NULL, status = ? WHERE id = ?').run('draft', row.id);
    return true;
  }

  permanentDeleteEntry(collectionId, slug, locale = '') {
    const row = this.db
      .prepare('SELECT * FROM _entries WHERE collection_id = ? AND slug = ? AND locale = ?')
      .get(collectionId, slug, locale);
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

  // ── Comments ───────────────────────────────────────
  getComments(entryId) {
    return this.db.prepare(
      'SELECT * FROM _comments WHERE entry_id = ? ORDER BY created_at ASC'
    ).all(entryId);
  }

  createComment(entryId, username, body) {
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO _comments (id, entry_id, username, body) VALUES (?, ?, ?, ?)'
    ).run(id, entryId, username, body);
    return id;
  }

  resolveComment(id, resolved = true) {
    this.db.prepare('UPDATE _comments SET resolved = ? WHERE id = ?').run(resolved ? 1 : 0, id);
  }

  deleteComment(id) {
    this.db.prepare('DELETE FROM _comments WHERE id = ?').run(id);
  }

  // ── Form submissions ───────────────────────────────
  createFormSubmission(formId, data, ip = null) {
    const id = randomUUID();
    this.db.prepare(
      'INSERT INTO _forms (id, form_id, data, ip) VALUES (?, ?, ?, ?)'
    ).run(id, formId, JSON.stringify(data), ip);
    return id;
  }

  getFormSubmissions({ formId, status, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM _forms WHERE 1=1';
    const params = [];
    if (formId) { sql += ' AND form_id = ?'; params.push(formId); }
    if (status)  { sql += ' AND status = ?';  params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return this.db.prepare(sql).all(...params).map(r => ({ ...r, data: JSON.parse(r.data) }));
  }

  getFormSubmission(id) {
    const r = this.db.prepare('SELECT * FROM _forms WHERE id = ?').get(id);
    return r ? { ...r, data: JSON.parse(r.data) } : null;
  }

  setFormStatus(id, status) {
    this.db.prepare('UPDATE _forms SET status = ? WHERE id = ?').run(status, id);
  }

  deleteFormSubmission(id) {
    this.db.prepare('DELETE FROM _forms WHERE id = ?').run(id);
  }

  getFormStats() {
    const rows = this.db.prepare(
      `SELECT form_id, status, COUNT(*) as count FROM _forms GROUP BY form_id, status`
    ).all();
    const out = {};
    for (const r of rows) {
      if (!out[r.form_id]) out[r.form_id] = { new: 0, read: 0, done: 0, spam: 0, total: 0 };
      out[r.form_id][r.status] = (out[r.form_id][r.status] ?? 0) + r.count;
      out[r.form_id].total += r.count;
    }
    return out;
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

  // ── Form configs ──────────────────────────────────
  getFormConfigs() {
    return this.db.prepare('SELECT * FROM _form_configs ORDER BY form_id').all()
      .map(r => ({ ...r, fields: JSON.parse(r.fields), settings: JSON.parse(r.settings) }));
  }

  getFormConfig(formId) {
    const row = this.db.prepare('SELECT * FROM _form_configs WHERE form_id = ?').get(formId);
    if (!row) return null;
    return { ...row, fields: JSON.parse(row.fields), settings: JSON.parse(row.settings) };
  }

  saveFormConfig(formId, { label, fields, settings } = {}) {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    this.db.prepare(
      'INSERT OR REPLACE INTO _form_configs (form_id, label, fields, settings, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(formId, label || formId, JSON.stringify(fields || []), JSON.stringify(settings || {}), now);
  }

  deleteFormConfig(formId) {
    this.db.prepare('DELETE FROM _form_configs WHERE form_id = ?').run(formId);
  }

  // ── Analytics ──────────────────────────────────────
  trackPageview(path, { referrer, ua, lang, screenW, isBot } = {}) {
    this.db.prepare(
      'INSERT INTO _analytics (path, referrer, ua, lang, screen_w, is_bot) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(path, referrer || null, ua || null, lang || null, screenW || null, isBot ? 1 : 0);
  }

  getAnalytics({ days = 30, path } = {}) {
    const since = `datetime('now', '-${Math.max(1, Math.min(days, 365))} days')`;
    const base = `FROM _analytics WHERE created_at >= ${since}` + (path ? ` AND path = ?` : '');
    const args = path ? [path] : [];

    const total = this.db.prepare(`SELECT COUNT(*) as count ${base}`).get(...args).count;
    const humans = this.db.prepare(`SELECT COUNT(*) as count ${base} AND is_bot = 0`).get(...args).count;
    const bots = total - humans;

    const topPages = this.db.prepare(
      `SELECT path, COUNT(*) as views, SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_views ${base} GROUP BY path ORDER BY views DESC LIMIT 20`
    ).all(...args);

    const topReferrers = this.db.prepare(
      `SELECT referrer, COUNT(*) as count ${base} AND referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 15`
    ).all(...args);

    const daily = this.db.prepare(
      `SELECT DATE(created_at) as date, COUNT(*) as views, SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) as human_views ${base} GROUP BY DATE(created_at) ORDER BY date DESC LIMIT ?`
    ).all(...args, days);

    return { total, humans, bots, topPages, topReferrers, daily: daily.reverse() };
  }

  pruneAnalytics(days = 90) {
    return this.db.prepare(
      `DELETE FROM _analytics WHERE created_at < datetime('now', '-' || ? || ' days')`
    ).run(days).changes;
  }

  close() {
    this.db.close();
  }
}
