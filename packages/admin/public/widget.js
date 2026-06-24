/**
 * Orbiter Widget SDK
 * Drop on any website to display content from an Orbiter POD.
 *
 * Usage:
 *   <div data-orbiter="https://mysite.com" data-collection="posts" data-limit="5" data-style="cards"></div>
 *   <script src="https://mysite.com/widget.js" defer></script>
 *
 * Attributes:
 *   data-orbiter     — Orbiter admin URL (required)
 *   data-collection  — collection ID (required)
 *   data-limit       — max entries (default: 5)
 *   data-style       — "cards" | "list" | "minimal" (default: cards)
 */
(function () {
  'use strict';

  var STYLES = {
    base: [
      '.orb-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
      '.orb-widget * { box-sizing: border-box; margin: 0; padding: 0; }',
      '.orb-widget a { text-decoration: none; color: inherit; }',
      '.orb-widget a:hover { opacity: 0.8; }',
      '.orb-error { padding: 12px; color: #888; font-size: 12px; }',
      '.orb-loading { padding: 12px; color: #aaa; font-size: 12px; }',
    ].join('\n'),
    cards: [
      '.orb-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }',
      '.orb-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; transition: box-shadow .15s; }',
      '.orb-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }',
      '.orb-card-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; line-height: 1.3; }',
      '.orb-card-excerpt { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 12px; }',
      '.orb-card-meta { font-size: 11px; color: #999; display: flex; gap: 12px; }',
      '.orb-card-tag { font-size: 10px; padding: 2px 8px; background: #f0f0f0; border-radius: 10px; }',
    ].join('\n'),
    list: [
      '.orb-list { display: flex; flex-direction: column; }',
      '.orb-list-item { padding: 12px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }',
      '.orb-list-item:last-child { border-bottom: none; }',
      '.orb-list-title { font-size: 14px; font-weight: 500; }',
      '.orb-list-date { font-size: 11px; color: #999; flex-shrink: 0; }',
    ].join('\n'),
    minimal: [
      '.orb-minimal { }',
      '.orb-mini-item { margin-bottom: 6px; }',
      '.orb-mini-item a { font-size: 13px; color: #333; }',
      '.orb-mini-item a:hover { text-decoration: underline; }',
    ].join('\n'),
  };

  function injectStyles(style) {
    if (document.getElementById('orb-widget-css')) return;
    var el = document.createElement('style');
    el.id = 'orb-widget-css';
    el.textContent = STYLES.base + '\n' + (STYLES[style] || STYLES.cards);
    document.head.appendChild(el);
  }

  function formatDate(d) {
    if (!d) return '';
    return new Date(d.replace(' ', 'T')).toLocaleDateString();
  }

  function renderCards(entries, baseUrl, collection) {
    return '<div class="orb-cards">' + entries.map(function (e) {
      var d = e.data;
      var url = baseUrl + '/' + collection + '/' + e.slug;
      var excerpt = d.excerpt || d.humanSummary || d.summaryMachine || '';
      if (excerpt.length > 160) excerpt = excerpt.slice(0, 157) + '…';
      var tags = (d.keywords || d.tags || []).slice(0, 3);
      return '<a class="orb-card" href="' + url + '" target="_blank" rel="noopener">'
        + '<div class="orb-card-title">' + esc(d.title || d.name || e.slug) + '</div>'
        + (excerpt ? '<div class="orb-card-excerpt">' + esc(excerpt) + '</div>' : '')
        + '<div class="orb-card-meta">'
        + '<span>' + formatDate(e.updated_at || e.created_at) + '</span>'
        + tags.map(function (t) { return '<span class="orb-card-tag">' + esc(t) + '</span>'; }).join('')
        + '</div></a>';
    }).join('') + '</div>';
  }

  function renderList(entries, baseUrl, collection) {
    return '<div class="orb-list">' + entries.map(function (e) {
      var d = e.data;
      var url = baseUrl + '/' + collection + '/' + e.slug;
      return '<a class="orb-list-item" href="' + url + '" target="_blank" rel="noopener">'
        + '<span class="orb-list-title">' + esc(d.title || d.name || e.slug) + '</span>'
        + '<span class="orb-list-date">' + formatDate(e.updated_at) + '</span>'
        + '</a>';
    }).join('') + '</div>';
  }

  function renderMinimal(entries, baseUrl, collection) {
    return '<div class="orb-minimal">' + entries.map(function (e) {
      var d = e.data;
      var url = baseUrl + '/' + collection + '/' + e.slug;
      return '<div class="orb-mini-item"><a href="' + url + '" target="_blank" rel="noopener">' + esc(d.title || d.name || e.slug) + '</a></div>';
    }).join('') + '</div>';
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function init() {
    var containers = document.querySelectorAll('[data-orbiter]');
    if (!containers.length) return;

    containers.forEach(function (el) {
      var base = el.dataset.orbiter.replace(/\/$/, '');
      var collection = el.dataset.collection;
      var limit = parseInt(el.dataset.limit) || 5;
      var style = el.dataset.style || 'cards';

      if (!collection) { el.innerHTML = '<div class="orb-error">data-collection required</div>'; return; }

      injectStyles(style);
      el.className = 'orb-widget';
      el.innerHTML = '<div class="orb-loading">Loading…</div>';

      fetch(base + '/api/widget/' + encodeURIComponent(collection) + '?limit=' + limit)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.error) { el.innerHTML = '<div class="orb-error">' + esc(data.error) + '</div>'; return; }
          var entries = data.entries || [];
          if (!entries.length) { el.innerHTML = '<div class="orb-error">No entries</div>'; return; }
          var siteUrl = base.replace(/:\d+$/, '');
          if (style === 'list') el.innerHTML = renderList(entries, siteUrl, collection);
          else if (style === 'minimal') el.innerHTML = renderMinimal(entries, siteUrl, collection);
          else el.innerHTML = renderCards(entries, siteUrl, collection);
        })
        .catch(function () { el.innerHTML = '<div class="orb-error">Failed to load</div>'; });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
