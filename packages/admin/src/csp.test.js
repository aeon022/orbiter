// Run: node --test packages/admin/src/csp.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addNonce, policy } from './csp.js';

test('addNonce tags every <script>, once, and nothing else', () => {
  const html = '<script src="/a.js"></script><script type="module">x()</script><script nonce="keep">y()</script><p>script <scripts></p>';
  const out = addNonce(html, 'N1');
  assert.equal((out.match(/nonce="N1"/g) ?? []).length, 2);
  assert.ok(out.includes('<script nonce="keep">'), 'existing nonce untouched');
  assert.ok(out.includes('<scripts>'), 'other tags untouched');
});

test('policy carries the nonce and forbids plugins/framing', () => {
  const p = policy('abc');
  assert.match(p, /script-src 'nonce-abc' 'strict-dynamic'/);
  assert.match(p, /object-src 'none'/);
  assert.match(p, /frame-ancestors 'self'/);
});
