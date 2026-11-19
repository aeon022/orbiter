// Fills the "anleitungen" collection (the read-only Help view in Orbiter admin and Lander) from Markdown files.
// Every "## Section" becomes an entry (the text before the first ## becomes "Overview"). Safe to re-run (entries with the same title are overwritten).
//   LANDER_USER=… LANDER_PASS=… node scripts/help-import.mjs <admin-url> Editors=docs/EDITORS.md Technical=docs/TECH.md [--links help-links.json]
// <admin-url>: the admin (…/ for Orbiter, …/lander for a Lander in a subfolder). The group name before "=" is shown in the Help view.
// --overview "Überblick"   title of the text before the first ## (default: Overview)
// help-links.json: [{"label": "Docs", "url": "https://…"}] — external links in the "Anleitungen" sidebar group (admin only; needs admin 0.3.113+ / Lander 0.7.6+).
// Entries are saved as drafts, so they are not served by the public API.
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const oi = args.indexOf('--overview'); const overview = oi >= 0 ? args.splice(oi, 2)[1] : 'Overview';   // title of the text before the first ## (e.g. "Überblick")
const li = args.indexOf('--links'); const linksFile = li >= 0 ? args.splice(li, 2)[1] : null;
const [base, ...pairs] = args;
if (!base || !pairs.length) { console.error('Usage: node scripts/help-import.mjs <admin-url> Group=file.md [Group=file.md …] [--links links.json] [--overview Title]'); process.exit(1); }
const admin = base.replace(/\/$/, ''), origin = new URL(admin).origin; let cookie = '';
const { LANDER_USER: user, LANDER_PASS: pass } = process.env;
async function api(path, method = 'GET', body, soft = false) {
  const r = await fetch(admin + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (path.endsWith('/login')) cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  if (!r.ok) { if (soft) return null; throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`); }
  return r.status === 204 ? {} : r.json();
}
await api('/api/auth/login', 'POST', { username: user, password: pass });
const groups = pairs.map((p) => p.split('=')[0]);
const def = { id: 'anleitungen', label: 'Anleitungen', singleton: false, schema: {
  title: { type: 'string', label: 'Titel', list: true }, gruppe: { type: 'select', label: 'Gruppe', options: groups, list: true },
  reihenfolge: { type: 'number', label: 'Reihenfolge', list: true }, body: { type: 'richtext', label: 'Text' } } };
const have = (await api('/api/collections')).find((c) => c.id === 'anleitungen');
if (have) { const old = have.schema?.gruppe?.options ?? []; def.schema.gruppe.options = [...new Set([...old, ...groups])]; await api('/api/collections/anleitungen', 'PUT', def); } else await api('/api/collections', 'POST', def);

const slug = (t) => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let n = 0;
for (const pair of pairs) {
  const [group, file] = [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)];
  const parts = readFileSync(file, 'utf8').split(/^## /m); const intro = parts.shift().replace(/^# [^\n]*\n*/, '').trim();
  const list = [...(intro ? [[overview, intro]] : []), ...parts.map((t) => { const [h, ...r] = t.split('\n'); return [h.replace(/^\d+\.\s*/, '').replace(/`/g, '').trim(), r.join('\n').trim()]; })];
  for (const [title, body] of list) {
    const id = slug(group + '-' + title); n += 1; const data = { title, gruppe: group, reihenfolge: n, body };
    const e = await api(`/api/collections/anleitungen/entries/${id}`, 'GET', undefined, true);
    if (e) await api(`/api/collections/anleitungen/entries/${id}`, 'PUT', { data, status: e.status }); else await api('/api/collections/anleitungen/entries', 'POST', { slug: id, data, status: 'draft' });
    console.log(' ', group, '·', title);
  }
}
const meta = await api('/api/meta'); const g = JSON.parse(meta['nav.groups'] || '{}');
for (const k of Object.keys(g)) g[k] = g[k].filter((c) => c !== 'anleitungen');
delete g.Hilfe;   // older name of the group; the dock now has its own "Hilfe" icon
g.Anleitungen = ['anleitungen'];
const put = { 'nav.groups': JSON.stringify(g) };
if (linksFile) put['nav.links'] = JSON.stringify({ Anleitungen: JSON.parse(readFileSync(linksFile, 'utf8')) });
await api('/api/meta', 'PUT', put);
console.log(n, 'entries · sidebar group "Anleitungen"' + (linksFile ? ' with links' : ''));
