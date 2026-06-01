import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const lockRoutes = new Hono();

const STALE_MS = 90_000; // lock expires after 90 s without refresh

function lockKey(collection, slug) {
  return `lock.${collection}.${slug}`;
}

function parseLock(val) {
  if (!val) return null;
  const [username, ts] = val.split('|');
  const age = Date.now() - new Date(ts).getTime();
  if (age > STALE_MS) return null; // stale — treat as free
  return { username, ts };
}

// POST /api/locks/:collection/:slug — claim or refresh lock
lockRoutes.post('/:collection/:slug', (c) => {
  const { collection, slug } = c.req.param();
  const username = c.get('user')?.username ?? 'unknown';
  const db  = openPod(c.get('podPath'));
  const key = lockKey(collection, slug);
  const existing = parseLock(db.getMeta(key));

  if (existing && existing.username !== username) {
    db.close();
    return c.json({ locked: true, by: existing.username }, 409);
  }

  db.setMeta(key, `${username}|${new Date().toISOString()}`);
  db.close();
  return c.json({ locked: false });
});

// DELETE /api/locks/:collection/:slug — release lock
lockRoutes.delete('/:collection/:slug', (c) => {
  const { collection, slug } = c.req.param();
  const username = c.get('user')?.username ?? 'unknown';
  const db  = openPod(c.get('podPath'));
  const key = lockKey(collection, slug);
  const existing = parseLock(db.getMeta(key));
  if (existing && existing.username === username) db.setMeta(key, '');
  db.close();
  return c.json({ ok: true });
});
