/*
 * Site search for orbiter.sh — press "/" or ⌘K / Ctrl+K anywhere.
 * Self-contained (injects its own styles), no dependencies. Loads /search-index.json on first use,
 * which scripts/postbuild.mjs generates from the built pages (docs, roadmap items, changelog, home sections).
 */
(() => {
  if (window.__orbSearch) return;
  window.__orbSearch = true;

  const CSS = `
  .sp-trigger{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:11px;letter-spacing:.03em;color:#8a8aa8;background:transparent;border:1px solid rgba(139,124,248,.22);border-radius:14px;padding:4px 10px;cursor:pointer;transition:color .15s,border-color .15s;line-height:1.4}
  .sp-trigger:hover{color:#e8e8f6;border-color:rgba(139,124,248,.5)}
  .sp-trigger kbd{font:inherit;font-size:10px;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:0 5px;color:#a9a9c6}
  @media (max-width:700px){.sp-trigger kbd{display:none}}
  #sp-dialog{margin:10vh auto auto;padding:0;width:min(640px,calc(100vw - 24px));max-height:78vh;border:1px solid rgba(139,124,248,.4);border-radius:16px;background:rgba(9,9,20,.97);color:#d6d6ea;box-shadow:0 28px 90px rgba(0,0,0,.65);font-family:Inter,system-ui,sans-serif;overflow:hidden}
  #sp-dialog::backdrop{background:rgba(3,3,10,.66);backdrop-filter:blur(4px)}
  #sp-dialog[open]{display:flex;flex-direction:column}
  .sp-box{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.07)}
  .sp-box svg{flex:none;color:#8b7cf8}
  #sp-input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#f1f1fa;font:inherit;font-size:16px}
  #sp-input::placeholder{color:#6f6f8d}
  #sp-input::-webkit-search-cancel-button{display:none}
  .sp-esc{font-size:10px;color:#8a8aa8;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:1px 6px}
  #sp-list{list-style:none;margin:0;padding:6px;overflow:auto;flex:1;min-height:60px}
  .sp-label{padding:10px 12px 4px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#6f6f8d}
  .sp-item{display:flex;gap:12px;align-items:flex-start;padding:9px 12px;border-radius:10px;cursor:pointer;text-decoration:none;color:inherit}
  .sp-item[aria-selected="true"]{background:rgba(139,124,248,.16)}
  .sp-chips{display:flex;gap:6px;padding:8px 16px 0}.sp-chip{font:inherit;font-size:11px;color:#a8a8d0;background:transparent;border:1px solid rgba(139,124,248,.25);border-radius:999px;padding:3px 11px;cursor:pointer}.sp-chip[aria-pressed=true]{color:#fff;background:rgba(139,124,248,.3);border-color:rgba(139,124,248,.6)}
  .sp-kind{flex:none;margin-top:2px;min-width:68px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8b7cf8}
  .sp-kind.Recent{color:#6f6f8d}.sp-kind.Roadmap{color:#4ade80}.sp-kind.Changelog{color:#f0b35a}.sp-kind.Page{color:#8a8aa8}
  .sp-main{min-width:0}
  .sp-title{font-size:14px;color:#f1f1fa;font-weight:500;line-height:1.35}
  .sp-snip{font-size:12px;color:#9a9ab8;line-height:1.5;margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .sp-item mark{background:rgba(139,124,248,.3);color:#fff;border-radius:3px;padding:0 1px}
  .sp-empty{padding:26px 16px;text-align:center;font-size:13px;color:#8a8aa8}
  .sp-foot{display:flex;gap:16px;flex-wrap:wrap;padding:9px 16px;border-top:1px solid rgba(255,255,255,.07);font-size:10.5px;color:#7a7a98}
  .sp-foot kbd{font:inherit;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:0 5px;margin-right:3px}
  .sp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  `;

  const SUGGEST = [
    { t: 'Quick start', u: '/docs/quick-start/', k: 'Docs', b: 'Install the admin and open your first POD' },
    { t: 'Roadmap', u: '/vision/', k: 'Page', b: 'What is shipped and what comes next' },
    { t: 'Security check & secrets', u: '/docs/security/', k: 'Docs', b: 'orbiter doctor, encrypted credentials, 2FA, API key limits' },
    { t: 'Webhooks', u: '/docs/webhooks/', k: 'Docs', b: 'Signed events with retries' },
    { t: "What's new", u: '/changelog/', k: 'Page', b: 'Changelog — also as an Atom feed' },
  ];
  const KIND_NAME = { Docs: 'Docs', Roadmap: 'Roadmap', Changelog: 'Changelog', Page: 'Page', Recent: 'Recent' };
  const RECENT_KEY = 'orb_search_recent';

  let index = null, loading = null, dlg = null, input = null, list = null, live = null;
  let shown = [], active = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isEditable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
  const remember = (q) => { try { const r = [q, ...recent().filter((x) => x !== q)].slice(0, 5); localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch { /* private mode */ } };

  function ensureDom() {
    if (!document.getElementById('orb-search-style')) {
      const st = document.createElement('style'); st.id = 'orb-search-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    if (dlg && document.body.contains(dlg)) return;
    dlg = document.createElement('dialog'); dlg.id = 'sp-dialog'; dlg.setAttribute('aria-label', 'Search the site');
    dlg.innerHTML = `
      <div class="sp-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="sp-input" type="search" role="combobox" aria-expanded="true" aria-controls="sp-list" aria-autocomplete="list" placeholder="Search docs, roadmap, changelog…" autocomplete="off" spellcheck="false" />
        <span class="sp-esc">esc</span>
      </div>
      <div class="sp-chips" role="group" aria-label="Filter results">${['', 'Docs', 'Roadmap', 'Changelog'].map((k) => `<button type="button" class="sp-chip" data-kind="${k}" aria-pressed="${k === ''}">${k || 'All'}</button>`).join('')}</div>
      <ul id="sp-list" role="listbox" aria-label="Results"></ul>
      <div class="sp-foot"><span><kbd>↑</kbd><kbd>↓</kbd>navigate</span><span><kbd>↵</kbd>open</span><span><kbd>/</kbd>or<kbd>⌘K</kbd>anywhere</span></div>
      <div class="sp-sr" id="sp-live" aria-live="polite"></div>`;
    document.body.appendChild(dlg);
    input = dlg.querySelector('#sp-input'); list = dlg.querySelector('#sp-list'); live = dlg.querySelector('#sp-live');
    input.addEventListener('input', () => run(input.value));
    dlg.querySelector('.sp-chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]'); if (!b) return;
      kind = b.dataset.kind; dlg.querySelectorAll('.sp-chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      run(input.value); input.focus();
    });
    input.addEventListener('keydown', onKey);
    list.addEventListener('mousemove', (e) => { const li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== active) setActive(+li.dataset.i); });
    list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) go(+li.dataset.i); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }

  let kind = '';   // result filter chosen with the chips (docs / roadmap / changelog)
  function load() {
    if (index) return Promise.resolve(index);
    return (loading ||= fetch('/search-index.json').then((r) => r.json()).then((j) => {
      j.entries.forEach((e) => { e._t = e.t.toLowerCase(); e._h = (e.h || '').toLowerCase(); e._b = (e.b || '').toLowerCase(); });
      return (index = j.entries);
    }).catch(() => (index = [])));
  }

  function score(e, tokens, whole) {
    let s = 0;
    for (const t of tokens) {
      const inT = e._t.includes(t), inH = e._h.includes(t), inB = e._b.includes(t);
      if (!inT && !inH && !inB) return 0;                       // every word must match somewhere
      if (inT) s += new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(e._t) ? 14 : 8;
      if (inH) s += 4;
      if (inB) s += 1;
    }
    if (e._t === whole) s += 30;
    if (e.k === 'Docs') s += 1;
    return s;
  }

  function snippet(e, tokens) {
    const body = e.b || '', low = e._b; let at = -1;
    for (const t of tokens) { const i = low.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
    const start = Math.max(0, at - 50), text = (start > 0 ? '…' : '') + body.slice(start, start + 150) + (body.length > start + 150 ? '…' : '');
    return text;
  }

  const highlight = (text, tokens) => {
    if (!tokens.length) return esc(text);
    const re = new RegExp('(' + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig');
    return text.split(re).map((part, i) => (i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part))).join('');
  };

  function render(items, tokens, label) {
    shown = items; active = 0;
    if (!items.length) { list.innerHTML = `<li class="sp-empty" role="presentation">Nothing found for “${esc(input.value.trim())}”.<br>Try fewer words, or browse the <a href="/docs/" style="color:#8b7cf8">docs</a>.</li>`; live.textContent = 'No results'; input.removeAttribute('aria-activedescendant'); return; }
    list.innerHTML = (label ? `<li class="sp-label" role="presentation">${esc(label)}</li>` : '') + items.map((e, i) =>
      `<li role="option" id="sp-o${i}" data-i="${i}" aria-selected="${i === 0}" class="sp-item"><span class="sp-kind ${esc(e.k)}">${esc(KIND_NAME[e.k] || e.k)}</span><span class="sp-main"><div class="sp-title">${highlight(e.t, tokens)}</div>${e.b ? `<div class="sp-snip">${highlight(tokens.length ? snippet(e, tokens) : e.b, tokens)}</div>` : ''}</span></li>`).join('');
    input.setAttribute('aria-activedescendant', 'sp-o0');
    live.textContent = items.length + (items.length === 1 ? ' result' : ' results');
  }

  function run(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      const r = recent().map((x) => ({ t: x, k: 'Recent', b: '', recent: true }));
      return render([...r, ...SUGGEST], [], r.length ? 'Recent & suggested' : 'Suggested');
    }
    const tokens = query.split(/\s+/).filter(Boolean);
    load().then((entries) => {
      if (input.value.trim().toLowerCase() !== query) return;     // a newer query is already running
      const res = entries.filter((e) => !kind || e.k === kind).map((e) => [score(e, tokens, query), e]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, e]) => e);
      render(res, tokens, '');
    });
  }

  function setActive(i) {
    active = Math.max(0, Math.min(i, shown.length - 1));
    list.querySelectorAll('[data-i]').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === active)));
    const li = list.querySelector(`[data-i="${active}"]`);
    if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
  }

  function go(i) {
    const e = shown[i]; if (!e) return;
    if (e.recent) { input.value = e.t; run(e.t); input.focus(); return; }   // re-run an earlier search
    if (input.value.trim()) remember(input.value.trim());
    dlg.close();
    const url = new URL(e.u, location.origin);
    if (url.pathname === location.pathname && url.hash) { location.hash = url.hash; } else { location.assign(url.pathname + url.hash); }
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Home' && e.ctrlKey) { setActive(0); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active); }
    else if (e.key === 'Escape') { e.preventDefault(); dlg.close(); }   // a type=search field would otherwise just clear itself first
  }

  function open() {
    ensureDom();
    if (!dlg.open) dlg.showModal();
    input.value = ''; run(''); input.focus();
    load();                                   // warm the index while the user types
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) { e.preventDefault(); open(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg && dlg.open ? dlg.close() : open(); }
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-search-open]')) { e.preventDefault(); open(); } });
  document.addEventListener('astro:before-swap', () => { if (dlg && dlg.open) dlg.close(); });

  // Style the trigger buttons that exist before the dialog is first opened
  const early = document.createElement('style'); early.id = 'orb-search-style'; early.textContent = CSS; document.head.appendChild(early);
})();
