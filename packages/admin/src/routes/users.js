import { Hono } from 'hono';
import { openPod, hashPassword } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '../middleware/auth.js';

export const userRoutes = new Hono();

// All user management requires admin role
userRoutes.use('*', requireAdmin);

// GET /api/users
userRoutes.get('/', (c) => {
  const db    = openPod(c.get('podPath'));
  const users = db.getUsers();
  db.close();
  return c.json(users);
});

// POST /api/users
userRoutes.post('/', async (c) => {
  const { username, password, role = 'editor' } = await c.req.json();
  if (!username || !password) return c.json({ error: 'username and password are required' }, 400);
  if (!['admin', 'editor'].includes(role)) return c.json({ error: 'Invalid role' }, 400);

  const db       = openPod(c.get('podPath'));
  const existing = db.getUserByUsername(username);
  if (existing) { db.close(); return c.json({ error: `User "${username}" already exists` }, 409); }

  const hashed = await hashPassword(password);
  const id     = randomUUID();
  db.insertUser(id, username, hashed, role);
  db.close();
  return c.json({ ok: true, id, username, role }, 201);
});

// PUT /api/users/:id — update role and/or password
userRoutes.put('/:id', async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');
  const { role, password } = await c.req.json();

  const db = openPod(c.get('podPath'));
  const users = db.getUsers();
  const target = users.find(u => u.id === id);
  if (!target) { db.close(); return c.json({ error: 'User not found' }, 404); }

  if (role && ['admin', 'editor'].includes(role)) {
    if (id === currentUser.id) { db.close(); return c.json({ error: 'Cannot change your own role' }, 400); }
    db.db.prepare('UPDATE _users SET role = ? WHERE id = ?').run(role, id);
  }

  if (password) {
    if (password.length < 8) { db.close(); return c.json({ error: 'Password must be at least 8 characters' }, 400); }
    const hashed = await hashPassword(password);
    db.db.prepare('UPDATE _users SET password = ? WHERE id = ?').run(hashed, id);
  }

  db.close();
  return c.json({ ok: true });
});

// DELETE /api/users/:id
// GET /api/users/:id/permissions
userRoutes.get('/:id/permissions', (c) => {
  const db  = openPod(c.get('podPath'));
  const raw = db.getMeta(`user.${c.req.param('id')}.allowed_collections`);
  db.close();
  let allowed = null;
  try { if (raw) allowed = JSON.parse(raw); } catch {}
  return c.json({ allowed }); // null = unrestricted
});

// PUT /api/users/:id/permissions
// Body: { allowed: ['posts','pages'] }  or  { allowed: null }  (unrestricted)
userRoutes.put('/:id/permissions', async (c) => {
  const { allowed } = await c.req.json();
  const db = openPod(c.get('podPath'));
  if (allowed === null || allowed === undefined) {
    db.setMeta(`user.${c.req.param('id')}.allowed_collections`, '');
  } else {
    db.setMeta(`user.${c.req.param('id')}.allowed_collections`, JSON.stringify(allowed));
  }
  db.close();
  return c.json({ ok: true });
});

userRoutes.delete('/:id', (c) => {
  const currentUser = c.get('user');
  if (currentUser.id === c.req.param('id')) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }
  const db = openPod(c.get('podPath'));
  db.deleteUser(c.req.param('id'));
  db.close();
  return c.json({ ok: true });
});
