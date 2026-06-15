#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// --port flag → PORT env var
const portIdx = process.argv.indexOf('--port');
if (portIdx !== -1 && process.argv[portIdx + 1]) {
  process.env.PORT = process.argv[portIdx + 1];
}

// When run via `npm run --workspace=...`, npm sets CWD to the workspace dir.
// INIT_CWD is where the user actually ran npm — use that as base for relative paths.
const baseCwd = process.env.INIT_CWD || process.cwd();

// Resolve ORBITER_POD to absolute path (server.js does chdir, so must happen first)
if (process.env.ORBITER_POD) {
  process.env.ORBITER_POD = resolve(baseCwd, process.env.ORBITER_POD);
} else {
  // Auto-detect a single .pod file in the directory where npm was invoked
  const pods = readdirSync(baseCwd).filter(f => f.endsWith('.pod'));
  if (pods.length === 0) {
    console.error('Error: No .pod file found in current directory.');
    console.error('Set ORBITER_POD=/path/to/content.pod or run from the directory containing your .pod file.');
    process.exit(1);
  }
  if (pods.length > 1) {
    console.error('Multiple .pod files found. Specify one with ORBITER_POD:');
    pods.forEach(p => console.error('  ORBITER_POD=' + resolve(baseCwd, p)));
    process.exit(1);
  }
  process.env.ORBITER_POD = resolve(baseCwd, pods[0]);
}

await import('./server.js');
