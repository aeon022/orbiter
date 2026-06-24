import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

const BOT_PATTERNS = /bot|crawl|spider|slurp|facebookexternalhit|bingpreview|linkedinbot|twitterbot|whatsapp|telegrambot|gptbot|claudebot|perplexity|anthropic|cohere-ai|chatgpt|meta-externalagent/i;

const AGENT_CLASSIFY = [
  [/gptbot/i,              'ai-crawler',   'GPTBot'],
  [/claudebot/i,           'ai-crawler',   'ClaudeBot'],
  [/anthropic/i,           'ai-crawler',   'Anthropic'],
  [/perplexity/i,          'ai-agent',     'Perplexity'],
  [/chatgpt/i,             'ai-agent',     'ChatGPT'],
  [/cohere-ai/i,           'rag-pipeline', 'Cohere'],
  [/meta-externalagent/i,  'ai-crawler',   'Meta AI'],
  [/bingbot|bingpreview/i, 'search',       'Bing'],
  [/googlebot/i,           'search',       'Google'],
  [/feedbin|feedly|newsblur|miniflux|inoreader/i, 'feed-reader', 'Feed Reader'],
];

function classifyAgent(ua) {
  for (const [re, type, name] of AGENT_CLASSIFY) {
    if (re.test(ua)) return { type, name };
  }
  if (BOT_PATTERNS.test(ua)) return { type: 'bot', name: 'Other Bot' };
  return null;
}

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

// GET /api/analytics/agents — AI agent breakdown (auth required)
analyticsRoutes.get('/agents', (c) => {
  const db = openPod(c.get('podPath'));
  const days = Math.min(parseInt(c.req.query('days') ?? '30'), 365);
  const since = `datetime('now', '-${days} days')`;

  const rows = db.db.prepare(
    `SELECT ua, path, COUNT(*) as hits, MAX(created_at) as last_seen
     FROM _analytics WHERE is_bot = 1 AND created_at >= ${since}
     GROUP BY ua, path ORDER BY hits DESC LIMIT 200`
  ).all();

  const agentMap = {};
  for (const row of rows) {
    const cls = classifyAgent(row.ua);
    if (!cls) continue;
    const key = cls.name;
    if (!agentMap[key]) agentMap[key] = { type: cls.type, name: cls.name, hits: 0, lastSeen: '', topPaths: {} };
    agentMap[key].hits += row.hits;
    if (row.last_seen > agentMap[key].lastSeen) agentMap[key].lastSeen = row.last_seen;
    agentMap[key].topPaths[row.path] = (agentMap[key].topPaths[row.path] || 0) + row.hits;
  }

  const agents = Object.values(agentMap)
    .sort((a, b) => b.hits - a.hits)
    .map(a => ({
      ...a,
      topPaths: Object.entries(a.topPaths).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([p, h]) => ({ path: p, hits: h })),
    }));

  db.close();
  return c.json({ agents, period: days });
});

// DELETE /api/analytics/prune — clean old data (auth required)
analyticsRoutes.delete('/prune', (c) => {
  const db = openPod(c.get('podPath'));
  const days = parseInt(c.req.query('days') ?? '90');
  const deleted = db.pruneAnalytics(days);
  db.close();
  return c.json({ ok: true, deleted });
});
