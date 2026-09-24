import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, POTIONS } from '../src/data.js';
import { brewResult, decay, hotPotion, merchantStock, saleTotal, unitPrice } from '../src/economy.js';

test('every potion can be brewed from the ingredients', () => {
  // Try every mix of up to 4 ingredients (with repeats).
  const ids = INGREDIENTS.map((i) => i.id);
  const mixes = [[]];
  for (let n = 0; n < 4; n++) for (const mix of [...mixes]) for (const id of ids) if (!mix.length || id >= mix.at(-1)) mixes.push([...mix, id]);
  for (const potion of POTIONS) {
    const best = Math.max(...mixes.map((mix) => (mix.length ? brewResult(potion.id, mix) : { quality: 0, ok: false })).filter((r) => r.ok).map((r) => r.quality), 0);
    assert.ok(best > 0.5, `${potion.id} best quality ${best.toFixed(2)}`);
  }
});

test('a good brew makes potions, a wrong one does not', () => {
  const good = brewResult('healthTonic', ['dewcap', 'dewcap', 'dewcap']);
  assert.ok(good.ok && good.count === 2 && good.quality > 0.8);
  assert.equal(brewResult('healthTonic', ['pepper']).ok, false);
});

test('prices fall with selling and recover over time', () => {
  const day = 1000;
  const fresh = unitPrice('windDraught', 0, 1, day);
  const busy = unitPrice('windDraught', 80, 1, day);
  assert.ok(busy < fresh / 2);
  assert.ok(decay(80, 6 * 3600) === 40);
  assert.ok(saleTotal('windDraught', 0, 1, 10, day) < fresh * 10);
});

test('the daily hot potion and merchant are the same for everyone that day', () => {
  assert.equal(hotPotion(20000), hotPotion(20000));
  assert.deepEqual(merchantStock(20000), merchantStock(20000));
  assert.equal(merchantStock(20000).length, 8);
  // The staples are in stock every day.
  for (let day = 20000; day < 20060; day++) for (const id of ['emberroot', 'dewcap']) assert.ok(merchantStock(day).some((o) => o.id === id));
  const hots = new Set(Array.from({ length: 60 }, (_, d) => hotPotion(d)));
  assert.ok(hots.size > 6);
});
