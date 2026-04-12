/**
 * orbiter add-user
 * Adds a user to an existing .pod file without needing the dev server.
 *
 * Usage:
 *   orbiter add-user [--pod ./content.pod]
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { openPod, hashPassword } from '@a83/orbiter-core';
import { ask, askSecret, closeRl } from './prompt.js';

export async function run(args) {
  // Parse --pod flag
  const podFlag = args.indexOf('--pod');
  const podArg  = podFlag !== -1 ? args[podFlag + 1] : null;
  const podPath = resolve(process.cwd(), podArg ?? './content.pod');

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}`);
    console.error(`     Pass a path with --pod ./my.pod\n`);
    process.exit(1);
  }

  console.log(`\n  ◆  Orbiter — Add User\n`);
  console.log(`     Pod: ${podPath}\n`);

  const username = await ask('Username');
  if (!username) {
    console.error('  ✕  Username cannot be empty.');
    closeRl();
    process.exit(1);
  }

  const password = await askSecret('Password (min 8 chars)');
  if (password.length < 8) {
    console.error('  ✕  Password must be at least 8 characters.');
    closeRl();
    process.exit(1);
  }

  const roleRaw = await ask('Role [editor/admin]', 'editor');
  const role    = roleRaw === 'admin' ? 'admin' : 'editor';

  closeRl();

  const db = openPod(podPath);

  // Check if username taken
  const taken = db.db.prepare('SELECT id FROM _users WHERE username = ?').get(username);
  if (taken) {
    db.close();
    console.error(`\n  ✕  Username "${username}" is already taken.\n`);
    process.exit(1);
  }

  const hash = await hashPassword(password);
  db.insertUser(randomUUID(), username, hash, role);
  db.close();

  console.log(`\n  ✓  User "${username}" (${role}) created successfully.\n`);
}
