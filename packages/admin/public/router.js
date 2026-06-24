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
  transCSS.textContent = '.main { transition: opacity 0.12s ease; } .main.fading { opacity: 0; }';
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
      toolsBtn.classList.toggle('active', ['schema', 'build', 'import'].indexOf(pg) !== -1);
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

  function navigate(href, replace) {
    // Kick off fade-out and fetch in parallel
    main.classList.add('fading');

    var fetchP = fetch(href, { credentials: 'include' }).then(function (r) { return r.text(); });
    var timerP = new Promise(function (res) { setTimeout(res, 120); });

    Promise.all([fetchP, timerP]).then(function (results) {
      var html = results[0];
      var doc = new DOMParser().parseFromString(html, 'text/html');

      // Swap page-specific <style>
      swapPageStyle(doc);

      // Swap <title>
      var newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      // Swap .main content
      var newMain = doc.querySelector('.main');
      main.innerHTML = newMain ? newMain.innerHTML : '';

      // Update URL
      if (replace) {
        history.replaceState(null, '', href);
      } else {
        history.pushState(null, '', href);
      }

      // Update sidebar active state
      updateActiveNav(href);

      // Re-execute module scripts (now live inside .main on every page)
      execModuleScripts(main);

      // Fade back in on next frame
      requestAnimationFrame(function () {
        main.classList.remove('fading');
      });

      // Scroll to top
      main.scrollTop = 0;
    }).catch(function () {
      location.href = href; // fallback: full navigation
    });
  }

  // --- intercept clicks ---

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var raw = a.getAttribute('href');
    if (!raw) return;
    var url;
    try { url = new URL(raw, location.origin); } catch (e) { return; }
    if (url.origin !== location.origin) return;
    if (!url.pathname.endsWith('.html')) return;
    if (url.pathname === '/login.html') return;
    if (url.pathname === '/editor.html') return; // full-screen layout, no .main to swap
    if (url.pathname === '/calendar.html') return; // top-level await, needs full reload
    if (url.pathname === '/analytics.html') return;
    if (url.pathname === '/forms.html') return;
    if (url.pathname === '/graph.html') return; // canvas, needs full reload
    if (url.pathname === '/users.html') return; // module scripts, needs full reload
    e.preventDefault();
    if (url.href === location.href) return;
    navigate(url.href, false);
  }, true); // capture phase so editor-internal links don't block

  // --- browser back/forward ---

  window.addEventListener('popstate', function () {
    navigate(location.href, true);
  });

  // Set initial active state (sidebar.js sets it during build, but
  // router also manages it on subsequent navigations)
  updateActiveNav(location.href);
})();
