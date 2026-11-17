/**
 * Orbiter theme engine — runs inline in <head> before first paint.
 * Manages: palette (space/zen/catppuccin/amber/paper) × scheme (dark/light/auto).
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
// Shared HTML escaper for attribute and text contexts (pages build markup with template strings)
window.orbEsc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"'`]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
  });
};
(function () {
  var theme  = localStorage.getItem('orb_theme')  || 'space';
  var scheme = localStorage.getItem('orb_scheme') || 'auto';
  var style  = localStorage.getItem('orb_style')  || 'xfce';

  var root = document.documentElement;
  if (theme !== 'space') root.setAttribute('data-theme', theme);
  if (scheme === 'dark')  root.setAttribute('data-scheme', 'dark');
  if (scheme === 'light') root.setAttribute('data-scheme', 'light');
  if (style === 'glass') root.setAttribute('data-style', 'glass');
  if (style === 'xfce')  root.setAttribute('data-style', 'xfce');

  var font = localStorage.getItem('orb_font');
  if (font === 'sans' || font === 'mono') root.setAttribute('data-font', font);
  // UI faces: IBM Plex Sans/Mono (default), JetBrains Mono (Terminal/Catppuccin); pages still preload Noto Serif JP for Zen
  var fl = document.createElement('link');
  fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap';
  document.head.appendChild(fl);

  // Custom colors: accent / background / text (+ derived surfaces) override the theme via inline custom properties
  window.orbApplyCustom = function () {
    var vars = ['--accent','--accent2','--accent-bg','--bg0','--bg1','--bg2','--bg3','--line','--line2','--muted','--mid','--text','--heading'];
    vars.forEach(function (v) { root.style.removeProperty(v); });
    var c; try { c = JSON.parse(localStorage.getItem('orb_custom') || 'null'); } catch (e) { c = null; }
    if (!c) return;
    var mix = function (a, b, p) { return 'color-mix(in srgb, ' + a + ' ' + p + '%, ' + b + ')'; };
    var set = function (k, v) { root.style.setProperty(k, v); };
    set('--accent', c.accent); set('--accent2', c.accent); set('--accent-bg', 'color-mix(in srgb, ' + c.accent + ' 11%, transparent)');
    set('--bg0', c.bg); set('--bg1', mix(c.bg, c.text, 95)); set('--bg2', mix(c.bg, c.text, 91)); set('--bg3', mix(c.bg, c.text, 84));
    set('--line', mix(c.bg, c.text, 78)); set('--line2', mix(c.bg, c.text, 87));
    set('--text', mix(c.text, c.bg, 88)); set('--mid', mix(c.text, c.bg, 72)); set('--muted', mix(c.text, c.bg, 58)); set('--heading', c.text);
  };
  window.orbApplyCustom();

  window.orbApplyZoom = function () {
    var z = localStorage.getItem('orb_ui_zoom') || '100';
    root.style.zoom = z === '100' ? '' : (parseInt(z, 10) / 100);
  };
  window.orbApplyZoom();

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

// Admin language: German strings are loaded only when chosen (Settings → General → Admin language)
try { if (localStorage.getItem('orb_lang') === 'de') { var a = document.createElement('script'); a.src = '/i18n-de.js' + (window.__orbV || ''); a.onload = function () { var b = document.createElement('script'); b.src = '/i18n.js' + (window.__orbV || ''); document.head.appendChild(b); }; document.head.appendChild(a); } } catch (e) {}

// ── Inline-handler replacement (CSP) ────────────────────────────────────────────
// Pages mark handlers as data-on-<event>="fn('arg', this, event)" instead of onclick="…". No eval: the call is parsed
// (function path + literal arguments: strings, numbers, true/false/null, this, event, this.<prop>, event.<prop>, a bare
// function name, or @ = the JSON array in data-args) and the function is looked up on window.
(function () {
  var EV = ['click', 'input', 'change', 'keydown', 'keyup', 'mousedown', 'mouseover', 'mouseout', 'submit', 'focus', 'blur'];
  var cache = {};
  function parse(src) {
    if (cache[src]) return cache[src];
    var m = /^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(([\s\S]*)\)\s*;?\s*$/.exec(src);
    if (!m) return (cache[src] = { bad: true });
    var args = [], s = m[2], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[\s,]/.test(c)) { i++; continue; }
      if (c === "'" || c === '"') {
        var j = i + 1, out = '';
        while (j < s.length && s[j] !== c) { if (s[j] === '\\' && j + 1 < s.length) { j++; var e = s[j]; out += e === 'n' ? '\n' : e === 't' ? '\t' : e; } else out += s[j]; j++; }
        args.push({ v: out }); i = j + 1; continue;
      }
      var t = /^[^,\s]+/.exec(s.slice(i))[0]; i += t.length;
      if (/^-?\d+(\.\d+)?$/.test(t)) args.push({ v: +t });
      else if (t === 'true') args.push({ v: true }); else if (t === 'false') args.push({ v: false });
      else if (t === 'null') args.push({ v: null }); else if (t === 'undefined') args.push({ v: undefined });
      else if (t === '@') args.push({ spread: true });
      else args.push({ ref: t });
    }
    return (cache[src] = { path: m[1].split('.'), args: args });
  }
  function resolve(path, root) { var o = root || window; for (var k = 0; k < path.length; k++) { if (o == null) return null; o = o[path[k]]; } return o; }
  function run(el, ev, src) {
    var p = parse(src);
    if (p.bad) { console.warn('orbiter: unsupported handler', src); return; }
    var args = [];
    p.args.forEach(function (a) {
      if ('v' in a) args.push(a.v);
      else if (a.spread) { var j = []; try { j = JSON.parse(el.getAttribute('data-args') || '[]'); } catch (e) {} args.push.apply(args, j); }
      else { var r = a.ref.split('.'), base = r[0] === 'this' ? el : r[0] === 'event' ? ev : window[r[0]]; args.push(r.length > 1 ? resolve(r.slice(1), base) : base); }
    });
    var root = p.path[0] === 'this' ? el : p.path[0] === 'event' ? ev : window, rest = root === window ? p.path : p.path.slice(1);
    var fn = resolve(rest, root), self = rest.length > 1 ? resolve(rest.slice(0, -1), root) : root;
    if (typeof fn === 'function') fn.apply(self, args); else console.warn('orbiter: handler not found', src);
  }
  EV.forEach(function (type) {
    var attr = 'data-on-' + type, sel = '[' + attr + ']';
    document.addEventListener(type, function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest(sel) : null;
      // emulate bubbling through nested elements; stopPropagation() inside a handler stops the walk
      var guard = 0;
      while (el && guard++ < 50) {
        run(el, ev, el.getAttribute(attr));
        if (ev.cancelBubble) break;
        el = el.parentElement ? el.parentElement.closest(sel) : null;
      }
    }, true); // capture: runs even when a page listener stops propagation lower down
  });
  // small helpers for the few handlers that were more than a function call
  window.orbH = {
    clickId: function (id) { var e = document.getElementById(id); if (e) e.click(); },
    rmClosest: function (el, sel) { var e = el.closest(sel); if (e) e.remove(); },
    ifSelf: function (ev, el, fn) { if (ev.target === el && typeof fn === 'function') fn(); },
    hover: function (el, border, color) { el.style.borderColor = border; el.style.color = color; },
    grow: function (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  };
})();
