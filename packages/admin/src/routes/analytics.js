import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

const BOT_PATTERNS = /bot|crawl|spider|slurp|facebookexternalhit|bingpreview|linkedinbot|twitterbot|whatsapp|telegrambot|gptbot|claudebot|perplexity|anthropic/i;

export const analyticsPublicRoutes = new Hono();
export const analyticsRoutes = new Hono();

// POST /api/hit — public, no auth, wide CORS
analyticsPublicRoutes.post('/', (c) => {
  const db = openPod(c.get('podPath'));
  const enabled = db.getMeta('analytics.enabled') !== '0';
  if (!enabled) { db.close(); return c.json({ ok: true }); }

  const body = c.req.query();
  const path = body.p || '/';
  const referrer = body.r || '';
  const ua = c.req.header('user-agent') || '';
  const lang = (c.req.header('accept-language') || '').split(',')[0] || '';
  const screenW = parseInt(body.w) || null;
  const isBot = BOT_PATTERNS.test(ua);

  db.trackPageview(path, { referrer, ua, lang, screenW, isBot });
  db.close();

  return new Response('', { status: 204 });
});

// Also accept GET with query params (for <img> pixel fallback)
analyticsPublicRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath'));
  const enabled = db.getMeta('analytics.enabled') !== '0';
  if (!enabled) { db.close(); return new Response('', { status: 204 }); }

  const path = c.req.query('p') || '/';
  const referrer = c.req.query('r') || '';
  const ua = c.req.header('user-agent') || '';
  const lang = (c.req.header('accept-language') || '').split(',')[0] || '';
  const screenW = parseInt(c.req.query('w')) || null;
  const isBot = BOT_PATTERNS.test(ua);

  db.trackPageview(path, { referrer, ua, lang, screenW, isBot });
  db.close();

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  return new Response(pixel, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } });
});

// GET /api/analytics — dashboard stats (auth required)
analyticsRoutes.get('/', (c) => {
  const db = openPod(c.get('podPath'));
  const days = Math.min(parseInt(c.req.query('days') ?? '30'), 365);
  const path = c.req.query('path') || undefined;
  const stats = db.getAnalytics({ days, path });
  db.close();
  return c.json(stats);
});

// DELETE /api/analytics/prune — clean old data (auth required)
analyticsRoutes.delete('/prune', (c) => {
  const db = openPod(c.get('podPath'));
  const days = parseInt(c.req.query('days') ?? '90');
  const deleted = db.pruneAnalytics(days);
  db.close();
  return c.json({ ok: true, deleted });
});
