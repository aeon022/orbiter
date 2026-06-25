import { Hono } from 'hono';
import { generateStaticSite, getPublishStats } from '../publish/generator.js';
import { themes, defaultTheme } from '../publish/themes/index.js';

export const publishRoutes = new Hono();

publishRoutes.get('/status', (c) => {
  const stats = getPublishStats(c.get('podPath'));
  return c.json(stats);
});

publishRoutes.get('/themes', (c) => {
  const list = Object.values(themes).map(t => t.meta);
  return c.json({ themes: list, default: defaultTheme });
});

publishRoutes.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const themeId = body.theme || defaultTheme;

  if (!themes[themeId]) {
    return c.json({ error: `Unknown theme: ${themeId}` }, 400);
  }

  const buffer = await generateStaticSite(c.get('podPath'), { themeId });
  const siteName = (body.siteName || 'site').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${siteName}-${Date.now()}.zip"`,
      'Content-Length': String(buffer.length),
    },
  });
});
