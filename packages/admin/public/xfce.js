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

  // collections loaded by /api/info — used by terminal
  var _termCols = [];

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
        '<button id="xfce-sb-palette-btn" class="xfce-sb-palette-btn" title="Command palette (⌘K)">⌘</button>',
        '<span class="xfce-sb-div">·</span>',
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
      openTerminal();
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
      openTerminal();
    });
    toolsPopup.appendChild(palBtn);
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

  // ── Hover + badge above collection items ─────────────────────────────
  var colCreateEl, colCreateTimer;

  function buildColCreate() {
    colCreateEl = el('a', 'xfce-col-create');
    colCreateEl.id = 'xfce-col-create';
    colCreateEl.textContent = '+';
    colCreateEl.addEventListener('mouseenter', function () { clearTimeout(colCreateTimer); });
    colCreateEl.addEventListener('mouseleave', function () { colCreateTimer = setTimeout(hideColCreate, 120); });
    document.body.appendChild(colCreateEl);
  }

  function showColCreate(href, itemEl) {
    if (!colCreateEl) buildColCreate();
    clearTimeout(colCreateTimer);
    var dock = document.getElementById('xfce-dock');
    var dockTop = dock ? dock.getBoundingClientRect().top : 0;
    var itemRect = itemEl.getBoundingClientRect();
    colCreateEl.href = href;
    colCreateEl.style.left = Math.round(itemRect.left + itemRect.width / 2) + 'px';
    colCreateEl.style.top  = Math.round(dockTop - 34) + 'px';
    colCreateEl.classList.add('visible');
  }

  function hideColCreate() {
    if (colCreateEl) colCreateEl.classList.remove('visible');
  }

  // ── Orbiter Terminal ─────────────────────────────────────────────────
  var terminal, termOutput, termInput;
  var termHistory = [], termHistIdx = -1;
  var TERM_CMDS = ['help','clear','info','ls','go','new','search','build','export'];
  var NAV_DEST  = {
    dashboard: '/dashboard.html', media: '/media.html', settings: '/settings.html',
    users: '/users.html', schema: '/schema.html', build: '/build.html',
    import: '/import.html', account: '/account.html',
  };

  function buildTerminal() {
    terminal = el('div', 'xfce-terminal');
    terminal.id = 'xfce-terminal';
    terminal.innerHTML = [
      '<div class="xfce-term-inner">',
        '<div class="xfce-term-bar">',
          '<span class="xfce-term-title">◈ orbiter terminal</span>',
          '<kbd class="xfce-term-esc">ESC</kbd>',
        '</div>',
        '<div id="xfce-term-output" class="xfce-term-output"></div>',
        '<div class="xfce-term-input-row">',
          '<span class="xfce-term-prompt">orbiter $</span>',
          '<input id="xfce-term-input" class="xfce-term-input" autocomplete="off" spellcheck="false" />',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(terminal);

    termOutput = document.getElementById('xfce-term-output');
    termInput  = document.getElementById('xfce-term-input');

    termPrint('Orbiter Admin  ·  type \'help\' for available commands', 'muted');
    termPrint('', '');

    termInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var line = termInput.value.trim();
        termInput.value = '';
        if (!line) return;
        termHistIdx = -1;
        if (!termHistory.length || termHistory[0] !== line) termHistory.unshift(line);
        if (termHistory.length > 50) termHistory.pop();
        termPrint('orbiter $ ' + line, 'cmd');
        execCmd(line);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (termHistIdx < termHistory.length - 1) { termHistIdx++; termInput.value = termHistory[termHistIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (termHistIdx > 0) { termHistIdx--; termInput.value = termHistory[termHistIdx]; }
        else { termHistIdx = -1; termInput.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        termTabComplete();
      } else if (e.key === 'Escape') {
        closeTerminal();
      }
    });

    terminal.addEventListener('click', function (e) {
      if (e.target === terminal) closeTerminal();
    });
  }

  function termPrint(text, cls) {
    var line = document.createElement('div');
    line.className = 'xfce-term-line' + (cls ? ' xfce-term-' + cls : '');
    line.textContent = text;
    termOutput.appendChild(line);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function termClear() { termOutput.innerHTML = ''; }

  function execCmd(raw) {
    var parts = raw.trim().split(/\s+/);
    var cmd   = parts[0].toLowerCase();
    var args  = parts.slice(1);
    switch (cmd) {
      case 'help':   termHelp();               break;
      case 'clear':  termClear();              break;
      case 'info':   termInfo();               break;
      case 'ls':     termLs(args);             break;
      case 'go':     termGo(args);             break;
      case 'new':    termNew(args);            break;
      case 'search': termSearch(args.join(' ')); break;
      case 'build':  termBuild();              break;
      case 'export': termExport(args);         break;
      default: termPrint('command not found: ' + cmd + '  (try \'help\')', 'err');
    }
    termPrint('', '');
  }

  function termHelp() {
    termPrint('', '');
    [
      '  go <page|collection>   navigate to a page or collection',
      '  new <collection>       open editor for a new entry',
      '  ls [collection]        list collections or recent entries',
      '  search <term>          full-text search across all content',
      '  info                   show pod and version info',
      '  build                  trigger deploy webhook',
      '  export <col> [flags]   download entries   flags: --md  --drafts',
      '  clear                  clear terminal',
      '  help                   show this message',
      '',
      '  shortcuts: ↑↓ history  ·  Tab completion  ·  ⌘K toggle',
    ].forEach(function (l) { termPrint(l, 'dim'); });
  }

  function termInfo() {
    fetch('/api/info', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { termPrint('error fetching info', 'err'); return; }
        var total = (d.collections || []).reduce(function (s, c) { return s + (c.total || 0); }, 0);
        termPrint('', '');
        termPrint('  pod         ' + d.podPath.split('/').pop(), 'dim');
        termPrint('  format      v' + d.formatVersion, 'dim');
        termPrint('  admin       v' + d.adminVersion, 'dim');
        termPrint('  collections ' + (d.collections || []).length, 'dim');
        termPrint('  published   ' + total + ' entries', 'dim');
      });
  }

  function termLs(args) {
    if (!args.length) {
      if (!_termCols.length) { termPrint('no collections loaded yet', 'muted'); return; }
      termPrint('', '');
      _termCols.forEach(function (col) {
        var info = col.total + ' entr' + (col.total === 1 ? 'y' : 'ies');
        if (col.drafts > 0) info += '  ' + col.drafts + ' draft' + (col.drafts === 1 ? '' : 's');
        termPrint('  ' + col.id.padEnd(22) + info, 'dim');
      });
      return;
    }
    var colId = args[0];
    fetch('/api/collections/' + encodeURIComponent(colId) + '/entries?status=published&limit=25', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { termPrint('collection not found: ' + colId, 'err'); return; }
        var entries = d.entries || (Array.isArray(d) ? d : []);
        termPrint('', '');
        if (!entries.length) { termPrint('  (no published entries)', 'muted'); return; }
        entries.forEach(function (e) {
          var date = (e.updated_at || e.created_at || '').substring(0, 10);
          termPrint('  ' + (e.slug || e.id || '').padEnd(36) + date, 'dim');
        });
        if (d.total > entries.length) termPrint('  … ' + (d.total - entries.length) + ' more', 'muted');
      });
  }

  function termGo(args) {
    if (!args.length) { termPrint('usage: go <page|collection>', 'err'); return; }
    var dest = args[0].toLowerCase();
    if (NAV_DEST[dest]) {
      termPrint('→ ' + dest, 'ok');
      closeTerminal();
      setTimeout(function () { location.href = NAV_DEST[dest]; }, 180);
      return;
    }
    var col = _termCols.find(function (c) { return c.id === dest || c.label.toLowerCase() === dest; });
    if (col) {
      termPrint('→ ' + col.label, 'ok');
      closeTerminal();
      var href = col.singleton
        ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
        : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
      setTimeout(function () { location.href = href; }, 180);
      return;
    }
    termPrint('not found: ' + dest, 'err');
  }

  function termNew(args) {
    if (!args.length) { termPrint('usage: new <collection>', 'err'); return; }
    var dest = args[0].toLowerCase();
    var col  = _termCols.find(function (c) { return c.id === dest || c.label.toLowerCase() === dest; });
    if (!col) { termPrint('collection not found: ' + dest, 'err'); return; }
    termPrint('→ new entry in ' + col.label, 'ok');
    closeTerminal();
    setTimeout(function () { location.href = '/editor.html?collection=' + encodeURIComponent(col.id); }, 180);
  }

  function termSearch(term) {
    if (!term) { termPrint('usage: search <term>', 'err'); return; }
    termPrint('searching…', 'muted');
    fetch('/api/search?q=' + encodeURIComponent(term), { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { termPrint('search error', 'err'); return; }
        var results = d.results || (Array.isArray(d) ? d : []);
        termPrint('', '');
        if (!results.length) { termPrint('  no results for "' + term + '"', 'muted'); return; }
        results.slice(0, 15).forEach(function (r) {
          termPrint('  › ' + (r.collection || '') + '/' + (r.slug || r.id || ''), 'ok');
          if (r.title) termPrint('    ' + r.title, 'dim');
        });
        if (results.length > 15) termPrint('  … ' + (results.length - 15) + ' more', 'muted');
      });
  }

  function termBuild() {
    termPrint('triggering build…', 'muted');
    fetch('/api/build', { method: 'POST', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok || d.message) termPrint('✓ ' + (d.message || 'build triggered'), 'ok');
        else termPrint('build: ' + (d.error || JSON.stringify(d)), 'err');
      })
      .catch(function () { termPrint('build request failed', 'err'); });
  }

  function termExport(args) {
    if (!args.length) { termPrint('usage: export <collection> [--md] [--drafts]', 'err'); return; }
    var colId  = args[0];
    var format = args.indexOf('--md') !== -1 ? 'md' : 'json';
    var drafts = args.indexOf('--drafts') !== -1 ? '1' : '0';
    var col    = _termCols.find(function (c) { return c.id === colId; });
    if (!col) { termPrint('collection not found: ' + colId, 'err'); return; }
    termPrint('exporting ' + col.label + ' as ' + format + '…', 'muted');
    fetch('/api/terminal/export?col=' + encodeURIComponent(colId) + '&format=' + format + '&drafts=' + drafts, { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || r.status); });
        return r.blob().then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = colId + '.' + format;
          document.body.appendChild(a); a.click(); a.remove();
          termPrint('✓ downloaded ' + colId + '.' + format, 'ok');
        });
      })
      .catch(function (err) { termPrint('export failed: ' + err.message, 'err'); });
  }

  function termTabComplete() {
    var val   = termInput.value;
    var parts = val.split(/\s+/);
    if (parts.length === 1) {
      var p = parts[0].toLowerCase();
      var m = TERM_CMDS.filter(function (c) { return c.startsWith(p); });
      if (m.length === 1) termInput.value = m[0] + ' ';
      else if (m.length > 1) termPrint(m.join('   '), 'muted');
    } else if (parts.length === 2) {
      var cmd2 = parts[0].toLowerCase(), p2 = parts[1].toLowerCase();
      var pool = _termCols.map(function (c) { return c.id; });
      if (cmd2 === 'go') pool = pool.concat(Object.keys(NAV_DEST));
      if (['go','new','ls','export'].indexOf(cmd2) !== -1) {
        var m2 = pool.filter(function (c) { return c.startsWith(p2); });
        if (m2.length === 1) termInput.value = parts[0] + ' ' + m2[0];
        else if (m2.length > 1) termPrint(m2.join('   '), 'muted');
      }
    }
  }

  function openTerminal() {
    if (!terminal) buildTerminal();
    terminal.style.display = 'flex';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        terminal.classList.add('open');
        setTimeout(function () { termInput.focus(); }, 40);
      });
    });
  }

  function closeTerminal() {
    if (!terminal) return;
    terminal.classList.remove('open');
    setTimeout(function () {
      if (!terminal.classList.contains('open')) terminal.style.display = 'none';
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

    // ── Magnification ─────────────────────────────────────────────────
    function applyMag(cx) {
      var items = dockInner.querySelectorAll('.xfce-dock-item');
      items.forEach(function (item) {
        var r   = item.getBoundingClientRect();
        var mid = r.left + r.width / 2;
        var d   = Math.abs(cx - mid);
        var s   = d < 80 ? 1 + (1 - d / 80) * 0.50 : 1;
        item.style.setProperty('--ds', s.toFixed(3));
      });
    }

    dock.addEventListener('mousemove', function (e) { applyMag(e.clientX); });
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

            // Hover shows + badge above this item
            var createHref = col.singleton
              ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
              : '/editor.html?collection=' + encodeURIComponent(col.id);
            item.addEventListener('mouseenter', function () { showColCreate(createHref, item); });
            item.addEventListener('mouseleave', function () { colCreateTimer = setTimeout(hideColCreate, 120); });

            colGroup.appendChild(item);

            // Add to terminal collection list
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
  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;

      // ⌘K — terminal
      if (mod && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (terminal && terminal.classList.contains('open')) closeTerminal();
        else openTerminal();
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

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    buildStatusBar();
    buildMetaPanel();
    buildDock();
    buildToastHost();
    loadInfo();
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
