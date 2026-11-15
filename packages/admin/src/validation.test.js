import test from 'node:test';
import assert from 'node:assert/strict';
import { slugInvalid } from './routes/entries.js';
import { USERNAME_RE } from './routes/users.js';

test('slugs: markup/quotes/control chars refused, normal and unicode slugs pass', () => {
  for (const bad of ['a"b', "a'b", 'a<b', 'a>b', 'a`b', 'a\\b', 'a\nb', '', '  ', 'x'.repeat(201), null])
    assert.equal(slugInvalid(bad), true, String(bad));
  for (const ok of ['hello-world', 'docs/intro', 'ümläut-äöß', 'v1.2.3', 'x'.repeat(200)])
    assert.equal(slugInvalid(ok), false, ok);
});

test('usernames: no markup, 2-64 chars', () => {
  for (const bad of ['<img src=x onerror=1>', 'a', 'a b', 'x'.repeat(65), 'a"b']) assert.equal(USERNAME_RE.test(bad), false, bad);
  for (const ok of ['admin', 'ok.name@x-y', 'Jürgen_2', 'a+b']) assert.equal(USERNAME_RE.test(ok), true, ok);
});
