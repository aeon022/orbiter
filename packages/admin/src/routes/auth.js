import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { openPod, verifyPassword, generateToken } from '@a83/orbiter-core';

export const authRoutes = new Hono();

const LOGIN_MAX     = 5;
const LOGIN_WINDOW  = 15 * 60 * 1000; // 15 min
const loginAttempts = new Map(); // ip → { count, resetAt }

function getRealIp(c) {
  return c.req.header('x-forwarded-for')?.split(',')[0].trim()
    ?? c.req.header('x-real-ip')
    ?? 'unknown';
}

function checkRateLimit(ip) {
  const now  = Date.now();
  const rec  = loginAttempts.get(ip);
  if (rec && rec.resetAt > now && rec.count >= LOGIN_MAX) return false;
  if (!rec || rec.resetAt <= now) loginAttempts.set(ip, { count: 0, resetAt: now + LOGIN_WINDOW });
  return true;
}

function recordFailure(ip) {
  const rec = loginAttempts.get(ip);
  if (rec) rec.count++;
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const ip = getRealIp(c);
  if (!checkRateLimit(ip)) {
    return c.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, 429);
  }

  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: 'Missing credentials' }, 400);

  const db   = openPod(c.get('podPath'));
  const user = db.getUserByUsername(username);
  if (!user || !(await verifyPassword(password, user.password))) {
    db.close();
    recordFailure(ip);
    return c.json({ error: 'Invalid username or password' }, 401);
  }
  clearAttempts(ip);

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
