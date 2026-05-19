import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { openPod, verifyPassword, generateToken } from '@a83/orbiter-core';

export const authRoutes = new Hono();

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: 'Missing credentials' }, 400);

  const db   = openPod(c.get('podPath'));
  const user = db.getUserByUsername(username);
  if (!user || !(await verifyPassword(password, user.password))) {
    db.close();
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const token     = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  db.createSession(user.id, token, expiresAt);
  db.close();

  setCookie(c, 'orb_sess', token, {
    httpOnly: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/logout
authRoutes.post('/logout', (c) => {
  const token = getCookie(c, 'orb_sess') ?? '';
  if (token) {
    const db = openPod(c.get('podPath'));
    db.deleteSession(token);
    db.close();
  }
  deleteCookie(c, 'orb_sess');
  return c.json({ ok: true });
});

// GET /api/auth/me
authRoutes.get('/me', (c) => {
  const token = getCookie(c, 'orb_sess') ?? '';
  const db    = openPod(c.get('podPath'));
  const user  = db.checkSession(token);
  db.close();
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ user });
});
