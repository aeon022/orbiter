/**
 * Orbiter theme engine — runs inline in <head> before first paint.
 * Manages: palette (space/zen/catppuccin) × scheme (dark/light/auto).
 */
(function () {
  var theme  = localStorage.getItem('orb_theme')  || 'space';
  var scheme = localStorage.getItem('orb_scheme') || 'auto';
  var style  = localStorage.getItem('orb_style')  || 'classic';

  var root = document.documentElement;
  if (theme !== 'space') root.setAttribute('data-theme', theme);
  if (scheme === 'dark')  root.setAttribute('data-scheme', 'dark');
  if (scheme === 'light') root.setAttribute('data-scheme', 'light');
  if (style === 'glass')  root.setAttribute('data-style', 'glass');

  // Wire up toggle button once DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('scheme-toggle');
    if (!btn) return;

    function updateBtn() {
      var s = localStorage.getItem('orb_scheme') || 'auto';
      if (s === 'auto') {
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        btn.textContent = prefersDark ? '◐' : '◑';
        btn.title = 'Auto (' + (prefersDark ? 'dark' : 'light') + ') — click to override';
      } else if (s === 'dark') {
        btn.textContent = '●';
        btn.title = 'Dark — click for light';
      } else {
        btn.textContent = '○';
        btn.title = 'Light — click for auto';
      }
    }

    btn.addEventListener('click', function () {
      var s = localStorage.getItem('orb_scheme') || 'auto';
      var next = s === 'auto' ? 'dark' : s === 'dark' ? 'light' : 'auto';
      localStorage.setItem('orb_scheme', next);
      var root = document.documentElement;
      root.removeAttribute('data-scheme');
      if (next === 'dark')  root.setAttribute('data-scheme', 'dark');
      if (next === 'light') root.setAttribute('data-scheme', 'light');
      updateBtn();
    });

    // React to system changes when in auto mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateBtn);
    updateBtn();
  });
})();
