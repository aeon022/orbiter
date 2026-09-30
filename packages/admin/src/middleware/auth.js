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

// Checks if `user` (editor role) is allowed to access collectionId.
// Admins always pass. Editors with no allowed_collections set also pass (unrestricted).
// Shared by the requireCollectionAccess middleware below and by routes that key on a
// child resource (e.g. a comment id) and must resolve collectionId themselves first.
export function userCanAccessCollection(user, podPath, collectionId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!collectionId) return true;
  const db = openPod(podPath);
  const raw = db.getMeta(`user.${user.id}.allowed_collections`);
  db.close();
  if (!raw) return true; // no restriction set → all collections allowed
  let allowed = [];
  try { allowed = JSON.parse(raw); } catch {}
  return allowed.includes(collectionId);
}

// Middleware: checks if the current user (editor role) is allowed to access collectionId.
export const requireCollectionAccess = async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const collectionId = c.req.param('collectionId') ?? c.req.param('collection') ?? c.req.param('id') ?? c.req.query('col');
  if (!userCanAccessCollection(user, c.get('podPath'), collectionId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  return next();
};
