// Run: node --test packages/admin/src/net.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, clientIp, safeFetch } from './net.js';

test('isPrivateIp', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.5', '172.16.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700::1111'])
    assert.equal(isPrivateIp(ip), false, ip);
});

test('clientIp ignores X-Forwarded-For from public peers, uses rightmost behind a proxy', () => {
  assert.equal(clientIp('203.0.113.9', '1.2.3.4'), '203.0.113.9');
  assert.equal(clientIp('127.0.0.1', '6.6.6.6, 203.0.113.9'), '203.0.113.9');
  assert.equal(clientIp('127.0.0.1', undefined), '127.0.0.1');
});

test('safeFetch blocks private targets and non-http schemes', async () => {
  await assert.rejects(safeFetch('http://127.0.0.1:1/'), /private/);
  await assert.rejects(safeFetch('http://169.254.169.254/latest/meta-data/'), /private/);
  await assert.rejects(safeFetch('http://[::1]/'), /private/);
  await assert.rejects(safeFetch('file:///etc/passwd'), /http/);
});
