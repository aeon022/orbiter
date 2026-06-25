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

  function tblr(paths) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  var TI = {
    dashboard: tblr('<path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1"/><path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1"/><path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1"/><path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1"/>'),
    calendar:  tblr('<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15h1"/><path d="M12 15v3"/>'),
    media:     tblr('<path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6"/><path d="M3 16l5-5c.928-.893 2.072-.893 3 0l5 5"/><path d="M14 14l1-1c.928-.893 2.072-.893 3 0l3 3"/>'),
    users:     tblr('<path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>'),
    inbox:     tblr('<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M3 7l9 6l9-6"/>'),
    forms:     tblr('<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6"/><path d="M4 16a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2"/>'),
    analytics: tblr('<path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6"/><path d="M15 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9"/><path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5"/><path d="M4 20h14"/>'),
    snippets:  tblr('<path d="M7 8l-4 4l4 4"/><path d="M17 8l4 4l-4 4"/><path d="M14 4l-4 16"/>'),
    schema:    tblr('<path d="M4 6a8 3 0 1 0 16 0a8 3 0 1 0-16 0"/><path d="M4 6v6a8 3 0 0 0 16 0V6"/><path d="M4 12v6a8 3 0 0 0 16 0v-6"/>'),
    build:     tblr('<path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3-5a9 9 0 0 0 6-8a3 3 0 0 0-3-3a9 9 0 0 0-8 6a6 6 0 0 0-5 3"/><path d="M7 14a6 6 0 0 0-3 6a6 6 0 0 0 6-3"/><path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>'),
    import:    tblr('<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M7 11l5 5l5-5"/><path d="M12 4v12"/>'),
    settings:  tblr('<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/>'),
    notes:     tblr('<path d="M4 20h4l10.5-10.5a2.828 2.828 0 1 0-4-4L4 16v4"/><path d="M13.5 6.5l4 4"/>'),
    todos:     tblr('<path d="M9 11l3 3l8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>'),
    publish:   tblr('<path d="M12 2L2 7l10 5l10-5l-10-5"/><path d="M2 17l10 5l10-5"/><path d="M2 12l10 5l10-5"/>'),
    tools:     tblr('<path d="M3 21h4l13-13a1.5 1.5 0 0 0-4-4L3 17v4"/><path d="M14.5 5.5l4 4"/><path d="M12 8l-5-5l-4 4l5 5"/><path d="M7 8l-1.5 1.5"/><path d="M16 12l5 5l-4 4l-5-5"/><path d="M16 17l-1.5 1.5"/>'),
  };

  var NAV = [
    { icon: TI.dashboard, label: 'Dashboard', href: '/dashboard.html', key: 'dashboard' },
    { icon: TI.calendar,  label: 'Calendar',  href: '/calendar.html',  key: 'calendar' },
    { icon: TI.media,     label: 'Media',     href: '/media.html',     key: 'media' },
    { icon: TI.users,     label: 'Users',     href: '/users.html',     key: 'users' },
  ];

  var TOOLS = [
    { icon: TI.inbox,     label: 'Inbox',     href: '/inbox.html',    key: 'inbox'    },
    { icon: TI.forms,     label: 'Forms',     href: '/forms.html',    key: 'forms'    },
    { icon: TI.analytics, label: 'Analytics', href: '/analytics.html',key: 'analytics'},
    { icon: TI.snippets,  label: 'Snippets',  href: '/snippets.html', key: 'snippets' },
    { icon: tblr('<path d="M6 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M18 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M18 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M7.5 7.5l9 9"/><path d="M7.5 16.5l9-9"/>'), label: 'Graph', href: '/graph.html', key: 'graph' },
    { icon: TI.schema,    label: 'Schema',    href: '/schema.html',   key: 'schema'   },
    { icon: TI.build,     label: 'Build',     href: '/build.html',    key: 'build'    },
    { icon: TI.publish,   label: 'Publish HTML', href: '/publish.html',  key: 'publish'  },
    { icon: TI.import,    label: 'Import',    href: '/import.html',   key: 'import'   },
    { icon: TI.settings,  label: 'Settings',  href: '/settings.html', key: 'settings' },
  ];

  var WORKSPACE = [
    { icon: TI.notes, label: 'Notes', pane: 'notes' },
    { icon: TI.todos, label: 'To-do', pane: 'todos' },
  ];

  // palette items — nav + tools pre-seeded; collections appended after /api/info
  var _palItems = NAV.concat(TOOLS).map(function (n) {
    return { icon: n.icon, label: n.label, href: n.href, group: n.key in { schema:1, build:1, publish:1, import:1, settings:1 } ? 'Tools' : 'Nav' };
  });
  var _termCols   = []; // collection metadata for palette commands
  var _activeDrawerTimer = null;
  var _palRecents = []; // prefetched recent entries for empty palette

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
        '<span id="xfce-sb-g-ind" class="xfce-sb-g-ind" style="display:none" title="g mode: d=dashboard k=calendar m=media u=users n=inbox f=forms y=analytics p=snippets c=schema b=build w=publish i=import s=settings a=account h=HUD">g ›</span>',
        '<button id="xfce-sb-bell" class="xfce-sb-bell" title="Notifications"><span id="xfce-sb-bell-icon">○</span><span id="xfce-sb-bell-badge" class="xfce-sb-bell-badge" style="display:none"></span></button>',
        '<span class="xfce-sb-div">·</span>',
        '<button id="xfce-sb-cheat" class="xfce-sb-cheat" title="Shortcuts (?)">?</button>',
        '<span class="xfce-sb-div">·</span>',
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

    // Breadcrumb / page title
    var titleEl = document.getElementById('xfce-sb-title');
    if (titleEl) {
      if (activeCol && (page === 'entries' || page === 'editor')) {
        // will be filled in by loadInfo once we know the collection label
        titleEl.dataset.col = activeCol;
        titleEl.dataset.page = page;
      } else {
        var title = document.title.replace(/\s*—\s*Orbiter.*$/, '').trim();
        if (title) titleEl.textContent = title;
      }
    }

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

    // Bell / notification center
    document.getElementById('xfce-sb-bell').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleNotifPanel();
    });

    // Cheatsheet
    document.getElementById('xfce-sb-cheat').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleCheatsheet();
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
        '<div class="xfce-hud-section-label" style="margin-top:16px">Drafts</div>',
        '<div id="xfce-hud-drafts" class="xfce-hud-rows xfce-hud-drafts"></div>',
        '<div class="xfce-hud-section-label" style="margin-top:16px">Activity</div>',
        '<div id="xfce-hud-activity" class="xfce-hud-rows xfce-hud-activity"></div>',
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
    if (metaPanel.classList.contains('open')) refreshHUDActivity();
  }

  // ── Tools popup ───────────────────────────────────────────────────────
  var toolsPopup;

  function buildToolsPopup() {
    toolsPopup = el('div', 'xfce-tools-popup');
    toolsPopup.id = 'xfce-tools-popup';
    TOOLS.filter(function (t) { return t.key !== 'settings'; }).forEach(function (t) {
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
    var btn  = document.getElementById('xfce-tools-btn');
    var dock = document.getElementById('xfce-dock');
    var isLeft = document.documentElement.dataset.dockPos === 'left';
    if (btn && dock) {
      var bRect = btn.getBoundingClientRect();
      var dRect = dock.getBoundingClientRect();
      if (isLeft) {
        toolsPopup.style.left   = Math.round(dRect.right + 10) + 'px';
        toolsPopup.style.top    = Math.round(bRect.top + bRect.height / 2) + 'px';
        toolsPopup.style.bottom = 'auto';
        toolsPopup.style.transform = 'translateY(-50%)';
      } else {
        toolsPopup.style.left      = Math.round(bRect.left + bRect.width / 2) + 'px';
        toolsPopup.style.top       = '';
        toolsPopup.style.bottom    = '';
        toolsPopup.style.transform = '';
      }
    }
    toolsPopup.classList.toggle('open');
  }

  // ── Hover preview card above collection items ────────────────────────
  var _previewEl = null, _previewTimer = null, _previewCache = {};

  function buildPreview() {
    _previewEl = el('div', 'xfce-col-preview');
    _previewEl.id = 'xfce-col-preview';
    _previewEl.addEventListener('mouseenter', function () {
      clearTimeout(_previewTimer);
      clearTimeout(_activeDrawerTimer);
    });
    _previewEl.addEventListener('mouseleave', function () {
      _previewTimer = setTimeout(hideColPreview, 150);
      if (_previewEl.classList.contains('from-drawer')) {
        _activeDrawerTimer = setTimeout(function () {
          document.querySelectorAll('.xfce-drawer-popup.open').forEach(function (p) { p.classList.remove('open'); });
        }, 250);
      }
    });
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
    var inDrawer = !!itemEl.closest('.xfce-drawer-popup');
    _previewEl.classList.toggle('from-drawer', inDrawer);

    function place() {
      if (inDrawer) {
        var popupEl = itemEl.closest('.xfce-drawer-popup');
        var popupR  = popupEl ? popupEl.getBoundingClientRect() : itemR;
        _previewEl.style.left   = Math.round(popupR.right + 8) + 'px';
        _previewEl.style.bottom = Math.round(window.innerHeight - popupR.top - popupR.height) + 'px';
        _previewEl.style.top    = 'auto';
      } else if (isLeft) {
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
      var statsHtml = '';
      if (!col.singleton) {
        var statParts = [];
        if (col.total > 0) statParts.push('<span class="xfce-stat xfce-stat-pub">' + col.total + ' published</span>');
        if (col.drafts > 0) statParts.push('<span class="xfce-stat xfce-stat-draft">' + col.drafts + ' draft' + (col.drafts !== 1 ? 's' : '') + '</span>');
        if ((col.scheduled||0) > 0) statParts.push('<span class="xfce-stat xfce-stat-sched">' + col.scheduled + ' scheduled</span>');
        if (statParts.length) statsHtml = '<div class="xfce-preview-stats">' + statParts.join('') + '</div>';
      }
      _previewEl.innerHTML =
        '<div class="xfce-preview-head"><a href="' + entriesHref + '">' + escHtml(col.label) + '</a></div>'
        + statsHtml
        + '<div class="xfce-preview-entries">' + rows + '</div>'
        + '<div class="xfce-preview-actions">'
        +   '<a class="xfce-preview-action" href="' + newHref + '">+ new entry</a>'
        +   '<a class="xfce-preview-action" href="' + entriesHref + '">◫ view all</a>'
        +   '<button class="xfce-preview-action xfce-preview-export" data-col="' + escHtml(col.id) + '">↓ export</button>'
        + '</div>';
      var expBtn = _previewEl.querySelector('.xfce-preview-export');
      if (expBtn) expBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        fetch('/api/terminal/export?col=' + encodeURIComponent(col.id) + '&format=json&drafts=0', { credentials: 'include' })
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = col.id + '.json';
            document.body.appendChild(a); a.click(); a.remove();
          });
        hideColPreview();
      });
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

    // Empty input → show recents + nav
    if (!q) {
      var html = '';
      if (_palRecents.length) {
        html += '<div class="xfce-pal-group">Recent</div>';
        _palRecents.forEach(function (r) {
          var href = '/collections/' + encodeURIComponent(r.collection) + '/entries/' + encodeURIComponent(r.slug);
          html += '<div class="xfce-pal-item" data-href="' + href + '">'
            + '<span class="xfce-pal-icon xfce-pal-icon-sm">◈</span>'
            + '<div class="xfce-pal-item-body">'
            + '<span class="xfce-pal-label">' + escHtml(r.title || r.slug) + '</span>'
            + '<span class="xfce-pal-snippet">' + escHtml(r.label) + '</span>'
            + '</div>'
            + '<span class="xfce-pal-hint-r xfce-pal-status xfce-pal-status-' + r.status + '">' + r.status + '</span>'
            + '</div>';
        });
        html += '<div class="xfce-pal-group">Navigation</div>';
      }
      var navGroups = {};
      _palItems.forEach(function (it) {
        var g = it.group || 'Nav';
        if (!navGroups[g]) navGroups[g] = [];
        navGroups[g].push(it);
      });
      Object.keys(navGroups).forEach(function (g) {
        if (_palRecents.length) html += '<div class="xfce-pal-group-sub">' + g + '</div>';
        else html += '<div class="xfce-pal-group">' + g + '</div>';
        navGroups[g].forEach(function (it) {
          html += '<div class="xfce-pal-item" data-href="' + it.href + '">'
            + '<span class="xfce-pal-icon">' + it.icon + '</span>'
            + '<span class="xfce-pal-label">' + escHtml(it.label) + '</span>'
            + (it.meta ? '<span class="xfce-pal-hint-r">' + escHtml(it.meta) + '</span>' : '')
            + '</div>';
        });
      });
      paletteResults.innerHTML = html;
      paletteResults.querySelectorAll('.xfce-pal-item[data-href]').forEach(function (item) {
        item.addEventListener('click', function () { location.href = item.dataset.href; closePalette(); });
        item.addEventListener('mouseenter', function () {
          var items = paletteResults.querySelectorAll('.xfce-pal-item[data-href]');
          palActive = Array.from(items).indexOf(item);
          updatePalActive(items);
        });
      });
      return;
    }

    var filtered = _palItems.filter(function (it) { return it.label.toLowerCase().includes(q); });

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
      case 'random': palRandom();               break;
      case '=':      palMath(args.join(' '));   break;
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
      '<code>random</code> &mdash; jump to a random entry',
      '<code>= &lt;expr&gt;</code> &mdash; evaluate math expression',
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
        if (d.ok || d.message) {
          palPrint('✓ ' + (d.message || 'build triggered'), 'ok');
          startBuildPoll();
          setTimeout(closePalette, 900);
        } else palPrint('build error: ' + escHtml(d.error || JSON.stringify(d)), 'err');
      })
      .catch(function () { paletteResults.innerHTML = ''; palPrint('build request failed', 'err'); });
  }

  function palMath(expr) {
    if (!expr) { palPrint('usage: <code>= 2 * 450 + 12</code>', 'dim'); return; }
    try {
      // only allow safe math chars
      if (!/^[\d\s\+\-\*\/\.\(\)%,^]+$/.test(expr)) throw new Error('unsafe');
      // replace ^ with ** for exponentiation
      var safe = expr.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      var result = Function('"use strict"; return (' + safe + ')')();
      if (typeof result !== 'number' || !isFinite(result)) throw new Error('not a number');
      palPrint('<span style="font-size:15px;color:var(--accent)">' + result + '</span>'
        + ' <span style="color:var(--muted);font-size:10px">= ' + escHtml(expr) + '</span>', '');
    } catch (e) {
      palPrint('invalid expression', 'err');
    }
  }

  function palRandom() {
    palPrint('picking a random entry…', 'muted');
    fetch('/api/search/recent?limit=50', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        var published = rows.filter(function (r) { return r.status === 'published'; });
        if (!published.length) { paletteResults.innerHTML = ''; palPrint('no published entries found', 'muted'); return; }
        var pick = published[Math.floor(Math.random() * published.length)];
        var href = '/collections/' + encodeURIComponent(pick.collection) + '/entries/' + encodeURIComponent(pick.slug);
        paletteResults.innerHTML = '';
        palPrint('✦ <a href="' + href + '" style="color:var(--accent)">' + escHtml(pick.title || pick.slug) + '</a>'
          + ' <span style="color:var(--muted)">in ' + escHtml(pick.label) + '</span>', '');
        setTimeout(function () { location.href = href; closePalette(); }, 1200);
      })
      .catch(function () { paletteResults.innerHTML = ''; palPrint('error fetching entries', 'err'); });
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
    pushNotif(msg, type);
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

  // ── Notification Center ───────────────────────────────────────────────
  var _notifications = [], _notifUnread = 0, _notifPanel = null;

  function pushNotif(msg, type) {
    _notifications.unshift({ msg: msg, type: type || 'info', time: Date.now() });
    if (_notifications.length > 40) _notifications.pop();
    _notifUnread++;
    var badge = document.getElementById('xfce-sb-bell-badge');
    var icon  = document.getElementById('xfce-sb-bell-icon');
    if (badge) { badge.textContent = _notifUnread > 9 ? '9+' : _notifUnread; badge.style.display = ''; }
    if (icon)  { icon.textContent = '●'; }
    if (_notifPanel && _notifPanel.classList.contains('open')) renderNotifList();
    refreshHUDActivity();
  }

  function buildNotifPanel() {
    _notifPanel = el('div', 'xfce-notif-panel');
    _notifPanel.id = 'xfce-notif-panel';
    _notifPanel.innerHTML = '<div class="xfce-notif-bar">'
      + '<span class="xfce-notif-title">Notifications</span>'
      + '<button id="xfce-notif-clear" class="xfce-notif-clear">Clear all</button>'
      + '</div>'
      + '<div id="xfce-notif-list" class="xfce-notif-list"></div>';
    document.body.appendChild(_notifPanel);
    document.getElementById('xfce-notif-clear').addEventListener('click', function () {
      _notifications = []; _notifUnread = 0;
      renderNotifList();
      var badge = document.getElementById('xfce-sb-bell-badge');
      var icon  = document.getElementById('xfce-sb-bell-icon');
      if (badge) badge.style.display = 'none';
      if (icon)  icon.textContent = '○';
    });
    document.addEventListener('click', function (e) {
      if (_notifPanel && _notifPanel.classList.contains('open')
          && !_notifPanel.contains(e.target)
          && e.target.id !== 'xfce-sb-bell') closeNotifPanel();
    });
  }

  function renderNotifList() {
    var list = document.getElementById('xfce-notif-list');
    if (!list) return;
    if (!_notifications.length) {
      list.innerHTML = '<div class="xfce-notif-empty">No notifications yet</div>';
      return;
    }
    list.innerHTML = _notifications.map(function (n) {
      var ago = Math.floor((Date.now() - n.time) / 1000);
      var t = ago < 60 ? ago + 's' : ago < 3600 ? Math.floor(ago/60) + 'm' : Math.floor(ago/3600) + 'h';
      var cls = n.type === 'success' ? 'ok' : n.type === 'error' ? 'err' : 'info';
      return '<div class="xfce-notif-item xfce-notif-' + cls + '">'
        + '<span class="xfce-notif-msg">' + escHtml(n.msg) + '</span>'
        + '<span class="xfce-notif-time">' + t + '</span>'
        + '</div>';
    }).join('');
  }

  function refreshHUDActivity() {
    var el2 = document.getElementById('xfce-hud-activity');
    if (!el2) return;
    if (!_notifications.length) {
      el2.innerHTML = '<div class="xfce-hud-empty">No activity yet</div>';
      return;
    }
    el2.innerHTML = _notifications.slice(0, 8).map(function (n) {
      var ago = Math.floor((Date.now() - n.time) / 1000);
      var t = ago < 60 ? ago + 's' : ago < 3600 ? Math.floor(ago / 60) + 'm' : Math.floor(ago / 3600) + 'h';
      var cls = n.type === 'success' ? 'xfce-hud-act-ok' : n.type === 'error' ? 'xfce-hud-act-err' : '';
      return '<div class="xfce-hud-act-row' + (cls ? ' ' + cls : '') + '">'
        + '<span class="xfce-hud-act-msg">' + escHtml(n.msg) + '</span>'
        + '<span class="xfce-hud-act-time">' + t + '</span>'
        + '</div>';
    }).join('');
  }

  function toggleNotifPanel() {
    if (!_notifPanel) buildNotifPanel();
    var isOpen = _notifPanel.classList.toggle('open');
    if (isOpen) {
      _notifUnread = 0;
      var badge = document.getElementById('xfce-sb-bell-badge');
      if (badge) badge.style.display = 'none';
      renderNotifList();
    }
  }

  function closeNotifPanel() {
    if (_notifPanel) _notifPanel.classList.remove('open');
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
    var toolsActive = TOOLS.some(function (t) { return t.key !== 'settings' && t.key === page; });
    var toolsBtn = makeDockItem(TI.tools, 'Tools', null, toolsActive, true);
    toolsBtn.id = 'xfce-tools-btn';
    toolsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleToolsPopup();
    });
    dockInner.appendChild(toolsBtn);

    var settingsDockBtn = makeDockItem(TI.settings, 'Settings', '/settings.html', page === 'settings', false);
    dockInner.appendChild(settingsDockBtn);

    dockInner.appendChild(el('div', 'xfce-dock-sep'));

    // HUD toggle
    var hudBtn = makeDockItem(tblr('<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6"/><path d="M4 12h16"/><path d="M12 4v16"/>'), 'HUD', null, false, true);
    hudBtn.addEventListener('click', toggleHUD);
    dockInner.appendChild(hudBtn);

    // Scheme toggle
    var schemeBtn = document.getElementById('scheme-toggle');
    var SCHEME_ICONS = {
      light: tblr('<path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0"/><path d="M3 12h1m8-9v1m8 8h1m-9 8v1m-6.4-15.4l.7.7m12.1-.7l-.7.7m0 11.4l.7.7m-12.1-.7l-.7.7"/>'),
      dark:  tblr('<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454"/>'),
      auto:  tblr('<path d="M9.173 14.83a4 4 0 1 1 5.657-5.657"/><path d="M11.294 12.707l.174.247a7.5 7.5 0 0 0 8.845 2.492a9 9 0 0 1-14.671 2.914"/><path d="M3 12h1"/><path d="M12 3v1"/><path d="M5.6 5.6l.7.7"/>'),
    };
    var curScheme = localStorage.getItem('orb_scheme') || 'auto';
    var schemeClone = makeDockItem(SCHEME_ICONS[curScheme] || SCHEME_ICONS.auto, curScheme === 'dark' ? 'Dark' : curScheme === 'light' ? 'Light' : 'Auto', null, false, true);
    function updateSchemeIcon() {
      curScheme = curScheme === 'auto' ? 'light' : curScheme === 'light' ? 'dark' : 'auto';
      localStorage.setItem('orb_scheme', curScheme);
      var root = document.documentElement;
      root.removeAttribute('data-scheme');
      if (curScheme === 'dark') root.setAttribute('data-scheme', 'dark');
      if (curScheme === 'light') root.setAttribute('data-scheme', 'light');
      schemeClone.querySelector('.xfce-dock-icon').innerHTML = SCHEME_ICONS[curScheme] || SCHEME_ICONS.auto;
      schemeClone.querySelector('.xfce-dock-lbl').textContent = curScheme === 'dark' ? 'Dark' : curScheme === 'light' ? 'Light' : 'Auto';
    }
    schemeClone.addEventListener('click', function () {
      updateSchemeIcon();
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
          var navHidden = new Set((info.nav && info.nav.hidden) || []);
          var navGroups = (info.nav && info.nav.groups) || null;
          var groupedIds = new Set();
          if (navGroups) { Object.keys(navGroups).forEach(function (g) { (navGroups[g] || []).forEach(function (id) { groupedIds.add(id); }); }); }

          var allCols = (info.collections || []).filter(function (c) { return !navHidden.has(c.id); });
          var topLevel = allCols.filter(function (c) { return !c.parent; });
          var colById = {};
          allCols.forEach(function (c) { colById[c.id] = c; });

          function addColDockItem(col, idx) {
            var isSingleton = !!col.singleton;
            var href = isSingleton
              ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
              : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
            var isActive = isSingleton
              ? page === 'editor' && activeCol === col.id
              : page === 'entries' && activeCol === col.id;
            var abbr = col.label.substring(0, 2);
            var item = makeDockItem(abbr, col.label, href, isActive, false);
            item.querySelector('.xfce-dock-icon').style.cssText = 'font-size:16px;font-weight:700;font-family:var(--mono);letter-spacing:-.03em;line-height:1;';
            item.dataset.dockIdx = idx + 1;
            item.addEventListener('mouseenter', function () { showColPreview(col, item); });
            item.addEventListener('mouseleave', function () { _previewTimer = setTimeout(hideColPreview, 150); });
            colGroup.appendChild(item);
            _palItems.push({ icon: abbr, label: col.label, href: href, group: 'Collections' });
            _termCols.push({ id: col.id, label: col.label, total: col.total || 0, drafts: col.drafts || 0, singleton: !!col.singleton });
          }

          // Drawer groups
          if (navGroups) {
            Object.keys(navGroups).forEach(function (groupLabel) {
              var colIds = navGroups[groupLabel] || [];
              var grpCols = colIds.map(function (id) { return colById[id]; }).filter(Boolean);
              if (!grpCols.length) return;

              var anyActive = grpCols.some(function (c) {
                return (page === 'entries' && activeCol === c.id) || (page === 'editor' && activeCol === c.id);
              });
              var drawerItem = makeDockItem('⬡', groupLabel, null, anyActive, true);
              // inherits base .xfce-dock-icon sizing (20px, opacity .82)
              colGroup.appendChild(drawerItem);

              // Build drawer popup with stats (reuses xfce-tools-popup styling)
              var popup = el('div', 'xfce-tools-popup xfce-drawer-popup');
              popup.innerHTML = '<div style="padding:7px 14px 6px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:6px"><span style="font-size:11px;opacity:.6">⬡</span>' + escHtml(groupLabel) + '</div>';
              grpCols.forEach(function (gc) {
                var gcSingleton = !!gc.singleton;
                var gcHref = gcSingleton
                  ? '/editor.html?collection=' + encodeURIComponent(gc.id) + '&singleton=1'
                  : '/entries.html?col=' + encodeURIComponent(gc.id) + '&label=' + encodeURIComponent(gc.label);
                var gcActive = gcSingleton
                  ? page === 'editor' && activeCol === gc.id
                  : page === 'entries' && activeCol === gc.id;
                var stats = [];
                if (gc.total > 0) stats.push(gc.total + ' pub');
                if (gc.drafts > 0) stats.push(gc.drafts + ' draft');
                var statsHtml = stats.length ? '<span style="margin-left:auto;font-size:9px;color:var(--muted)">' + stats.join(' · ') + '</span>' : '';
                var a = el('a', 'xfce-tools-item' + (gcActive ? ' active' : ''));
                a.href = gcHref;
                a.innerHTML = '<span class="xfce-tools-icon" style="font-size:12px;font-weight:700;font-family:var(--mono);letter-spacing:-.02em">' + gc.label.substring(0, 2) + '</span><span>' + escHtml(gc.label) + '</span>' + statsHtml;
                a.addEventListener('mouseenter', function () { showColPreview(gc, a); });
                a.addEventListener('mouseleave', function () { _previewTimer = setTimeout(hideColPreview, 150); });
                popup.appendChild(a);
                _palItems.push({ icon: gc.label.substring(0, 2), label: gc.label, href: gcHref, group: 'Collections' });
                _termCols.push({ id: gc.id, label: gc.label, total: gc.total || 0, drafts: gc.drafts || 0, singleton: gcSingleton });
              });
              popup._drawerBtn = drawerItem;
              drawerItem._groupPopup = popup;
              drawerItem._positionPopup = function () {
                var dck = document.getElementById('xfce-dock');
                var isLeft = document.documentElement.dataset.dockPos === 'left';
                var bRect = drawerItem.getBoundingClientRect();
                var dRect = dck ? dck.getBoundingClientRect() : { top: 0, right: 0 };
                if (isLeft) {
                  popup.style.left = Math.round(dRect.right + 10) + 'px';
                  popup.style.top = Math.round(bRect.top + bRect.height / 2) + 'px';
                  popup.style.bottom = 'auto';
                  popup.style.transform = 'translateY(-50%)';
                } else {
                  popup.style.left = Math.round(bRect.left + bRect.width / 2) + 'px';
                  popup.style.top = '';
                  popup.style.bottom = '';
                  popup.style.transform = '';
                }
              };
              drawerItem.classList.add('xfce-dock-col-group');
              document.body.appendChild(popup);

              var drawerTimer;
              function showDrawer() {
                clearTimeout(drawerTimer);
                clearTimeout(_activeDrawerTimer);
                hideColPreview();
                document.querySelectorAll('.xfce-drawer-popup.open').forEach(function (p) { if (p !== popup) p.classList.remove('open'); });
                var dck = document.getElementById('xfce-dock');
                var isLeft = document.documentElement.dataset.dockPos === 'left';
                var bRect = drawerItem.getBoundingClientRect();
                var dRect = dck ? dck.getBoundingClientRect() : { top: 0, right: 0 };
                if (isLeft) {
                  popup.style.left = Math.round(dRect.right + 10) + 'px';
                  popup.style.top = Math.round(bRect.top + bRect.height / 2) + 'px';
                  popup.style.bottom = 'auto';
                  popup.style.transform = 'translateY(-50%)';
                } else {
                  popup.style.left = Math.round(bRect.left + bRect.width / 2) + 'px';
                  popup.style.top = '';
                  popup.style.bottom = '';
                  popup.style.transform = '';
                }
                popup.classList.add('open');
              }
              function scheduleHide() {
                drawerTimer = setTimeout(function () { popup.classList.remove('open'); hideColPreview(); }, 250);
                _activeDrawerTimer = drawerTimer;
              }
              drawerItem.addEventListener('mouseenter', showDrawer);
              drawerItem.addEventListener('mouseleave', scheduleHide);
              popup.addEventListener('mouseenter', function () { clearTimeout(drawerTimer); clearTimeout(_activeDrawerTimer); });
              popup.addEventListener('mouseleave', scheduleHide);
            });
          }

          // Ungrouped collections — original behaviour with hover preview
          var idx = 0;
          topLevel.forEach(function (col) {
            if (groupedIds.has(col.id)) return;
            addColDockItem(col, idx++);
          });

          // Extend g-mode with collection shortcuts (first unused letter of label)
          var usedKeys = new Set(Object.keys(G_MAP));
          var colShortcuts = [];
          topLevel.forEach(function (col) {
            var href = col.singleton
              ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
              : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
            var label = col.label.toLowerCase();
            for (var ci = 0; ci < label.length; ci++) {
              var ch = label[ci];
              if (/[a-z]/.test(ch) && !usedKeys.has(ch)) {
                G_MAP[ch] = href;
                usedKeys.add(ch);
                colShortcuts.push({ key: ch, label: col.label });
                break;
              }
            }
          });
          // Update g-mode tooltip
          var gInd = document.getElementById('xfce-sb-g-ind');
          if (gInd) {
            var _gLabels = {};
            NAV.concat(TOOLS).forEach(function (n) { _gLabels[n.href] = n.label; });
            colShortcuts.forEach(function (cs) { _gLabels[G_MAP[cs.key]] = cs.label; });
            var tips = Object.keys(G_MAP).sort().map(function (k) {
              var label = _gLabels[G_MAP[k]] || G_MAP[k].replace(/.*\//, '').replace('.html', '').replace(/\?.*/, '');
              return k + '=' + label;
            });
            gInd.title = 'g mode: ' + tips.join(' ');
          }
          // Inject collection shortcuts into cheatsheet if already built
          if (_cheatEl) {
            var navCol = _cheatEl.querySelector('.xfce-cheat-col');
            if (navCol && colShortcuts.length) {
              var dockRow = navCol.querySelector('.xfce-cheat-row:last-child');
              var html = '<div class="xfce-cheat-section" style="margin-top:10px">Collections (g + key)</div>';
              colShortcuts.forEach(function (cs) {
                html += cheatRow('g &nbsp;+&nbsp; ' + cs.key, cs.label);
              });
              if (dockRow) dockRow.insertAdjacentHTML('afterend', html);
            }
          }
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

        // Breadcrumb in status bar center
        var titleEl = document.getElementById('xfce-sb-title');
        if (titleEl && titleEl.dataset.col) {
          var colMeta = (info.collections || []).find(function (c) { return c.id === titleEl.dataset.col; });
          var colLabel = colMeta ? colMeta.label : titleEl.dataset.col;
          var crumbPage = titleEl.dataset.page === 'editor' ? 'Editor' : 'Entries';
          titleEl.innerHTML = '<a href="/entries.html?col=' + encodeURIComponent(titleEl.dataset.col) + '" class="xfce-sb-crumb-link">' + escHtml(colLabel) + '</a>'
            + '<span class="xfce-sb-crumb-sep"> › </span>'
            + '<span class="xfce-sb-crumb-page">' + crumbPage + '</span>';
        }
      })
      .catch(function () {});

    // HUD Drafts
    fetch('/api/search/recent?status=draft&limit=10', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (drafts) {
        var hudDrafts = document.getElementById('xfce-hud-drafts');
        if (!hudDrafts) return;
        if (!drafts.length) {
          hudDrafts.innerHTML = '<div class="xfce-hud-empty">No drafts</div>';
          return;
        }
        hudDrafts.innerHTML = drafts.map(function (d) {
          var href = '/collections/' + encodeURIComponent(d.collection) + '/entries/' + encodeURIComponent(d.slug);
          var ago = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 60000);
          var t = ago < 60 ? ago + 'm' : Math.floor(ago / 60) + 'h';
          return '<div class="xfce-hud-draft-row">'
            + '<a class="xfce-hud-draft-link" href="' + href + '">' + escHtml(d.title || d.slug) + '</a>'
            + '<span class="xfce-hud-draft-meta">' + escHtml(d.label) + ' · ' + t + '</span>'
            + '</div>';
        }).join('');
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

    // Prefetch recent entries for palette empty state
    fetch('/api/search/recent?limit=7', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { _palRecents = rows; })
      .catch(function () {});
  }

  function hudRow(label, value) {
    return '<div class="xfce-hud-row"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  // ── Zen / Focus mode ─────────────────────────────────────────────────
  function toggleZen() {
    var html = document.documentElement;
    var on = html.dataset.zen !== '1';
    html.dataset.zen = on ? '1' : '';
    localStorage.setItem('orb_zen', on ? '1' : '');
    if (on) window.xfceToast('Focus mode on  —  ⌘⇧F to exit', 'info');
  }

  // ── Shortcut cheatsheet ───────────────────────────────────────────────
  var _cheatEl = null;

  function buildCheatsheet() {
    _cheatEl = el('div', 'xfce-cheat-overlay');
    _cheatEl.id = 'xfce-cheat';
    _cheatEl.innerHTML = [
      '<div class="xfce-cheat-panel">',
        '<div class="xfce-cheat-bar">',
          '<span class="xfce-cheat-title">⌨ Shortcuts</span>',
          '<button class="xfce-cheat-close" id="xfce-cheat-close">✕</button>',
        '</div>',
        '<div class="xfce-cheat-body">',
          '<div class="xfce-cheat-col">',
            '<div class="xfce-cheat-section">Navigation</div>',
            cheatRow('⌘K &nbsp;/&nbsp; /', 'Open command palette'),
            cheatRow('↑ ↓', 'Move selection in palette'),
            cheatRow('↵', 'Go to selected item'),
            cheatRow('Esc', 'Close overlay / panel'),
            cheatRow('g &nbsp;+&nbsp; d', 'Dashboard'),
            cheatRow('g &nbsp;+&nbsp; k', 'Calendar'),
            cheatRow('g &nbsp;+&nbsp; m', 'Media'),
            cheatRow('g &nbsp;+&nbsp; u', 'Users'),
            cheatRow('g &nbsp;+&nbsp; n', 'Inbox'),
            cheatRow('g &nbsp;+&nbsp; f', 'Form Builder'),
            cheatRow('g &nbsp;+&nbsp; y', 'Analytics'),
            cheatRow('g &nbsp;+&nbsp; p', 'Snippets'),
            cheatRow('g &nbsp;+&nbsp; c', 'Schema'),
            cheatRow('g &nbsp;+&nbsp; b', 'Build'),
            cheatRow('g &nbsp;+&nbsp; i', 'Import'),
            cheatRow('g &nbsp;+&nbsp; s', 'Settings'),
            cheatRow('g &nbsp;+&nbsp; a', 'Account'),
            cheatRow('g &nbsp;+&nbsp; h', 'Toggle HUD'),
            cheatRow('1 – 9', 'Jump to nth dock item'),
          '</div>',
          '<div class="xfce-cheat-col">',
            '<div class="xfce-cheat-section">Panels</div>',
            cheatRow('⌘⇧F', 'Focus / Zen mode'),
            cheatRow('⌘⇧L', 'Switch to Glass mode'),
            cheatRow('?', 'This cheatsheet'),
            '<div class="xfce-cheat-section" style="margin-top:14px">Palette commands</div>',
            cheatRow('&gt; ls', 'List collections'),
            cheatRow('&gt; go &lt;page&gt;', 'Navigate to page'),
            cheatRow('&gt; new &lt;col&gt;', 'New entry in collection'),
            cheatRow('&gt; search &lt;q&gt;', 'Search entries'),
            cheatRow('&gt; build', 'Trigger site build'),
            cheatRow('&gt; export &lt;col&gt;', 'Export collection'),
            cheatRow('&gt; random', 'Jump to random entry'),
            cheatRow('&gt; = &lt;expr&gt;', 'Evaluate math'),
            cheatRow('&gt; info', 'Show pod info'),
            cheatRow('&gt; help', 'Show command help'),
          '</div>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(_cheatEl);
    document.getElementById('xfce-cheat-close').addEventListener('click', closeCheatsheet);
    _cheatEl.addEventListener('click', function (e) {
      if (e.target === _cheatEl) closeCheatsheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _cheatEl && _cheatEl.classList.contains('open')) closeCheatsheet();
    });
  }

  function cheatRow(key, desc) {
    return '<div class="xfce-cheat-row"><kbd class="xfce-cheat-key">' + key + '</kbd><span class="xfce-cheat-desc">' + desc + '</span></div>';
  }

  function toggleCheatsheet() {
    if (!_cheatEl) buildCheatsheet();
    _cheatEl.classList.toggle('open');
  }

  function closeCheatsheet() {
    if (_cheatEl) _cheatEl.classList.remove('open');
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  var _gPending = false, _gTimer = null;
  var G_MAP = { d: '/dashboard.html', m: '/media.html', s: '/settings.html',
                u: '/users.html',     b: '/build.html',  i: '/import.html',
                c: '/schema.html',   a: '/account.html', n: '/inbox.html',
                p: '/snippets.html',  k: '/calendar.html', y: '/analytics.html',
                f: '/forms.html', w: '/publish.html' };

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
        if (e.key === 'h') { e.preventDefault(); toggleHUD(); }
        else if (G_MAP[e.key]) { e.preventDefault(); location.href = G_MAP[e.key]; }
        return;
      }


      // ⌘⇧F — zen / focus mode
      if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        toggleZen();
        return;
      }

      // ⌘⇧L — switch back to glass mode
      if (mod && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        localStorage.setItem('orb_style', 'glass');
        location.reload();
        return;
      }

      // ? — shortcut cheatsheet
      if (!mod && !e.altKey && e.key === '?' && !isEditing(e.target)) {
        e.preventDefault();
        toggleCheatsheet();
        return;
      }

      // 1–9 — jump to nth dock item (links navigate, drawers open popup)
      if (!mod && !e.shiftKey && !e.altKey && !isEditing(e.target)) {
        var n = parseInt(e.key);
        if (n >= 1 && n <= 9 && dockInner) {
          var items = Array.from(dockInner.querySelectorAll('.xfce-dock-item')).filter(function (it) {
            return !it.classList.contains('xfce-dock-create')
              && !it.dataset.wspane
              && it.dataset.label !== 'Tools'
              && it.dataset.label !== 'HUD'
              && it.dataset.label !== 'Scheme';
          });
          var target = items[n - 1];
          if (target) {
            e.preventDefault();
            if (target.tagName === 'A' && target.href) {
              location.href = target.href;
            } else if (target._groupPopup) {
              document.querySelectorAll('.xfce-drawer-popup.open').forEach(function (p) { p.classList.remove('open'); });
              hideColPreview();
              if (target._positionPopup) target._positionPopup();
              target._groupPopup.classList.add('open');
            } else {
              target.click();
            }
          }
        }
      }
    });
  }

  // ── Build status in status bar ────────────────────────────────────────
  var _buildPolling = false;

  function loadBuildStatus() {
    fetch('/api/build/status', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var el2 = document.getElementById('xfce-sb-build');
        var sep = document.getElementById('xfce-sb-build-sep');
        if (!el2) return;

        var running = d.running === true;
        el2.classList.toggle('xfce-sb-build--running', running);

        if (running) {
          el2.textContent = '◉ building…';
          el2.title = 'Build in progress';
          if (sep) sep.style.display = '';
          if (!_buildPolling) {
            _buildPolling = true;
            setTimeout(function poll() {
              loadBuildStatus();
              if (_buildPolling) setTimeout(poll, 4000);
            }, 4000);
          }
          return;
        }

        _buildPolling = false;
        if (!d.lastTriggered) return;
        var dt    = new Date(d.lastTriggered.replace(' ', 'T'));
        var diffM = Math.floor((Date.now() - dt) / 60000);
        var label = diffM < 1 ? 'built now'
          : diffM < 60   ? 'built ' + diffM + 'm ago'
          : diffM < 1440 ? 'built ' + Math.floor(diffM / 60) + 'h ago'
          : 'built ' + dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
        el2.textContent = '◉ ' + label;
        el2.title = 'Last build: ' + d.lastTriggered;
        if (sep) sep.style.display = '';
      });
  }

  function startBuildPoll() {
    _buildPolling = true;
    var el2 = document.getElementById('xfce-sb-build');
    var sep = document.getElementById('xfce-sb-build-sep');
    if (el2) { el2.textContent = '◉ building…'; el2.classList.add('xfce-sb-build--running'); }
    if (sep) sep.style.display = '';
    setTimeout(function poll() {
      loadBuildStatus();
      if (_buildPolling) setTimeout(poll, 4000);
    }, 3000);
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
    if (localStorage.getItem('orb_zen') === '1') {
      document.documentElement.dataset.zen = '1';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
