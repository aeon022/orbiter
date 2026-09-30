// Run: node --test packages/core/src/media-backend.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getMediaBackend } from './media-backend.js';

function fakeDb(root) {
  return {
    getMeta: (k) => (k === 'media.backend' ? 'local' : k === 'media.local_path' ? root : null),
    insertMedia: () => {},
  };
}

test('local media backend rejects folder path traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'orbiter-media-'));
  try {
    const backend = getMediaBackend(fakeDb(root));
    await assert.rejects(
      () => backend.upload('id1', 'a.txt', 'text/plain', 4, Buffer.from('test'), null, '../outside'),
      /Invalid folder path/
    );
    // nothing should have been written outside root
    const parentEntries = await readdir(join(root, '..'));
    assert.ok(!parentEntries.includes('outside'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local media backend allows a normal subfolder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'orbiter-media-'));
  try {
    const backend = getMediaBackend(fakeDb(root));
    const { path } = await backend.upload('id2', 'a.txt', 'text/plain', 4, Buffer.from('test'), null, 'sub');
    assert.ok(path.startsWith(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
