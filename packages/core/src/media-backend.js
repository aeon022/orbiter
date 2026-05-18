import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';

/**
 * Returns the configured media backend for a given db connection.
 * Reads `media.backend` from _meta; defaults to 'blob'.
 */
export function getMediaBackend(db) {
  const backend = db.getMeta('media.backend') ?? 'blob';
  switch (backend) {
    case 'local':  return new LocalBackend(db);
    case 'github': return new GitHubBackend(db);
    default:       return new BlobBackend(db);
  }
}

// ── Blob (default) — store file data as BLOB in SQLite ──────────────────────

class BlobBackend {
  constructor(db) { this.db = db; }

  async upload(id, filename, mimeType, size, buffer, alt, folder) {
    this.db.insertMedia(id, filename, mimeType, size, buffer, alt, folder);
    return {};
  }

  async get(id) {
    const item = this.db.getMediaItem(id);
    if (!item) return null;
    return { data: item.data, mimeType: item.mime_type };
  }

  async delete(id) {
    this.db.deleteMedia(id);
  }
}

// ── Local — write files to disk, store path in _media ───────────────────────

class LocalBackend {
  constructor(db) {
    this.db   = db;
    this.root = db.getMeta('media.local_path') ?? './media';
  }

  async upload(id, filename, mimeType, size, buffer, alt, folder) {
    const dir      = join(this.root, folder || '');
    await mkdir(dir, { recursive: true });
    const ext      = extname(filename) || '';
    const diskPath = join(dir, `${id}${ext}`);
    await writeFile(diskPath, buffer);
    this.db.insertMedia(id, filename, mimeType, size, null, alt, folder, null, diskPath);
    return { path: diskPath };
  }

  async get(id) {
    const item = this.db.getMediaItem(id);
    if (!item) return null;
    if (item.path) {
      const data = await readFile(item.path);
      return { data, mimeType: item.mime_type };
    }
    return { data: item.data, mimeType: item.mime_type };
  }

  async delete(id) {
    const item = this.db.getMediaItem(id);
    if (item?.path) await unlink(item.path).catch(() => {});
    this.db.deleteMedia(id);
  }
}

// ── GitHub — store files via GitHub Contents API, serve from jsDelivr CDN ───

class GitHubBackend {
  constructor(db) {
    this.db     = db;
    this.token  = db.getMeta('media.github_token') ?? db.getMeta('github.token')  ?? '';
    this.repo   = db.getMeta('media.github_repo')  ?? db.getMeta('github.repo')   ?? '';
    this.branch = db.getMeta('media.github_branch') ?? db.getMeta('github.branch') ?? 'main';
    this.dir    = db.getMeta('media.github_dir')    ?? 'media';
  }

  async upload(id, filename, mimeType, size, buffer, alt, folder) {
    if (!this.token || !this.repo) throw new Error('GitHub token and repo are required for github backend');

    const ext        = extname(filename) || '';
    const remotePath = [this.dir, folder, `${id}${ext}`].filter(Boolean).join('/');
    const content    = buffer.toString('base64');

    const res = await fetch(`https://api.github.com/repos/${this.repo}/contents/${remotePath}`, {
      method: 'PUT',
      headers: {
        Authorization:  `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent':   'Orbiter-Admin/1.0',
        Accept:         'application/vnd.github+json',
      },
      body: JSON.stringify({ message: `media: upload ${filename}`, content, branch: this.branch }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub API ${res.status}: ${err}`);
    }

    const cdnUrl = `https://cdn.jsdelivr.net/gh/${this.repo}@${this.branch}/${remotePath}`;
    this.db.insertMedia(id, filename, mimeType, size, null, alt, folder, cdnUrl, remotePath);
    return { url: cdnUrl };
  }

  async get(id) {
    const item = this.db.getMediaItem(id);
    if (!item) return null;
    return { url: item.url, mimeType: item.mime_type };
  }

  async delete(id) {
    const item = this.db.getMediaItem(id);
    if (item?.path && this.token && this.repo) {
      const infoRes = await fetch(
        `https://api.github.com/repos/${this.repo}/contents/${item.path}?ref=${this.branch}`,
        { headers: { Authorization: `Bearer ${this.token}`, 'User-Agent': 'Orbiter-Admin/1.0' } },
      );
      if (infoRes.ok) {
        const { sha } = await infoRes.json();
        await fetch(`https://api.github.com/repos/${this.repo}/contents/${item.path}`, {
          method: 'DELETE',
          headers: {
            Authorization:  `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            'User-Agent':   'Orbiter-Admin/1.0',
          },
          body: JSON.stringify({ message: `media: delete ${item.filename}`, sha, branch: this.branch }),
        });
      }
    }
    this.db.deleteMedia(id);
  }
}
