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

// DELETE /api/users/:id
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
