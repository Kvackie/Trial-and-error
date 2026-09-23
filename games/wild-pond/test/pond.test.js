import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAIT_EVERY, GROW_MS, addCreature, canBreed, newPond, updateBait } from '../src/pond.js';
import { wildGenes } from '../src/genes.js';

test('a new pond has three grown-up creatures and their book entries', () => {
  const pond = newPond(1_000_000);
  assert.equal(pond.creatures.length, 3);
  assert.ok(pond.creatures.every((c) => canBreed(c, 1_000_000)));
  assert.ok(pond.found.length >= 7);
});

test('babies must grow up, and bait comes back over time', () => {
  const pond = newPond(0);
  const { creature } = addCreature(pond, wildGenes(), { now: 0 });
  assert.equal(canBreed(creature, GROW_MS - 1), false);
  assert.equal(canBreed(creature, GROW_MS), true);
  pond.bait = 0;
  pond.baitAt = 0;
  updateBait(pond, BAIT_EVERY * 2 + 5);
  assert.equal(pond.bait, 2);
  updateBait(pond, BAIT_EVERY * 10);
  assert.equal(pond.bait, 3);
});
