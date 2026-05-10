/**
 * sidebar.js — dynamically populates collection links + pod footer in every page.
 * Runs after DOMContentLoaded, fetches /api/info, inserts nav items before "Assets".
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var params    = new URLSearchParams(location.search);
    var activeCol = params.get('collection');
    var page      = location.pathname.split('/').pop().replace('.html', '');

    fetch('/api/info', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info) return;

        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Insert collection items before "Assets" section
        var sections = sidebar.querySelectorAll('.nav-section');
        var assetsSection = null;
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].textContent.trim() === 'Assets') {
            assetsSection = sections[i];
            break;
          }
        }
        if (!assetsSection) return;

        var frag = document.createDocumentFragment();
        (info.collections || []).forEach(function (col) {
          var isActive = page === 'entries' && activeCol === col.id;
          var a = document.createElement('a');
          a.className = 'nav-item' + (isActive ? ' active' : '');
          a.href = '/entries.html?collection=' + encodeURIComponent(col.id);
          a.innerHTML =
            '<span class="nav-icon">▤</span>' +
            '<span class="nav-label">' + col.label + '</span>' +
            '<span class="nav-badge">' + col.total + '</span>';
          frag.appendChild(a);
        });
        assetsSection.parentNode.insertBefore(frag, assetsSection);

        // Update sidebar footer with real pod filename
        var podNameEl = sidebar.querySelector('#pod-name, #sidebar-info, .pod-name');
        if (podNameEl && info.podPath) {
          var filename = info.podPath.split('/').pop();
          podNameEl.textContent = filename;
        }

        // Populate pod-info line if present
        var podInfoEl = sidebar.querySelector('#pod-info');
        if (podInfoEl && info.collections) {
          var total = info.collections.reduce(function (s, c) { return s + c.total; }, 0);
          podInfoEl.textContent = info.collections.length + ' collections · ' + total + ' entries';
        }
      })
      .catch(function () {});
  });
})();
