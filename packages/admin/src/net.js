import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_REDIRECTS = 5;
export const MAX_FETCH_BYTES = 50 * 1024 * 1024;

// True for loopback, private, link-local, CGNAT, ULA, multicast and unspecified addresses
// (IPv4, IPv6, and IPv4-mapped IPv6).
export function isPrivateIp(ip) {
  ip = String(ip).toLowerCase();
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) ip = mapped[1];
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0)
      || (a === 198 && (b === 18 || b === 19));
  }
  if (isIP(ip) === 6) {
    return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('ff');
  }
  return true; // not an IP → treat as unsafe
}

async function assertPublicUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error('Invalid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http(s) URLs are allowed');
  if (process.env.ORBITER_ALLOW_PRIVATE_FETCH === '1') return u;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) {
    throw new Error('URL resolves to a private or reserved address');
  }
  return u;
}

/**
 * fetch() for user-supplied URLs: http(s) only, no private/loopback/link-local targets
 * (re-checked on every redirect hop), body capped at MAX_FETCH_BYTES.
 * Returns { resp, buffer } (buffer is null for HEAD).
 * ponytail: validates DNS before fetch(), which resolves again — a rebinding race is
 * possible; pin the resolved IP via an undici dispatcher if that threat matters.
 */
export async function safeFetch(rawUrl, init = {}) {
  let url = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const resp = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
      url = new URL(resp.headers.get('location'), url).href;
      continue;
    }
    if (init.method === 'HEAD') return { resp, buffer: null };
    if (Number(resp.headers.get('content-length')) > MAX_FETCH_BYTES) throw new Error('Remote file too large');
    const chunks = [];
    let total = 0;
    for await (const chunk of resp.body ?? []) {
      total += chunk.length;
      if (total > MAX_FETCH_BYTES) throw new Error('Remote file too large');
      chunks.push(chunk);
    }
    return { resp, buffer: Buffer.concat(chunks) };
  }
  throw new Error('Too many redirects');
}

/**
 * Client IP for rate limiting. X-Forwarded-For is only honoured when the TCP peer is itself
 * a private/loopback address (i.e. a reverse proxy in front); then the *rightmost* entry —
 * the one that proxy appended — is used. A direct client can't spoof it.
 */
export function clientIp(socketIp, xForwardedFor) {
  const peer = socketIp ?? 'unknown';
  if (!xForwardedFor || !isPrivateIp(peer)) return peer;
  const parts = xForwardedFor.split(',').map(s => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? peer;
}
