/**
 * Outgoing webhooks: HMAC-signed, retried, logged.
 *
 * Hooks live in _meta `webhooks.urls` as [{ id, url, events?, secret? }] (encrypted at rest when
 * ORBITER_SECRET is set). Each delivery POSTs JSON and sends
 *   X-Orbiter-Event, X-Orbiter-Delivery, X-Orbiter-Timestamp (unix s)
 *   X-Orbiter-Signature: sha256=<hex hmac(secret, `${timestamp}.${body}`)>   (when the hook has a secret)
 * A failed delivery (network error / non-2xx) is retried after 5 s, 30 s and 5 min.
 * ponytail: retries are in-process timers — a restart drops pending ones. Persist a queue if that matters.
 */
import { createHmac, randomUUID, randomBytes } from 'node:crypto';
import { openPod } from '@a83/orbiter-core';

const RETRY_MS  = [5_000, 30_000, 300_000];
const LOG_LIMIT = 50;

export const sign = (secret, timestamp, body) =>
  'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

export const newSecret = () => 'whsec_' + randomBytes(24).toString('base64url');

export function readHooks(db) {
  let hooks = [];
  try { hooks = JSON.parse(db.getMeta('webhooks.urls') || '[]'); } catch {}
  // Older entries have no id: derive a stable one from the position so they can be listed/removed.
  return hooks.filter(h => h?.url).map((h, i) => ({ id: h.id ?? `legacy-${i}`, ...h }));
}
export const writeHooks = (db, hooks) => db.setMeta('webhooks.urls', JSON.stringify(hooks));

export function readLog(db) {
  try { return JSON.parse(db.getMeta('webhooks.log') || '[]'); } catch { return []; }
}
function appendLog(podPath, entry) {
  try {
    const db = openPod(podPath);
    db.setMeta('webhooks.log', JSON.stringify([entry, ...readLog(db)].slice(0, LOG_LIMIT)));
    db.close();
  } catch { /* logging must never break a request */ }
}

/** One delivery attempt chain. Resolves with the final log entry (retries continue in the background). */
export async function deliver(podPath, hook, event, payload = {}, { retry = true } = {}) {
  const id   = randomUUID();
  const body = JSON.stringify({ event, id, timestamp: new Date().toISOString(), ...payload });

  const attempt = async (n) => {
    const ts = Math.floor(Date.now() / 1000);
    const headers = {
      'Content-Type': 'application/json', 'User-Agent': 'Orbiter-Webhook/1.0',
      'X-Orbiter-Event': event, 'X-Orbiter-Delivery': id, 'X-Orbiter-Timestamp': String(ts),
      ...(hook.secret ? { 'X-Orbiter-Signature': sign(hook.secret, ts, body) } : {}),
    };
    let status = 0, error = null;
    try {
      const res = await fetch(hook.url, { method: 'POST', headers, body, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      status = res.status;
    } catch (e) { error = e.message; }
    const ok = status >= 200 && status < 300;
    const entry = { id, ts: new Date().toISOString(), event, hook: hook.id, url: hook.url, status, ok, attempt: n, error };
    appendLog(podPath, entry);
    if (!ok && retry && n <= RETRY_MS.length) {
      setTimeout(() => attempt(n + 1), RETRY_MS[n - 1]).unref();
    }
    return entry;
  };
  return attempt(1);
}

/** Fire an event at every matching hook (fire-and-forget). */
export function fireHooks(podPath, event, payload = {}) {
  const db = openPod(podPath);
  const hooks = readHooks(db);
  db.close();
  for (const hook of hooks) {
    if (hook.events?.length && !hook.events.includes(event) && !hook.events.includes('*')) continue;
    deliver(podPath, hook, event, payload).catch(() => {});
  }
}
