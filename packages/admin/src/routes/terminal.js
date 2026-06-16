import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const terminalRoutes = new Hono();

// GET /api/terminal/export?col=<id>&format=json|md&drafts=0|1
terminalRoutes.get('/export', (c) => {
  const podPath    = c.get('podPath');
  const colId      = c.req.query('col');
  const format     = c.req.query('format') || 'json';
  const inclDrafts = c.req.query('drafts') === '1';

  if (!colId) return c.json({ error: 'col is required' }, 400);

  const db  = openPod(podPath);
  const col = db.getCollections().find(col => col.id === colId);
  if (!col) { db.close(); return c.json({ error: 'Collection not found' }, 404); }

  const entries = inclDrafts
    ? db.getEntries(colId)
    : db.getEntries(colId, { status: 'published' });
  db.close();

  if (format === 'md') {
    const md = entries.map(e =>
      `---\nslug: ${JSON.stringify(e.slug)}\nstatus: ${JSON.stringify(e.status)}\n---\n\n${e.content || ''}`
    ).join('\n\n---\n\n');
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${colId}.md"`,
      },
    });
  }

  return new Response(JSON.stringify({ collection: colId, entries }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${colId}.json"`,
    },
  });
});
