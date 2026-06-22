import { Hono } from 'hono';
import { Client } from 'basic-ftp';
import { existsSync } from 'node:fs';
import { openPod } from '@a83/orbiter-core';
import { requireAdmin } from '../middleware/auth.js';

export const deployRoutes = new Hono();
deployRoutes.use('*', requireAdmin);

async function getFtpCfg(podPath) {
  const db = openPod(podPath);
  const cfg = {
    host:       db.getMeta('ftp.host')        ?? '',
    port:       parseInt(db.getMeta('ftp.port') ?? '21', 10),
    user:       db.getMeta('ftp.user')        ?? '',
    password:   db.getMeta('ftp.password')    ?? '',
    remotePath: db.getMeta('ftp.remote_path') ?? '/',
    localPath:  db.getMeta('ftp.local_path')  ?? '',
    secure:     db.getMeta('ftp.secure')      === '1',
  };
  db.close();
  return cfg;
}

export async function runFtpDeploy(podPath) {
  const cfg = await getFtpCfg(podPath);
  if (!cfg.host || !cfg.user || !cfg.password || !cfg.localPath) {
    throw new Error('FTP not fully configured');
  }
  if (!existsSync(cfg.localPath)) {
    throw new Error(`Local path not found: ${cfg.localPath}`);
  }

  const client = new Client();
  client.ftp.verbose = false;
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, secure: cfg.secure });
    await client.uploadFromDir(cfg.localPath, cfg.remotePath || '/');

    const db = openPod(podPath);
    db.setMeta('ftp.last_deploy', new Date().toISOString());
    db.setMeta('ftp.last_status', 'ok');
    db.setMeta('ftp.last_error',  '');
    db.close();
  } finally {
    client.close();
  }
}

// GET /api/deploy/ftp/status
deployRoutes.get('/ftp/status', (c) => {
  const db = openPod(c.get('podPath'));
  const out = {
    configured: !!(db.getMeta('ftp.host') && db.getMeta('ftp.user') && db.getMeta('ftp.password') && db.getMeta('ftp.local_path')),
    lastDeploy: db.getMeta('ftp.last_deploy') ?? null,
    lastStatus: db.getMeta('ftp.last_status') ?? null,
    lastError:  db.getMeta('ftp.last_error')  ?? null,
    autoDeploy: db.getMeta('ftp.auto_deploy') === '1',
  };
  db.close();
  return c.json(out);
});

// POST /api/deploy/ftp — run full deploy
deployRoutes.post('/ftp', async (c) => {
  try {
    await runFtpDeploy(c.get('podPath'));
    return c.json({ ok: true });
  } catch (err) {
    const db = openPod(c.get('podPath'));
    db.setMeta('ftp.last_status', 'error');
    db.setMeta('ftp.last_error',  err.message);
    db.close();
    return c.json({ error: err.message }, 502);
  }
});

// POST /api/deploy/ftp/test — test connection only, no upload
deployRoutes.post('/ftp/test', async (c) => {
  const cfg = await getFtpCfg(c.get('podPath'));
  if (!cfg.host || !cfg.user || !cfg.password) {
    return c.json({ error: 'FTP credentials not configured — save settings first' }, 400);
  }

  const client = new Client();
  client.ftp.verbose = false;
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, secure: cfg.secure });
    const list = await client.list(cfg.remotePath || '/');
    return c.json({ ok: true, files: list.length, path: cfg.remotePath || '/' });
  } catch (err) {
    return c.json({ error: err.message }, 502);
  } finally {
    client.close();
  }
});
