/**
 * orbiter publish
 * Generates a static HTML site from a .pod file.
 *
 * Usage:
 *   orbiter publish [--pod <path>] [--out <dir>] [--theme orbit|canvas]
 */
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { openPod } from '@a83/orbiter-core';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const opts = { pod: './content.pod', out: './site', theme: 'orbit' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pod' && args[i + 1]) opts.pod = args[++i];
    else if (args[i] === '--out' && args[i + 1]) opts.out = args[++i];
    else if (args[i] === '--theme' && args[i + 1]) opts.theme = args[++i];
  }
  return opts;
}

export async function run(args) {
  const opts = parseArgs(args);
  const podPath = resolve(process.cwd(), opts.pod);
  const outDir = resolve(process.cwd(), opts.out);

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }

  console.log(`\n  ◆  Orbiter — Publish HTML\n`);
  console.log(`  Pod:   ${podPath}`);
  console.log(`  Theme: ${opts.theme}`);
  console.log(`  Out:   ${outDir}\n`);

  let generateStaticSite;
  try {
    const mod = await import(join(__dirname, '../../admin/src/publish/generator.js'));
    generateStaticSite = mod.generateStaticSite;
  } catch (e) {
    console.error(`  ✕  Could not load publish generator.\n  ${e.message}`);
    process.exit(1);
  }

  console.log('  Generating…');
  const buffer = await generateStaticSite(podPath, { themeId: opts.theme });

  mkdirSync(outDir, { recursive: true });
  const zip = new AdmZip(buffer);
  zip.extractAllTo(outDir, true);

  const db = openPod(podPath);
  const siteName = db.getMeta('site.name') || 'site';
  db.close();

  console.log(`\n  ✓  Published ${zip.getEntries().length} files to ${outDir}`);
  console.log(`     Site: ${siteName}`);
  console.log(`     Theme: ${opts.theme}\n`);
}
