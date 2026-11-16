/**
 * Digi-ID sign-in (see ../digiid.js). Addresses are linked to a user in the pod table _digiid.
 * Public:   POST /api/digiid/challenge · POST /api/digiid/callback (the wallet) · GET /api/digiid/status
 * Account:  GET /api/account/digiid · POST /link (password) · DELETE /:address (password)
 * Signing in with a linked key counts as a full sign-in (like a passkey): no password, no extra 2FA code.
 */
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { openPod, verifyPassword, generateToken } from '@a83/orbiter-core';
import { clientIp } from '../net.js';
import { allow } from '../ratelimit.js';
import { newChallenge, getChallenge, dropChallenge, checkCallback, looksLikeAddress } from '../digiid.js';

const table = (db) => db.db.exec("CREATE TABLE IF NOT EXISTS _digiid (address TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
const ipOf = (c) => clientIp(c.env?.incoming?.socket?.remoteAddress, c.req.header('x-forwarded-for'));
const hostOf = (c) => (c.req.header('x-forwarded-host') ?? c.req.header('host') ?? '').split(',')[0].trim();
const secureOf = (c) => c.req.url.startsWith('https') || c.req.header('x-forwarded-proto') === 'https';

export const digiidPublicRoutes = new Hono();

digiidPublicRoutes.post('/challenge', (c) => {
  if (!allow(`digiid-ch:${ipOf(c)}`, 30, 60_000)) return c.json({ error: 'Too many requests' }, 429);
  const host = hostOf(c);
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return c.json({ error: 'Bad host' }, 400);
  const ch = newChallenge({ purpose: 'login', host, secure: secureOf(c) });
  if (!ch) return c.json({ error: 'Busy, try again' }, 503);
  return c.json({ nonce: ch.nonce, poll: ch.poll, uri: ch.uri });
});

// The wallet posts here. Never trust anything but the checked signature.
digiidPublicRoutes.post('/callback', async (c) => {
  if (!allow(`digiid-cb:${ipOf(c)}`, 60, 60_000)) return c.json({ error: 'Too many requests' }, 429);
  const body = await c.req.json().catch(() => null);
  const r = checkCallback(body);
  if (r.error) return c.json({ error: r.error }, 400);
  const { address, challenge: ch, nonce } = r;
  const db = openPod(c.get('podPath'));
  try {
    table(db);
    if (ch.purpose === 'login') {
      const row = db.db.prepare('SELECT u.id FROM _digiid d JOIN _users u ON u.id = d.user_id WHERE d.address = ?').get(address);
      if (!row) { ch.status = 'unknown'; return c.json({ error: 'This address is not linked to an account' }, 403); }
      ch.status = 'ok'; ch.userId = row.id; ch.address = address;
    } else {
      const owner = db.db.prepare('SELECT user_id FROM _digiid WHERE address = ?').get(address);
      if (owner && owner.user_id !== ch.userId) { ch.status = 'taken'; return c.json({ error: 'Address already linked to another account' }, 409); }
      if (!owner) db.db.prepare('INSERT INTO _digiid (address, user_id) VALUES (?, ?)').run(address, ch.userId);
      ch.status = 'ok'; ch.address = address;
    }
  } finally { db.close(); }
  return c.json({ address, nonce });
});

// The browser that created the challenge polls with its secret; the QR nonce alone is not enough.
digiidPublicRoutes.get('/status', (c) => {
  const ch = getChallenge(c.req.query('nonce') ?? '');
  if (!ch || ch.poll !== c.req.query('poll')) return c.json({ status: 'expired' }, 404);
  if (ch.status === 'pending') return c.json({ status: 'pending' });
  const nonce = c.req.query('nonce');
  if (ch.status !== 'ok') { dropChallenge(nonce); return c.json({ status: ch.status }); }
  dropChallenge(nonce);
  if (ch.purpose !== 'login') return c.json({ status: 'ok', address: ch.address });
  const db = openPod(c.get('podPath'));
  const user = db.db.prepare('SELECT id, username, role FROM _users WHERE id = ?').get(ch.userId);
  if (!user) { db.close(); return c.json({ status: 'unknown' }); }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  db.createSession(user.id, token, expiresAt, { ip: ipOf(c), ua: c.req.header('user-agent') });
  db.close();
  setCookie(c, 'orb_sess', token, { httpOnly: true, sameSite: 'Strict', secure: secureOf(c), path: '/', maxAge: 30 * 24 * 60 * 60 });
  return c.json({ status: 'ok', user });
});

export const digiidAccountRoutes = new Hono();

digiidAccountRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath')); table(db);
  const rows = db.db.prepare('SELECT address, created_at FROM _digiid WHERE user_id = ? ORDER BY created_at').all(c.get('user').id);
  db.close();
  return c.json({ addresses: rows });
});

async function passwordOk(c, db, body) {
  const full = db.getUserByUsername(c.get('user').username);
  return !!body?.currentPassword && await verifyPassword(body.currentPassword, full.password);
}

// POST /api/account/digiid/link { currentPassword } → { nonce, poll, uri }. A stolen session alone must not be able to plant a key.
digiidAccountRoutes.post('/link', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const db = openPod(c.get('podPath'));
  const ok = await passwordOk(c, db, body); db.close();
  if (!ok) return c.json({ error: 'Current password is incorrect' }, 401);
  const ch = newChallenge({ purpose: 'link', userId: c.get('user').id, host: hostOf(c), secure: secureOf(c) });
  if (!ch) return c.json({ error: 'Busy, try again' }, 503);
  return c.json({ nonce: ch.nonce, poll: ch.poll, uri: ch.uri });
});

digiidAccountRoutes.delete('/:address', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const db = openPod(c.get('podPath')); table(db);
  if (!(await passwordOk(c, db, body))) { db.close(); return c.json({ error: 'Current password is incorrect' }, 401); }
  const a = c.req.param('address');
  if (!looksLikeAddress(a)) { db.close(); return c.json({ error: 'Bad address' }, 400); }
  db.db.prepare('DELETE FROM _digiid WHERE address = ? AND user_id = ?').run(a, c.get('user').id);
  db.close();
  return c.json({ ok: true });
});
