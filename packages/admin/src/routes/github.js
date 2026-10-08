import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireAdmin } from '../middleware/auth.js';
import { SECRET_KEYS } from './meta.js';

export const githubRoutes = new Hono();
githubRoutes.use('*', requireAdmin);

const API = 'https://api.github.com';

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept:        'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent':   'orbiter-cms',
  };
}

async function ghGet(token, path) {
  const res = await fetch(`${API}${path}`, { headers: ghHeaders(token) });
  if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPost(token, path, body) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: ghHeaders(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub POST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPatch(token, path, body) {
  const res = await fetch(`${API}${path}`, { method: 'PATCH', headers: ghHeaders(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub PATCH ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const MIME_EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
  'application/pdf': '.pdf', 'video/mp4': '.mp4', 'video/webm': '.webm',
};

function extFor(mime, filename) {
  if (MIME_EXT[mime]) return MIME_EXT[mime];
  const m = filename.match(/\.[^.]+$/);
  return m ? m[0] : '.bin';
}

// Secrets that must never leave the server, beyond the masked-in-UI SECRET_KEYS.
const EXTRA_SECRET_KEYS = ['api.keys', 'webhooks.urls', 'build.webhook_url'];

export function scrubbedPodBase64(podPath) {
  const dir = mkdtempSync(join(tmpdir(), 'orbiter-push-'));
  const copy = join(dir, 'content.pod');
  try {
    const src = openPod(podPath);
    src.db.exec(`VACUUM INTO '${copy.replace(/'/g, "''")}'`);
    src.close();
    const clean = openPod(copy);
    clean.db.exec('DELETE FROM _sessions; DELETE FROM _users;');
    const del = clean.db.prepare('DELETE FROM _meta WHERE key = ?');
    for (const k of [...SECRET_KEYS, ...EXTRA_SECRET_KEYS]) del.run(k);
    clean.db.exec("DELETE FROM _meta WHERE key LIKE 'user.%' OR key LIKE 'lock.%'");
    clean.close();
    return readFileSync(copy).toString('base64');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// POST /api/github/push — commit pod + media to GitHub
githubRoutes.post('/push', async (c) => {
  const podPath = c.get('podPath');
  const db      = openPod(podPath);
  const token   = db.getMeta('github.token')  ?? '';
  const repo    = db.getMeta('github.repo')   ?? '';
  const branch  = db.getMeta('github.branch') ?? 'main';

  if (!token || !repo) {
    db.close();
    return c.json({ ok: false, message: 'GitHub token and repo not configured in Settings.' }, 400);
  }

  try {
    // Read media rows (with BLOBs)
    const media = db.db.prepare('SELECT id, filename, mime_type, data FROM _media').all();

    // Build media index (no BLOBs)
    const mediaRows   = db.db.prepare('SELECT id, filename, mime_type, size, alt, folder, created_at FROM _media').all();
    const indexEntries = mediaRows.map(r => ({
      id:         r.id,
      filename:   r.filename,
      mime_type:  r.mime_type,
      size:       r.size,
      alt:        r.alt ?? '',
      folder:     r.folder ?? '',
      created_at: r.created_at,
      file:       `media/${r.id}${extFor(r.mime_type, r.filename)}`,
    }));
    const indexJson = JSON.stringify({ version: 1, media: indexEntries }, null, 2);

    // Mark storage mode so GH Action knows to unpack
    db.setMeta('storage.mode', 'git');
    db.close();

    // Push a scrubbed copy: never ship live sessions, password hashes or stored credentials to git.
    const podBase64 = scrubbedPodBase64(podPath);

    const files = [
      { path: 'content.pod',      content: podBase64, encoding: 'base64' },
      { path: 'media-index.json', content: Buffer.from(indexJson).toString('base64'), encoding: 'base64' },
    ];

    for (const row of media) {
      if (!row.data || row.data.length === 0) continue;
      const ext = extFor(row.mime_type, row.filename);
      files.push({ path: `media/${row.id}${ext}`, content: row.data.toString('base64'), encoding: 'base64' });
    }

    // Commit via Git Trees API
    const refData    = await ghGet(token, `/repos/${repo}/git/refs/heads/${branch}`);
    const latestSha  = refData.object.sha;
    const commitData = await ghGet(token, `/repos/${repo}/git/commits/${latestSha}`);
    const treeSha    = commitData.tree.sha;

    const treeItems = await Promise.all(
      files.map(async f => {
        const blob = await ghPost(token, `/repos/${repo}/git/blobs`, { content: f.content, encoding: f.encoding });
        return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
      })
    );

    const newTree   = await ghPost(token, `/repos/${repo}/git/trees`, { base_tree: treeSha, tree: treeItems });
    const newCommit = await ghPost(token, `/repos/${repo}/git/commits`, {
      message: `orbiter: publish content [${new Date().toISOString().slice(0, 10)}]`,
      tree:    newTree.sha,
      parents: [latestSha],
    });
    await ghPatch(token, `/repos/${repo}/git/refs/heads/${branch}`, { sha: newCommit.sha, force: false });

    return c.json({ ok: true, message: `Pushed ${files.length} files to ${repo}@${branch}`, commit: newCommit.sha });

  } catch (err) {
    return c.json({ ok: false, message: err.message ?? 'Unknown error' }, 500);
  }
});

// GET /api/github/status
githubRoutes.get('/status', (c) => {
  const db     = openPod(c.get('podPath'));
  const token  = db.getMeta('github.token') ?? '';
  const repo   = db.getMeta('github.repo')  ?? '';
  db.close();
  return c.json({ configured: !!(token && repo) });
});
