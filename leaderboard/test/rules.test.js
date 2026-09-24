import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, validateSubmission } from '../src/rules.js';

const ok = { game: 'block-drop', name: 'Ada', score: 1200, client: 'abcd1234-ef56' };

test('accepts a normal score and tidies the name', () => {
  assert.deepEqual(validateSubmission({ ...ok, name: '  Ada   L ' }).entry, { ...ok, name: 'Ada L' });
});

test('rejects bad games, names, scores and ids', () => {
  for (const bad of [
    { game: 'nope' },
    { name: '' },
    { name: 'waytoolongname' },
    { name: '<script>' },
    { score: 0 },
    { score: 1.5 },
    { score: '100' },
    { game: 'lantern-maze', score: 5000 },
    { client: 'x' },
  ]) {
    assert.ok(validateSubmission({ ...ok, ...bad }).error, JSON.stringify(bad));
  }
});

test('only the site, the apps and local development may call it', () => {
  assert.equal(allowedOrigin('https://kvackie.github.io'), 'https://kvackie.github.io');
  assert.equal(allowedOrigin('https://localhost'), 'https://localhost');
  assert.equal(allowedOrigin('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(allowedOrigin('https://evil.example'), null);
  assert.equal(allowedOrigin(null), null);
});

test('names are tidied', async () => {
  const { cleanName } = await import('../src/rules.js');
  assert.equal(cleanName('  Ada  L '), 'Ada L');
  assert.equal(cleanName('<b>'), null);
});
