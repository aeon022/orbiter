function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function colHref(root, colId) { return `${root}${colId}/index.html`; }
function entryHref(root, colId, slug) { return `${root}${colId}/${slug}/index.html`; }

function readingTime(text) {
  if (!text) return '';
  const words = text.replace(/<[^>]*>/g, '').replace(/[#*_~`>\-|]/g, ' ').split(/\s+/).filter(Boolean).length;
  const min = Math.max(1, Math.round(words / 200));
  return `${min} min read`;
}

const COLLECTION_ICONS = {
  posts:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  pages:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
  events:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
  authors:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
  dossiers:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/></svg>',
  projects:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/></svg>',
  services:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  team:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  _default:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
};

function iconFor(colId) {
  for (const [key, svg] of Object.entries(COLLECTION_ICONS)) {
    if (key !== '_default' && colId.includes(key.replace(/s$/, ''))) return svg;
  }
  return COLLECTION_ICONS._default;
}

// favicon as properly percent-encoded data URI
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 2L4 9v14l12 7 12-7V9L16 2z' fill='%237c3aed' opacity='.9'/%3E%3Cpath d='M16 6l-8 4.6v9.2L16 24.4l8-4.6v-9.2L16 6z' fill='%23fff' opacity='.25'/%3E%3C/svg%3E";

const SITE_JS = `<script>
(function(){
  var d=document.documentElement;
  var s=localStorage.getItem('orb-theme');
  if(s==='dark')d.setAttribute('data-theme','dark');
  else if(s==='light')d.setAttribute('data-theme','light');
  var t=document.getElementById('theme-toggle');
  if(t)t.addEventListener('click',function(){
    var c=d.getAttribute('data-theme');
    var n=c==='dark'?'light':c==='light'?'dark':
      (matchMedia('(prefers-color-scheme:dark)').matches?'light':'dark');
    d.setAttribute('data-theme',n);
    localStorage.setItem('orb-theme',n);
  });
  var h=document.querySelector('.site-header');
  if(h){var last=0;addEventListener('scroll',function(){
    var y=scrollY;
    h.classList.toggle('scrolled',y>60);
    h.classList.toggle('hidden',y>300&&y>last);
    last=y;
  },{passive:true})}
})();
<\/script>`;

export const orbit = {
  meta: {
    id: 'orbit',
    name: 'Orbit',
    description: 'Clean, modern default theme with dark mode, cards, and responsive navigation',
  },

  css() {
    return `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

:root{
  --bg:#fafaf9;--bg-alt:#f5f5f4;--surface:#ffffff;
  --border:#e7e5e4;--border-subtle:#f0efed;
  --text:#1c1917;--text-2:#44403c;--text-3:#78716c;--text-4:#a8a29e;
  --accent:#7c3aed;--accent-hover:#6d28d9;--accent-subtle:#ede9fe;--accent-muted:#ddd6fe;
  --radius:12px;--radius-sm:8px;--radius-xs:6px;
  --max-w:780px;
  --font:'Outfit',system-ui,-apple-system,sans-serif;
  --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  --shadow-sm:0 1px 3px rgba(0,0,0,.04);
  --shadow:0 4px 12px rgba(0,0,0,.06);
  --shadow-lg:0 8px 30px rgba(0,0,0,.08);
  --gradient:linear-gradient(135deg,#7c3aed 0%,#6366f1 50%,#818cf8 100%);
}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){
  --bg:#09090b;--bg-alt:#18181b;--surface:#18181b;
  --border:#27272a;--border-subtle:#1f1f23;
  --text:#fafafa;--text-2:#d4d4d8;--text-3:#a1a1aa;--text-4:#71717a;
  --accent:#a78bfa;--accent-hover:#c4b5fd;--accent-subtle:rgba(167,139,250,.1);--accent-muted:rgba(167,139,250,.18);
  --shadow-sm:0 1px 3px rgba(0,0,0,.3);
  --shadow:0 4px 12px rgba(0,0,0,.4);
  --shadow-lg:0 8px 30px rgba(0,0,0,.5);
  --gradient:linear-gradient(135deg,#6d28d9 0%,#4f46e5 50%,#6366f1 100%);
}}
:root[data-theme=dark]{
  --bg:#09090b;--bg-alt:#18181b;--surface:#18181b;
  --border:#27272a;--border-subtle:#1f1f23;
  --text:#fafafa;--text-2:#d4d4d8;--text-3:#a1a1aa;--text-4:#71717a;
  --accent:#a78bfa;--accent-hover:#c4b5fd;--accent-subtle:rgba(167,139,250,.1);--accent-muted:rgba(167,139,250,.18);
  --shadow-sm:0 1px 3px rgba(0,0,0,.3);
  --shadow:0 4px 12px rgba(0,0,0,.4);
  --shadow-lg:0 8px 30px rgba(0,0,0,.5);
  --gradient:linear-gradient(135deg,#6d28d9 0%,#4f46e5 50%,#6366f1 100%);
}
:root[data-theme=light]{
  --bg:#fafaf9;--bg-alt:#f5f5f4;--surface:#ffffff;
  --border:#e7e5e4;--border-subtle:#f0efed;
  --text:#1c1917;--text-2:#44403c;--text-3:#78716c;--text-4:#a8a29e;
  --accent:#7c3aed;--accent-hover:#6d28d9;--accent-subtle:#ede9fe;--accent-muted:#ddd6fe;
  --shadow-sm:0 1px 3px rgba(0,0,0,.04);
  --shadow:0 4px 12px rgba(0,0,0,.06);
  --shadow-lg:0 8px 30px rgba(0,0,0,.08);
  --gradient:linear-gradient(135deg,#7c3aed 0%,#6366f1 50%,#818cf8 100%);
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:var(--font);color:var(--text);background:var(--bg);line-height:1.6;min-height:100dvh;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:var(--accent);text-decoration:none;transition:color .2s}
a:hover{color:var(--accent-hover)}

/* ═══ Header — capsule bar, compacts to island on scroll ═══ */
.site-header{position:sticky;top:0;z-index:100;padding:10px 20px;transition:padding .4s cubic-bezier(.4,0,.2,1)}
.site-header::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(var(--max-w),calc(100% - 32px));background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:40px;height:48px;box-shadow:var(--shadow-sm);transition:all .4s cubic-bezier(.4,0,.2,1)}
.header-inner{max-width:calc(var(--max-w) - 40px);margin:0 auto;display:flex;align-items:center;justify-content:center;height:48px;gap:12px;position:relative}
.site-name{margin-right:auto}
.header-right{margin-left:auto}
.site-name{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-.02em;white-space:nowrap;transition:all .3s}
.site-name:hover{color:var(--accent)}
.header-right{display:flex;align-items:center;gap:4px}

/* Site initial — gradient badge, always visible alongside name */
.site-initial{width:26px;height:26px;background:var(--gradient);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0;transition:all .3s;text-decoration:none;letter-spacing:-.02em}
.site-initial:hover{opacity:.85;transform:scale(1.05)}

/* Island state on scroll — narrower, name hidden */
.site-header.scrolled{padding:6px 20px}
.site-header.scrolled::before{width:min(520px,calc(100% - 32px));height:42px;box-shadow:var(--shadow),0 0 0 1px color-mix(in srgb,var(--accent) 6%,transparent)}
.site-header.scrolled .header-inner{height:42px;max-width:min(480px,100%);justify-content:center;gap:8px}
.site-header.scrolled .site-name{font-size:0;width:0;overflow:hidden;margin:0;padding:0}
.site-header.scrolled .header-right{margin-left:0}

/* Hide on scroll down */
.site-header.hidden{transform:translateY(calc(-100% - 12px));pointer-events:none}

nav.site-nav{display:flex;gap:2px}
nav.site-nav a{font-size:12px;color:var(--text-3);padding:5px 11px;border-radius:20px;font-weight:500;transition:all .2s;white-space:nowrap}
nav.site-nav a:hover{color:var(--text);background:color-mix(in srgb,var(--text) 6%,transparent)}

.theme-toggle{appearance:none;border:none;background:none;color:var(--text-4);width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;flex-shrink:0}
.theme-toggle:hover{color:var(--accent);transform:rotate(45deg)}
.theme-toggle svg{width:14px;height:14px}

/* ═══ Mobile menu ═══ */
.menu-toggle{display:none;appearance:none;border:none;background:none;color:var(--text-3);width:28px;height:28px;cursor:pointer;padding:4px;border-radius:50%;position:relative;z-index:102;transition:color .2s}
.menu-toggle:hover{color:var(--text)}
.menu-toggle .bar{display:block;width:16px;height:1.5px;background:currentColor;border-radius:1px;transition:all .3s ease;margin:3px auto}
#mobile-menu{display:none}
#mobile-menu:checked~.mobile-overlay{opacity:1;pointer-events:auto}
#mobile-menu:checked~.mobile-panel{transform:translateX(0)}

.mobile-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:98;opacity:0;pointer-events:none;transition:opacity .3s;backdrop-filter:blur(2px)}
.mobile-panel{position:fixed;top:0;right:0;bottom:0;width:min(300px,82vw);background:var(--surface);z-index:101;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;border-left:1px solid var(--border)}
.mobile-panel-header{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.mobile-panel-title{font-size:10px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:.14em}
.mobile-panel-close{appearance:none;border:none;background:none;color:var(--text-3);cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all .2s}
.mobile-panel-close:hover{background:var(--bg-alt);color:var(--text)}
.mobile-panel-close svg{width:16px;height:16px}
.mobile-panel-links{flex:1;padding:8px;overflow-y:auto;display:flex;flex-direction:column;gap:1px}
.mobile-panel-links a{font-size:14px;padding:12px 14px;border-radius:var(--radius-sm);color:var(--text-2);font-weight:500;transition:all .15s;display:flex;align-items:center;gap:10px}
.mobile-panel-links a:hover{background:var(--bg-alt);color:var(--accent)}
.mobile-panel-links a svg{width:17px;height:17px;color:var(--text-4);flex-shrink:0}
.mobile-panel-footer{padding:14px 20px;border-top:1px solid var(--border);font-size:11px;color:var(--text-4)}

@media(max-width:640px){
  .menu-toggle{display:flex;align-items:center;justify-content:center}
  nav.site-nav{display:none}
  .site-header::before{width:calc(100% - 24px)!important;border-radius:28px!important}
  .site-header.scrolled::before{height:40px}
  .site-header.scrolled .header-inner{height:40px}
}

/* ═══ Page ═══ */
.page-wrap{max-width:var(--max-w);margin:0 auto;padding:48px 20px 80px;flex:1;width:100%}

/* ═══ Homepage ═══ */
.home-hero{margin-bottom:40px;padding:52px 44px;border-radius:var(--radius);background:var(--gradient);position:relative;overflow:hidden}
.home-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.18),transparent 60%)}
.home-hero h1{font-size:clamp(30px,5vw,48px);font-weight:800;letter-spacing:-.04em;line-height:1.05;color:#fff;position:relative}
.home-hero p{font-size:17px;color:rgba(255,255,255,.78);margin-top:12px;max-width:460px;line-height:1.55;position:relative;font-weight:300}

.collection-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.collection-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;display:flex;align-items:flex-start;gap:14px;text-decoration:none;transition:all .25s;box-shadow:var(--shadow-sm)}
.collection-card:hover{border-color:var(--accent-muted);transform:translateY(-3px);box-shadow:var(--shadow-lg)}
.card-icon{width:36px;height:36px;padding:7px;border-radius:var(--radius-sm);background:var(--accent-subtle);color:var(--accent);flex-shrink:0}
.card-icon svg{width:100%;height:100%}
.card-body h2{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-.01em;margin-bottom:2px}
.card-body .count{font-size:12px;color:var(--text-4)}

/* ═══ Header meta — children links below title ═══ */
.list-children{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.list-children a{font-size:11px;color:var(--text-4);padding:3px 10px;border:1px solid var(--border);border-radius:20px;font-weight:500;transition:all .2s}
.list-children a:hover{color:var(--accent);border-color:var(--accent-muted);background:var(--accent-subtle)}

/* ═══ Entry Cards ═══ */
.list-header{margin-bottom:8px}
.list-header h1{font-size:clamp(24px,4vw,34px);font-weight:800;letter-spacing:-.03em;margin-bottom:4px}
.entry-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.entry-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;text-decoration:none;color:inherit;transition:all .25s;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:8px}
.entry-card:hover{border-color:var(--accent-muted);transform:translateY(-2px);box-shadow:var(--shadow)}
.entry-card-title{font-size:16px;font-weight:700;color:var(--text);letter-spacing:-.02em;line-height:1.3}
.entry-card-excerpt{font-size:13px;color:var(--text-3);line-height:1.55;flex:1}
.entry-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--text-4);font-weight:500;padding-top:6px;border-top:1px solid var(--border-subtle);margin-top:auto}
.entry-empty{padding:48px 0;text-align:center;color:var(--text-4);font-size:14px}

/* ═══ Article ═══ */
.breadcrumb{font-size:12px;color:var(--text-4);margin-bottom:24px;display:flex;align-items:center;gap:8px;font-weight:500}
.breadcrumb a{color:var(--text-3)}
.breadcrumb a:hover{color:var(--accent)}
.breadcrumb .sep{color:var(--border)}

article header{margin-bottom:36px}
article header h1{font-size:clamp(26px,5vw,40px);font-weight:800;letter-spacing:-.035em;line-height:1.1}
.article-meta{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px;font-size:12px;color:var(--text-4);font-weight:500}
.reading-time::before{content:'\\b7';margin-right:12px}

.hero-img{margin-bottom:36px;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}
.hero-img img{width:100%;aspect-ratio:2/1;object-fit:cover}

.field-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:32px;padding:16px 20px;background:var(--bg-alt);border-radius:var(--radius);border:1px solid var(--border-subtle)}
.field-item{display:flex;flex-direction:column;gap:2px}
.field-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-4);font-weight:700}
.field-value{font-size:13px;color:var(--text-2)}
.field-value a{word-break:break-all}

/* ═══ Prose ═══ */
.prose{font-size:16.5px;line-height:1.8;color:var(--text-2)}
.prose h1{font-size:28px;font-weight:800;margin:56px 0 16px;letter-spacing:-.03em;line-height:1.15;color:var(--text)}
.prose h2{font-size:22px;font-weight:700;margin:48px 0 14px;letter-spacing:-.02em;line-height:1.2;color:var(--text)}
.prose h3{font-size:18px;font-weight:700;margin:36px 0 10px;color:var(--text)}
.prose p{margin-bottom:20px}
.prose>*:first-child{margin-top:0}
.prose>*:last-child{margin-bottom:0}
.prose ul,.prose ol{margin-bottom:20px;padding-left:22px}
.prose li{margin-bottom:6px}
.prose li::marker{color:var(--text-4)}
.prose blockquote{border-left:3px solid var(--accent);margin:32px 0;padding:16px 24px;color:var(--text-3);background:var(--accent-subtle);border-radius:0 var(--radius-sm) var(--radius-sm) 0}
.prose blockquote p:last-child{margin-bottom:0}
.prose pre{background:#1a1625;color:#e2def6;padding:20px 24px;border-radius:var(--radius);overflow-x:auto;margin:32px 0;font-size:13.5px;line-height:1.65;font-family:var(--mono);tab-size:2;box-shadow:var(--shadow)}
.prose code{font-family:var(--mono);font-size:.85em;background:var(--accent-subtle);padding:2px 7px;border-radius:var(--radius-xs);color:var(--accent)}
.prose pre code{background:none;padding:0;font-size:inherit;color:inherit}
.prose img{margin:32px 0;border-radius:var(--radius);box-shadow:var(--shadow-sm)}
.prose hr{border:none;height:1px;background:var(--border);margin:48px 0}
.prose a{color:var(--accent);text-decoration:underline;text-decoration-color:var(--accent-muted);text-underline-offset:3px;transition:text-decoration-color .2s}
.prose a:hover{text-decoration-color:var(--accent)}
.prose strong{font-weight:700;color:var(--text)}
.prose table{width:100%;border-collapse:collapse;margin:28px 0;font-size:14px;border-radius:var(--radius-sm);overflow:hidden}
.prose th,.prose td{padding:10px 14px;border:1px solid var(--border);text-align:left}
.prose th{background:var(--bg-alt);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3)}

.tags{display:flex;gap:5px;flex-wrap:wrap}
.tag{font-size:11px;background:var(--accent-subtle);color:var(--accent);padding:3px 10px;border-radius:20px;font-weight:600}

/* ═══ Footer ═══ */
.site-footer{border-top:1px solid var(--border);padding:40px 20px 28px;margin-top:auto}
.footer-inner{max-width:var(--max-w);margin:0 auto}
.footer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px}
.footer-brand{display:flex;align-items:center;gap:10px}
.footer-diamond{width:24px;height:24px;color:var(--accent);flex-shrink:0}
.footer-name{font-size:14px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.footer-links{display:flex;gap:16px;flex-wrap:wrap}
.footer-links a{font-size:12px;color:var(--text-4);font-weight:500;transition:color .15s}
.footer-links a:hover{color:var(--accent)}
.footer-bottom{max-width:var(--max-w);margin:0 auto;padding-top:16px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--text-4)}
.footer-bottom a{color:var(--text-4);transition:color .2s}
.footer-bottom a:hover{color:var(--accent)}
.back-to-top{display:flex;align-items:center;gap:3px;font-weight:500}
.back-to-top svg{width:12px;height:12px}
@media(max-width:640px){.footer-top{flex-direction:column;gap:16px}.footer-links{gap:12px}}

/* ═══ Responsive ═══ */
@media(max-width:640px){
  .page-wrap{padding:24px 16px 48px}
  .home-hero{padding:36px 24px;margin:0 -16px;border-radius:0}
  .collection-grid{grid-template-columns:1fr}
  .entry-grid{grid-template-columns:1fr}
  .field-grid{grid-template-columns:1fr 1fr}
}
@media print{
  .site-header,.site-footer,.breadcrumb{display:none}
  .page-wrap{padding:0;max-width:100%}
  body{background:#fff;color:#000}
  .home-hero{background:#f3f0ff!important}
  .home-hero h1,.home-hero p{color:#000!important}
}
`;
  },

  layoutHTML(site, content, meta, navItems, root) {
    const r = root || '';
    const navLinks = (navItems || [])
      .map(c => `<a href="${colHref(r, esc(c.id))}">${esc(c.label)}</a>`)
      .join('');
    const mobileLinks = (navItems || [])
      .map(c => `<a href="${colHref(r, esc(c.id))}">${iconFor(c.id)}${esc(c.label)}</a>`)
      .join('\n      ');
    const pageTitle = meta.title ? `${esc(meta.title)} — ${esc(site.name)}` : esc(site.name);
    const canonical = meta.canonical ? `\n  <link rel="canonical" href="${esc(meta.canonical)}">` : '';
    const desc = meta.description || site.description || '';
    const siteUrl = (site.url || '').replace(/\/+$/, '');
    const ogImage = meta.ogImage || '';

    const jsonLd = meta.type === 'article'
      ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          'headline': meta.title || '',
          'description': desc,
          ...(meta.canonical ? { 'url': meta.canonical } : {}),
          ...(meta.datePublished ? { 'datePublished': meta.datePublished.split(' ')[0] } : {}),
          ...(meta.dateModified  ? { 'dateModified':  meta.dateModified.split(' ')[0]  } : {}),
          ...(meta.author ? { 'author': { '@type': 'Person', 'name': meta.author } } : {
              'author': { '@type': 'Organization', 'name': site.name, 'url': siteUrl || undefined },
          }),
          ...(ogImage ? { 'image': ogImage } : {}),
          ...(Array.isArray(meta.tags) && meta.tags.length ? { 'keywords': meta.tags.join(', ') } : {}),
          'publisher': { '@type': 'Organization', 'name': site.name, ...(siteUrl ? { 'url': siteUrl } : {}) },
        })
      : JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': site.name,
          ...(siteUrl ? { 'url': siteUrl } : {}),
          ...(desc ? { 'description': desc } : {}),
        });

    return `<!DOCTYPE html>
<html lang="${esc(site.locale || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="generator" content="Orbiter CMS">${canonical}
  <meta property="og:title" content="${esc(meta.title || site.name)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="${meta.type || 'website'}">
  ${siteUrl && meta.canonical ? `<meta property="og:url" content="${esc(meta.canonical)}">` : ''}
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="${r}style.css">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a class="site-initial" href="${r}index.html">${esc(site.name.charAt(0))}</a>
      <a class="site-name" href="${r}index.html">${esc(site.name)}</a>
      <div class="header-right">
        <nav class="site-nav">${navLinks}</nav>
        <button class="theme-toggle" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        </button>
        <label class="menu-toggle" for="mobile-menu" aria-label="Menu">
          <span class="bar"></span><span class="bar"></span><span class="bar"></span>
        </label>
      </div>
    </div>
  </header>
  <input type="checkbox" id="mobile-menu" hidden>
  <label class="mobile-overlay" for="mobile-menu"></label>
  <div class="mobile-panel">
    <div class="mobile-panel-header">
      <span class="mobile-panel-title">Menu</span>
      <label class="mobile-panel-close" for="mobile-menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></label>
    </div>
    <nav class="mobile-panel-links">
      ${mobileLinks}
    </nav>
    <div class="mobile-panel-footer">${esc(site.name)}</div>
  </div>
  ${content}
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <svg class="footer-diamond" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2L4 9v14l12 7 12-7V9L16 2z"/></svg>
          <span class="footer-name">${esc(site.name)}</span>
        </div>
        <div class="footer-links">
          ${(navItems || []).map(c => `<a href="${colHref(r, esc(c.id))}">${esc(c.label)}</a>`).join('\n          ')}
        </div>
      </div>
      <div class="footer-bottom">
        <span>Powered by Orbiter</span>
        <a class="back-to-top" href="#">Back to top<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg></a>
      </div>
    </div>
  </footer>
  ${SITE_JS}
</body>
</html>`;
  },

  homepageHTML(site, collections, root) {
    const r = root || '';
    const cards = collections
      .map(c => `<a class="collection-card" href="${colHref(r, esc(c.id))}">
        <div class="card-icon">${iconFor(c.id)}</div>
        <div class="card-body">
          <h2>${esc(c.label)}</h2>
          <span class="count">${c.entryCount} ${c.entryCount === 1 ? 'entry' : 'entries'}</span>
        </div>
      </a>`)
      .join('\n      ');

    return `
  <div class="page-wrap">
    <div class="home-hero">
      <h1>${esc(site.name)}</h1>
      ${site.description ? `<p>${esc(site.description)}</p>` : ''}
    </div>
    <div class="collection-grid">
      ${cards}
    </div>
  </div>`;
  },

  collectionListHTML(site, collection, entries, root) {
    const r = root || '';
    const children = collection._childCollections || [];
    const parent = collection._parent;
    const items = entries
      .map(e => {
        const excerpt = e.excerpt ? `<span class="entry-card-excerpt">${esc(e.excerpt)}</span>` : '';
        const rt = e.readingTime ? `<span>${esc(e.readingTime)}</span>` : '';
        return `<a class="entry-card" href="${entryHref(r, esc(collection.id), esc(e.slug))}">
          <span class="entry-card-title">${esc(e.title)}</span>
          ${excerpt}
          <span class="entry-card-meta">
            <time>${formatDate(e.date)}</time>
            ${rt}
          </span>
        </a>`;
      })
      .join('\n      ');

    const breadcrumb = parent
      ? `<div class="breadcrumb"><a href="${colHref(r, esc(parent.id))}">${esc(parent.label)}</a><span class="sep">/</span></div>`
      : '';

    const childLinks = children.length
      ? `<div class="list-children">${children.map(c => `<a href="${colHref(r, esc(c.id))}">${esc(c.label)}</a>`).join('')}</div>`
      : '';

    return `
  <div class="page-wrap">
    ${breadcrumb}
    <div class="list-header">
      <h1>${esc(collection.label)}</h1>
      ${childLinks}
    </div>
    <div class="entry-grid">
      ${items || '<div class="entry-empty">No published entries yet.</div>'}
    </div>
  </div>`;
  },

  entryHTML(site, collection, entry, renderedBody, root) {
    const r = root || '';
    const parent = collection._parent;
    const tags = (entry.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    const heroImg = entry.heroImage
      ? `<div class="hero-img"><img src="${esc(entry.heroImage)}" alt="${esc(entry.title)}"></div>`
      : '';

    const metaParts = [];
    if (entry.date) metaParts.push(`<time>${formatDate(entry.date)}</time>`);
    if (entry.readingTime) metaParts.push(`<span class="reading-time">${esc(entry.readingTime)}</span>`);
    if (tags) metaParts.push(`<div class="tags">${tags}</div>`);

    const fieldGrid = this._fieldGridHTML(entry.fields);

    const breadcrumbParts = [];
    if (parent) breadcrumbParts.push(`<a href="${colHref(r, esc(parent.id))}">${esc(parent.label)}</a><span class="sep">/</span>`);
    breadcrumbParts.push(`<a href="${colHref(r, esc(collection.id))}">${esc(collection.label)}</a><span class="sep">/</span>`);

    return `
  <div class="page-wrap">
    <div class="breadcrumb">
      ${breadcrumbParts.join('\n      ')}
    </div>
    <article>
      <header>
        <h1>${esc(entry.title)}</h1>
        ${metaParts.length ? `<div class="article-meta">${metaParts.join('')}</div>` : ''}
      </header>
      ${heroImg}
      ${fieldGrid}
      ${renderedBody ? `<div class="prose">${renderedBody}</div>` : ''}
    </article>
  </div>`;
  },

  _subNavHTML(children, root) {
    if (!children || !children.length) return '';
    return `<nav class="sub-nav">
      ${children.map(c =>
        `<a href="${colHref(root, esc(c.id))}">${esc(c.label)}</a>`
      ).join('\n      ')}
    </nav>`;
  },

  _fieldGridHTML(fields) {
    if (!fields || !fields.length) return '';
    const items = fields.map(f => {
      let val = f.value;
      if (f.type === 'url' && val) val = `<a href="${esc(val)}" target="_blank" rel="noopener">${esc(val)}</a>`;
      else if (f.type === 'email' && val) val = `<a href="mailto:${esc(val)}">${esc(val)}</a>`;
      else if (f.type === 'boolean') val = val ? 'Yes' : 'No';
      else if (Array.isArray(val)) val = val.map(v => esc(String(v))).join(', ');
      else val = esc(String(val || ''));
      if (!val) return '';
      return `<div class="field-item"><span class="field-label">${esc(f.label)}</span><span class="field-value">${val}</span></div>`;
    }).filter(Boolean).join('\n      ');
    if (!items) return '';
    return `<div class="field-grid">\n      ${items}\n    </div>`;
  },

  readingTime,
};
