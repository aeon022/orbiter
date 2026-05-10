// Flash-free theme apply — runs inline before first paint
(function () {
  if (localStorage.getItem('orb-dark') === '1') document.documentElement.classList.add('dark');
  var t = localStorage.getItem('orb-theme') || '';
  if (t) document.documentElement.classList.add('theme-' + t);
})();
