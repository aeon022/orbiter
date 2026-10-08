/**
 * Security checks for a pod. Pure data in, findings out — used by `orbiter doctor`
 * and the admin dashboard card.
 *
 * ctx: { gitTracked?: boolean }  (whether the .pod file is tracked by git; unknown = omit)
 * Returns [{ level: 'fail' | 'warn' | 'ok', id, message, fix? }]
 */
import { execFileSync } from 'node:child_process';
import { dirname, basename } from 'node:path';
import { SECRET_META_KEYS, secretsEnabled, isEncrypted } from './secrets.js';

export function securityChecks(db, ctx = {}) {
  const out = [];
  const add = (level, id, message, fix) => out.push({ level, id, message, ...(fix ? { fix } : {}) });
  const rawMeta = (k) => db.db.prepare('SELECT value FROM _meta WHERE key = ?').get(k)?.value ?? '';

  const sessions = db.db.prepare("SELECT COUNT(*) n FROM _sessions WHERE expires_at > datetime('now')").get().n;
  const users    = db.db.prepare('SELECT COUNT(*) n FROM _users').get().n;
  const admins   = db.db.prepare("SELECT COUNT(*) n FROM _users WHERE role = 'admin'").get().n;

  // 1. The pod file in git carries accounts, sessions and credentials.
  if (ctx.gitTracked) {
    add('fail', 'pod-in-git',
      `The pod is tracked by git and contains ${users} user account(s) with password hashes and ${sessions} live session(s).`,
      'Use a private repo and encrypt it (orbiter encrypt), or stop tracking the file and deploy content another way.');
  } else if (ctx.gitTracked === false) {
    add('ok', 'pod-in-git', 'The pod file is not tracked by git.');
  }

  // 2. Credentials stored in plaintext.
  const plain = [...SECRET_META_KEYS].filter(k => { const v = rawMeta(k); return v && !isEncrypted(v); });
  if (plain.length) {
    add('warn', 'plaintext-secrets',
      `${plain.length} credential(s) are stored in plaintext: ${plain.join(', ')}.`,
      secretsEnabled()
        ? 'Restart the admin; it encrypts them on startup.'
        : 'Set ORBITER_SECRET (a long random string) in the server environment and restart the admin.');
  } else if ([...SECRET_META_KEYS].some(k => rawMeta(k))) {
    add('ok', 'plaintext-secrets', 'Stored credentials are encrypted.');
  }

  // 3. Content API exposure.
  const apiOn = rawMeta('api.enabled') === '1';
  const apiToken = rawMeta('api.token');
  if (apiOn && !apiToken && rawMeta('api.requireKey') !== '1') {
    add('warn', 'api-open', 'The Content API is enabled without a token or required API key: all published content is readable by anyone.',
      'Set an API token, or turn on "require API key" if the content is not meant to be public.');
  }
  if (apiToken && !apiToken.startsWith('sha256:')) {
    add('warn', 'api-token-plain', 'The API token is stored in plaintext.', 'Open Settings → API and save once; it is stored hashed from then on.');
  }
  let keys = [];
  try { keys = JSON.parse(rawMeta('api.keys') || '[]'); } catch {}
  if (keys.some(k => k.key)) add('warn', 'api-keys-plain', 'Some API keys are stored in plaintext.', 'Use each key once; it is migrated to a hash on first use.');
  const writeKeys = keys.filter(k => k.scope === 'draft-write').length;
  if (writeKeys) add('ok', 'api-write-keys', `${writeKeys} API key(s) can create drafts over MCP (they can never publish).`);

  // 4. Accounts.
  if (!admins) add('fail', 'no-admin', 'No admin account exists.', 'Create one with: orbiter add-user');
  if (admins > 3) add('warn', 'many-admins', `${admins} admin accounts. Prefer the editor role where possible.`);
  if (sessions > 20) add('warn', 'many-sessions', `${sessions} live sessions. Change a password to sign out other devices.`);

  // 5. Preview token.
  if (rawMeta('preview.token')) add('ok', 'preview-token', 'A preview token is set (drafts are only visible with it).');

  if (!out.some(f => f.level !== 'ok')) add('ok', 'all-clear', 'No problems found.');
  return out;
}

/** true/false if the pod file is inside a git work tree and (not) tracked; undefined if git is unavailable or it's not a repo. */
export function isTrackedByGit(podPath) {
  const cwd = dirname(podPath);
  const git = (args) => execFileSync('git', args, { cwd, stdio: 'ignore', timeout: 5000 });
  try { git(['rev-parse', '--is-inside-work-tree']); } catch { return undefined; }
  try { git(['ls-files', '--error-unmatch', basename(podPath)]); return true; } catch { return false; }
}
