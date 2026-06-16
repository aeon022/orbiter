/**
 * xfce.js — Space Station dock mode for Orbiter Admin.
 * Auto-loaded by sidebar.js when orb_style === 'xfce'.
 * Creates: status bar (top) + floating dock (bottom center) + HUD panel (slide-right).
 */
(function () {
  'use strict';

  var page      = location.pathname.split('/').pop().replace('.html', '');
  var params    = new URLSearchParams(location.search);
  var activeCol = params.get('col') || params.get('collection');

  var NAV = [
    { icon: '⬡', label: 'Dashboard', href: '/dashboard.html', key: 'dashboard' },
    { icon: '◫', label: 'Media',     href: '/media.html',     key: 'media' },
    { icon: '⚙', label: 'Settings',  href: '/settings.html',  key: 'settings' },
    { icon: '⊛', label: 'Users',     href: '/users.html',     key: 'users' },
  ];

  var TOOLS = [
    { icon: '▦', label: 'Schema', href: '/schema.html', key: 'schema' },
    { icon: '◉', label: 'Build',  href: '/build.html',  key: 'build'  },
    { icon: '↓', label: 'Import', href: '/import.html', key: 'import' },
  ];

  var WORKSPACE = [
    { icon: '✎', label: 'Notes', pane: 'notes' },
    { icon: '☑', label: 'To-do', pane: 'todos' },
  ];

  // palette items — nav + tools pre-seeded; collections appended after /api/info
  var _palItems = NAV.concat(TOOLS).map(function (n) {
    return { icon: n.icon, label: n.label, href: n.href, group: n.key in { schema:1, build:1, import:1 } ? 'Tools' : 'Nav' };
  });
  var _termCols = []; // collection metadata for palette commands

  // ── Helpers ───────────────────────────────────────────────────────────
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function isEditing(target) {
    var t = target.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || target.isContentEditable;
  }

  // ── Status Bar ────────────────────────────────────────────────────────
  function buildStatusBar() {
    var sb = el('div', 'xfce-sb');
    sb.innerHTML = [
      '<div class="xfce-sb-left">',
        '<a class="xfce-sb-logo" href="/dashboard.html">',
          '<svg viewBox="0 0 20 20" width="12" height="12" fill="none" style="margin-right:5px;vertical-align:middle">',
            '<circle cx="10" cy="10" r="4.5" fill="currentColor" opacity=".9"/>',
            '<ellipse cx="10" cy="10" rx="9" ry="3.2" stroke="currentColor" stroke-width="1" opacity=".5" transform="rotate(-22 10 10)"/>',
          '</svg>ORBITER',
        '</a>',
        '<span class="xfce-sb-div">·</span>',
        '<span id="xfce-sb-site">—</span>',
      '</div>',
      '<div class="xfce-sb-center" id="xfce-sb-title"></div>',
      '<div class="xfce-sb-right">',
        '<span id="xfce-sb-g-ind" class="xfce-sb-g-ind" style="display:none" title="g — type destination key">g_</span>',
        '<button id="xfce-sb-palette-btn" class="xfce-sb-palette-btn" title="Command palette (⌘K)">⌘</button>',
        '<span class="xfce-sb-div">·</span>',
        '<span id="xfce-sb-build" class="xfce-sb-build" title="Last build"></span>',
        '<span id="xfce-sb-build-sep" class="xfce-sb-div" style="display:none">·</span>',
        '<a id="xfce-sb-user" href="/account.html" class="xfce-sb-user-link"></a>',
        '<span class="xfce-sb-div">·</span>',
        '<button id="xfce-sb-logout" class="xfce-sb-logout" title="Log out">⏻</button>',
        '<span class="xfce-sb-div">·</span>',
        '<span id="xfce-sb-clock"></span>',
      '</div>',
    ].join('');
    document.body.insertBefore(sb, document.body.firstChild);

    // Page title from document.title
    var title  = document.title.replace(/\s*—\s*Orbiter.*$/, '').trim();
    var titleEl = document.getElementById('xfce-sb-title');
    if (titleEl && title) titleEl.textContent = title;

    // Clock
    function tick() {
      var c = document.getElementById('xfce-sb-clock');
      if (!c) return;
      c.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    tick();
    setInterval(tick, 15000);

    // Logout
    document.getElementById('xfce-sb-logout').addEventListener('click', function () {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .finally(function () { location.href = '/login.html'; });
    });

    // Palette trigger in status bar
    document.getElementById('xfce-sb-palette-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      openPalette();
    });
  }

  // ── HUD Meta Panel ────────────────────────────────────────────────────
  var metaPanel;

  function buildMetaPanel() {
    metaPanel = el('div', 'xfce-hud');
    metaPanel.id = 'xfce-hud';
    metaPanel.innerHTML = [
      '<div class="xfce-hud-bar">',
        '<span class="xfce-hud-title">◈ System HUD</span>',
        '<button class="xfce-hud-close" id="xfce-hud-close" title="Close">✕</button>',
      '</div>',
      '<div class="xfce-hud-body">',
        '<div class="xfce-hud-section-label">Pod</div>',
        '<div id="xfce-hud-pod" class="xfce-hud-rows"></div>',
        '<div class="xfce-hud-section-label" style="margin-top:16px">Collections</div>',
        '<div id="xfce-hud-cols" class="xfce-hud-rows"></div>',
        '<div class="xfce-hud-section-label" style="margin-top:16px">Navigation</div>',
        '<div class="xfce-hud-nav-links" id="xfce-hud-nav"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(metaPanel);

    document.getElementById('xfce-hud-close').addEventListener('click', function () {
      metaPanel.classList.remove('open');
    });

    var navWrap = document.getElementById('xfce-hud-nav');
    if (navWrap) {
      NAV.concat(TOOLS).forEach(function (n) {
        var a = el('a', 'xfce-hud-nav-item' + (page === n.key ? ' active' : ''));
        a.href = n.href;
        a.innerHTML = '<span>' + n.icon + '</span><span>' + n.label + '</span>';
        navWrap.appendChild(a);
      });
    }
  }

  function toggleHUD() {
    if (!metaPanel) return;
    metaPanel.classList.toggle('open');
  }

  // ── Tools popup ───────────────────────────────────────────────────────
  var toolsPopup;

  function buildToolsPopup() {
    toolsPopup = el('div', 'xfce-tools-popup');
    toolsPopup.id = 'xfce-tools-popup';
    TOOLS.forEach(function (t) {
      var a = el('a', 'xfce-tools-item' + (page === t.key ? ' active' : ''));
      a.href = t.href;
      a.innerHTML = '<span class="xfce-tools-icon">' + t.icon + '</span><span>' + t.label + '</span>';
      toolsPopup.appendChild(a);
    });
    var sep = document.createElement('div');
    sep.className = 'xfce-tools-sep';
    toolsPopup.appendChild(sep);
    var palBtn = el('button', 'xfce-tools-item xfce-tools-palette');
    palBtn.innerHTML = '<span class="xfce-tools-icon">⌘</span><span>Palette</span><kbd class="xfce-tools-kbd">⌘K</kbd>';
    palBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toolsPopup.classList.remove('open');
      openPalette();
    });
    toolsPopup.appendChild(palBtn);

    var dockSep2 = document.createElement('div');
    dockSep2.className = 'xfce-tools-sep';
    toolsPopup.appendChild(dockSep2);

    var dockPosBtn = el('button', 'xfce-tools-item');
    dockPosBtn.id = 'xfce-dock-pos-btn';
    function updateDockPosLabel() {
      var pos = document.documentElement.dataset.dockPos || 'bottom';
      dockPosBtn.innerHTML = '<span class="xfce-tools-icon">' + (pos === 'left' ? '⬌' : '⬍') + '</span>'
        + '<span>Dock: ' + (pos === 'left' ? 'left' : 'bottom') + '</span>';
    }
    updateDockPosLabel();
    dockPosBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var cur = document.documentElement.dataset.dockPos || 'bottom';
      var next = cur === 'bottom' ? 'left' : 'bottom';
      localStorage.setItem('orb_dock_pos', next);
      document.documentElement.dataset.dockPos = next;
      updateDockPosLabel();
      toolsPopup.classList.remove('open');
      _previewCache = {};
    });
    toolsPopup.appendChild(dockPosBtn);
    document.body.appendChild(toolsPopup);
    document.addEventListener('click', function () {
      toolsPopup.classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') toolsPopup.classList.remove('open');
    });
  }

  function toggleToolsPopup() {
    if (!toolsPopup) buildToolsPopup();
    var btn = document.getElementById('xfce-tools-btn');
    if (btn) {
      var rect = btn.getBoundingClientRect();
      toolsPopup.style.left = Math.round(rect.left + rect.width / 2) + 'px';
    }
    toolsPopup.classList.toggle('open');
  }

  // ── Hover preview card above collection items ────────────────────────
  var _previewEl = null, _previewTimer = null, _previewCache = {};

  function buildPreview() {
    _previewEl = el('div', 'xfce-col-preview');
    _previewEl.id = 'xfce-col-preview';
    _previewEl.addEventListener('mouseenter', function () { clearTimeout(_previewTimer); });
    _previewEl.addEventListener('mouseleave', function () { _previewTimer = setTimeout(hideColPreview, 150); });
    document.body.appendChild(_previewEl);
  }

  function showColPreview(col, itemEl) {
    if (!_previewEl) buildPreview();
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(function () { _renderPreview(col, itemEl); }, 280);
  }

  function _renderPreview(col, itemEl) {
    var dock    = document.getElementById('xfce-dock');
    var isLeft  = document.documentElement.dataset.dockPos === 'left';
    var dockR   = dock ? dock.getBoundingClientRect() : { top: 0, right: 0 };
    var itemR   = itemEl.getBoundingClientRect();

    function place() {
      if (isLeft) {
        _previewEl.style.left = Math.round(dockR.right + 10) + 'px';
        _previewEl.style.top  = Math.round(itemR.top + itemR.height / 2 - _previewEl.offsetHeight / 2) + 'px';
        _previewEl.style.bottom = 'auto';
      } else {
        var cx = Math.round(itemR.left + itemR.width / 2);
        _previewEl.style.left   = cx + 'px';
        _previewEl.style.bottom = Math.round(window.innerHeight - dockR.top + 10) + 'px';
        _previewEl.style.top    = 'auto';
      }
    }

    var newHref     = '/editor.html?collection=' + encodeURIComponent(col.id);
    var entriesHref = col.singleton
      ? newHref + '&singleton=1'
      : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);

    function render(entries) {
      var rows = entries.length
        ? entries.slice(0, 3).map(function (e) {
            var slug = e.slug || e.id || '';
            var date = (e.updated_at || e.created_at || '').substring(5, 10);
            var href = '/editor.html?collection=' + encodeURIComponent(col.id) + '&slug=' + encodeURIComponent(slug);
            return '<a class="xfce-preview-row" href="' + href + '">'
              + '<span class="xfce-preview-slug">' + escHtml(slug) + '</span>'
              + '<span class="xfce-preview-date">' + date + '</span>'
              + '</a>';
          }).join('')
        : '<div class="xfce-preview-empty">no entries yet</div>';
      _previewEl.innerHTML =
        '<div class="xfce-preview-head"><a href="' + entriesHref + '">' + escHtml(col.label) + '</a></div>'
        + '<div class="xfce-preview-entries">' + rows + '</div>'
        + '<a class="xfce-preview-new" href="' + newHref + '">+ new entry</a>';
      _previewEl.classList.add('visible');
      place();
    }

    if (_previewCache[col.id]) {
      render(_previewCache[col.id]);
      return;
    }
    _previewEl.innerHTML = '<div class="xfce-preview-loading">…</div>';
    _previewEl.classList.add('visible');
    place();
    fetch('/api/collections/' + encodeURIComponent(col.id) + '/entries?limit=3', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var entries = d ? (d.entries || (Array.isArray(d) ? d : [])) : [];
        _previewCache[col.id] = entries;
        if (_previewEl.classList.contains('visible')) render(entries);
      });
  }

  function hideColPreview() {
    clearTimeout(_previewTimer);
    if (_previewEl) _previewEl.classList.remove('visible');
  }

  // ── Command Palette ───────────────────────────────────────────────────
  var palette, paletteInp, paletteResults, palActive = -1;
  var _cmdHistory = [], _cmdHistIdx = -1;

  var NAV_DEST = {
    dashboard: '/dashboard.html', media: '/media.html', settings: '/settings.html',
    users: '/users.html', schema: '/schema.html', build: '/build.html',
    import: '/import.html', account: '/account.html',
  };

  function buildPalette() {
    palette = el('div', 'xfce-palette');
    palette.id = 'xfce-palette';
    palette.innerHTML = [
      '<div class="xfce-palette-inner">',
        '<div class="xfce-palette-bar">',
          '<span class="xfce-palette-cmd">⌘</span>',
          '<input id="xfce-palette-inp" class="xfce-palette-inp" placeholder="Go to page or collection…  › type > for commands" autocomplete="off" spellcheck="false" />',
          '<span class="xfce-palette-hint">ESC to close</span>',
        '</div>',
        '<div id="xfce-palette-results" class="xfce-palette-results"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(palette);

    paletteInp     = document.getElementById('xfce-palette-inp');
    paletteResults = document.getElementById('xfce-palette-results');

    paletteInp.addEventListener('input', function () {
      palActive = -1;
      renderPalette(paletteInp.value);
    });

    paletteInp.addEventListener('keydown', function (e) {
      var val = paletteInp.value.trim();
      var inCmdMode = val.startsWith('>');

      if (e.key === 'Enter') {
        if (inCmdMode) {
          e.preventDefault();
          var cmd = val.slice(1).trim();
          if (cmd) {
            if (!_cmdHistory.length || _cmdHistory[0] !== cmd) _cmdHistory.unshift(cmd);
            if (_cmdHistory.length > 30) _cmdHistory.pop();
          }
          _cmdHistIdx = -1;
          execPaletteCmd(cmd);
        } else {
          var active = paletteResults.querySelector('.xfce-pal-item.pal-active');
          if (active && active.dataset.href) { location.href = active.dataset.href; closePalette(); }
          else {
            var first = paletteResults.querySelector('.xfce-pal-item[data-href]');
            if (first) { location.href = first.dataset.href; closePalette(); }
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (inCmdMode && _cmdHistory.length) {
          _cmdHistIdx = Math.min(_cmdHistIdx + 1, _cmdHistory.length - 1);
          paletteInp.value = '> ' + _cmdHistory[_cmdHistIdx];
          renderPalette(paletteInp.value);
        } else if (!inCmdMode) {
          var items = paletteResults.querySelectorAll('.xfce-pal-item[data-href]');
          palActive = Math.max(palActive - 1, 0);
          updatePalActive(items);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (inCmdMode && _cmdHistory.length) {
          _cmdHistIdx = Math.max(_cmdHistIdx - 1, -1);
          paletteInp.value = _cmdHistIdx < 0 ? '> ' : '> ' + _cmdHistory[_cmdHistIdx];
          renderPalette(paletteInp.value);
        } else if (!inCmdMode) {
          var items = paletteResults.querySelectorAll('.xfce-pal-item[data-href]');
          palActive = Math.min(palActive + 1, items.length - 1);
          updatePalActive(items);
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    palette.addEventListener('click', function (e) {
      if (e.target === palette) closePalette();
    });
  }

  function updatePalActive(items) {
    items.forEach(function (it, i) {
      it.classList.toggle('pal-active', i === palActive);
      if (i === palActive) it.scrollIntoView({ block: 'nearest' });
    });
  }

  function renderPalette(q) {
    q = (q || '').trim();

    if (q.startsWith('>')) {
      var cmd = q.slice(1).trim();
      paletteResults.innerHTML = cmd
        ? '<div class="xfce-pal-output xfce-pal-cmd-hint">↵ run: ' + escHtml(cmd) + '</div>'
        : '<div class="xfce-pal-output xfce-pal-dim">commands: ls &nbsp;· go &lt;page&gt; &nbsp;· new &lt;col&gt; &nbsp;· search &lt;term&gt; &nbsp;· build &nbsp;· export &lt;col&gt; &nbsp;· info</div>';
      return;
    }

    q = q.toLowerCase();
    var filtered = q
      ? _palItems.filter(function (it) { return it.label.toLowerCase().includes(q); })
      : _palItems;

    if (!filtered.length) {
      paletteResults.innerHTML = '<div class="xfce-pal-empty">No results</div>';
      return;
    }

    var groups = {};
    filtered.forEach(function (it) {
      var g = it.group || 'Nav';
      if (!groups[g]) groups[g] = [];
      groups[g].push(it);
    });

    var html = '';
    Object.keys(groups).forEach(function (g) {
      html += '<div class="xfce-pal-group">' + g + '</div>';
      groups[g].forEach(function (it) {
        html += '<div class="xfce-pal-item" data-href="' + it.href + '">'
          + '<span class="xfce-pal-icon">' + it.icon + '</span>'
          + '<span class="xfce-pal-label">' + escHtml(it.label) + '</span>'
          + (it.meta ? '<span class="xfce-pal-hint-r">' + escHtml(it.meta) + '</span>' : '')
          + '</div>';
      });
    });
    paletteResults.innerHTML = html;

    paletteResults.querySelectorAll('.xfce-pal-item[data-href]').forEach(function (item) {
      item.addEventListener('click', function () {
        location.href = item.dataset.href;
        closePalette();
      });
      item.addEventListener('mouseenter', function () {
        var items = paletteResults.querySelectorAll('.xfce-pal-item[data-href]');
        palActive = Array.from(items).indexOf(item);
        updatePalActive(items);
      });
    });
  }

  function palPrint(html, cls) {
    paletteResults.insertAdjacentHTML('beforeend',
      '<div class="xfce-pal-output' + (cls ? ' xfce-pal-' + cls : '') + '">' + html + '</div>');
  }

  function palSetItems(html) {
    paletteResults.innerHTML = html;
    paletteResults.querySelectorAll('.xfce-pal-item[data-href]').forEach(function (item) {
      item.addEventListener('click', function () { location.href = item.dataset.href; closePalette(); });
      item.addEventListener('mouseenter', function () {
        var items = paletteResults.querySelectorAll('.xfce-pal-item[data-href]');
        palActive = Array.from(items).indexOf(item);
        updatePalActive(items);
      });
    });
  }

  function execPaletteCmd(raw) {
    if (!raw) return;
    var parts = raw.trim().split(/\s+/);
    var cmd   = parts[0].toLowerCase();
    var args  = parts.slice(1);
    paletteResults.innerHTML = '';

    switch (cmd) {
      case 'help':   palHelp();                  break;
      case 'info':   palInfo();                  break;
      case 'ls':     palLs(args);               break;
      case 'go':     palGo(args);               break;
      case 'new':    palNew(args);              break;
      case 'search': palSearch(args.join(' ')); break;
      case 'build':  palBuild();                break;
      case 'export': palExport(args);           break;
      default: palPrint('unknown: <b>' + escHtml(cmd) + '</b> &mdash; try <b>&gt; help</b>', 'err');
    }
  }

  function palHelp() {
    palPrint([
      '<code>go &lt;page|collection&gt;</code> &mdash; navigate',
      '<code>new &lt;collection&gt;</code> &mdash; new entry',
      '<code>ls [collection]</code> &mdash; list collections or entries',
      '<code>search &lt;term&gt;</code> &mdash; full-text search',
      '<code>info</code> &mdash; pod &amp; version info',
      '<code>build</code> &mdash; trigger deploy',
      '<code>export &lt;col&gt; [--md] [--drafts]</code> &mdash; download',
    ].join('<br>'), 'dim');
  }

  function palInfo() {
    fetch('/api/info', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { palPrint('error fetching info', 'err'); return; }
        var total = (d.collections || []).reduce(function (s, c) { return s + (c.total || 0); }, 0);
        palPrint([
          'Pod: <b>' + escHtml(d.podPath.split('/').pop()) + '</b>',
          'Format: v' + d.formatVersion + ' &nbsp;· Admin: v' + d.adminVersion,
          'Collections: ' + (d.collections || []).length + ' &nbsp;· Published: ' + total,
        ].join('<br>'), 'dim');
      });
  }

  function palLs(args) {
    if (!args.length) {
      if (!_termCols.length) { palPrint('no collections loaded yet', 'muted'); return; }
      var html = _termCols.map(function (col) {
        var href = col.singleton
          ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
          : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
        var abbr = col.label.substring(0, 2).toUpperCase();
        var meta = col.total + (col.total === 1 ? ' entry' : ' entries') + (col.drafts > 0 ? ', ' + col.drafts + ' draft' + (col.drafts === 1 ? '' : 's') : '');
        return '<div class="xfce-pal-item" data-href="' + href + '">'
          + '<span class="xfce-pal-icon">' + abbr + '</span>'
          + '<span class="xfce-pal-label">' + escHtml(col.label) + '</span>'
          + '<span class="xfce-pal-hint-r">' + meta + '</span>'
          + '</div>';
      }).join('');
      palSetItems(html);
      return;
    }
    var colId = args[0];
    palPrint('loading…', 'muted');
    fetch('/api/collections/' + encodeURIComponent(colId) + '/entries?status=published&limit=20', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        paletteResults.innerHTML = '';
        if (!d) { palPrint('collection not found: ' + escHtml(colId), 'err'); return; }
        var entries = d.entries || (Array.isArray(d) ? d : []);
        if (!entries.length) { palPrint('(no published entries)', 'muted'); return; }
        var html = entries.map(function (e) {
          var href = '/editor.html?collection=' + encodeURIComponent(colId) + '&id=' + encodeURIComponent(e.id || '');
          var date = (e.updated_at || e.created_at || '').substring(0, 10);
          return '<div class="xfce-pal-item" data-href="' + href + '">'
            + '<span class="xfce-pal-icon">✎</span>'
            + '<span class="xfce-pal-label">' + escHtml(e.slug || e.id || '') + '</span>'
            + '<span class="xfce-pal-hint-r">' + date + '</span>'
            + '</div>';
        }).join('');
        palSetItems(html);
        if (d.total > entries.length) palPrint('… ' + (d.total - entries.length) + ' more', 'muted');
      });
  }

  function palGo(args) {
    if (!args.length) { palPrint('usage: go &lt;page|collection&gt;', 'err'); return; }
    var dest = args[0].toLowerCase();
    if (NAV_DEST[dest]) { closePalette(); setTimeout(function () { location.href = NAV_DEST[dest]; }, 120); return; }
    var col = _termCols.find(function (c) { return c.id === dest || c.label.toLowerCase() === dest; });
    if (col) {
      closePalette();
      var href = col.singleton
        ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
        : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
      setTimeout(function () { location.href = href; }, 120);
      return;
    }
    palPrint('not found: ' + escHtml(dest), 'err');
  }

  function palNew(args) {
    if (!args.length) { palPrint('usage: new &lt;collection&gt;', 'err'); return; }
    var dest = args[0].toLowerCase();
    var col  = _termCols.find(function (c) { return c.id === dest || c.label.toLowerCase() === dest; });
    if (!col) { palPrint('collection not found: ' + escHtml(dest), 'err'); return; }
    closePalette();
    setTimeout(function () { location.href = '/editor.html?collection=' + encodeURIComponent(col.id); }, 120);
  }

  function palSearch(term) {
    if (!term) { palPrint('usage: search &lt;term&gt;', 'err'); return; }
    palPrint('searching…', 'muted');
    fetch('/api/search?q=' + encodeURIComponent(term), { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        paletteResults.innerHTML = '';
        if (!d) { palPrint('search error', 'err'); return; }
        var results = d.results || (Array.isArray(d) ? d : []);
        if (!results.length) { palPrint('no results for “' + escHtml(term) + '”', 'muted'); return; }
        var html = results.slice(0, 15).map(function (r) {
          var href = '/editor.html?collection=' + encodeURIComponent(r.collection || '') + '&slug=' + encodeURIComponent(r.slug || '');
          var snippet = r.snippet ? '<div class=”xfce-pal-snippet”>' + escHtml(r.snippet) + '</div>' : '';
          return '<div class=”xfce-pal-item xfce-pal-item--rich” data-href=”' + href + '”>'
            + '<span class=”xfce-pal-icon”>⌕</span>'
            + '<span class=”xfce-pal-item-body”>'
            + '<span class=”xfce-pal-label”>' + escHtml(r.title || r.slug || '') + '</span>'
            + snippet
            + '</span>'
            + '<span class=”xfce-pal-hint-r”>' + escHtml(r.label || r.collection || '') + '</span>'
            + '</div>';
        }).join('');
        palSetItems(html);
        if (results.length > 15) palPrint('… ' + (results.length - 15) + ' more', 'muted');
      });
  }

  function palBuild() {
    palPrint('triggering build…', 'muted');
    fetch('/api/build/trigger', { method: 'POST', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        paletteResults.innerHTML = '';
        if (d.ok || d.message) { palPrint('✓ ' + (d.message || 'build triggered'), 'ok'); setTimeout(closePalette, 900); }
        else palPrint('build error: ' + escHtml(d.error || JSON.stringify(d)), 'err');
      })
      .catch(function () { paletteResults.innerHTML = ''; palPrint('build request failed', 'err'); });
  }

  function palExport(args) {
    if (!args.length) { palPrint('usage: export &lt;collection&gt; [--md] [--drafts]', 'err'); return; }
    var colId  = args[0];
    var format = args.indexOf('--md') !== -1 ? 'md' : 'json';
    var drafts = args.indexOf('--drafts') !== -1 ? '1' : '0';
    var col    = _termCols.find(function (c) { return c.id === colId; });
    if (!col) { palPrint('collection not found: ' + escHtml(colId), 'err'); return; }
    palPrint('exporting…', 'muted');
    fetch('/api/terminal/export?col=' + encodeURIComponent(colId) + '&format=' + format + '&drafts=' + drafts, { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || r.status); });
        return r.blob().then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = colId + '.' + format;
          document.body.appendChild(a); a.click(); a.remove();
          paletteResults.innerHTML = '';
          palPrint('✓ downloaded ' + colId + '.' + format, 'ok');
          setTimeout(closePalette, 900);
        });
      })
      .catch(function (err) { paletteResults.innerHTML = ''; palPrint('export failed: ' + escHtml(err.message), 'err'); });
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function openPalette() {
    if (!palette) buildPalette();
    palette.style.display = 'flex';
    paletteInp.value = '';
    palActive = -1;
    renderPalette('');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        palette.classList.add('open');
        setTimeout(function () { paletteInp.focus(); }, 40);
      });
    });
  }

  function closePalette() {
    if (!palette) return;
    palette.classList.remove('open');
    setTimeout(function () {
      if (!palette.classList.contains('open')) palette.style.display = 'none';
    }, 200);
  }

  // ── Toast system ──────────────────────────────────────────────────────
  function buildToastHost() {
    var host = el('div', 'xfce-toast-host');
    host.id = 'xfce-toast-host';
    document.body.appendChild(host);
  }

  window.xfceToast = function (msg, type) {
    var host = document.getElementById('xfce-toast-host');
    if (!host) return;
    var t = el('div', 'xfce-toast' + (type ? ' xfce-toast-' + type : ''));
    t.textContent = msg;
    host.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2500);
  };

  function observeSavedFlash() {
    var flash = document.getElementById('saved-flash');
    if (!flash) return;
    new MutationObserver(function () {
      if (flash.style.display !== 'none' && flash.textContent.trim()) {
        window.xfceToast(flash.textContent.trim(), 'success');
      }
    }).observe(flash, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Workspace overlay (Notes + To-do) ────────────────────────────────
  var wsOverlay, wsActivePane = 'notes', wsNotesTimer, wsTodosData = [];

  function buildWorkspaceOverlay() {
    wsOverlay = el('div', 'xfce-ws-overlay');
    wsOverlay.id = 'xfce-ws-overlay';
    wsOverlay.innerHTML = [
      '<div class="xfce-ws-bar">',
        '<div class="xfce-ws-tabs">',
          '<button class="xfce-ws-tab active" data-pane="notes">✎ Notes</button>',
          '<button class="xfce-ws-tab" data-pane="todos">☑ To-do</button>',
        '</div>',
        '<div style="display:flex;align-items:center;gap:8px">',
          '<span id="xfce-ws-ind" class="xfce-ws-ind"></span>',
          '<button id="xfce-ws-export" class="xfce-ws-export" title="Download as Markdown">↓ .md</button>',
          '<button id="xfce-ws-close" class="xfce-ws-close">✕</button>',
        '</div>',
      '</div>',
      '<div class="xfce-ws-body">',
        '<div id="xfce-ws-notes-pane" class="xfce-ws-pane">',
          '<textarea id="xfce-ws-notes" class="xfce-ws-textarea" placeholder="Jot something down…"></textarea>',
        '</div>',
        '<div id="xfce-ws-todos-pane" class="xfce-ws-pane" style="display:none">',
          '<div class="xfce-ws-todo-row">',
            '<span class="xfce-ws-todo-prompt">›</span>',
            '<input id="xfce-ws-todo-inp" class="xfce-ws-todo-inp" placeholder="Add a task…" type="text" />',
            '<button id="xfce-ws-todo-add" class="xfce-ws-todo-add">↵</button>',
          '</div>',
          '<div id="xfce-ws-todo-list" class="xfce-ws-todo-list"></div>',
          '<div class="xfce-ws-todo-footer">',
            '<span id="xfce-ws-todo-count"></span>',
            '<button id="xfce-ws-todo-clear" style="display:none;background:none;border:none;font-family:var(--mono);font-size:9px;color:var(--muted);cursor:pointer">Clear done</button>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(wsOverlay);

    wsOverlay.querySelectorAll('.xfce-ws-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { switchWsPane(btn.dataset.pane); });
    });

    document.getElementById('xfce-ws-close').addEventListener('click', closeWorkspace);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wsOverlay.classList.contains('open')) closeWorkspace();
    });
    document.addEventListener('click', function (e) {
      if (!wsOverlay.classList.contains('open')) return;
      if (wsOverlay.contains(e.target)) return;
      closeWorkspace();
    });

    var notesEl = document.getElementById('xfce-ws-notes');
    var ind = document.getElementById('xfce-ws-ind');
    notesEl.addEventListener('input', function () {
      clearTimeout(wsNotesTimer);
      ind.textContent = '● unsaved'; ind.style.color = 'var(--gold)';
      wsNotesTimer = setTimeout(function () {
        ind.textContent = '↑ saving…'; ind.style.color = 'var(--muted)';
        fetch('/api/meta', {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 'dashboard.notes': notesEl.value }),
        }).then(function () {
          ind.textContent = '✓ saved'; ind.style.color = 'var(--jade)';
          setTimeout(function () { ind.textContent = ''; }, 2000);
        });
      }, 1200);
    });

    function addTodo() {
      var inp  = document.getElementById('xfce-ws-todo-inp');
      var text = inp.value.trim();
      if (!text) return;
      wsTodosData.push({ text: text, done: false });
      inp.value = '';
      renderTodos();
      saveTodos();
    }
    document.getElementById('xfce-ws-todo-add').addEventListener('click', addTodo);
    document.getElementById('xfce-ws-todo-inp').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTodo();
    });

    document.getElementById('xfce-ws-todo-clear').addEventListener('click', function () {
      wsTodosData = wsTodosData.filter(function (t) { return !t.done; });
      renderTodos(); saveTodos();
    });

    document.getElementById('xfce-ws-export').addEventListener('click', function () {
      var date = new Date().toISOString().slice(0, 10);
      var text, filename;
      if (wsActivePane === 'notes') {
        text     = document.getElementById('xfce-ws-notes').value;
        filename = 'notes-' + date + '.md';
      } else {
        text     = wsTodosData.map(function (t) { return (t.done ? '- [x] ' : '- [ ] ') + t.text; }).join('\n');
        filename = 'todos-' + date + '.md';
      }
      var blob = new Blob([text], { type: 'text/markdown' });
      var a    = document.createElement('a');
      a.href   = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  function switchWsPane(pane) {
    wsActivePane = pane;
    wsOverlay.querySelectorAll('.xfce-ws-tab').forEach(function (b) { b.classList.remove('active'); });
    wsOverlay.querySelector('[data-pane="' + pane + '"]').classList.add('active');
    document.getElementById('xfce-ws-notes-pane').style.display = pane === 'notes' ? '' : 'none';
    document.getElementById('xfce-ws-todos-pane').style.display = pane === 'todos' ? '' : 'none';
  }

  function renderTodos() {
    var list  = document.getElementById('xfce-ws-todo-list');
    var count = document.getElementById('xfce-ws-todo-count');
    var clear = document.getElementById('xfce-ws-todo-clear');
    if (!list) return;
    var done = wsTodosData.filter(function (t) { return t.done; }).length;
    if (count) count.textContent = done + '/' + wsTodosData.length + ' done';
    if (clear) clear.style.display = done > 0 ? '' : 'none';
    list.innerHTML = wsTodosData.length === 0
      ? '<div class="xfce-ws-todo-empty">No tasks yet</div>'
      : '';
    wsTodosData.forEach(function (t, i) {
      var row = document.createElement('label');
      row.className = 'xfce-ws-todo-item' + (t.done ? ' done' : '');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !!t.done;
      cb.addEventListener('change', function () {
        wsTodosData[i].done = cb.checked;
        renderTodos(); saveTodos();
      });
      var span = document.createElement('span');
      span.textContent = t.text;
      row.appendChild(cb); row.appendChild(span);
      list.appendChild(row);
    });
  }

  function saveTodos() {
    fetch('/api/meta', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'dashboard.todos': JSON.stringify(wsTodosData) }),
    });
  }

  function loadWsData() {
    var dashNotes = document.getElementById('notes-area');
    if (dashNotes) {
      var ta = document.getElementById('xfce-ws-notes');
      if (ta) ta.value = dashNotes.value;
    } else {
      fetch('/api/meta/dashboard~notes', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var ta = document.getElementById('xfce-ws-notes');
          if (ta && d && d.value != null) ta.value = d.value;
        });
    }
    fetch('/api/meta/dashboard~todos', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        try { wsTodosData = JSON.parse(d && d.value ? d.value : '[]'); } catch (e) { wsTodosData = []; }
        if (!Array.isArray(wsTodosData)) wsTodosData = [];
        renderTodos();
      });
  }

  function openWorkspace(pane) {
    if (!wsOverlay) buildWorkspaceOverlay();
    var isOpen = wsOverlay.classList.contains('open');
    if (isOpen && wsActivePane === pane) { closeWorkspace(); return; }
    switchWsPane(pane);
    if (!isOpen) {
      wsOverlay.classList.add('open');
      loadWsData();
    }
    setTimeout(function () {
      var focus = pane === 'notes'
        ? document.getElementById('xfce-ws-notes')
        : document.getElementById('xfce-ws-todo-inp');
      if (focus) focus.focus();
    }, 60);
  }

  function closeWorkspace() {
    if (wsOverlay) wsOverlay.classList.remove('open');
    document.querySelectorAll('[data-wspane]').forEach(function (btn) {
      btn.classList.remove('active');
    });
  }

  // ── Focus mode ────────────────────────────────────────────────────────
  var focusedEl      = null;
  var focusOrigStyle = null;

  function buildFocusDim() {
    var dim = document.createElement('div');
    dim.id  = 'xfce-focus-dim';
    dim.className = 'xfce-focus-dim';
    dim.addEventListener('click', exitFocusMode);
    document.body.appendChild(dim);
    return dim;
  }

  function enterFocusMode(target) {
    if (focusedEl) return;
    var dim  = document.getElementById('xfce-focus-dim') || buildFocusDim();
    var rect = target.getBoundingClientRect();

    focusOrigStyle = {
      position:  target.style.position  || '',
      left:      target.style.left      || '',
      top:       target.style.top       || '',
      width:     target.style.width     || '',
      height:    target.style.height    || '',
      zIndex:    target.style.zIndex    || '',
      overflow:  target.style.overflow  || '',
      maxHeight: target.style.maxHeight || '',
      boxShadow: target.style.boxShadow || '',
      transition:target.style.transition|| '',
    };
    focusedEl = target;

    var tw   = Math.round(window.innerWidth  * 0.92);
    var maxH = Math.round(window.innerHeight * 0.86);
    var tl   = Math.round((window.innerWidth - tw) / 2);

    target.style.transition = 'none';
    target.style.position   = 'fixed';
    target.style.left       = rect.left + 'px';
    target.style.top        = rect.top  + 'px';
    target.style.width      = tw        + 'px';
    target.style.height     = 'auto';
    target.style.maxHeight  = maxH      + 'px';
    target.style.zIndex     = '9995';
    target.style.overflow   = 'auto';
    target.classList.add('xfce-in-focus');

    var actualH = Math.min(target.scrollHeight, maxH);
    var tt      = Math.round((window.innerHeight - actualH) / 2);

    target.style.transition = [
      'left .32s cubic-bezier(.34,1.15,.64,1)',
      'top .32s cubic-bezier(.34,1.15,.64,1)',
      'width .28s cubic-bezier(.4,0,.2,1)',
      'box-shadow .28s',
    ].join(',');
    target.style.left      = tl + 'px';
    target.style.top       = tt + 'px';
    target.style.boxShadow = '0 32px 80px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb,var(--accent) 28%,transparent)';

    dim.classList.add('active');
    document.addEventListener('keydown', onFocusKey);
  }

  function exitFocusMode() {
    if (!focusedEl) return;
    var target = focusedEl;
    var dim    = document.getElementById('xfce-focus-dim');

    if (dim) dim.classList.remove('active');
    document.removeEventListener('keydown', onFocusKey);

    target.style.transition = 'opacity .18s';
    target.style.opacity    = '0';

    setTimeout(function () {
      target.classList.remove('xfce-in-focus');
      Object.keys(focusOrigStyle).forEach(function (k) {
        target.style[k] = focusOrigStyle[k];
      });
      target.style.opacity = '0';
      target.getBoundingClientRect();
      target.style.transition = 'opacity .15s';
      target.style.opacity    = '1';
      setTimeout(function () {
        target.style.transition = '';
        target.style.opacity    = '';
      }, 160);
      focusedEl      = null;
      focusOrigStyle = null;
    }, 180);
  }

  function onFocusKey(e) {
    if (e.key === 'Escape') exitFocusMode();
  }

  function initFocusMode() {
    var dashContent = document.querySelector('.dash-content');
    if (!dashContent) return;
    var head = dashContent.querySelector('.section-head');
    if (!head) return;
    head.classList.add('xfce-focus-trigger');
    head.title = 'Click to focus';
    head.addEventListener('click', function () { enterFocusMode(dashContent); });
  }

  // ── Dock ──────────────────────────────────────────────────────────────
  var dockInner;

  function makeDockItem(icon, label, hrefOrNull, isActive, isBtn) {
    var item = isBtn ? el('button') : el('a');
    item.className = 'xfce-dock-item' + (isActive ? ' active' : '');
    if (!isBtn) item.href = hrefOrNull;
    item.setAttribute('aria-label', label);
    item.dataset.label = label;
    item.innerHTML = '<span class="xfce-dock-icon">' + icon + '</span><span class="xfce-dock-lbl">' + label + '</span>';
    item.style.setProperty('--ds', '1');
    return item;
  }

  function buildDock() {
    var dock = el('div', 'xfce-dock');
    dock.id = 'xfce-dock';
    dockInner = el('div', 'xfce-dock-inner');
    dock.appendChild(dockInner);

    // Nav items group
    var navGroup = el('div', 'xfce-dock-group');
    NAV.forEach(function (n) {
      navGroup.appendChild(makeDockItem(n.icon, n.label, n.href, page === n.key, false));
    });
    dockInner.appendChild(navGroup);

    dockInner.appendChild(el('div', 'xfce-dock-sep'));

    // Collections group (populated by /api/info)
    var colGroup = el('div', 'xfce-dock-group');
    colGroup.id = 'xfce-dock-cols';
    dockInner.appendChild(colGroup);

    dockInner.appendChild(el('div', 'xfce-dock-sep'));

    // Workspace group
    var wsGroup = el('div', 'xfce-dock-group');
    WORKSPACE.forEach(function (w) {
      var btn = makeDockItem(w.icon, w.label, null, false, true);
      btn.dataset.wspane = w.pane;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openWorkspace(w.pane);
      });
      wsGroup.appendChild(btn);
    });
    dockInner.appendChild(wsGroup);

    dockInner.appendChild(el('div', 'xfce-dock-sep'));

    // Tools popup button
    var toolsActive = TOOLS.some(function (t) { return t.key === page; });
    var toolsBtn = makeDockItem('⚒', 'Tools', null, toolsActive, true);
    toolsBtn.id = 'xfce-tools-btn';
    toolsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleToolsPopup();
    });
    dockInner.appendChild(toolsBtn);

    dockInner.appendChild(el('div', 'xfce-dock-sep'));

    // HUD toggle
    var hudBtn = makeDockItem('▣', 'HUD', null, false, true);
    hudBtn.addEventListener('click', toggleHUD);
    dockInner.appendChild(hudBtn);

    // Scheme toggle
    var schemeBtn   = document.getElementById('scheme-toggle');
    var schemeClone = makeDockItem('◐', 'Scheme', null, false, true);
    schemeClone.addEventListener('click', function () {
      if (schemeBtn) schemeBtn.click();
      setTimeout(function () {
        schemeClone.querySelector('.xfce-dock-icon').textContent = schemeBtn ? schemeBtn.textContent : '◐';
      }, 50);
    });
    dockInner.appendChild(schemeClone);

    document.body.appendChild(dock);

    dock.addEventListener('click', function () {
      if (focusedEl) exitFocusMode();
    }, true);

    // Apply saved dock position
    var _savedDockPos = localStorage.getItem('orb_dock_pos') || 'bottom';
    document.documentElement.dataset.dockPos = _savedDockPos;

    // ── Magnification ─────────────────────────────────────────────────
    function applyMag(cx, cy) {
      var isLeft = document.documentElement.dataset.dockPos === 'left';
      var items  = dockInner.querySelectorAll('.xfce-dock-item');
      items.forEach(function (item) {
        var r   = item.getBoundingClientRect();
        var mid = isLeft ? (r.top + r.height / 2) : (r.left + r.width / 2);
        var pos = isLeft ? cy : cx;
        var d   = Math.abs(pos - mid);
        var s   = d < 80 ? 1 + (1 - d / 80) * 0.50 : 1;
        item.style.setProperty('--ds', s.toFixed(3));
      });
    }

    dock.addEventListener('mousemove', function (e) { applyMag(e.clientX, e.clientY); });
    dock.addEventListener('mouseleave', function () {
      dockInner.querySelectorAll('.xfce-dock-item').forEach(function (item) {
        item.style.setProperty('--ds', '1');
      });
    });
  }

  // ── Load /api/info ────────────────────────────────────────────────────
  function loadInfo() {
    fetch('/api/info', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info) return;

        // Site name in status bar
        var siteEl = document.getElementById('xfce-sb-site');
        if (siteEl) siteEl.textContent = info.siteName || info.podPath.split('/').pop().replace('.pod', '');

        // Collections in dock
        var colGroup = document.getElementById('xfce-dock-cols');
        if (colGroup) {
          var topLevel = (info.collections || []).filter(function (c) { return !c.parent; });
          topLevel.forEach(function (col, idx) {
            var isSingleton = !!col.singleton;
            var href = isSingleton
              ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
              : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
            var isActive = isSingleton
              ? page === 'editor' && activeCol === col.id
              : page === 'entries' && activeCol === col.id;
            var abbr = col.label.substring(0, 2);
            var item = makeDockItem(abbr, col.label, href, isActive, false);
            item.querySelector('.xfce-dock-icon').style.cssText = 'font-size:14px;font-weight:700;font-family:var(--mono);letter-spacing:-.03em;line-height:1;opacity:1;';
            item.dataset.dockIdx = idx + 1;

            // Draft badge
            if (col.drafts > 0) {
              var badge = el('span', 'xfce-dock-badge');
              badge.textContent = col.drafts;
              badge.title = col.drafts + ' draft' + (col.drafts === 1 ? '' : 's');
              item.appendChild(badge);
            }

            // Hover shows preview card with recent entries
            item.addEventListener('mouseenter', function () { showColPreview(col, item); });
            item.addEventListener('mouseleave', function () { _previewTimer = setTimeout(hideColPreview, 150); });

            // Right-click context menu
            addDockCtxMenu(item, col);

            colGroup.appendChild(item);

            // Add to palette fuzzy search and command list
            _palItems.push({ icon: abbr, label: col.label, href: href, group: 'Collections' });
            _termCols.push({ id: col.id, label: col.label, total: col.total || 0, drafts: col.drafts || 0, singleton: !!col.singleton });
          });
        }

        // HUD pod section
        var hudPod = document.getElementById('xfce-hud-pod');
        if (hudPod) {
          var total = (info.collections || []).reduce(function (s, c) { return s + (c.total || 0); }, 0);
          hudPod.innerHTML = [
            hudRow('File',        info.podPath.split('/').pop()),
            hudRow('Format',      'v' + info.formatVersion),
            hudRow('Admin',       'v' + info.adminVersion),
            hudRow('Collections', info.collections.length),
            hudRow('Published',   total),
          ].join('');
        }

        // HUD collections section
        var hudCols = document.getElementById('xfce-hud-cols');
        if (hudCols) {
          hudCols.innerHTML = (info.collections || []).map(function (col) {
            var draftTxt = col.drafts > 0 ? ', ' + col.drafts + ' draft' + (col.drafts === 1 ? '' : 's') : '';
            return hudRow(col.label, col.total + ' published' + draftTxt);
          }).join('');
        }
      })
      .catch(function () {});

    // Site meta
    fetch('/api/meta/site~name', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.value) return;
        var siteEl = document.getElementById('xfce-sb-site');
        if (siteEl) siteEl.textContent = d.value;
      })
      .catch(function () {});

    // Current user
    fetch('/api/auth/me', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.user) return;
        var sbUser = document.getElementById('xfce-sb-user');
        if (sbUser) sbUser.textContent = d.user.username;
      })
      .catch(function () {});
  }

  function hudRow(label, value) {
    return '<div class="xfce-hud-row"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  var _gPending = false, _gTimer = null;
  var G_MAP = { d: '/dashboard.html', m: '/media.html', s: '/settings.html',
                u: '/users.html',     b: '/build.html',  i: '/import.html',
                h: '/schema.html',   a: '/account.html' };

  function setGMode(on) {
    _gPending = on;
    var ind = document.getElementById('xfce-sb-g-ind');
    if (ind) ind.style.display = on ? '' : 'none';
  }

  function bindKeys() {
    // Capture-phase ⌘K: fires before admin-utils.js bubble-phase listener, stops it
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (palette && palette.classList.contains('open')) closePalette();
        else openPalette();
      }
    }, true);

    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;

      // ⌘K handled above in capture phase
      if (mod && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        return;
      }

      // / — open palette (when not typing in an input; Shift+7 on DE keyboard also produces '/')
      if (!mod && !e.altKey && e.key === '/' && !isEditing(e.target)) {
        e.preventDefault();
        setGMode(false); clearTimeout(_gTimer);
        if (palette && palette.classList.contains('open')) closePalette();
        else openPalette();
        return;
      }

      // g — vim-style navigation prefix (g d = dashboard, g m = media, …)
      if (!mod && !e.shiftKey && !e.altKey && e.key === 'g' && !isEditing(e.target)) {
        e.preventDefault();
        setGMode(true);
        clearTimeout(_gTimer);
        _gTimer = setTimeout(function () { setGMode(false); }, 1500);
        return;
      }
      if (_gPending && !isEditing(e.target)) {
        clearTimeout(_gTimer); setGMode(false);
        if (G_MAP[e.key]) { e.preventDefault(); location.href = G_MAP[e.key]; }
        return;
      }

      // ⌘⇧D — toggle HUD
      if (mod && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        toggleHUD();
        return;
      }

      // ⌘⇧L — switch back to glass mode
      if (mod && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        localStorage.setItem('orb_style', 'glass');
        location.reload();
        return;
      }

      // 1–9 — jump to nth dock link (no modifier, not in input)
      if (!mod && !e.shiftKey && !e.altKey && !isEditing(e.target)) {
        var n = parseInt(e.key);
        if (n >= 1 && n <= 9) {
          var links = dockInner
            ? Array.from(dockInner.querySelectorAll('a.xfce-dock-item')).filter(function (a) {
                return !a.classList.contains('xfce-dock-create');
              })
            : [];
          if (links[n - 1]) {
            e.preventDefault();
            location.href = links[n - 1].href;
          }
        }
      }
    });
  }

  // ── Build status in status bar ────────────────────────────────────────
  function loadBuildStatus() {
    fetch('/api/build/status', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.lastTriggered) return;
        var el2 = document.getElementById('xfce-sb-build');
        var sep = document.getElementById('xfce-sb-build-sep');
        if (!el2) return;
        var dt = new Date(d.lastTriggered.replace(' ', 'T'));
        var now = new Date();
        var diffM = Math.floor((now - dt) / 60000);
        var label = diffM < 1 ? 'built now'
          : diffM < 60 ? 'built ' + diffM + 'm ago'
          : diffM < 1440 ? 'built ' + Math.floor(diffM / 60) + 'h ago'
          : 'built ' + dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
        el2.textContent = '◉ ' + label;
        el2.title = 'Last build: ' + d.lastTriggered;
        if (sep) sep.style.display = '';
      });
  }

  // ── Dock right-click context menu ─────────────────────────────────────
  var _ctxMenu = null;

  function buildCtxMenu() {
    _ctxMenu = document.createElement('div');
    _ctxMenu.className = 'xfce-ctx-menu';
    _ctxMenu.id = 'xfce-ctx-menu';
    document.body.appendChild(_ctxMenu);
    document.addEventListener('click', function (e) {
      if (_ctxMenu && !_ctxMenu.contains(e.target)) closeCtxMenu();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCtxMenu();
    });
  }

  function openCtxMenu(x, y, items) {
    if (!_ctxMenu) buildCtxMenu();
    _ctxMenu.innerHTML = items.map(function (it) {
      return '<button class="xfce-ctx-item" data-href="' + (it.href || '') + '">'
        + '<span class="xfce-ctx-icon">' + it.icon + '</span>'
        + '<span>' + it.label + '</span>'
        + '</button>';
    }).join('');
    _ctxMenu.querySelectorAll('.xfce-ctx-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var href = btn.dataset.href;
        closeCtxMenu();
        if (href) location.href = href;
      });
    });
    var vw = window.innerWidth, vh = window.innerHeight;
    _ctxMenu.style.display = 'block';
    var w = _ctxMenu.offsetWidth, h = _ctxMenu.offsetHeight;
    _ctxMenu.style.left = Math.min(x, vw - w - 8) + 'px';
    _ctxMenu.style.top  = Math.min(y, vh - h - 8) + 'px';
    _ctxMenu.classList.add('open');
  }

  function closeCtxMenu() {
    if (!_ctxMenu) return;
    _ctxMenu.classList.remove('open');
    setTimeout(function () { if (_ctxMenu) _ctxMenu.style.display = 'none'; }, 120);
  }

  function addDockCtxMenu(item, col) {
    item.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var entriesHref = col.singleton
        ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
        : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
      var newHref = '/editor.html?collection=' + encodeURIComponent(col.id);
      openCtxMenu(e.clientX, e.clientY, [
        { icon: '◫', label: 'View entries', href: entriesHref },
        { icon: '+', label: 'New entry',    href: newHref },
        { icon: '↓', label: 'Export JSON',  href: '' },
      ]);
      // Wire export separately (needs fetch, not href)
      var exportBtn = _ctxMenu.querySelectorAll('.xfce-ctx-item')[2];
      if (exportBtn) {
        exportBtn.addEventListener('click', function (ev) {
          ev.stopImmediatePropagation();
          closeCtxMenu();
          fetch('/api/terminal/export?col=' + encodeURIComponent(col.id) + '&format=json&drafts=0', { credentials: 'include' })
            .then(function (r) { return r.blob(); })
            .then(function (blob) {
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = col.id + '.json';
              document.body.appendChild(a); a.click(); a.remove();
            });
        }, { once: true });
      }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    buildStatusBar();
    buildMetaPanel();
    buildDock();
    buildToastHost();
    loadInfo();
    loadBuildStatus();
    bindKeys();
    initFocusMode();
    observeSavedFlash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
