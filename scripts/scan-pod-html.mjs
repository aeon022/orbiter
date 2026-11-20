#!/usr/bin/env node
// Report only: which richtext fields (and bodies) of a pod hold HTML instead of Markdown? Nothing is written.
// Usage: node scripts/scan-pod-html.mjs <file.pod> [more.pod …]
import { openPod } from '../packages/core/src/index.js';
const HTML = /^\s*<(p|h[1-6]|ul|ol|div|figure|table|blockquote|section|article|object|span|strong|em|a|img|br)\b/i;
const MD_SPUR = /(^|\n)(#{1,6} |[-*+] |\d+\. |> |!\[)|\*\*[^*\s]|\]\(|==[^=\s]/;
const istHtml = (s) => HTML.test(s) && !MD_SPUR.test(s.replace(/<[^>]*>/g, ''));
for (const file of process.argv.slice(2)) {
  let db; try { db = openPod(file); } catch (e) { console.log(`${file}: not openable (${e.message.split('\n')[0]})`); continue; }
  const rows = [];
  for (const c of db.getCollections()) {
    const schema = JSON.parse(c.schema || '{}');
    const keys = new Set(['body', ...Object.entries(schema).filter(([, f]) => f?.type === 'richtext').map(([k]) => k)]);
    const entries = db.getEntries(c.id);
    for (const k of keys) {
      const total = entries.filter((e) => typeof e.data?.[k] === 'string' && e.data[k].trim()).length;
      const html = entries.filter((e) => typeof e.data?.[k] === 'string' && istHtml(e.data[k])).length;
      if (total) rows.push(`  ${c.id}.${k}: ${html} of ${total} look like HTML${schema[k]?.type ? '' : ' (not in schema)'}`);
    }
  }
  console.log(`${file}${rows.some((r) => !/: 0 of/.test(r)) ? '  ← HTML found' : ''}\n${rows.join('\n') || '  (no text fields)'}`);
  db.close();
}
