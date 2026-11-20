// Docs code blocks: keyboard-focusable, copy button, and an npm / pnpm / yarn / bun switch for install-style commands.
(function () {
  var PMS = ['npm', 'pnpm', 'yarn', 'bun'];
  var get = function () { try { return localStorage.getItem('orb_pm') || 'npm'; } catch (e) { return 'npm'; } };
  var set = function (v) { try { localStorage.setItem('orb_pm', v); } catch (e) { /* private mode */ } };

  // npm line → equivalent for another package manager (leading whitespace kept)
  function convert(line, pm) {
    if (pm === 'npm') return line;
    var m;
    if ((m = line.match(/^(\s*)npm (?:install|i) (-g|--global) (.+)$/))) return m[1] + ({ pnpm: 'pnpm add -g ', yarn: 'yarn global add ', bun: 'bun add -g ' })[pm] + m[3];
    if ((m = line.match(/^(\s*)npm (?:install|i)$/))) return m[1] + ({ pnpm: 'pnpm install', yarn: 'yarn', bun: 'bun install' })[pm];
    if ((m = line.match(/^(\s*)npm (?:install|i) (.+)$/))) return m[1] + pm + ' add ' + m[2].replace(/--save-dev/, pm === 'bun' ? '--dev' : '-D');
    if ((m = line.match(/^(\s*)npm run (.+)$/))) return m[1] + ({ pnpm: 'pnpm run ', yarn: 'yarn ', bun: 'bun run ' })[pm] + m[2];
    if ((m = line.match(/^(\s*)npx (.+)$/))) return m[1] + ({ pnpm: 'pnpm dlx ', yarn: 'yarn dlx ', bun: 'bunx ' })[pm] + m[2];
    return line;
  }

  function enhance(pre) {
    pre.tabIndex = 0;
    if (pre.dataset.tools) return;
    pre.dataset.tools = '1';
    var tools = document.createElement('div');
    tools.className = 'code-tools';
    var plain = !pre.children.length;
    var orig = pre.textContent;
    var hasPm = plain && /^\s*(npm (install|i|run)\b|npx )/m.test(orig);

    if (hasPm) {
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Package manager');
      PMS.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); });
      var apply = function (pm) { pre.firstChild.nodeValue = orig.split('\n').map(function (l) { return convert(l, pm); }).join('\n'); };
      sel.value = get();
      sel.addEventListener('change', function () { set(sel.value); document.querySelectorAll('pre[data-pm-orig]').forEach(function (x) { x.dispatchEvent(new CustomEvent('pm', { detail: sel.value })); }); });
      pre.dataset.pmOrig = '1';
      pre.addEventListener('pm', function (e) { sel.value = e.detail; apply(e.detail); });
      apply(sel.value);
      tools.appendChild(sel);
    }

    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'code-copy'; btn.textContent = 'Copy'; btn.setAttribute('aria-label', 'Copy code');
    btn.addEventListener('click', function () {
      var c = pre.cloneNode(true); c.querySelector('.code-tools').remove(); var text = c.textContent;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
    tools.appendChild(btn);
    pre.appendChild(tools);
  }

  document.addEventListener('astro:page-load', function () { document.querySelectorAll('.prose pre').forEach(enhance); });
})();
