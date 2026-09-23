import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOK, RARE, TRAITS, breed, decode, encode, wildGenes } from '../src/genes.js';

// Small repeatable random numbers for the tests.
function seeded(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

test('wild creatures only have common traits and survive a round trip', () => {
  const rng = seeded(1);
  for (let i = 0; i < 200; i++) {
    const genes = wildGenes(rng);
    assert.deepEqual(decode(encode(genes)), genes);
    for (const trait of Object.keys(TRAITS)) assert.ok(TRAITS[trait].common.includes(genes[trait]), trait);
  }
});

test('children take after their parents, and mutations bring rare traits', () => {
  const rng = seeded(7);
  const a = wildGenes(rng);
  const b = wildGenes(rng);
  let fromParents = 0;
  let traits = 0;
  const found = new Set();
  for (let i = 0; i < 4000; i++) {
    const child = breed(a, b, rng);
    assert.ok(decode(encode(child)), encode(child));
    for (const trait of Object.keys(TRAITS)) {
      traits++;
      if (child[trait] === a[trait] || child[trait] === b[trait]) fromParents++;
      if (RARE.has(`${trait}:${child[trait]}`)) found.add(`${trait}:${child[trait]}`);
    }
  }
  assert.ok(fromParents / traits > 0.88);
  assert.equal(found.size, RARE.size, 'every rare trait can appear');
});

test('rejects impossible genes', () => {
  for (const bad of ['', 'round', 'round.coral.spots.sun.small.two.none.none.300', 'cube.coral.spots.sun.small.two.none.none.100', 42]) {
    assert.equal(decode(bad), null, String(bad));
  }
  assert.equal(BOOK.length, 32);
});
