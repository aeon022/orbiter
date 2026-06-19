import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN_ROOT = join(__dirname, '..');
// In standalone mode chdir so other relative-path tooling works.
// In Electron the asar is not a real directory, so we skip it.
if (!process.env.ELECTRON) process.chdir(ADMIN_ROOT);;
import { readFileSync } from 'node:fs';
import { openPod }          from '@a83/orbiter-core';
import { authRoutes }       from './routes/auth.js';
import { collectionRoutes } from './routes/collections.js';
import { entryRoutes }      from './routes/entries.js';
import { mediaRoutes }      from './routes/media.js';
import { userRoutes }       from './routes/users.js';
import { metaRoutes }       from './routes/meta.js';
import { accountRoutes }    from './routes/account.js';
import { buildRoutes }      from './routes/build.js';
import { searchRoutes }     from './routes/search.js';
import { githubRoutes }     from './routes/github.js';
import { infoRoutes }       from './routes/info.js';
import { importRoutes }     from './routes/import.js';
import { commentRoutes }    from './routes/comments.js';
import { lockRoutes }       from './routes/locks.js';
import { terminalRoutes }   from './routes/terminal.js';
import { deployRoutes }     from './routes/deploy.js';
import { formPublicRoutes, formRoutes } from './routes/forms.js';
import { requireAuth }      from './middleware/auth.js';
import { csrfMiddleware }  from './middleware/csrf.js';

const { version: adminVersion } = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

const POD_PATH = process.env.ORBITER_POD;
if (!POD_PATH) {
  console.error('Error: ORBITER_POD environment variable is required.');
  console.error('Example: ORBITER_POD=/path/to/content.pod npm start');
  process.exit(1);
}

const PORT        = parseInt(process.env.PORT ?? '4322', 10);
const ALLOWED_ORIGINS = process.env.ADMIN_ORIGIN
  ? process.env.ADMIN_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:4321', 'http://localhost:4322'];

export function createApp(podPath) {
  const app = new Hono();

  // Inject pod path into every request context
  app.use('*', async (c, next) => {
    c.set('podPath', podPath);
    await next();
  });

  app.use('*', cors({
    origin:      ALLOWED_ORIGINS,
    credentials: true,
  }));

  // Public routes (no CSRF needed — login can't be meaningfully CSRF-attacked)
  app.route('/api/auth', authRoutes);

  // Public form submission — wide CORS (called from any static site)
  app.use('/api/form/*', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'] }));
  app.use('/api/form/*', async (c, next) => { c.set('podPath', podPath); await next(); });
  app.route('/api/form', formPublicRoutes);

  // Protected routes — CSRF + auth
  const api = new Hono();
  api.use('*', csrfMiddleware(ALLOWED_ORIGINS));
  api.use('*', requireAuth);
  api.route('/collections',  collectionRoutes);
  api.route('/collections',  entryRoutes);
  api.route('/media',        mediaRoutes);
  api.route('/users',        userRoutes);
  api.route('/meta',         metaRoutes);
  api.route('/account',      accountRoutes);
  api.route('/build',        buildRoutes);
  api.route('/search',       searchRoutes);
  api.route('/github',       githubRoutes);
  api.route('/info',         infoRoutes);
  api.route('/import',       importRoutes);
  api.route('/collections',  commentRoutes);
  api.route('/',             commentRoutes);
  api.route('/locks',        lockRoutes);
  api.route('/terminal',     terminalRoutes);
  api.route('/deploy',       deployRoutes);
  api.route('/forms',        formRoutes);

  app.route('/api', api);

  app.get('/health', (c) => {
    let podOk = false;
    try { const db = openPod(podPath); db.close(); podOk = true; } catch {}
    return c.json({ ok: podOk, version: adminVersion, pod: podPath, uptime: Math.floor(process.uptime()) });
  });

  // Redirect root to login
  app.get('/', (c) => c.redirect('/login.html'));

  // Serve static frontend files from public/
  app.use('/*', serveStatic({ root: join(ADMIN_ROOT, 'public') }));

  return app;
}

serve({ fetch: createApp(POD_PATH).fetch, port: PORT }, () => {
  console.log(`Orbiter Admin API  →  http://localhost:${PORT}`);
  console.log(`Pod: ${POD_PATH}`);
});

// Scheduled publishing — check every 60 s
setInterval(() => {
  try {
    const db  = openPod(POD_PATH);
    const due     = db.getScheduledDue();
    const expired = db.getExpiredDue();
    if (!due.length && !expired.length) { db.close(); return; }
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    for (const entry of due) {
      db.db.prepare("UPDATE _entries SET status = 'published', publish_at = NULL, updated_at = ? WHERE id = ?").run(now, entry.id);
      db.logAudit(entry.id, 'scheduler', 'publish');
    }
    for (const entry of expired) {
      db.db.prepare("UPDATE _entries SET status = 'draft', unpublish_at = NULL, updated_at = ? WHERE id = ?").run(now, entry.id);
      db.logAudit(entry.id, 'scheduler', 'unpublish');
    }
    const webhookUrl = db.getMeta('build.webhook_url') ?? '';
    if (webhookUrl) db.setMeta('build.last_triggered', new Date().toISOString());
    db.close();
    if (due.length)     console.log(`[scheduler] Published ${due.length} scheduled entr${due.length === 1 ? 'y' : 'ies'}`);
    if (expired.length) console.log(`[scheduler] Unpublished ${expired.length} expired entr${expired.length === 1 ? 'y' : 'ies'}`);
    if (webhookUrl) fetch(webhookUrl, { method: 'POST' }).catch(() => {});
  } catch (e) {
    console.warn('[scheduler]', e.message);
  }
}, 60_000);
