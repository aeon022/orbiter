import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { createHash } from 'node:crypto';
import { openPod, verifyPassword, hashPassword, generateTotpSecret, verifyTotp, totpUri, generateRecoveryCodes, hashRecoveryCode } from '@a83/orbiter-core';

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
  db.deleteUserSessions(user.id, getCookie(c, 'orb_sess') ?? null); // log out all other devices
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

// ── Two-factor authentication (TOTP) ─────────────────────────────────────────

// Revoke every session of `userId` except the cookie's.
const dropOtherSessions = (c, db, userId) => db.deleteUserSessions(userId, getCookie(c, 'orb_sess') ?? null);

// GET /api/account/2fa
accountRoutes.get('/2fa', (c) => {
  const db = openPod(c.get('podPath'));
  const t = db.getTotp(c.get('user').id);
  db.close();
  return c.json({ enabled: !!t?.enabled, recoveryLeft: t?.enabled ? t.recovery.length : 0 });
});

// POST /api/account/2fa/setup { currentPassword } → { secret, uri }   (not active until /enable)
accountRoutes.post('/2fa/setup', async (c) => {
  const user = c.get('user');
  const { currentPassword } = await c.req.json().catch(() => ({}));
  const db = openPod(c.get('podPath'));
  if (db.getTotp(user.id)?.enabled) { db.close(); return c.json({ error: '2FA is already enabled' }, 409); }
  const full = db.getUserByUsername(user.username);
  if (!currentPassword || !(await verifyPassword(currentPassword, full.password))) { db.close(); return c.json({ error: 'Current password is incorrect' }, 401); }
  const secret = generateTotpSecret();
  db.setTotpPending(user.id, secret);
  db.close();
  return c.json({ secret, uri: totpUri(secret, user.username) });
});

// POST /api/account/2fa/enable { code } → { recoveryCodes }   (shown once)
accountRoutes.post('/2fa/enable', async (c) => {
  const user = c.get('user');
  const { code } = await c.req.json().catch(() => ({}));
  const db = openPod(c.get('podPath'));
  const t = db.getTotp(user.id);
  const step = t?.secret && !t.enabled ? verifyTotp(t.secret, code) : null;
  if (!step) { db.close(); return c.json({ error: 'Code did not match — check the time on your phone and try again' }, 400); }
  const codes = generateRecoveryCodes();
  db.enableTotp(user.id, codes.map(hashRecoveryCode), step);
  dropOtherSessions(c, db, user.id);
  db.close();
  return c.json({ ok: true, recoveryCodes: codes });
});

// POST /api/account/2fa/disable { currentPassword, code }   (code = authenticator code or a recovery code)
accountRoutes.post('/2fa/disable', async (c) => {
  const user = c.get('user');
  const { currentPassword, code } = await c.req.json().catch(() => ({}));
  const db = openPod(c.get('podPath'));
  const full = db.getUserByUsername(user.username);
  const t = db.getTotp(user.id);
  if (!t?.enabled) { db.close(); return c.json({ error: '2FA is not enabled' }, 400); }
  if (!currentPassword || !(await verifyPassword(currentPassword, full.password))) { db.close(); return c.json({ error: 'Current password is incorrect' }, 401); }
  const codeOk = verifyTotp(t.secret, code, { after: t.last }) || t.recovery.includes(hashRecoveryCode(code ?? ''));
  if (!codeOk) { db.close(); return c.json({ error: 'Invalid code' }, 401); }
  db.disableTotp(user.id);
  db.close();
  return c.json({ ok: true });
});

// ── Active sessions ──────────────────────────────────────────────────────────
// Sessions are addressed by a hash of the token, never the token itself.
const sessionId = (token) => createHash('sha256').update(token).digest('hex').slice(0, 16);

// GET /api/account/sessions
accountRoutes.get('/sessions', (c) => {
  const current = getCookie(c, 'orb_sess') ?? '';
  const db = openPod(c.get('podPath'));
  const rows = db.listSessions(c.get('user').id);
  db.close();
  return c.json(rows.map(r => ({
    id: sessionId(r.token), current: r.token === current,
    ip: r.ip, ua: r.ua, created_at: r.created_at, expires_at: r.expires_at,
  })));
});

// DELETE /api/account/sessions/:id — sign out one other device
accountRoutes.delete('/sessions/:id', (c) => {
  const current = getCookie(c, 'orb_sess') ?? '';
  const db = openPod(c.get('podPath'));
  const hit = db.listSessions(c.get('user').id).find(r => sessionId(r.token) === c.req.param('id') && r.token !== current);
  if (hit) db.deleteSession(hit.token);
  db.close();
  return c.json({ ok: !!hit });
});

// DELETE /api/account/sessions — sign out everywhere else
accountRoutes.delete('/sessions', (c) => {
  const db = openPod(c.get('podPath'));
  dropOtherSessions(c, db, c.get('user').id);
  db.close();
  return c.json({ ok: true });
});
