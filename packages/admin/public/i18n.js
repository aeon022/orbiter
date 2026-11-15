// Admin translation layer (German). Loaded by theme.js when localStorage.orb_lang === 'de'.
// Walks the page, swaps every text node / placeholder / title / aria-label whose English text is in ORB_DE, and
// keeps watching for content the pages add later. User content (editor, inputs, code) is never touched.
(function () {
  var D = window.ORB_DE || {}, RX = window.ORB_DE_RX || [];
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|CODE|PRE|SELECT)$/;
  var cache = {};
  function tr(s) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2].replace(/\s+/g, ' ');
    if (!core) return s;
    var out = cache[core];
    if (out === undefined) {
      out = D[core] || D[m[2]] || null;
      if (!out) for (var i = 0; i < RX.length; i++) if (RX[i][0].test(core)) { out = core.replace(RX[i][0], RX[i][1]); break; }
      cache[core] = out || '';
    }
    return out ? m[1] + out + m[3] : s;
  }
  function skip(el) { return !el || SKIP.test(el.tagName) || el.isContentEditable || (el.closest && el.closest('.ProseMirror,[contenteditable="true"],[data-no-i18n]')); }
  function node(n) {
    if (n.nodeType === 3) { var p = n.parentElement; if (p && !skip(p)) { var v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } return; }
    if (n.nodeType !== 1 || skip(n)) return;
    ['placeholder', 'title', 'aria-label', 'data-tip'].forEach(function (a) { var v = n.getAttribute && n.getAttribute(a); if (v) { var t = tr(v); if (t !== v) n.setAttribute(a, t); } });
    if (n.tagName === 'INPUT' && /^(button|submit)$/.test(n.type)) { var t2 = tr(n.value); if (t2 !== n.value) n.value = t2; }
    for (var c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function title() { var t = tr(document.title); if (t !== document.title) document.title = t; }
  function run() {
    document.documentElement.lang = 'de';
    node(document.body); title();
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') node(m.target);
        else m.addedNodes.forEach(node);
      });
      title();
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
  }
  // browser dialogs
  ['alert', 'confirm', 'prompt'].forEach(function (k) { var o = window[k]; window[k] = function (m) { var a = [].slice.call(arguments); a[0] = tr(String(m)); return o.apply(window, a); }; });
  window.orbT = tr;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
