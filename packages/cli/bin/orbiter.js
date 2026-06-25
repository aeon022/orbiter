#!/usr/bin/env node
import { argv, exit } from 'node:process';

const [,, command, ...args] = argv;

const commands = {
  init:       () => import('../src/init.js').then(m => m.run(args)),
  'add-user': () => import('../src/add-user.js').then(m => m.run(args)),
  export:     () => import('../src/export.js').then(m => m.run(args)),
  publish:    () => import('../src/publish.js').then(m => m.run(args)),
  backup:     () => import('../src/backup.js').then(m => m.run(args)),
  unpack:     () => import('../src/unpack.js').then(m => m.run(args)),
  pack:       () => import('../src/pack.js').then(m => m.run(args)),
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

  Options:
    -h, --help    Show this help message
`);
}

main().catch(err => {
  console.error(err.message ?? err);
  exit(1);
});
