import { Hono } from 'hono';
import { openPod, hashApiKey } from '@a83/orbiter-core';
import { randomBytes } from 'node:crypto';
import { requireAdmin } from '../middleware/auth.js';

export const apiKeyRoutes = new Hono();

// Public Content API credentials — admin only.
apiKeyRoutes.use('*', requireAdmin);

function readKeys(db) {
  try { return JSON.parse(db.getMeta('api.keys') ?? '[]'); } catch { return []; }
}
function writeKeys(db, keys) {
  db.setMeta('api.keys', JSON.stringify(keys));
}

// GET /api/api-keys
apiKeyRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath'));
  // Legacy records (created before hashing) still hold a plaintext `key`;
  // show the same truncated preview either way. Never return the full key.
  const keys = readKeys(db).map(k => ({ ...k, key: k.preview ?? (k.key ? k.key.slice(0, 10) + '…' : '') }));
  db.close();
  return c.json({ keys });
});

// POST /api/api-keys — generate new key
apiKeyRoutes.post('/', async (c) => {
  const { label } = await c.req.json().catch(() => ({}));
  const db = openPod(c.get('podPath'));
  const keys = readKeys(db);
  const rawKey = 'orb_' + randomBytes(24).toString('base64url');
  const entry = {
    id:      'k_' + randomBytes(6).toString('hex'),
    label:   label || 'API Key',
    hash:    hashApiKey(rawKey), // raw key is never persisted — shown once below
    preview: rawKey.slice(0, 10) + '…',
    created: new Date().toISOString().split('T')[0],
    hits:    0,
    lastUsed: null,
  };
  keys.push(entry);
  writeKeys(db, keys);
  db.close();
  return c.json({ key: { ...entry, key: rawKey } });
});

// DELETE /api/api-keys/:id — revoke
apiKeyRoutes.delete('/:id', (c) => {
  const { id } = c.req.param();
  const db = openPod(c.get('podPath'));
  const keys = readKeys(db).filter(k => k.id !== id);
  writeKeys(db, keys);
  db.close();
  return c.json({ ok: true });
});
