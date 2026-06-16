/**
 * orbiter export
 * Exports published content from a .pod file.
 *
 * Usage:
 *   orbiter export [--pod ./content.pod] [--out ./export] [--format json|md] [--collection <id>]
 */
import { resolve, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { openPod } from '@a83/orbiter-core';

export async function run(args) {
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : fallback;
  };

  const podPath   = resolve(process.cwd(), get('--pod', './content.pod'));
  const outDir    = resolve(process.cwd(), get('--out', './export'));
  const format    = get('--format', 'json');
  const onlyCol   = get('--collection', null);
  const locale    = get('--locale', undefined);
  const drafts    = args.includes('--drafts');

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }

  if (format !== 'json' && format !== 'md') {
    console.error(`\n  ✕  Unknown format "${format}". Use json or md.\n`);
    process.exit(1);
  }

  console.log(`\n  ◆  Orbiter — Export\n`);
  console.log(`     Pod:    ${podPath}`);
  console.log(`     Output: ${outDir}`);
  console.log(`     Format: ${format}`);
  if (locale) console.log(`     Locale: ${locale}`);
  if (drafts) console.log(`     Status: all (including drafts)`);
  console.log('');

  const db          = openPod(podPath);
  const collections = db.getCollections().filter(c => !onlyCol || c.id === onlyCol);
  const query       = { status: drafts ? undefined : 'published', locale };

  let totalCount = 0;

  for (const col of collections) {
    const entries = db.getEntries(col.id, query);
    if (entries.length === 0) continue;

    const colDir = join(outDir, col.id);
    mkdirSync(colDir, { recursive: true });

    for (const entry of entries) {
      const locSuffix = entry.locale ? `.${entry.locale}` : '';
      if (format === 'json') {
        const out = {
          id:         entry.id,
          slug:       entry.slug,
          locale:     entry.locale || null,
          status:     entry.status,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          ...entry.data,
        };
        writeFileSync(join(colDir, `${entry.slug}${locSuffix}.json`), JSON.stringify(out, null, 2));
      } else {
        // Markdown: YAML frontmatter + body field
        const { body, ...rest } = entry.data ?? {};
        const frontmatter = Object.entries({
          id:         entry.id,
          slug:       entry.slug,
          locale:     entry.locale || null,
          status:     entry.status,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          ...rest,
        })
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join('\n');
        const content = `---\n${frontmatter}\n---\n\n${body ?? ''}`;
        writeFileSync(join(colDir, `${entry.slug}${locSuffix}.md`), content);
      }
      totalCount++;
    }

    console.log(`  ✓  ${col.label ?? col.id}: ${entries.length} entries`);
  }

  db.close();
  console.log(`\n  Done. ${totalCount} entries exported to ${outDir}\n`);
}
