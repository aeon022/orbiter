/**
 * sidebar.js — dynamically populates collection links + pod footer in every page.
 * Supports parent/child hierarchy (matching SidebarCollections.astro in the original).
 */
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
          a.innerHTML =
            '<span class="nav-icon">' + (isSingleton ? '◈' : '▤') + '</span>' +
            '<span class="nav-label">' + col.label + '</span>' +
            (isSingleton ? '' : '<span class="nav-badge">' + col.total + '</span>');
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
              ka.innerHTML =
                '<span class="nav-icon">◦</span>' +
                '<span class="nav-label">' + kid.label + '</span>' +
                '<span class="nav-badge">' + kid.total + '</span>';
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
      })
      .catch(function () {});
  });
})();
