/**
 * Runs after `astro build` (npm "postbuild" hook). Reads the built HTML in dist/ and writes
 *   dist/search-index.json   — what public/search.js searches (pages, docs, roadmap items, changelog entries)
 *   dist/changelog.xml       — Atom feed of the changelog
 *   dist/changelog.json      — JSON Feed 1.1 of the same
 * No dependencies: the markup is ours, so a few regular expressions are enough.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://orbiter.sh';

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&rarr;': '→', '&#123;': '{', '&#125;': '}' };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|nbsp|mdash|ndash|hellip|rarr|#39|#123|#125);/g, (m) => ENT[m]).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const strip = (html) => decode(html.replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const slug = (t) => t.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clip = (s, n) => (s.length > n ? s.slice(0, n) : s);
// The page text starts with its own heading; the title is already shown above the snippet
const noTitle = (body, title) => (body.toLowerCase().startsWith(title.toLowerCase()) ? body.slice(title.length).trim() : body);
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
}
const urlOf = (file) => '/' + relative(DIST, file).split(sep).join('/').replace(/index\.html$/, '');

const entries = [];
const feed = [];

for (const file of walk(DIST).filter((f) => f.endsWith('index.html'))) {
  const url = urlOf(file);
  if (/^\/(privacy|cookies|404)\/?$/.test(url)) continue;
  const html = readFileSync(file, 'utf8');
  const title = strip((html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? url).replace(/\s+—\s+Orbiter( Docs)?$/i, '');

  if (url.startsWith('/docs/')) {
    const article = (html.match(/<article class="prose[^"]*"[^>]*>([\s\S]*?)<\/article>/) ?? [])[1] ?? '';
    const heads = [...article.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map((m) => strip(m[1]));
    entries.push({ t: title, u: url, k: 'Docs', h: heads.join(' · '), b: clip(noTitle(strip(article), title), 2400) });
  } else if (url === '/') {
    // One entry per top-level section so results deep-link into the home page
    for (const m of html.matchAll(/<section id="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
      const [, id, inner] = m;
      if (id === 'updates') continue; // changelog cards are indexed on their own below
      const h2 = (inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) ?? [])[1];
      entries.push({ t: h2 ? strip(h2) : id.replace(/-/g, ' '), u: `/#${id}`, k: 'Page', h: '', b: clip(strip(inner), 1200) });
    }
    // Changelog cards → search entries + feed items
    for (const m of html.matchAll(/<div class="update-card[^"]*"[^>]*?id="([^"]+)"[^>]*?data-date="([^"]+)"[^>]*>([\s\S]*?)(?=<div class="update-card|<\/div>\s*<\/div>\s*<\/section>)/g)) {
      const [, id, date, inner] = m;
      const ttl = strip((inner.match(/<div class="update-title"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? id);
      const tag = strip((inner.match(/<div class="update-tag"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? '');
      const lead = strip((inner.match(/<p[^>]*>([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => x[1].trim());
      entries.push({ t: ttl, u: `/#${id}`, k: 'Changelog', h: tag, b: clip(strip(inner), 1800) });
      feed.push({ id, date, title: ttl, tag, lead, items });
    }
  } else if (url === '/vision/') {
    for (const m of html.matchAll(/<div class="rm-item[^"]*"[^>]*>([\s\S]*?)<span class="rm-tag ([a-z]+)"[^>]*>([\s\S]*?)<\/span>/g)) {
      const [, inner, , tagText] = m;
      const phase = strip((inner.match(/<div class="rm-phase"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? '');
      const ttl = strip((inner.match(/<div class="rm-title"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? '');
      const desc = strip((inner.match(/<div class="rm-desc"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? '');
      if (!ttl) continue;
      entries.push({ t: ttl, u: `/vision/#${slug(ttl)}`, k: 'Roadmap', h: `${phase} · ${strip(tagText)}`, b: clip(desc, 700) });
    }
    entries.push({ t: 'Vision — One content source, two audiences', u: '/vision/', k: 'Page', h: '', b: clip(strip(html), 1200) });
  }
}

// Deduplicate roadmap slugs the same way the page script does (-2 suffix)
const used = new Set();
for (const e of entries.filter((x) => x.k === 'Roadmap')) {
  let [path, id] = e.u.split('#'); let n = id; while (used.has(n)) n += '-2'; used.add(n); e.u = `${path}#${n}`;
}

writeFileSync(join(DIST, 'search-index.json'), JSON.stringify({ v: 1, built: new Date().toISOString(), entries }));

// ── Changelog feeds ─────────────────────────────────────────────────────────
feed.sort((a, b) => b.date.localeCompare(a.date));
const stamp = (d) => `${d}T12:00:00Z`;
const body = (f) => `<p>${xml(f.lead || f.tag)}</p>${f.items.length ? `<ul>${f.items.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''}`;

const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Orbiter — changelog</title>
  <subtitle>Releases and notable changes of Orbiter, the CMS in one POD.</subtitle>
  <link href="${SITE}/changelog.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE}/#updates" rel="alternate" type="text/html"/>
  <id>${SITE}/changelog.xml</id>
  <updated>${stamp(feed[0]?.date ?? new Date().toISOString().slice(0, 10))}</updated>
  <author><name>Orbiter</name><uri>${SITE}</uri></author>
${feed.map((f) => `  <entry>
    <id>${SITE}/#${f.id}</id>
    <title>${xml(f.title)}</title>
    <link href="${SITE}/#${f.id}" rel="alternate" type="text/html"/>
    <updated>${stamp(f.date)}</updated>
    <summary>${xml(f.tag)}</summary>
    <content type="html">${xml(body(f))}</content>
  </entry>`).join('\n')}
</feed>
`;
writeFileSync(join(DIST, 'changelog.xml'), atom);

writeFileSync(join(DIST, 'changelog.json'), JSON.stringify({
  version: 'https://jsonfeed.org/version/1.1', title: 'Orbiter — changelog',
  home_page_url: `${SITE}/#updates`, feed_url: `${SITE}/changelog.json`,
  description: 'Releases and notable changes of Orbiter, the CMS in one POD.',
  items: feed.map((f) => ({ id: `${SITE}/#${f.id}`, url: `${SITE}/#${f.id}`, title: f.title, summary: f.tag, content_html: body(f), date_published: stamp(f.date) })),
}, null, 2));

console.log(`postbuild: ${entries.length} search entries (${(statSyncSafe(join(DIST, 'search-index.json')) / 1024).toFixed(0)} KB), ${feed.length} changelog items`);
function statSyncSafe(p) { return existsSync(p) ? statSync(p).size : 0; }
