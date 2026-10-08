import { Hono } from 'hono';
import { openPod, securityChecks, isTrackedByGit } from '@a83/orbiter-core';
import { requireAdmin } from '../middleware/auth.js';

export const securityRoutes = new Hono();
securityRoutes.use('*', requireAdmin);

// GET /api/security-check — same findings as `orbiter doctor`
securityRoutes.get('/', (c) => {
  const podPath = c.get('podPath');
  const db = openPod(podPath);
  const findings = securityChecks(db, { gitTracked: isTrackedByGit(podPath) });
  db.close();
  return c.json({ findings });
});
