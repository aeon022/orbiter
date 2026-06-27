import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { randomBytes } from 'node:crypto';

export const apiKeyRoutes = new Hono();

function readKeys(db) {
  try { return JSON.parse(db.getMeta('api.keys') ?? '[]'); } catch { return []; }
}
function writeKeys(db, keys) {
  db.setMeta('api.keys', JSON.stringify(keys));
}

// GET /api/api-keys
apiKeyRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath'));
  const keys = readKeys(db).map(k => ({ ...k, key: k.key.slice(0, 10) + '…' }));
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
    key:     rawKey,
    created: new Date().toISOString().split('T')[0],
    hits:    0,
    lastUsed: null,
  };
  keys.push(entry);
  writeKeys(db, keys);
  db.close();
  return c.json({ key: entry });
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
