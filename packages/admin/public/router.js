/**
 * router.js — client-side SPA router.
 * Intercepts <a> clicks to .html pages, swaps only .main content,
 * keeps sidebar/topbar persistent, adds fade transitions.
 */
(function () {
  if (window.__orbRouter) return;
  window.__orbRouter = true;

  var main = document.querySelector('.main');
  if (!main) return; // login page or no-layout page — skip

  // Tag the initial page-specific <style> so we can swap it later
  var headStyle = document.querySelector('head > style:not([id])');
  if (headStyle) headStyle.id = '__page-style';

  // Inject transition rule once
  var transCSS = document.createElement('style');
  transCSS.textContent = '.main { transition: opacity .14s ease, transform .2s ease, filter .2s ease; } .main.fading { opacity: 0; transform: translateY(5px); filter: blur(3px); } @media (prefers-reduced-motion: reduce) { .main, .main.fading { transition: none; transform: none; filter: none; } } #orb-progress { position: fixed; top: 0; left: 0; height: 2px; width: 0; z-index: 100002; background: var(--accent); box-shadow: 0 0 8px var(--accent); opacity: 0; transition: width .4s ease, opacity .2s; pointer-events: none; } #orb-progress.on { opacity: 1; width: 70%; } #orb-progress.done { opacity: 0; width: 100%; transition: width .15s, opacity .3s .1s; }';
  var bar = document.createElement('div'); bar.id = 'orb-progress'; document.body.appendChild(bar);
  document.head.appendChild(transCSS);

  // --- helpers ---

  function updateActiveNav(href) {
    var target;
    try { target = new URL(href, location.origin); } catch (e) { return; }
    var pg = target.pathname.split('/').pop().replace('.html', '');

    // Update classic sidebar + xfce dock/HUD link items
    document.querySelectorAll('.nav-item, .nav-group-body a, a.xfce-dock-item, a.xfce-hud-nav-item, a.xfce-tools-item').forEach(function (a) {
      var raw = a.getAttribute('href');
      if (!raw) return;
      var itemUrl;
      try { itemUrl = new URL(raw, location.origin); } catch (e) { return; }
      var match = itemUrl.pathname === target.pathname;
      if (match && itemUrl.search) {
        itemUrl.searchParams.forEach(function (v, k) {
          if (target.searchParams.get(k) !== v) match = false;
        });
      }
      a.classList.toggle('active', match);
    });

    // xfce tools button is a <button> (not an <a>), update separately
    var toolsBtn = document.getElementById('xfce-tools-btn');
    if (toolsBtn) {
      toolsBtn.classList.toggle('active', ['schema', 'build', 'publish', 'import'].indexOf(pg) !== -1);
    }

    // xfce drawer buttons — active if any child <a> in their popup matches
    var col = target.searchParams.get('col') || target.searchParams.get('collection') || '';
    document.querySelectorAll('.xfce-drawer-popup').forEach(function (popup) {
      var links = popup.querySelectorAll('a.xfce-tools-item');
      var hasActive = false;
      links.forEach(function (a) {
        try {
          var u = new URL(a.getAttribute('href'), location.origin);
          var linkCol = u.searchParams.get('col') || u.searchParams.get('collection') || '';
          if (linkCol && linkCol === col) { hasActive = true; a.classList.add('active'); }
          else a.classList.remove('active');
        } catch (e) {}
      });
      if (popup._drawerBtn) popup._drawerBtn.classList.toggle('active', hasActive);
    });

    // xfce status bar breadcrumb
    var sbTitle = document.getElementById('xfce-sb-title');
    if (sbTitle && col && (pg === 'entries' || pg === 'editor')) {
      var colLabel = col;
      document.querySelectorAll('.xfce-drawer-popup a.xfce-tools-item, #xfce-dock-cols a.xfce-dock-item').forEach(function (a) {
        try {
          var u = new URL(a.getAttribute('href'), location.origin);
          if ((u.searchParams.get('col') || u.searchParams.get('collection')) === col) {
            colLabel = a.textContent.replace(/^\w{2}/, '').replace(/\d+.*$/, '').trim() || col;
          }
        } catch (e) {}
      });
      var crumbPage = pg === 'editor' ? 'Editor' : 'Entries';
      sbTitle.innerHTML = '<a href="/entries.html?col=' + encodeURIComponent(col) + '" class="xfce-sb-crumb-link">' + colLabel + '</a>'
        + '<span class="xfce-sb-crumb-sep"> › </span>'
        + '<span class="xfce-sb-crumb-page">' + crumbPage + '</span>';
    } else if (sbTitle && pg !== 'entries' && pg !== 'editor') {
      var pageTitle = document.title.replace(/\s*—\s*Orbiter.*$/, '').trim();
      if (pageTitle) sbTitle.textContent = pageTitle;
    }
  }

  function swapPageStyle(doc) {
    var old = document.getElementById('__page-style');
    if (old) old.remove();
    var fresh = doc.querySelector('head > style');
    if (fresh) {
      fresh.id = '__page-style';
      document.head.appendChild(fresh);
    }
  }

  function execModuleScripts(container) {
    container.querySelectorAll('script[type="module"]').forEach(function (old) {
      var code = old.textContent;
      old.remove();
      // Blob URL import() is the only reliable way to re-execute module scripts
      // (replaceChild/innerHTML does not re-trigger browser module execution)
      var blob = new Blob([code], { type: 'text/javascript' });
      var blobUrl = URL.createObjectURL(blob);
      import(blobUrl).catch(function (e) {
        console.error('[router] page script error:', e);
      }).finally(function () {
        URL.revokeObjectURL(blobUrl);
      });
    });
  }

  // Page shells are static; the data is loaded by each page's own script, so the HTML can be cached and warmed up.
  var pageCache = {}, PAGE_TTL = 5 * 60 * 1000;
  function getPage(href) {
    var c = pageCache[href];
    if (c && Date.now() - c.t < PAGE_TTL) return c.p;
    var p = fetch(href, { credentials: 'include' }).then(function (r) {
      if (!r.ok || /\/login\.html/.test(r.url)) throw new Error('no page');   // session over: full navigation shows the login
      return r.text();
    }).catch(function (e) { delete pageCache[href]; throw e; });
    pageCache[href] = { t: Date.now(), p: p };
    return p;
  }

  var navSeq = 0;
  function navigate(href, replace) {
    var seq = ++navSeq;
    // The old page stays visible (dock, sidebar and content) until the new one is ready; a thin bar shows progress.
    bar.classList.remove('done'); void bar.offsetWidth; bar.classList.add('on');

    getPage(href).then(function (html) {
      if (seq !== navSeq) return;   // a newer click won
      var doc = new DOMParser().parseFromString(html, 'text/html');
      main.classList.add('fading');
      setTimeout(function () {
        if (seq !== navSeq) return;
        swapPageStyle(doc);
        var newTitle = doc.querySelector('title');
        if (newTitle) document.title = newTitle.textContent;
        var newMain = doc.querySelector('.main');
        main.innerHTML = newMain ? newMain.innerHTML : '';
        if (replace) history.replaceState(null, '', href); else history.pushState(null, '', href);
        updateActiveNav(href);
        execModuleScripts(main);
        window.dispatchEvent(new Event('orb:navigated'));
        main.scrollTop = 0;
        requestAnimationFrame(function () { main.classList.remove('fading'); });
        bar.classList.remove('on'); bar.classList.add('done');
      }, 90);
    }).catch(function () {
      location.href = href; // fallback: full navigation
    });
  }

  // --- the editor: opens in place (Station mode only); leaving it is always a full navigation, which tears down its many listeners and timers cleanly ---

  var EDITOR_PAGE = '/editor.html';
  var editorMode = false;   // true once the editor was opened in place: from then on every link is a normal navigation
  function station() { return document.documentElement.getAttribute('data-style') === 'xfce'; }
  function ensureMarked() {
    if (window.marked) return Promise.resolve();
    return new Promise(function (res) {
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/marked@12/marked.min.js';
      s.onload = res; s.onerror = res; document.head.appendChild(s);
    });
  }
  function enterEditor(href) {
    var seq = ++navSeq;
    bar.classList.remove('done'); void bar.offsetWidth; bar.classList.add('on');
    getPage(href).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var app = doc.querySelector('.app'), shell = doc.querySelector('.editor-shell'), mod = doc.querySelector('body script[type="module"]');
      if (!app || !shell || !mod) throw new Error('not an editor page');
      return ensureMarked().then(function () {
        if (seq !== navSeq) return;
        main.classList.add('fading');
        setTimeout(function () {
          if (seq !== navSeq) return;
          swapPageStyle(doc);
          var t = doc.querySelector('title'); if (t) document.title = t.textContent;
          // body-level overlays that come before the app (shortcut sheet, focus hint)
          var liveApp = main.closest('.app') || document.querySelector('.app');
          // every other element of the editor page that sits next to the app (overlays, pickers, hidden file inputs)
          [].slice.call(doc.body.children).forEach(function (n) {
            if (n !== app && n.tagName !== 'SCRIPT') liveApp.parentNode.insertBefore(document.importNode(n, true), liveApp);
          });
          liveApp.innerHTML = app.innerHTML;
          editorMode = true;
          history.pushState(null, '', href);
          updateActiveNav(href);
          var blob = new Blob([mod.textContent], { type: 'text/javascript' }), u = URL.createObjectURL(blob);
          import(u).catch(function (e) { console.error('[router] editor error:', e); }).finally(function () { URL.revokeObjectURL(u); });
          window.dispatchEvent(new Event('orb:navigated'));
          bar.classList.remove('on'); bar.classList.add('done');
        }, 90);
      });
    }).catch(function () { location.href = href; });   // anything unexpected: a normal navigation
  }

  // --- intercept clicks ---

  var FULL_RELOAD = ['/login.html', '/calendar.html', '/analytics.html', '/forms.html', '/graph.html', '/users.html', '/account.html', '/pods.html'];
  function routable(e) {
    if (editorMode) return null;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return null;
    var raw = a.getAttribute('href'); if (!raw) return null;
    var url; try { url = new URL(raw, location.origin); } catch (err) { return null; }
    if (url.origin !== location.origin || !url.pathname.endsWith('.html') || FULL_RELOAD.indexOf(url.pathname) !== -1) return null;
    if (url.pathname === EDITOR_PAGE && !station()) return null;
    return url;
  }
  function go(url) { if (url.pathname === EDITOR_PAGE) enterEditor(url.href); else navigate(url.href, false); }
  // for page scripts (the entries list): open a page through the router when possible
  window.__orbGo = function (href) {
    var url; try { url = new URL(href, location.origin); } catch (err) { location.href = href; return; }
    if (editorMode || url.origin !== location.origin || !url.pathname.endsWith('.html') || FULL_RELOAD.indexOf(url.pathname) !== -1 || (url.pathname === EDITOR_PAGE && !station())) { location.href = href; return; }
    go(url);
  };
  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var url = routable(e); if (!url) return;
    e.preventDefault();
    if (url.href === location.href) return;
    go(url);
  }, true); // capture phase so editor-internal links don't block

  // Warm the page while the finger or cursor is still on its way
  ['mouseover', 'touchstart', 'focusin'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { var url = routable(e); if (url && url.href !== location.href) getPage(url.href).catch(function () {}); }, { passive: true, capture: true });
  });

  // --- browser back/forward ---

  window.addEventListener('popstate', function () {
    if (editorMode || new URL(location.href).pathname === EDITOR_PAGE) { location.reload(); return; }   // from or to the editor: a clean load
    navigate(location.href, true);
  });

  // Set initial active state (sidebar.js sets it during build, but
  // router also manages it on subsequent navigations)
  updateActiveNav(location.href);
})();
