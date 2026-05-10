// Apply saved theme immediately to avoid flash of unstyled content.
// Loaded as a plain <script> (not module) in <head> on every page.
(function () {
  const t = localStorage.getItem('orb_theme');
  if (t && t !== 'space') document.documentElement.setAttribute('data-theme', t);
})();
