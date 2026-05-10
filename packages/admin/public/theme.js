// Apply saved theme immediately to avoid flash of unstyled content.
(function () {
  const t = localStorage.getItem('orb_theme');
  if (t && t !== 'space') document.documentElement.setAttribute('data-theme', t);
})();
