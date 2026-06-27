#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { exec } from 'node:child_process';

const [,, command, ...args] = argv;
const DOCS_URL = 'https://github.com/aeon022/orbiter#readme';

const commands = {
  init:       () => import('../src/init.js').then(m => m.run(args)),
  'add-user': () => import('../src/add-user.js').then(m => m.run(args)),
  export:     () => import('../src/export.js').then(m => m.run(args)),
  publish:    () => import('../src/publish.js').then(m => m.run(args)),
  backup:     () => import('../src/backup.js').then(m => m.run(args)),
  unpack:     () => import('../src/unpack.js').then(m => m.run(args)),
  pack:       () => import('../src/pack.js').then(m => m.run(args)),
  status:     () => import('../src/status.js').then(m => m.run(args)),
  sync:       () => import('../src/sync.js').then(m => m.run(args)),
  encrypt:    () => import('../src/encrypt.js').then(m => m.runEncrypt(args)),
  decrypt:    () => import('../src/encrypt.js').then(m => m.runDecrypt(args)),
  docs:       () => openDocs(),
  help:       () => printHelp(),
};

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    exit(1);
  }
  await handler();
}

function openDocs() {
  const opener = process.platform === 'darwin' ? 'open'
               : process.platform === 'win32'  ? 'start'
               : 'xdg-open';
  exec(`${opener} ${DOCS_URL}`);
  console.log(`  Opening docs → ${DOCS_URL}`);
}

function printHelp() {
  console.log(`
  Orbiter CLI

  Usage: orbiter <command> [options]

  Commands:
    init                           Scaffold a new Orbiter + Astro project
    add-user [--pod <path>]        Add a user to an existing .pod file
    export   [--pod <path>]        Export content from a .pod file
             [--out <dir>]           Output directory (default: ./export)
             [--format json|md]      Output format (default: json)
             [--collection <id>]     Export a single collection
             [--locale <code>]       Export a specific locale only
             [--drafts]              Include draft entries
    publish  [--pod <path>]        Generate a static HTML site from a pod
             [--out <dir>]           Output directory (default: ./site)
             [--theme orbit|canvas]  Theme to use (default: orbit)
    backup   [--pod <path>]        Create a timestamped backup of a pod
             [--out <dir>]           Backup directory (default: same as pod)
    unpack   [--pod <path>]        Extract media BLOBs to files (pod → git mode)
    pack     [--pod <path>]        Re-insert media files as BLOBs (git → server mode)
    status   [pod-path]            Show pod health — entry counts, size, last modified
    sync     --remote user@host:/path/content.pod
             [--pod <path>] [--pull]  Push or pull pod via rsync
    encrypt  [--pod <path>]        Encrypt a .pod file → .pod.enc (AES-256-GCM)
             [--out <path>]          Output path (default: <pod>.enc)
             [--key <passphrase>]    Passphrase (prompted if omitted)
    decrypt  [--in <path>]         Decrypt a .pod.enc file → .pod
             [--out <path>]          Output path (default: strip .enc)
             [--key <passphrase>]    Passphrase (prompted if omitted)
    docs                           Open the Orbiter documentation in your browser

  Options:
    -h, --help    Show this help message
`);
}

main().catch(err => {
  console.error(err.message ?? err);
  exit(1);
});
