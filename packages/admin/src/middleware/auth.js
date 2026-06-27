import { getCookie } from 'hono/cookie';
import { openPod } from '@a83/orbiter-core';

export const requireAuth = async (c, next) => {
  const token = getCookie(c, 'orb_sess') ?? '';
  const db    = openPod(c.get('podPath'));
  const user  = db.checkSession(token);
  db.close();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  c.set('user', user);
  await next();
};

export const requireAdmin = async (c, next) => {
  const user = c.get('user');
  if (user?.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await next();
};

// Middleware: checks if the current user (editor role) is allowed to access collectionId.
// Admins always pass. Editors with no allowed_collections set also pass (unrestricted).
export const requireCollectionAccess = async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role === 'admin') return next();
  const collectionId = c.req.param('collectionId') ?? c.req.param('id');
  if (!collectionId) return next();
  const db = openPod(c.get('podPath'));
  const raw = db.getMeta(`user.${user.id}.allowed_collections`);
  db.close();
  if (!raw) return next(); // no restriction set → all collections allowed
  let allowed = [];
  try { allowed = JSON.parse(raw); } catch {}
  if (!allowed.includes(collectionId)) return c.json({ error: 'Forbidden' }, 403);
  return next();
};
