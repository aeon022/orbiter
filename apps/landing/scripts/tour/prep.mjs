import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { totpCode } from '../../../../packages/core/src/totp.js';
const sharp = createRequire(new URL('../../../../packages/admin/package.json', import.meta.url))('sharp');
const B = 'http://localhost:4398', O = { Origin: B };
let cookie = '';
const api = async (path, { method = 'GET', json, form } = {}) => {
  const r = await fetch(B + path, { method, headers: { ...O, cookie, ...(json ? { 'Content-Type': 'application/json' } : {}) }, body: json ? JSON.stringify(json) : form });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const t = await r.text(); try { return JSON.parse(t); } catch { return t; }
};
await api('/api/auth/login', { method: 'POST', json: { username: 'admin', password: 'orbiter-demo-1' } });

// ── abstract cover art ─────────────────────────────────────────────────────────
const palettes = {
  'studio-wall':      ['#1b2a49', '#e8a87c', '#c38d9e'], 'typography-study': ['#2d2a32', '#f2e9e4', '#c9ada7'],
  'harbour-dawn':     ['#0b3954', '#ff9f68', '#ffd6a5'], 'bakery-brand':     ['#3d2c2e', '#f4a259', '#bc4b51'],
  'clinic-lobby':     ['#16423c', '#6a9c89', '#e9efec'], 'lab-prototype':    ['#1a1a2e', '#7f5af0', '#2cb67d'],
  'festival-poster':  ['#2b1055', '#ff6ec7', '#ffd23f'], 'moodboard-unused': ['#222', '#888', '#bbb'],
};
const art = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="880" cy="250" r="170" fill="${c[1]}" opacity=".92"/><circle cx="880" cy="250" r="230" fill="none" stroke="${c[1]}" stroke-opacity=".35" stroke-width="3"/>${[0,1,2,3,4].map((i) => `<path d="M0 ${520 + i * 46} Q300 ${470 + i * 46} 600 ${520 + i * 46} T1200 ${520 + i * 46}" fill="none" stroke="#fff" stroke-opacity="${0.5 - i * 0.08}" stroke-width="2"/>`).join('')}</svg>`;
const media = {};
for (const [name, c] of Object.entries(palettes)) {
  const buf = await sharp(Buffer.from(art(c))).jpeg({ quality: 82 }).toBuffer();
  const fd = new FormData(); fd.set('file', new Blob([buf], { type: 'image/jpeg' }), name + '.jpg'); fd.set('alt', name.replace(/-/g, ' '));
  const m = await api('/api/media', { method: 'POST', form: fd }); media[name] = m.id;
}
// ── covers on entries ──────────────────────────────────────────────────────────
const covers = { journal: { 'single-file-website': 'studio-wall', 'typography-long-form': 'typography-study', 'harbour-festival': 'harbour-dawn', 'review-workflow': 'lab-prototype', 'three-handovers': 'studio-wall', 'design-systems': 'lab-prototype' },
  projects: { 'harbour-festival': 'festival-poster', 'nordic-bakery': 'bakery-brand', 'atlas-clinic': 'clinic-lobby', 'lumen-lab': 'lab-prototype' } };
for (const [col, map] of Object.entries(covers)) for (const [slug, img] of Object.entries(map)) {
  const e = await api(`/api/collections/${col}/entries/${slug}`);
  await api(`/api/collections/${col}/entries/${slug}`, { method: 'PUT', json: { slug, data: { ...e.data, cover: media[img] }, status: e.status === 'scheduled' ? 'scheduled' : e.status } });
}
// ── API keys + webhook ─────────────────────────────────────────────────────────
await api('/api/api-keys', { method: 'POST', json: { label: 'Website frontend', scope: 'read' } });
await api('/api/api-keys', { method: 'POST', json: { label: 'Claude agent', scope: 'draft-write', collections: ['journal'], expires: '2027-01-31', rateLimit: 60 } });
await api('/api/webhooks', { method: 'POST', json: { url: 'https://hooks.example.com/orbiter', events: ['publish', 'review'] } });
// ── 2FA for the admin (kept session stays valid) ───────────────────────────────
const s = await api('/api/account/2fa/setup', { method: 'POST', json: { currentPassword: 'orbiter-demo-1' } });
const en = await api('/api/account/2fa/enable', { method: 'POST', json: { code: totpCode(s.secret) } });
console.log('2fa enabled:', !!en.ok);
writeFileSync(new URL('./session.json', import.meta.url), JSON.stringify({ cookie, media }));
console.log('media:', Object.keys(media).length, 'cookie:', cookie.slice(0, 18) + '…');
