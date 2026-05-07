import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { authRoutes }       from './routes/auth.js';
import { collectionRoutes } from './routes/collections.js';
import { entryRoutes }      from './routes/entries.js';
import { mediaRoutes }      from './routes/media.js';
import { userRoutes }       from './routes/users.js';
import { metaRoutes }       from './routes/meta.js';
import { requireAuth }      from './middleware/auth.js';

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

  // Public routes
  app.route('/api/auth', authRoutes);

  // Protected routes
  const api = new Hono();
  api.use('*', requireAuth);
  api.route('/collections',  collectionRoutes);
  api.route('/collections',  entryRoutes);
  api.route('/media',        mediaRoutes);
  api.route('/users',        userRoutes);
  api.route('/meta',         metaRoutes);

  app.route('/api', api);

  app.get('/health', (c) => c.json({ ok: true, pod: podPath }));

  return app;
}

serve({ fetch: createApp(POD_PATH).fetch, port: PORT }, () => {
  console.log(`Orbiter Admin API  →  http://localhost:${PORT}`);
  console.log(`Pod: ${POD_PATH}`);
});
