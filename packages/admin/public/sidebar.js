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

        // Inject Analytics link before Snippets in Tools section
        var snippetsLink = sidebar.querySelector('a[href="/snippets.html"]');
        if (snippetsLink && !sidebar.querySelector('a[href="/analytics.html"]')) {
          var anLink = document.createElement('a');
          anLink.className = 'nav-item' + (page === 'analytics' ? ' active' : '');
          anLink.href = '/analytics.html';
          anLink.innerHTML = '<span class="nav-icon">◉</span>Analytics';
          snippetsLink.parentNode.insertBefore(anLink, snippetsLink);
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

        // Build parent→children map
        var topLevel = collections.filter(function (c) { return !c.parent; });
        var childMap = {};
        collections.filter(function (c) { return c.parent; }).forEach(function (c) {
          if (!childMap[c.parent]) childMap[c.parent] = [];
          childMap[c.parent].push(c);
        });

        var frag = document.createDocumentFragment();

        topLevel.forEach(function (col) {
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
          a.innerHTML =
            '<span class="nav-icon">' + (isSingleton ? '◈' : '▤') + '</span>' +
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
          podInfoEl.textContent = collections.length + ' collections · ' + total + ' entries';
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
