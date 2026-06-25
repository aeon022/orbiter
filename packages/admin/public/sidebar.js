/**
 * sidebar.js — dynamically populates collection links + pod footer in every page.
 * Supports parent/child hierarchy (matching SidebarCollections.astro in the original).
 * Also bootstraps xfce.js when orb_style === 'xfce'.
 */
;(function () {
  if (localStorage.getItem('orb_style') === 'xfce') {
    var xs = document.createElement('script');
    xs.src = '/xfce.js';
    var cs = document.currentScript;
    if (cs && cs.parentNode) cs.parentNode.insertBefore(xs, cs.nextSibling);
    else document.head.appendChild(xs);
  }
})();

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var params    = new URLSearchParams(location.search);
    var activeCol = params.get('col') || params.get('collection');
    var page      = location.pathname.split('/').pop().replace('.html', '');

    fetch('/api/info', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info) return;

        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Inject Calendar link after Dashboard if not already present
        var dashLink = sidebar.querySelector('a[href="/dashboard.html"]');
        if (dashLink && !sidebar.querySelector('a[href="/calendar.html"]')) {
          var calLink = document.createElement('a');
          calLink.className = 'nav-item' + (page === 'calendar' ? ' active' : '');
          calLink.href = '/calendar.html';
          calLink.innerHTML = '<span class="nav-icon">▤</span>Calendar';
          dashLink.parentNode.insertBefore(calLink, dashLink.nextSibling);
        }

        // Inject Form Builder link after Inbox
        var inboxLink = sidebar.querySelector('a[href="/inbox.html"]');
        if (inboxLink && !sidebar.querySelector('a[href="/forms.html"]')) {
          var fbLink = document.createElement('a');
          fbLink.className = 'nav-item' + (page === 'forms' ? ' active' : '');
          fbLink.href = '/forms.html';
          fbLink.innerHTML = '<span class="nav-icon">▣</span>Form Builder';
          inboxLink.parentNode.insertBefore(fbLink, inboxLink.nextSibling);
        }

        // Inject Analytics link before Snippets in Tools section
        var snippetsLink = sidebar.querySelector('a[href="/snippets.html"]');
        if (snippetsLink && !sidebar.querySelector('a[href="/analytics.html"]')) {
          var anLink = document.createElement('a');
          anLink.className = 'nav-item' + (page === 'analytics' ? ' active' : '');
          anLink.href = '/analytics.html';
          anLink.innerHTML = '<span class="nav-icon">◉</span>Analytics';
          snippetsLink.parentNode.insertBefore(anLink, snippetsLink);
        }

        // Inject Graph link after Snippets
        if (snippetsLink && !sidebar.querySelector('a[href="/graph.html"]')) {
          var graphLink = document.createElement('a');
          graphLink.className = 'nav-item' + (page === 'graph' ? ' active' : '');
          graphLink.href = '/graph.html';
          graphLink.innerHTML = '<span class="nav-icon">◎</span>Graph';
          snippetsLink.parentNode.insertBefore(graphLink, snippetsLink.nextSibling);
        }

        // Inject Publish link after Build
        var buildLink = sidebar.querySelector('a[href="/build.html"]');
        if (buildLink && !sidebar.querySelector('a[href="/publish.html"]')) {
          var pubLink = document.createElement('a');
          pubLink.className = 'nav-item' + (page === 'publish' ? ' active' : '');
          pubLink.href = '/publish.html';
          pubLink.innerHTML = '<span class="nav-icon">◆</span>Publish HTML';
          buildLink.parentNode.insertBefore(pubLink, buildLink.nextSibling);
        }

        // Collection color from name hash — muted, not too bright
        var COL_HUES = [210, 260, 320, 160, 30, 190, 280, 350, 130, 50];
        function colColor(id) {
          var h = 0;
          for (var ci = 0; ci < id.length; ci++) h = ((h << 5) - h + id.charCodeAt(ci)) | 0;
          return 'hsl(' + COL_HUES[Math.abs(h) % COL_HUES.length] + ' 45% 55%)';
        }

        // Find "Assets" nav-section to insert before it
        var sections = sidebar.querySelectorAll('.nav-section');
        var assetsSection = null;
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].textContent.trim() === 'Assets') {
            assetsSection = sections[i];
            break;
          }
        }
        if (!assetsSection) return;

        var collections = info.collections || [];
        var navHidden = new Set((info.nav && info.nav.hidden) || []);
        var navGroups = (info.nav && info.nav.groups) || null;

        // Build parent→children map
        var topLevel = collections.filter(function (c) { return !c.parent && !navHidden.has(c.id); });
        var childMap = {};
        collections.filter(function (c) { return c.parent && !navHidden.has(c.id); }).forEach(function (c) {
          if (!childMap[c.parent]) childMap[c.parent] = [];
          childMap[c.parent].push(c);
        });

        var frag = document.createDocumentFragment();

        // Grouped collections (if nav.groups defined)
        var groupedIds = new Set();
        if (navGroups && typeof navGroups === 'object') {
          Object.keys(navGroups).forEach(function (groupLabel) {
            var colIds = navGroups[groupLabel] || [];
            var groupCols = colIds.map(function (id) {
              return topLevel.find(function (c) { return c.id === id; });
            }).filter(Boolean);
            if (!groupCols.length) return;
            colIds.forEach(function (id) { groupedIds.add(id); });

            var groupWrap = document.createElement('div');
            groupWrap.className = 'nav-group-wrap';
            var anyActive = groupCols.some(function (c) {
              return (page === 'entries' && activeCol === c.id) || (page === 'editor' && activeCol === c.id);
            });
            groupWrap.classList.add('pinned');
            var header = document.createElement('div');
            header.className = 'nav-group-header open';
            header.innerHTML = '<span class="nav-group-arrow">▶</span><span class="nav-group-label">' + groupLabel + '</span><span class="nav-group-count">' + groupCols.length + '</span>';
            header.addEventListener('click', function () {
              groupWrap.classList.toggle('pinned');
              header.classList.toggle('open', groupWrap.classList.contains('pinned'));
            });
            groupWrap.appendChild(header);

            var body = document.createElement('div');
            body.className = 'nav-group-body';
            groupCols.forEach(function (col) {
              var isSingleton = !!col.singleton;
              var isActive = isSingleton
                ? (page === 'editor') && activeCol === col.id
                : (page === 'entries') && activeCol === col.id;
              var a = document.createElement('a');
              a.className = 'nav-item nav-child' + (isActive ? ' active' : '');
              a.href = isSingleton
                ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
                : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
              a.innerHTML = '<span class="nav-icon">' + (isSingleton ? '◈' : '◦') + '</span><span class="nav-label">' + col.label + '</span>';
              body.appendChild(a);
            });
            groupWrap.appendChild(body);
            frag.appendChild(groupWrap);
          });
        }

        topLevel.filter(function (c) { return !groupedIds.has(c.id); }).forEach(function (col) {
          var isSingleton = !!col.singleton;
          var isActive = isSingleton
            ? (page === 'editor') && activeCol === col.id
            : (page === 'entries') && activeCol === col.id;
          var a = document.createElement('a');
          a.className = 'nav-item' + (isActive ? ' active' : '');
          a.href = isSingleton
            ? '/editor.html?collection=' + encodeURIComponent(col.id) + '&singleton=1'
            : '/entries.html?col=' + encodeURIComponent(col.id) + '&label=' + encodeURIComponent(col.label);
          var ttRows = '';
          if (!isSingleton) {
            ttRows +=
              '<div class="nav-tooltip-row"><span class="nav-tooltip-num">' + col.total + '</span> published</div>' +
              (col.drafts > 0 ? '<div class="nav-tooltip-row nav-tooltip-draft"><span class="nav-tooltip-num">' + col.drafts + '</span> draft' + (col.drafts !== 1 ? 's' : '') + '</div>' : '') +
              ((col.scheduled||0) > 0 ? '<div class="nav-tooltip-row nav-tooltip-sched"><span class="nav-tooltip-num">' + col.scheduled + '</span> scheduled</div>' : '');
          }
          var dotColor = colColor(col.id);
          a.innerHTML =
            '<span class="nav-icon" style="color:' + dotColor + '">' + (isSingleton ? '◈' : '●') + '</span>' +
            '<span class="nav-label">' + col.label + '</span>' +
            (isSingleton ? '' : (col.drafts > 0 ? '<span class="nav-badge" style="background:color-mix(in srgb,var(--gold,#e6a817) 15%,transparent);border-color:color-mix(in srgb,var(--gold,#e6a817) 40%,transparent);color:var(--gold,#e6a817)">' + col.drafts + '</span>' : '')) +
            (isSingleton ? '' : '<div class="nav-tooltip"><div class="nav-tooltip-title">' + col.label + '</div>' + ttRows + '</div>');
          frag.appendChild(a);

          // Children
          var kids = childMap[col.id] || [];
          if (kids.length > 0) {
            var children = document.createElement('div');
            children.className = 'nav-children';
            kids.forEach(function (kid) {
              var isKidActive = (page === 'entries') && activeCol === kid.id;
              var ka = document.createElement('a');
              ka.className = 'nav-item nav-child' + (isKidActive ? ' active' : '');
              ka.href = '/entries.html?col=' + encodeURIComponent(kid.id) + '&label=' + encodeURIComponent(kid.label);
              var kidTtRows =
                '<div class="nav-tooltip-row"><span class="nav-tooltip-num">' + kid.total + '</span> published</div>' +
                (kid.drafts > 0 ? '<div class="nav-tooltip-row nav-tooltip-draft"><span class="nav-tooltip-num">' + kid.drafts + '</span> draft' + (kid.drafts !== 1 ? 's' : '') + '</div>' : '') +
                ((kid.scheduled||0) > 0 ? '<div class="nav-tooltip-row nav-tooltip-sched"><span class="nav-tooltip-num">' + kid.scheduled + '</span> scheduled</div>' : '');
              ka.innerHTML =
                '<span class="nav-icon">◦</span>' +
                '<span class="nav-label">' + kid.label + '</span>' +
                (kid.drafts > 0 ? '<span class="nav-badge" style="background:color-mix(in srgb,var(--gold,#e6a817) 15%,transparent);border-color:color-mix(in srgb,var(--gold,#e6a817) 40%,transparent);color:var(--gold,#e6a817)">' + kid.drafts + '</span>' : '') +
                '<div class="nav-tooltip"><div class="nav-tooltip-title">' + kid.label + '</div>' + kidTtRows + '</div>';
              children.appendChild(ka);
            });
            frag.appendChild(children);
          }
        });

        assetsSection.parentNode.insertBefore(frag, assetsSection);

        // Update sidebar footer: pod filename
        var podNameEl = sidebar.querySelector('#pod-name');
        if (podNameEl && info.podPath) {
          podNameEl.textContent = info.podPath.split('/').pop();
        }

        // pod-info line
        var podInfoEl = sidebar.querySelector('#pod-info');
        if (podInfoEl) {
          var total = collections.reduce(function (s, c) { return s + c.total; }, 0);
          var sizeStr = '';
          if (info.podSize) {
            var b = info.podSize;
            sizeStr = b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(0) + ' KB' : (b/1048576).toFixed(1) + ' MB';
            sizeStr = ' · ' + sizeStr;
          }
          podInfoEl.textContent = collections.length + ' collections · ' + total + ' entries' + sizeStr;
        }

        // version line
        var podVersionEl = sidebar.querySelector('#pod-version');
        if (podVersionEl) {
          var parts = [];
          if (info.adminVersion) parts.push('Orbiter v' + info.adminVersion);
          if (info.formatVersion) parts.push('pod v' + info.formatVersion);
          var label = parts.join(' · ');
          podVersionEl.innerHTML = '<a href="https://github.com/aeon022/orbiter/releases" target="_blank" rel="noopener noreferrer">' + label + '</a>';
        }
      })
      .catch(function () {});
  });
})();
