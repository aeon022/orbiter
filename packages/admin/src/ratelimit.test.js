// Run: node --test packages/admin/src/ratelimit.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allow } from './ratelimit.js';

test('allow() blocks after max within window, per key', () => {
  assert.ok(allow('a', 2, 1000)); assert.ok(allow('a', 2, 1000));
  assert.equal(allow('a', 2, 1000), false);
  assert.ok(allow('b', 2, 1000));
});
