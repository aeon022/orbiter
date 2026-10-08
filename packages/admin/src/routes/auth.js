import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { openPod, verifyPassword, generateToken } from '@a83/orbiter-core';
import { clientIp } from '../net.js';

export const authRoutes = new Hono();

// Valid-format hash of a random password; only used to burn the same CPU time for unknown users.
const DUMMY_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`;
const LOGIN_MAX     = 5;
const LOGIN_WINDOW  = 15 * 60 * 1000; // 15 min
const loginAttempts = new Map(); // ip → { count, resetAt }

function getRealIp(c) {
  return clientIp(c.env?.incoming?.socket?.remoteAddress, c.req.header('x-forwarded-for'));
}

function checkRateLimit(ip) {
  const now  = Date.now();
  const rec  = loginAttempts.get(ip);
  if (rec && rec.resetAt > now && rec.count >= LOGIN_MAX) return false;
  if (!rec || rec.resetAt <= now) {
    if (loginAttempts.size > 10_000) {
      for (const [k, v] of loginAttempts) if (v.resetAt <= now) loginAttempts.delete(k);
    }
    loginAttempts.set(ip, { count: 0, resetAt: now + LOGIN_WINDOW });
  }
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

  const body = await c.req.json().catch(() => null);
  const { username, password } = body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) return c.json({ error: 'Missing credentials' }, 400);

  const db   = openPod(c.get('podPath'));
  const user = db.getUserByUsername(username);
  // Always run scrypt, even for unknown users, so response time doesn't reveal which usernames exist.
  const passwordOk = await verifyPassword(password, user?.password ?? DUMMY_HASH);
  if (!user || !passwordOk) {
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

  const isSecure = c.req.url.startsWith('https') || c.req.header('x-forwarded-proto') === 'https';
  setCookie(c, 'orb_sess', token, {
    httpOnly: true,
    // csrf.js relies on this being 'Strict' to safely allow requests with no
    // Origin/Referer header through — loosening this (e.g. for a cross-subdomain
    // admin/preview setup) reopens that exception as a real CSRF gap. Update
    // csrf.js's check alongside any change here.
    sameSite: 'Strict',
    secure: isSecure,
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
