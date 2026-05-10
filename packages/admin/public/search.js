// Global Cmd+K search palette — import this on any admin page
(function () {
  const CSS = `
#search-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 9000;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  backdrop-filter: blur(2px);
}
#search-overlay.open { display: flex; }
#search-box {
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  width: 560px;
  max-width: 94vw;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  overflow: hidden;
}
#search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
}
#search-input-wrap svg { color: var(--muted); flex-shrink: 0; }
#search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text);
  padding: 14px 0;
}
#search-results {
  max-height: 360px;
  overflow-y: auto;
}
#search-results:empty::after {
  content: 'No results';
  display: block;
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: var(--muted);
}
.sr-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--line2);
  text-decoration: none;
  transition: background 0.1s;
}
.sr-item:last-child { border-bottom: none; }
.sr-item:hover, .sr-item.focused { background: var(--accent-bg); }
.sr-col {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  font-family: var(--mono);
  min-width: 80px;
  flex-shrink: 0;
}
.sr-title {
  font-size: 13px;
  color: var(--heading);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sr-badge {
  font-size: 9px;
  font-family: var(--mono);
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.sr-badge.published { background: var(--jade-bg); color: var(--jade); }
.sr-badge.draft     { background: rgba(139,124,248,0.1); color: var(--accent); }
#search-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 16px;
  font-size: 10px;
  color: var(--muted);
  font-family: var(--mono);
}
#search-footer kbd {
  font-family: var(--mono);
  background: var(--bg3, rgba(255,255,255,0.06));
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 9px;
}
`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'search-overlay';
  overlay.innerHTML = `
    <div id="search-box" role="dialog" aria-label="Search">
      <div id="search-input-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input id="search-input" type="text" placeholder="Search entries…" autocomplete="off" spellcheck="false" />
        <kbd>Esc</kbd>
      </div>
      <div id="search-results" role="listbox"></div>
      <div id="search-footer">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let items = [];
  let focused = -1;
  let debounce = null;

  function open() {
    overlay.classList.add('open');
    input.value = '';
    results.innerHTML = '';
    items = [];
    focused = -1;
    input.focus();
  }

  function close() {
    overlay.classList.remove('open');
  }

  function setFocus(idx) {
    items.forEach((el, i) => el.classList.toggle('focused', i === idx));
    focused = idx;
    if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
  }

  async function search(q) {
    if (!q.trim()) { results.innerHTML = ''; items = []; focused = -1; return; }
    const data = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
      .then(r => r.json()).catch(() => []);
    results.innerHTML = '';
    items = [];
    focused = -1;
    if (!data.length) return;
    data.forEach(hit => {
      const a = document.createElement('a');
      a.className = 'sr-item';
      a.href = `/editor.html?collection=${hit.collection}&slug=${hit.slug}`;
      a.innerHTML = `
        <span class="sr-col">${hit.collection}</span>
        <span class="sr-title">${hit.title || hit.slug}</span>
        <span class="sr-badge ${hit.status}">${hit.status}</span>
      `;
      a.addEventListener('mouseenter', () => setFocus(items.indexOf(a)));
      results.appendChild(a);
      items.push(a);
    });
  }

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => search(input.value), 180);
  });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      overlay.classList.contains('open') ? close() : open();
      return;
    }
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(Math.min(focused + 1, items.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocus(Math.max(focused - 1, 0)); return; }
    if (e.key === 'Enter' && items[focused]) { items[focused].click(); return; }
  });

  overlay.addEventListener('mousedown', e => {
    if (e.target === overlay) close();
  });

  // Wire click on any .search-trigger button (present after DOM is ready)
  document.addEventListener('click', e => {
    if (e.target.closest('#search-btn')) open();
  });
})();
