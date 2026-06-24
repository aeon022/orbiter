export const prerender = false;

/**
 * GET /orbiter/llms.txt
 * Machine-readable content map for AI agents.
 * Lists all published entries with summaries, grouped by collection.
 * Follows the llms.txt convention: https://llmstxt.org
 */
import { podPath } from 'orbiter:db';
import { openPod } from '@a83/orbiter-core';

const TEXT_H = { 'Content-Type': 'text/plain; charset=utf-8' };

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

    const schema = col.schema ? JSON.parse(col.schema) : {};
    const hasSummaryMachine = !!schema.summaryMachine;
    const hasExcerpt = !!schema.excerpt;

    const lines = [];
    for (const e of entries) {
      const d = e.data;
      const summary = d.summaryMachine || d.excerpt || d.humanSummary || d.title || '';
      const url = siteUrl ? `${siteUrl}/${col.id}/${e.slug}` : `/${col.id}/${e.slug}`;

      let line = `- [${d.title || e.slug}](${url})`;
      if (summary && summary !== d.title) line += `: ${summary.replace(/\n/g, ' ').slice(0, 300)}`;
      lines.push(line);
    }

    sections.push(`## ${col.label || col.id}\n\n${lines.join('\n')}`);
  }

  db.close();

  const header = `# ${siteName}\n\n` +
    (siteDesc ? `> ${siteDesc}\n\n` : '') +
    (siteUrl ? `- Home: ${siteUrl}\n` : '') +
    (siteUrl ? `- JSON Feed: ${siteUrl}/orbiter/feed.json\n` : '') +
    (siteUrl ? `- Sitemap: ${siteUrl}/orbiter/sitemap.xml\n` : '') +
    '\n';

  const body = sections.join('\n\n');

  return new Response(header + body + '\n', { headers: TEXT_H });
}
