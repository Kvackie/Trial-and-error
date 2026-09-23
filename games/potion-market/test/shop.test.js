import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addToCauldron, brew, buy, emptyCauldron, helpIfBroke, learn, newShop, recordSale } from '../src/shop.js';

test('buy, brew and sell', () => {
  const shop = newShop();
  for (let i = 0; i < 3; i++) assert.ok(buy(shop, 'dewcap', 5));
  assert.equal(shop.gold, 105);
  for (let i = 0; i < 3; i++) assert.equal(addToCauldron(shop, 'dewcap'), null);
  assert.equal(addToCauldron(shop, 'dewcap'), 'noneLeft');
  const result = brew(shop);
  assert.ok(result.first);
  assert.equal(shop.stock.healthTonic.count, 2);
  recordSale(shop, 'healthTonic', 2, 60);
  assert.equal(shop.gold, 165);
  assert.equal(shop.earned, 60);
  assert.equal(shop.stock.healthTonic, undefined);
});

test('a wrong mix stays in the cauldron and can be emptied back', () => {
  const shop = newShop();
  buy(shop, 'pepper', 20);
  addToCauldron(shop, 'pepper');
  assert.equal(brew(shop), null);
  emptyCauldron(shop);
  assert.equal(shop.inventory.pepper, 1);
});

test('recipes cost gold, and a broke shop gets help once a day', () => {
  const shop = newShop();
  assert.equal(learn(shop, 'nightGlass'), false);
  shop.gold = 5;
  assert.ok(helpIfBroke(shop, 100) > 0);
  assert.equal(helpIfBroke(shop, 100), 0);
});
