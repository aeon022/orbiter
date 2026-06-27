export const prerender = false;

/**
 * GET /llms-full.txt
 * Full content dump for AI agents — complete entry bodies, grouped by collection.
 * Follows the llms.txt convention: https://llmstxt.org
 * Lightweight index available at /llms.txt
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const TEXT_H = { 'Content-Type': 'text/plain; charset=utf-8' };

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  const db = openPod(podPath);

  const siteName = db.getMeta('site.name') || 'Orbiter Site';
  const siteUrl  = (db.getMeta('site.url') || '').replace(/\/$/, '');
  const siteDesc = db.getMeta('site.description') || '';
  const llmsCols = db.getMeta('llms.collections') || '';

  const allowedCols = llmsCols
    ? new Set(llmsCols.split(',').map(s => s.trim()).filter(Boolean))
    : null;

  const cols = db.getCollections();
  const sections = [];

  for (const col of cols) {
    if (allowedCols && !allowedCols.has(col.id)) continue;

    const entries = db.getEntries(col.id, { status: 'published' });
    if (!entries.length) continue;

    const entryBlocks = [];

    for (const e of entries) {
      const d = e.data;
      const url = siteUrl ? `${siteUrl}/${col.id}/${e.slug}` : `/${col.id}/${e.slug}`;
      const title = d.title || e.slug;
      const body = d.body ? stripHtml(d.body) : (d.content ? stripHtml(d.content) : '');
      const excerpt = d.excerpt || d.summaryMachine || '';
      const author = d.author || d.authorName || '';
      const date = (e.updated_at || e.created_at || '').split(' ')[0];

      const lines = [`### ${title}`, `URL: ${url}`];
      if (date)    lines.push(`Date: ${date}`);
      if (author)  lines.push(`Author: ${author}`);
      if (excerpt) lines.push(`Summary: ${excerpt}`);
      if (body)    lines.push('', body);

      entryBlocks.push(lines.join('\n'));
    }

    sections.push(`## ${col.label || col.id}\n\n${entryBlocks.join('\n\n---\n\n')}`);
  }

  db.close();

  const header = `# ${siteName}\n\n` +
    (siteDesc ? `> ${siteDesc}\n\n` : '') +
    (siteUrl ? `- Home: ${siteUrl}\n` : '') +
    (siteUrl ? `- Index: ${siteUrl}/llms.txt\n` : '') +
    '\n';

  return new Response(header + sections.join('\n\n') + '\n', { headers: TEXT_H });
}
