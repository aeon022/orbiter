// Orbiter Admin Utilities — Dark Mode + Command Palette
// Loaded via orbiter:admin-utils virtual module on every admin page

(function () {

  // ── Dark Mode ──────────────────────────────────────────────────────
  if (localStorage.getItem('orb-dark') === '1') {
    document.documentElement.classList.add('dark');
  }

  function darkLabel(isDark) { return isDark ? '○ light' : '● dark'; }

  window.__orbToggleDark = function () {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('orb-dark', dark ? '1' : '0');
    var btn = document.getElementById('orb-dark-btn');
    if (btn) btn.textContent = darkLabel(dark);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('orb-dark-btn');
    if (btn) btn.textContent = darkLabel(document.documentElement.classList.contains('dark'));
  });

  // ── Theme ──────────────────────────────────────────────────────────
  var THEMES = ['space'];

  // Backwards compat: 'space-light' / 'space-dark' → 'space'
  var _savedTheme = localStorage.getItem('orb-theme') || '';
  if (_savedTheme === 'space-light' || _savedTheme === 'space-dark') {
    _savedTheme = 'space';
    localStorage.setItem('orb-theme', 'space');
  }
  if (_savedTheme) document.documentElement.classList.add('theme-' + _savedTheme);

  // ── Space Enso: load Space Mono font on demand ─────────────────────
  if (_savedTheme === 'space') {
    var _fl = document.createElement('link');
    _fl.rel  = 'stylesheet';
    _fl.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(_fl);
  }

  window.__orbSetTheme = function(theme) {
    THEMES.forEach(function(t) { document.documentElement.classList.remove('theme-' + t); });
    localStorage.setItem('orb-theme', theme);
    if (theme) document.documentElement.classList.add('theme-' + theme);
    if (theme === 'space' && !document.querySelector('link[href*="Space+Mono"]')) {
      var _fl2 = document.createElement('link');
      _fl2.rel  = 'stylesheet';
      _fl2.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap';
      document.head.appendChild(_fl2);
    }
    document.querySelectorAll('[data-theme-btn]').forEach(function(btn) {
      var active = btn.dataset.themeBtn === theme;
      btn.style.borderColor = active ? 'var(--gold)' : 'var(--line)';
      btn.style.color       = active ? 'var(--gold)' : 'var(--muted)';
      btn.style.background  = active ? 'var(--gold-bg)' : 'transparent';
    });
  };

  document.addEventListener('DOMContentLoaded', function() {
    var cur = localStorage.getItem('orb-theme') || '';
    if (cur === 'space-light' || cur === 'space-dark') cur = 'space';
    document.querySelectorAll('[data-theme-btn]').forEach(function(btn) {
      var active = btn.dataset.themeBtn === cur;
      btn.style.borderColor = active ? 'var(--gold)' : 'var(--line)';
      btn.style.color       = active ? 'var(--gold)' : 'var(--muted)';
      btn.style.background  = active ? 'var(--gold-bg)' : 'transparent';
    });
  });

  // ── Global styles (themes + pal-trigger) ───────────────────────────
  (function() {
    var s = document.createElement('style');
    s.textContent = [
      // pal-trigger
      '.pal-trigger{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;',
      'border:1px solid var(--line,#e0dbd0);background:var(--bg2,#fff);',
      'color:var(--muted,#a09890);font-family:"DM Mono",monospace;font-size:10px;',
      'letter-spacing:0.04em;cursor:pointer;transition:border-color 0.12s,color 0.12s;}',
      '.pal-trigger:hover{border-color:var(--accent,#3d4fa8);color:var(--accent,#3d4fa8);}',
      '.pal-trigger kbd{font-size:9px;opacity:0.6;}',

      // Space Light — kühl, hell, technisch
      'html.theme-space{',
        '--bg0:#edf4fc;--bg1:#f4f9ff;--bg2:#ffffff;--bg3:#ddeeff;',
        '--line:#a8ccec;--line2:rgba(0,120,200,0.06);',
        '--muted:#5a8ab0;--mid:#1c6090;--text:#0d2e50;--heading:#060f20;',
        '--gold:#0088cc;--gold-bg:rgba(0,136,204,0.09);',
        '--jade:#007a5c;--jade-bg:rgba(0,122,92,0.08);',
        '--accent:#4a30b8;--accent-bg:rgba(74,48,184,0.08);',
        '--crimson:#c0184e;--crimson-bg:rgba(192,24,78,0.07);',
        '--shadow:0 1px 4px rgba(0,100,180,0.1);',
      '}',

      // Space Dark — tief schwarz, neon-cyan
      'html.theme-space.dark{',
        '--bg0:#000e1a;--bg1:#001524;--bg2:#001c2e;--bg3:#00243c;',
        '--line:#003a5c;--line2:rgba(0,180,255,0.05);',
        '--muted:#1a6080;--mid:#3a90b0;--text:#7dc8de;--heading:#c0ecfc;',
        '--gold:#00c8ff;--gold-bg:rgba(0,200,255,0.09);',
        '--jade:#00e89a;--jade-bg:rgba(0,232,154,0.08);',
        '--accent:#8060ff;--accent-bg:rgba(128,96,255,0.09);',
        '--crimson:#ff3d6e;--crimson-bg:rgba(255,61,110,0.08);',
        '--shadow:0 1px 8px rgba(0,200,255,0.08);',
      '}',

      // Space Enso — terminal typography (Space Mono replaces Noto Serif JP)
      'html.theme-space{--serif:"Space Mono",monospace;}',
      // Logo: tighter, all-caps terminal feel
      'html.theme-space .logo{font-family:"Space Mono",monospace;font-weight:400;font-size:13px;letter-spacing:0.22em;text-transform:uppercase;}',
      // Hero site name
      'html.theme-space .hero-site{font-family:"Space Mono",monospace;font-weight:400;font-size:20px;letter-spacing:0.1em;}',
      // Editor / schema display titles
      'html.theme-space .editor-title{font-family:"Space Mono",monospace;font-weight:400;font-size:18px;letter-spacing:0.06em;}',
      // Stat numbers
      'html.theme-space .stat-num{font-family:"Space Mono",monospace;font-weight:700;font-size:28px;}',

      // Space Light — crisp blue accents on active elements
      'html.theme-space:not(.dark) .logo-mark{border-color:#0088cc;box-shadow:0 0 0 2px rgba(0,136,204,0.12);}',
      'html.theme-space:not(.dark) .nav-item.active::before{background:#0088cc;}',

      // Space Light — button hover: deep navy (instead of Zen warm-brown #7a5520)
      'html.theme-space:not(.dark){--btn-hover:#0055a0;}',
      'html.theme-space:not(.dark) .btn-save:hover,',
      'html.theme-space:not(.dark) button[type=submit]:hover{background:#0055a0!important;border-color:#0055a0!important;}',
      'html.theme-space:not(.dark) .btn-deploy:hover{background:#0055a0!important;color:#fff!important;}',
      'html.theme-space:not(.dark) .btn-support:hover{background:#0055a0!important;color:#fff!important;}',
      'html.theme-space:not(.dark) .btn-sm.primary:hover{background:#0055a0!important;color:#fff!important;}',

      // Space Dark — neon glow effects
      'html.theme-space.dark .nav-item.active::before{box-shadow:2px 0 10px var(--gold);}',
      'html.theme-space.dark .logo-mark{box-shadow:0 0 12px rgba(0,200,255,0.35);}',
      'html.theme-space.dark .pod-dot{box-shadow:0 0 6px var(--jade);}',
      'html.theme-space.dark .btn-publish{box-shadow:0 0 14px rgba(0,200,255,0.2);}',

      // Space Dark — button hover: mid cyan (instead of Zen warm-brown #7a5520)
      'html.theme-space.dark{--btn-hover:#00a0cc;}',
      'html.theme-space.dark .btn-save:hover,',
      'html.theme-space.dark button[type=submit]:hover{background:#00a0cc!important;border-color:#00a0cc!important;}',
      'html.theme-space.dark .btn-deploy:hover{background:#00a0cc!important;color:#000e1a!important;}',
      'html.theme-space.dark .btn-support:hover{background:#00a0cc!important;color:#000e1a!important;}',
      'html.theme-space.dark .btn-sm.primary:hover{background:#00a0cc!important;color:#000e1a!important;}',
    ].join('');
    document.head.appendChild(s);
  })();

  // ── Sidebar sub-menus ──────────────────────────────────────────────
  window.__orbToggleNav = function(colId) {
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

  document.addEventListener('DOMContentLoaded', function() {
    try {
      var state = JSON.parse(localStorage.getItem('orb_nav') || '{}');
      Object.keys(state).forEach(function(colId) {
        var sub  = document.getElementById('nav-sub-' + colId);
        var chev = document.getElementById('chev-' + colId);
        if (!sub) return;
        // Never close a group whose child is currently active
        if (!state[colId] && sub.querySelector('.active')) return;
        sub.style.display = state[colId] ? '' : 'none';
        if (chev) chev.textContent = state[colId] ? '▾' : '▸';
      });
    } catch {}
  });

  // ── Command Palette ────────────────────────────────────────────────
  var palette     = null;
  var palInput    = null;
  var palResults  = null;
  var palOpen     = false;
  var palIdx      = -1;
  var palItems    = [];
  var palTimer    = null;

  var NAV = [
    { title: 'Dashboard',  href: '/orbiter',          hint: 'nav' },
    { title: 'Media',      href: '/orbiter/media',    hint: 'nav' },
    { title: 'Build',      href: '/orbiter/build',    hint: 'nav' },
    { title: 'Settings',   href: '/orbiter/settings', hint: 'nav' },
    { title: 'Abmelden',   href: '/orbiter/logout',   hint: 'action' },
  ];

  function buildPalette() {
    palette = document.createElement('div');
    palette.style.cssText = [
      'position:fixed','inset:0','z-index:9000',
      'background:rgba(0,0,0,0.5)',
      'display:flex','align-items:flex-start','justify-content:center',
      'padding-top:15vh',
    ].join(';');

    var box = document.createElement('div');
    box.style.cssText = [
      'width:520px','max-width:calc(100vw - 32px)',
      'background:var(--bg2,#fff)',
      'border:1px solid var(--line,#e0dbd0)',
      'box-shadow:0 20px 60px rgba(0,0,0,0.2)',
      'font-family:"DM Mono",monospace',
      'overflow:hidden',
    ].join(';');

    // Input row
    var inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;align-items:center;padding:0 16px;border-bottom:1px solid var(--line,#e0dbd0);';

    var prompt = document.createElement('span');
    prompt.textContent = '›';
    prompt.style.cssText = 'color:var(--muted,#a09890);font-size:14px;margin-right:10px;flex-shrink:0;';

    palInput = document.createElement('input');
    palInput.type = 'text';
    palInput.placeholder = 'Suchen, navigieren…';
    palInput.style.cssText = [
      'flex:1','border:none','outline:none','background:transparent',
      'padding:14px 0','font-size:13px',
      'color:var(--text,#3a3228)',
      'font-family:"DM Mono",monospace',
    ].join(';');

    var hint = document.createElement('span');
    hint.textContent = 'esc';
    hint.style.cssText = 'font-size:9px;color:var(--muted,#a09890);border:1px solid var(--line,#e0dbd0);padding:2px 6px;letter-spacing:0.06em;';

    inputRow.appendChild(prompt);
    inputRow.appendChild(palInput);
    inputRow.appendChild(hint);

    palResults = document.createElement('div');
    palResults.style.cssText = 'max-height:340px;overflow-y:auto;';

    box.appendChild(inputRow);
    box.appendChild(palResults);
    palette.appendChild(box);

    palette.addEventListener('mousedown', function (e) {
      if (e.target === palette) closePalette();
    });
    palInput.addEventListener('input', function () {
      clearTimeout(palTimer);
      palTimer = setTimeout(runSearch, 120);
    });
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
    palInput.value = '';
  }

  function handlePalKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); movePal(1); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); movePal(-1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      var active = palResults.querySelector('.pal-item.pal-active');
      if (active) window.location.href = active.dataset.href;
      return;
    }
  }

  function movePal(dir) {
    var items = palResults.querySelectorAll('.pal-item');
    if (!items.length) return;
    palIdx = Math.max(-1, Math.min(items.length - 1, palIdx + dir));
    items.forEach(function (el, i) {
      el.classList.toggle('pal-active', i === palIdx);
      if (i === palIdx) el.style.background = 'var(--accent-bg,rgba(61,79,168,0.06))';
      else              el.style.background = '';
    });
  }

  function row(item) {
    var el = document.createElement('a');
    el.href = item.href;
    el.dataset.href = item.href;
    el.className = 'pal-item';
    el.style.cssText = [
      'display:flex','align-items:center','gap:12px',
      'padding:9px 16px','text-decoration:none',
      'border-bottom:1px solid var(--line2,rgba(0,0,0,0.04))',
      'transition:background 0.08s','cursor:pointer',
    ].join(';');
    el.addEventListener('mouseenter', function () {
      palIdx = Array.from(palResults.querySelectorAll('.pal-item')).indexOf(el);
      palResults.querySelectorAll('.pal-item').forEach(function (x) { x.style.background = ''; x.classList.remove('pal-active'); });
      el.style.background = 'var(--accent-bg,rgba(61,79,168,0.06))';
      el.classList.add('pal-active');
    });

    var icon = document.createElement('div');
    icon.style.cssText = 'width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted,#a09890);flex-shrink:0;';
    icon.textContent = item.hint === 'action' ? '→' : item.hint === 'nav' ? '◈' : item.status === 'published' ? '▪' : '▫';

    var main = document.createElement('div');
    main.style.cssText = 'flex:1;min-width:0;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:12px;color:var(--text,#3a3228);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    title.textContent = item.title;

    main.appendChild(title);

    if (item.collLabel) {
      var sub = document.createElement('div');
      sub.style.cssText = 'font-size:9px;color:var(--muted,#a09890);margin-top:1px;';
      sub.textContent = item.collLabel + ' · ' + item.slug;
      main.appendChild(sub);
    }

    var badge = document.createElement('div');
    badge.style.cssText = 'font-size:9px;color:var(--muted,#a09890);flex-shrink:0;';
    badge.textContent = item.hint || item.status || '';

    el.appendChild(icon);
    el.appendChild(main);
    el.appendChild(badge);
    return el;
  }

  function renderResults(navItems, entryItems) {
    palResults.innerHTML = '';
    palIdx = -1;
    palItems = [];

    if (navItems.length) {
      var navSec = document.createElement('div');
      navSec.style.cssText = 'font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted,#a09890);padding:8px 16px 4px;';
      navSec.textContent = 'Navigation';
      palResults.appendChild(navSec);
      navItems.forEach(function (item) { palResults.appendChild(row(item)); });
    }

    if (entryItems.length) {
      var entrySec = document.createElement('div');
      entrySec.style.cssText = 'font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted,#a09890);padding:8px 16px 4px;border-top:1px solid var(--line,#e0dbd0);';
      entrySec.textContent = 'Einträge';
      palResults.appendChild(entrySec);
      entryItems.forEach(function (item) { palResults.appendChild(row(item)); });
    }

    if (!navItems.length && !entryItems.length) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:20px 16px;font-size:11px;color:var(--muted,#a09890);text-align:center;';
      empty.textContent = 'Keine Ergebnisse';
      palResults.appendChild(empty);
    }
  }

  async function runSearch() {
    var q = palInput.value.trim();
    if (!q) { renderResults(NAV, []); return; }
    try {
      var res  = await fetch('/orbiter/search?q=' + encodeURIComponent(q));
      var json = await res.json();
      var navMatches = NAV.filter(function (n) { return n.title.toLowerCase().includes(q.toLowerCase()); });
      renderResults(navMatches, json.results || []);
    } catch {}
  }

  // Global Cmd+K / Ctrl+K
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && !e.metaKey && e.key === 'k') {
      e.preventDefault();
      palOpen ? closePalette() : openPalette();
    }
  });

})();
