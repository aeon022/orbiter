import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Returns the configured media backend for a given db connection.
 * Reads `media.backend` from _meta; defaults to 'blob'.
 */
export function getMediaBackend(db) {
  const backend = db.getMeta('media.backend') ?? 'blob';
  switch (backend) {
    case 'local':  return new LocalBackend(db);
    case 'github': return new GitHubBackend(db);
    case 's3':     return new S3Backend(db);
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
    this.root = resolve(db.getMeta('media.local_path') ?? './media');
  }

  async upload(id, filename, mimeType, size, buffer, alt, folder) {
    const dir = resolve(this.root, folder || '');
    if (dir !== this.root && !dir.startsWith(this.root + sep)) {
      throw new Error('Invalid folder path');
    }
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

// Strips `.`/`..` segments from a user-supplied folder so it can't escape the
// configured base dir/prefix when joined into a GitHub repo path or S3 key.
function safeFolder(folder) {
  if (!folder) return '';
  return String(folder).split('/').filter(p => p && p !== '.' && p !== '..').join('/');
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
    const remotePath = [this.dir, safeFolder(folder), `${id}${ext}`].filter(Boolean).join('/');
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

// ── S3 — store files in any S3-compatible bucket (AWS, R2, B2, MinIO) ───────

class S3Backend {
  constructor(db) {
    this.db        = db;
    this.bucket    = db.getMeta('media.s3_bucket')     ?? '';
    this.publicUrl = (db.getMeta('media.s3_public_url') ?? '').replace(/\/$/, '');

    this.client = new S3Client({
      region:      db.getMeta('media.s3_region')      || 'auto',
      endpoint:    db.getMeta('media.s3_endpoint')    || undefined,
      credentials: {
        accessKeyId:     db.getMeta('media.s3_access_key') ?? '',
        secretAccessKey: db.getMeta('media.s3_secret_key') ?? '',
      },
      forcePathStyle: !!(db.getMeta('media.s3_endpoint')),
    });
  }

  #key(id, filename, folder) {
    const ext = extname(filename) || '';
    return [safeFolder(folder), `${id}${ext}`].filter(Boolean).join('/');
  }

  async upload(id, filename, mimeType, size, buffer, alt, folder) {
    if (!this.bucket) throw new Error('S3 bucket is required for s3 backend');

    const key = this.#key(id, filename, folder);
    await this.client.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
    }));

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    this.db.insertMedia(id, filename, mimeType, size, null, alt, folder, url, key);
    return { url };
  }

  async get(id) {
    const item = this.db.getMediaItem(id);
    if (!item) return null;
    return { url: item.url, mimeType: item.mime_type };
  }

  async delete(id) {
    const item = this.db.getMediaItem(id);
    if (item?.path && this.bucket) {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key:    item.path,
      })).catch(() => {});
    }
    this.db.deleteMedia(id);
  }
}

// Types that are safe to render inline when served from our origin. Everything else
// (html, js, xml, ...) is forced to download so an uploaded file can't run script here.
const INLINE_SAFE = /^(image\/(jpeg|png|gif|webp|avif|tiff|svg\+xml)|video\/(mp4|webm|ogg)|audio\/(mpeg|ogg|wav|webm)|application\/pdf)$/;

/**
 * Response headers for serving a stored media file. Uploaded files are untrusted:
 * nosniff + a sandboxing CSP (so an SVG opened directly can't run script; skipped for
 * PDF, whose viewer breaks under `sandbox`) + attachment for non-allowlisted types.
 */
export function mediaResponseHeaders(mimeType) {
  const mime = String(mimeType ?? '').toLowerCase().split(';')[0].trim();
  const safe = INLINE_SAFE.test(mime);
  const headers = {
    'Content-Type':           safe ? mime : 'application/octet-stream',
    'Cache-Control':          'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!safe) headers['Content-Disposition'] = 'attachment';
  if (mime !== 'application/pdf') headers['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
  return headers;
}
