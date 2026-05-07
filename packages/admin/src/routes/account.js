import { Hono } from 'hono';
import { openPod, verifyPassword, hashPassword } from '@a83/orbiter-core';

export const accountRoutes = new Hono();

// PUT /api/account/password
accountRoutes.put('/password', async (c) => {
  const user = c.get('user');
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) return c.json({ error: 'Missing fields' }, 400);
  if (newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400);

  const db   = openPod(c.get('podPath'));
  const full = db.getUserByUsername(user.username);
  const ok   = await verifyPassword(currentPassword, full.password);
  if (!ok) { db.close(); return c.json({ error: 'Current password is incorrect' }, 401); }

  const hash = await hashPassword(newPassword);
  db.db.prepare('UPDATE _users SET password = ? WHERE id = ?').run(hash, user.id);
  db.close();
  return c.json({ ok: true });
});

// PUT /api/account/username
accountRoutes.put('/username', async (c) => {
  const user = c.get('user');
  const { newUsername, currentPassword } = await c.req.json();
  if (!newUsername || !currentPassword) return c.json({ error: 'Missing fields' }, 400);

  const db   = openPod(c.get('podPath'));
  const full = db.getUserByUsername(user.username);
  const ok   = await verifyPassword(currentPassword, full.password);
  if (!ok) { db.close(); return c.json({ error: 'Current password is incorrect' }, 401); }

  const taken = db.db.prepare('SELECT id FROM _users WHERE username = ? AND id != ?').get(newUsername, user.id);
  if (taken) { db.close(); return c.json({ error: 'Username already taken' }, 409); }

  db.db.prepare('UPDATE _users SET username = ? WHERE id = ?').run(newUsername, user.id);
  db.close();
  return c.json({ ok: true });
});
