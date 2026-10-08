// Run: node --test packages/core/src/media-variant.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseVariant, focalCrop, renderVariant, canVariant, useSharp } from './media-variant.js';

test('parseVariant snaps widths up, drops unknown values', () => {
  assert.deepEqual(parseVariant(new URLSearchParams('w=700&fmt=webp&ar=16:9')), { w: 800, fmt: 'webp', ar: '16:9' });
  assert.deepEqual(parseVariant(new URLSearchParams('w=99999')), { w: 2000 });
  assert.equal(parseVariant(new URLSearchParams('w=abc&fmt=gif&ar=7:3')), null);
  assert.equal(parseVariant(new URLSearchParams('')), null);
});

test('focalCrop: right aspect, inside the image, follows the focal point', () => {
  const c = focalCrop(1000, 500, 1, 0.9, 0.5);               // square crop of a wide image, subject at right
  assert.deepEqual([c.width, c.height], [500, 500]);
  assert.equal(c.left, 500);                                  // clamped to the right edge
  assert.equal(focalCrop(1000, 500, 1).left, 250);            // default: centred
  const t = focalCrop(400, 800, 16 / 9, 0.5, 0.1);            // wide crop of a tall image, subject at top
  assert.equal(t.top, 0); assert.equal(t.width, 400);
});

test('renderVariant crops/resizes real images, caches, and skips non-raster', async () => {
  // sharp lives in the admin package in this monorepo; hosts hand it over via useSharp()
  const sharp = createRequire(new URL('../../admin/package.json', import.meta.url))('sharp');
  useSharp(sharp);
  const red = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#f00' } }).png().toBuffer();
  const r = await renderVariant('k1', red, 'image/png', { w: 160, ar: '1:1', fmt: 'webp' }, { x: 0.5, y: 0.5 });
  const meta = await sharp(r.data).metadata();
  assert.equal(r.type, 'image/webp'); assert.equal(meta.width, 160); assert.equal(meta.height, 160);
  assert.equal(await renderVariant('k1', red, 'image/png', { w: 160, ar: '1:1', fmt: 'webp' }, { x: 0.5, y: 0.5 }), r, 'second call hits the cache');
  assert.equal(await renderVariant('k2', Buffer.from('<svg/>'), 'image/svg+xml', { w: 160 }), null);
  assert.equal(canVariant('image/gif'), false);
});
