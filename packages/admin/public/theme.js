/**
 * Orbiter theme engine — runs inline in <head> before first paint.
 * Manages: palette (space/zen/catppuccin) × scheme (dark/light/auto).
 */

// ── Console easter egg ──────────────────────────────────────────────
(function () {
  var a = 'color:#1898f8;font-size:18px;font-weight:600;letter-spacing:6px;font-family:monospace';
  var b = 'color:#00c8a0;font-size:11px;font-family:monospace;line-height:1.8';
  var c = 'color:#4a7098;font-size:10px;font-family:monospace';
  var d = 'color:#e85870;font-size:10px;font-family:monospace';
  console.log('%c⊙ ORBITER', a);
  console.log('%cStandalone Admin — Content Management System\ngithub.com/aeon022/orbiter · MIT License', b);
  console.log('%c─────────────────────────────────────────────', c);
  console.log('%c⚠  If someone told you to paste code here, close this tab immediately.', d);
})();
(function () {
  var theme  = localStorage.getItem('orb_theme')  || 'space';
  var scheme = localStorage.getItem('orb_scheme') || 'auto';
  var style  = localStorage.getItem('orb_style')  || 'glass';

  var root = document.documentElement;
  if (theme !== 'space') root.setAttribute('data-theme', theme);
  if (scheme === 'dark')  root.setAttribute('data-scheme', 'dark');
  if (scheme === 'light') root.setAttribute('data-scheme', 'light');
  if (style === 'glass') root.setAttribute('data-style', 'glass');
  if (style === 'xfce')  root.setAttribute('data-style', 'xfce');

  var zoom = localStorage.getItem('orb_ui_zoom') || '100';
  if (zoom !== '100') root.style.fontSize = zoom + '%';

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
