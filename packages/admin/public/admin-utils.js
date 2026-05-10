// Orbiter Admin Utilities — port of packages/integration/src/admin-utils.js
// Dark mode (html.dark class) + Space theme (html.theme-space class) + Command Palette

(function () {

  // ── Dark mode ────────────────────────────────────────────────────────
  if (localStorage.getItem('orb-dark') === '1') {
    document.documentElement.classList.add('dark');
  }

  function darkLabel(isDark) { return isDark ? '○ light' : '● dark'; }

  window.__orbToggleDark = function () {
    var dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('orb-dark', dark ? '1' : '0');
    var btn = document.getElementById('orb-dark-btn');
    if (btn) btn.textContent = darkLabel(dark);
  };

  function syncDarkBtn() {
    var btn = document.getElementById('orb-dark-btn');
    if (btn) btn.textContent = darkLabel(document.documentElement.classList.contains('dark'));
  }

  // ── Theme ────────────────────────────────────────────────────────────
  var THEMES = ['space'];

  var _savedTheme = localStorage.getItem('orb-theme') || '';
  if (_savedTheme) document.documentElement.classList.add('theme-' + _savedTheme);

  if (_savedTheme === 'space' && !document.querySelector('link[href*="Space+Mono"]')) {
    var _fl = document.createElement('link');
    _fl.rel = 'stylesheet';
    _fl.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(_fl);
  }

  window.__orbSetTheme = function (theme) {
    THEMES.forEach(function (t) { document.documentElement.classList.remove('theme-' + t); });
    localStorage.setItem('orb-theme', theme);
    if (theme) document.documentElement.classList.add('theme-' + theme);
    if (theme === 'space' && !document.querySelector('link[href*="Space+Mono"]')) {
      var fl2 = document.createElement('link');
      fl2.rel = 'stylesheet';
      fl2.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap';
      document.head.appendChild(fl2);
    }
    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      var active = btn.dataset.themeBtn === theme;
      btn.style.borderColor = active ? 'var(--gold)' : 'var(--line)';
      btn.style.color       = active ? 'var(--gold)' : 'var(--muted)';
      btn.style.background  = active ? 'var(--gold-bg)' : 'transparent';
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    syncDarkBtn();

    var cur = localStorage.getItem('orb-theme') || '';
    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      var active = btn.dataset.themeBtn === cur;
      btn.style.borderColor = active ? 'var(--gold)' : 'var(--line)';
      btn.style.color       = active ? 'var(--gold)' : 'var(--muted)';
      btn.style.background  = active ? 'var(--gold-bg)' : 'transparent';
    });
  });

  // ── Sidebar sub-menus ────────────────────────────────────────────────
  window.__orbToggleNav = function (colId) {
    var sub  = document.getElementById('nav-sub-' + colId);
    var chev = document.getElementById('chev-' + colId);
    if (!sub) return;
    var open = sub.style.display !== 'none';
    sub.style.display = open ? 'none' : '';
    if (chev) chev.textContent = open ? '▸' : '▾';
    try {
      var state = JSON.parse(localStorage.getItem('orb_nav') || '{}');
      state[colId] = !open;
      localStorage.setItem('orb_nav', JSON.stringify(state));
    } catch {}
  };

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var state = JSON.parse(localStorage.getItem('orb_nav') || '{}');
      Object.keys(state).forEach(function (colId) {
        var sub  = document.getElementById('nav-sub-' + colId);
        var chev = document.getElementById('chev-' + colId);
        if (!sub) return;
        if (!state[colId] && sub.querySelector('.active')) return;
        sub.style.display = state[colId] ? '' : 'none';
        if (chev) chev.textContent = state[colId] ? '▾' : '▸';
      });
    } catch {}
  });

  // ── Sign out ─────────────────────────────────────────────────────────
  window.__orbSignOut = async function () {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(function () {});
    window.location.replace('/login.html');
  };

  // ── Breadcrumbs ───────────────────────────────────────────────────────
  window.__orbBreadcrumbs = function (crumbs) {
    var el = document.getElementById('topbar-breadcrumb');
    if (!el || !crumbs.length) return;
    el.innerHTML = crumbs.map(function (c, i) {
      var sep = i > 0 ? '<span class="sep">/</span>' : '';
      var item = c.href
        ? '<a href="' + c.href + '">' + c.label + '</a>'
        : '<span class="current">' + c.label + '</span>';
      return sep + item;
    }).join('');
  };

  // ── Command Palette ──────────────────────────────────────────────────
  var palette    = null;
  var palInput   = null;
  var palResults = null;
  var palOpen    = false;
  var palIdx     = -1;
  var palTimer   = null;

  var NAV = [
    { title: 'Dashboard', href: '/dashboard.html', hint: 'nav' },
    { title: 'Media',     href: '/media.html',     hint: 'nav' },
    { title: 'Schema',    href: '/schema.html',    hint: 'nav' },
    { title: 'Build',     href: '/build.html',     hint: 'nav' },
    { title: 'Settings',  href: '/settings.html',  hint: 'nav' },
  ];

  function buildPalette() {
    palette = document.createElement('div');
    palette.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-start;justify-content:center;padding-top:15vh;';

    var box = document.createElement('div');
    box.style.cssText = 'width:520px;max-width:calc(100vw - 32px);background:var(--bg2);border:1px solid var(--line);box-shadow:0 20px 60px rgba(0,0,0,0.2);font-family:var(--mono);overflow:hidden;';

    var inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;align-items:center;padding:0 16px;border-bottom:1px solid var(--line);';

    var prompt = document.createElement('span');
    prompt.textContent = '›';
    prompt.style.cssText = 'color:var(--muted);font-size:14px;margin-right:10px;flex-shrink:0;';

    palInput = document.createElement('input');
    palInput.type = 'text';
    palInput.placeholder = 'Search, navigate…';
    palInput.style.cssText = 'flex:1;border:none;outline:none;background:transparent;padding:14px 0;font-size:13px;color:var(--text);font-family:var(--mono);';

    var hint = document.createElement('span');
    hint.textContent = 'esc';
    hint.style.cssText = 'font-size:9px;color:var(--muted);border:1px solid var(--line);padding:2px 6px;letter-spacing:0.06em;';

    inputRow.appendChild(prompt);
    inputRow.appendChild(palInput);
    inputRow.appendChild(hint);

    palResults = document.createElement('div');
    palResults.style.cssText = 'max-height:340px;overflow-y:auto;';

    box.appendChild(inputRow);
    box.appendChild(palResults);
    palette.appendChild(box);

    palette.addEventListener('mousedown', function (e) { if (e.target === palette) closePalette(); });
    palInput.addEventListener('input', function () { clearTimeout(palTimer); palTimer = setTimeout(runSearch, 120); });
    palInput.addEventListener('keydown', handlePalKey);
    document.body.appendChild(palette);
  }

  window.__orbOpenPalette = openPalette;

  function openPalette() {
    if (!palette) buildPalette();
    palOpen = true;
    palette.style.display = 'flex';
    palInput.value = '';
    palIdx = -1;
    renderResults(NAV, []);
    setTimeout(function () { palInput.focus(); }, 10);
  }

  function closePalette() {
    if (!palette) return;
    palOpen = false;
    palette.style.display = 'none';
  }

  function handlePalKey(e) {
    if (e.key === 'Escape')    { e.preventDefault(); closePalette(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); movePal(1);  return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); movePal(-1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      var active = palResults.querySelector('.pal-item.pal-active');
      if (active) window.location.href = active.dataset.href;
    }
  }

  function movePal(dir) {
    var items = palResults.querySelectorAll('.pal-item');
    if (!items.length) return;
    palIdx = Math.max(-1, Math.min(items.length - 1, palIdx + dir));
    items.forEach(function (el, i) {
      el.classList.toggle('pal-active', i === palIdx);
      el.style.background = i === palIdx ? 'var(--accent-bg)' : '';
    });
  }

  function palRow(item) {
    var el = document.createElement('a');
    el.href = item.href;
    el.dataset.href = item.href;
    el.className = 'pal-item';
    el.style.cssText = 'display:flex;align-items:center;gap:12px;padding:9px 16px;text-decoration:none;border-bottom:1px solid var(--line2);transition:background 0.08s;cursor:pointer;';
    el.addEventListener('mouseenter', function () {
      palIdx = Array.from(palResults.querySelectorAll('.pal-item')).indexOf(el);
      palResults.querySelectorAll('.pal-item').forEach(function (x) { x.style.background = ''; x.classList.remove('pal-active'); });
      el.style.background = 'var(--accent-bg)';
      el.classList.add('pal-active');
    });

    var icon = document.createElement('div');
    icon.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted);flex-shrink:0;';
    icon.textContent = item.hint === 'action' ? '→' : item.hint === 'nav' ? '◈' : item.status === 'published' ? '▪' : '▫';

    var main = document.createElement('div');
    main.style.cssText = 'flex:1;min-width:0;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    title.textContent = item.title;
    main.appendChild(title);

    if (item.collLabel) {
      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:9px;color:var(--muted);margin-top:1px;';
      sub.textContent = item.collLabel + ' · ' + item.slug;
      main.appendChild(sub);
    }

    var badge = document.createElement('div');
    badge.style.cssText = 'font-size:9px;color:var(--muted);flex-shrink:0;';
    badge.textContent = item.hint || item.status || '';

    el.appendChild(icon);
    el.appendChild(main);
    el.appendChild(badge);
    return el;
  }

  function renderResults(navItems, entryItems) {
    palResults.innerHTML = '';
    palIdx = -1;

    if (navItems.length) {
      var navSec = document.createElement('div');
      navSec.style.cssText = 'font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);padding:8px 16px 4px;';
      navSec.textContent = 'Navigation';
      palResults.appendChild(navSec);
      navItems.forEach(function (item) { palResults.appendChild(palRow(item)); });
    }

    if (entryItems.length) {
      var entrySec = document.createElement('div');
      entrySec.style.cssText = 'font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);padding:8px 16px 4px;border-top:1px solid var(--line);';
      entrySec.textContent = 'Entries';
      palResults.appendChild(entrySec);
      entryItems.forEach(function (item) { palResults.appendChild(palRow(item)); });
    }

    if (!navItems.length && !entryItems.length) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:20px 16px;font-size:11px;color:var(--muted);text-align:center;';
      empty.textContent = 'No results';
      palResults.appendChild(empty);
    }
  }

  async function runSearch() {
    var q = palInput.value.trim();
    if (!q) { renderResults(NAV, []); return; }
    try {
      var res  = await fetch('/api/search?q=' + encodeURIComponent(q), { credentials: 'include' });
      var json = await res.json();
      var navMatches = NAV.filter(function (n) { return n.title.toLowerCase().includes(q.toLowerCase()); });
      renderResults(navMatches, (json.results || []).map(function (r) {
        return { title: r.title || r.slug, href: '/editor.html?collection=' + r.collection_id + '&slug=' + r.slug, collLabel: r.collection_id, slug: r.slug, status: r.status };
      }));
    } catch {}
  }

  // Cmd+K (Mac) or Ctrl+K (other)
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      palOpen ? closePalette() : openPalette();
    }
  });

})();
