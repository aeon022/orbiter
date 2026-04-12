#!/usr/bin/env node
import { argv, exit } from 'node:process';

const [,, command, ...args] = argv;

const commands = {
  init:       () => import('../src/init.js').then(m => m.run(args)),
  'add-user': () => import('../src/add-user.js').then(m => m.run(args)),
  export:     () => import('../src/export.js').then(m => m.run(args)),
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
    init          Scaffold a new Orbiter + Astro project
    add-user      Add a user to an existing .pod file
    export        Export content from a .pod file to JSON
    unpack        Extract media BLOBs to files (pod → git mode)
    pack          Re-insert media files as BLOBs (git → server mode)

  Options:
    -h, --help    Show this help message
`);
}

main().catch(err => {
  console.error(err.message ?? err);
  exit(1);
});
