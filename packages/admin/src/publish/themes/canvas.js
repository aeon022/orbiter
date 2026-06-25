function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function colHref(root, colId) { return `${root}${colId}/index.html`; }
function entryHref(root, colId, slug) { return `${root}${colId}/${slug}/index.html`; }

function readingTime(text) {
  if (!text) return '';
  const words = text.replace(/<[^>]*>/g, '').replace(/[#*_~`>\-|]/g, ' ').split(/\s+/).filter(Boolean).length;
  const min = Math.max(1, Math.round(words / 200));
  return `${min} min read`;
}

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='4' y='4' width='24' height='24' rx='4' fill='%234f46e5' opacity='.9'/%3E%3Crect x='8' y='8' width='16' height='16' rx='2' fill='%23fff' opacity='.3'/%3E%3C/svg%3E";

const THEME_JS = `<script>
(function(){
  var d=document.documentElement;
  var s=localStorage.getItem('canvas-theme');
  if(s==='dark')d.setAttribute('data-theme','dark');
  else if(s==='light')d.setAttribute('data-theme','light');
  var t=document.getElementById('theme-toggle');
  if(t)t.addEventListener('click',function(){
    var c=d.getAttribute('data-theme');
    var n=c==='dark'?'light':c==='light'?'dark':
      (matchMedia('(prefers-color-scheme:dark)').matches?'light':'dark');
    d.setAttribute('data-theme',n);
    localStorage.setItem('canvas-theme',n);
  });
})();
<\/script>`;

export const canvas = {
  meta: {
    id: 'canvas',
    name: 'Canvas',
    description: 'Editorial whiteboard theme — paper-like, generous spacing, serif headings',
  },

  css() {
    return `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

:root{
  --bg:#f1f5f9;--board:#ffffff;--board-border:#e2e8f0;
  --text:#0f172a;--text-2:#334155;--text-3:#64748b;--text-4:#94a3b8;
  --accent:#4f46e5;--accent-subtle:#eef2ff;
  --divider:linear-gradient(90deg,transparent,#cbd5e1 20%,#cbd5e1 80%,transparent);
  --radius:24px;--radius-sm:16px;
  --sans:'Plus Jakarta Sans',system-ui,sans-serif;
  --serif:'Cinzel',Georgia,'Times New Roman',serif;
  --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  --shadow:0 20px 40px rgba(15,23,42,.03),0 1px 3px rgba(15,23,42,.02);
  --content-w:900px;
  --board-w:1100px;
  --board-pad:60px;
}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){
  --bg:#0f172a;--board:#1e293b;--board-border:#334155;
  --text:#f1f5f9;--text-2:#cbd5e1;--text-3:#94a3b8;--text-4:#64748b;
  --accent:#818cf8;--accent-subtle:rgba(129,140,248,.1);
  --divider:linear-gradient(90deg,transparent,#475569 20%,#475569 80%,transparent);
  --shadow:0 20px 40px rgba(0,0,0,.2),0 1px 3px rgba(0,0,0,.1);
}}
:root[data-theme=dark]{
  --bg:#0f172a;--board:#1e293b;--board-border:#334155;
  --text:#f1f5f9;--text-2:#cbd5e1;--text-3:#94a3b8;--text-4:#64748b;
  --accent:#818cf8;--accent-subtle:rgba(129,140,248,.1);
  --divider:linear-gradient(90deg,transparent,#475569 20%,#475569 80%,transparent);
  --shadow:0 20px 40px rgba(0,0,0,.2),0 1px 3px rgba(0,0,0,.1);
}
:root[data-theme=light]{
  --bg:#f1f5f9;--board:#ffffff;--board-border:#e2e8f0;
  --text:#0f172a;--text-2:#334155;--text-3:#64748b;--text-4:#94a3b8;
  --accent:#4f46e5;--accent-subtle:#eef2ff;
  --divider:linear-gradient(90deg,transparent,#cbd5e1 20%,#cbd5e1 80%,transparent);
  --shadow:0 20px 40px rgba(15,23,42,.03),0 1px 3px rgba(15,23,42,.02);
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:var(--sans);color:var(--text);background:var(--bg);line-height:1.8;min-height:100dvh;padding:48px 20px;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none;transition:opacity .2s}
a:hover{opacity:.75}
img{max-width:100%;height:auto;display:block}

/* ═══ Board ═══ */
.board{max-width:var(--board-w);margin:0 auto;background:var(--board);border:1px solid var(--board-border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--board-pad);position:relative}
.board::after{content:'';position:absolute;bottom:0;left:10%;width:80%;height:4px;background:var(--divider);border-radius:2px}

.board-content{max-width:var(--content-w);margin:0 auto}

.board-divider{height:1px;background:var(--divider);border:none;margin:64px 0}

/* ═══ Board Nav ═══ */
.board-nav{display:flex;justify-content:center;gap:32px;margin-bottom:48px}
.board-nav a{font-size:.8rem;text-transform:uppercase;letter-spacing:2.5px;color:var(--text-3);font-weight:500;transition:color .2s;opacity:1}
.board-nav a:hover{color:var(--text);opacity:1}
.theme-toggle-wrap{position:absolute;top:var(--board-pad);right:var(--board-pad)}
.theme-toggle{appearance:none;border:none;background:none;color:var(--text-4);width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s}
.theme-toggle:hover{color:var(--accent)}
.theme-toggle svg{width:16px;height:16px}

/* ═══ Board Header ═══ */
.board-header{text-align:center;margin-bottom:72px;padding-bottom:40px;border-bottom:1px solid var(--board-border)}
.board-header h1{font-family:var(--serif);font-size:clamp(2.2rem,5vw,3.5rem);font-weight:400;letter-spacing:.2em;color:var(--text);margin-bottom:12px}
.board-header p{color:var(--text-4);font-size:.95rem;text-transform:uppercase;letter-spacing:5px}

/* ═══ Section Titles ═══ */
.section-title{font-family:var(--serif);font-size:.85rem;text-transform:uppercase;letter-spacing:4px;color:var(--text-4);margin-bottom:40px;text-align:center}

/* ═══ Card Grid ═══ */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:28px}
.card{background:var(--board);border:1px solid var(--board-border);border-radius:var(--radius-sm);padding:32px;transition:all .3s ease}
.card:hover{transform:translateY(-4px);box-shadow:0 20px 30px -8px rgba(15,23,42,.06);border-color:var(--text-4)}
.card-tag{font-size:.7rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--accent);font-weight:600;display:block;margin-bottom:14px}
.card h2{font-size:1.2rem;color:var(--text);margin-bottom:10px;line-height:1.4;font-weight:600}
.card p{color:var(--text-3);font-size:.9rem;margin-bottom:20px;line-height:1.6}
.card-link{font-size:.85rem;font-weight:600;color:var(--text);border-bottom:1px solid var(--text);padding-bottom:2px;transition:opacity .2s;opacity:1}
.card-link:hover{opacity:.6}
.card-meta{display:flex;align-items:center;gap:16px;font-size:.75rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-4);margin-top:auto;padding-top:16px;border-top:1px solid var(--board-border)}

/* ═══ Article Detail ═══ */
.article-meta{display:flex;align-items:center;gap:16px;margin-bottom:24px;font-size:.8rem;text-transform:uppercase;letter-spacing:2px}
.article-meta .cat{color:var(--accent);font-weight:600}
.article-meta .rt{color:var(--text-4)}
.article-meta .rt::before{content:'\\b7';margin-right:16px}

article h1{font-family:var(--serif);font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.3;color:var(--text);margin-bottom:36px;font-weight:600}

.hero-img{margin:-20px calc(-1 * var(--board-pad)) 40px;overflow:hidden}
.hero-img img{width:100%;aspect-ratio:2.2/1;object-fit:cover}

.field-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:40px;padding:20px 24px;background:var(--bg);border-radius:12px}
.field-item{display:flex;flex-direction:column;gap:2px}
.field-label{font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-4);font-weight:600}
.field-value{font-size:.85rem;color:var(--text-2)}
.field-value a{word-break:break-all}

/* ═══ Prose ═══ */
.prose{font-size:1.1rem;color:var(--text-2);line-height:1.9}
.prose h1{font-family:var(--serif);font-size:2rem;margin:56px 0 20px;color:var(--text);font-weight:600}
.prose h2{font-family:var(--serif);font-size:1.6rem;margin:48px 0 16px;color:var(--text);font-weight:600}
.prose h3{font-size:1.3rem;margin:36px 0 12px;color:var(--text);font-weight:600}
.prose p{margin-bottom:28px}
.prose>*:first-child{margin-top:0}
.prose>*:last-child{margin-bottom:0}
.prose ul,.prose ol{margin-bottom:28px;padding-left:20px}
.prose li{margin-bottom:12px;color:var(--text-3)}
.prose li::marker{color:var(--text-4)}
.prose blockquote{margin:40px 0;padding:28px 36px;background:var(--bg);border-left:2px solid var(--text);font-style:italic;font-size:1.15rem;color:var(--text-2);border-radius:0 12px 12px 0}
.prose blockquote p:last-child{margin-bottom:0}
.prose pre{background:#1e1b2e;color:#e2def6;padding:24px 28px;border-radius:12px;overflow-x:auto;margin:32px 0;font-size:.85rem;line-height:1.7;font-family:var(--mono);tab-size:2}
.prose code{font-family:var(--mono);font-size:.85em;background:var(--accent-subtle);padding:2px 6px;border-radius:4px;color:var(--accent)}
.prose pre code{background:none;padding:0;color:inherit}
.prose img{margin:36px 0;border-radius:12px}
.prose hr{border:none;height:1px;background:var(--divider);margin:48px 0}
.prose a{color:var(--accent);border-bottom:1px solid var(--accent);padding-bottom:1px;opacity:1}
.prose a:hover{opacity:.7}
.prose strong{font-weight:600;color:var(--text)}
.prose table{width:100%;border-collapse:collapse;margin:32px 0;font-size:.9rem}
.prose th,.prose td{padding:10px 14px;border:1px solid var(--board-border);text-align:left}
.prose th{background:var(--bg);font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-3)}

/* ═══ Breadcrumb ═══ */
.breadcrumb{margin-bottom:24px;font-size:.8rem;text-transform:uppercase;letter-spacing:2px;color:var(--text-4);display:flex;align-items:center;gap:8px}
.breadcrumb a{color:var(--text-3);opacity:1}
.breadcrumb a:hover{color:var(--accent);opacity:1}
.breadcrumb .sep{color:var(--text-4);font-size:.65rem}

/* ═══ Children pills ═══ */
.list-children{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.list-children a{font-size:.7rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-4);padding:4px 12px;border:1px solid var(--board-border);border-radius:20px;font-weight:500;transition:all .2s;opacity:1}
.list-children a:hover{color:var(--accent);border-color:var(--accent);opacity:1}

.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.tag{font-size:.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent);padding:3px 10px;border:1px solid var(--accent);border-radius:20px;font-weight:500;opacity:.7}

/* ═══ Footer ═══ */
.board-footer{text-align:center;padding-top:40px;margin-top:64px;border-top:1px solid var(--board-border);font-size:.75rem;color:var(--text-4);text-transform:uppercase;letter-spacing:3px}

/* ═══ Responsive ═══ */
@media(max-width:768px){
  body{padding:20px 12px}
  .board{padding:32px 24px;border-radius:20px}
  .board-nav{gap:20px;flex-wrap:wrap}
  .board-nav a{font-size:.7rem;letter-spacing:1.5px}
  .board-header h1{letter-spacing:.1em}
  .card-grid{grid-template-columns:1fr}
  .hero-img{margin-left:-24px;margin-right:-24px}
  .theme-toggle-wrap{top:32px;right:24px}
  .field-grid{grid-template-columns:1fr 1fr}
}
@media print{
  body{padding:0;background:#fff}
  .board{box-shadow:none;border:none;padding:0;max-width:100%}
  .board::after,.board-nav,.theme-toggle-wrap,.breadcrumb{display:none}
}
`;
  },

  layoutHTML(site, content, meta, navItems, root) {
    const r = root || '';
    const navLinks = (navItems || [])
      .map(c => `<a href="${colHref(r, esc(c.id))}">${esc(c.label)}</a>`)
      .join('\n        ');
    const pageTitle = meta.title ? `${esc(meta.title)} — ${esc(site.name)}` : esc(site.name);
    const canonical = meta.canonical ? `\n  <link rel="canonical" href="${esc(meta.canonical)}">` : '';
    const desc = meta.description || site.description || '';
    const siteUrl = (site.url || '').replace(/\/+$/, '');
    const ogImage = meta.ogImage || '';

    return `<!DOCTYPE html>
<html lang="${esc(site.locale || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="generator" content="Orbiter CMS">${canonical}
  <meta property="og:title" content="${esc(meta.title || site.name)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="${meta.type || 'website'}">
  ${siteUrl && meta.canonical ? `<meta property="og:url" content="${esc(meta.canonical)}">` : ''}
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="${r}style.css">
</head>
<body>
  <div class="board">
    <div class="theme-toggle-wrap">
      <button class="theme-toggle" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      </button>
    </div>
    <nav class="board-nav">
      <a href="${r}index.html">${esc(site.name)}</a>
      ${navLinks}
    </nav>
    ${content}
    <div class="board-footer">${esc(site.name)} &middot; Powered by Orbiter</div>
  </div>
  ${THEME_JS}
</body>
</html>`;
  },

  homepageHTML(site, collections, root) {
    const r = root || '';
    const cards = collections
      .map(c => `<a class="card" href="${colHref(r, esc(c.id))}" style="text-decoration:none">
          <span class="card-tag">${esc(c.label)}</span>
          <h2>${esc(c.label)}</h2>
          <p>${c.entryCount} ${c.entryCount === 1 ? 'entry' : 'entries'}</p>
          <span class="card-link">Explore</span>
        </a>`)
      .join('\n        ');

    return `
    <header class="board-header">
      <h1>${esc(site.name)}</h1>
      ${site.description ? `<p>${esc(site.description)}</p>` : ''}
    </header>
    <div class="board-content">
      <div class="card-grid">
        ${cards}
      </div>
    </div>`;
  },

  collectionListHTML(site, collection, entries, root) {
    const r = root || '';
    const parent = collection._parent;
    const children = collection._childCollections || [];
    const items = entries
      .map(e => {
        const excerpt = e.excerpt ? `<p>${esc(e.excerpt)}</p>` : '';
        return `<a class="card" href="${entryHref(r, esc(collection.id), esc(e.slug))}" style="text-decoration:none">
          ${excerpt ? `<span class="card-tag">${esc(collection.label)}</span>` : ''}
          <h2>${esc(e.title)}</h2>
          ${excerpt}
          <div class="card-meta">
            <time>${formatDate(e.date)}</time>
            ${e.readingTime ? `<span>${esc(e.readingTime)}</span>` : ''}
          </div>
        </a>`;
      })
      .join('\n        ');

    const breadcrumb = parent
      ? `<div class="breadcrumb"><a href="${colHref(r, esc(parent.id))}">${esc(parent.label)}</a><span class="sep">/</span></div>`
      : '';

    const childLinks = children.length
      ? `<div class="list-children">${children.map(c => `<a href="${colHref(r, esc(c.id))}">${esc(c.label)}</a>`).join('')}</div>`
      : '';

    return `
    <div class="board-content">
      ${breadcrumb}
      <div class="section-title">${esc(collection.label)}</div>
      ${childLinks ? `<div style="text-align:center;margin-bottom:40px">${childLinks}</div>` : ''}
      <div class="card-grid">
        ${items || '<p style="text-align:center;color:var(--text-4)">No published entries yet.</p>'}
      </div>
    </div>`;
  },

  entryHTML(site, collection, entry, renderedBody, root) {
    const r = root || '';
    const parent = collection._parent;
    const tags = (entry.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    const heroImg = entry.heroImage
      ? `<div class="hero-img"><img src="${esc(entry.heroImage)}" alt="${esc(entry.title)}"></div>`
      : '';

    const breadcrumbParts = [];
    if (parent) breadcrumbParts.push(`<a href="${colHref(r, esc(parent.id))}">${esc(parent.label)}</a><span class="sep">/</span>`);
    breadcrumbParts.push(`<a href="${colHref(r, esc(collection.id))}">${esc(collection.label)}</a><span class="sep">/</span>`);

    const fieldGrid = this._fieldGridHTML(entry.fields);

    return `
    <div class="board-content">
      <div class="breadcrumb">
        ${breadcrumbParts.join('\n        ')}
      </div>
      <article>
        <div class="article-meta">
          <span class="cat">${esc(collection.label)}</span>
          ${entry.readingTime ? `<span class="rt">${esc(entry.readingTime)}</span>` : ''}
        </div>
        <h1>${esc(entry.title)}</h1>
        ${heroImg}
        ${tags ? `<div class="tags" style="margin-bottom:32px">${tags}</div>` : ''}
        ${fieldGrid}
        ${renderedBody ? `<div class="prose">${renderedBody}</div>` : ''}
      </article>
    </div>`;
  },

  _fieldGridHTML(fields) {
    if (!fields || !fields.length) return '';
    const items = fields.map(f => {
      let val = f.value;
      if (f.type === 'url' && val) val = `<a href="${esc(val)}" target="_blank" rel="noopener">${esc(val)}</a>`;
      else if (f.type === 'email' && val) val = `<a href="mailto:${esc(val)}">${esc(val)}</a>`;
      else if (f.type === 'boolean') val = val ? 'Yes' : 'No';
      else if (Array.isArray(val)) val = val.map(v => esc(String(v))).join(', ');
      else val = esc(String(val || ''));
      if (!val) return '';
      return `<div class="field-item"><span class="field-label">${esc(f.label)}</span><span class="field-value">${val}</span></div>`;
    }).filter(Boolean).join('\n      ');
    if (!items) return '';
    return `<div class="field-grid">\n      ${items}\n    </div>`;
  },

  readingTime,
};
