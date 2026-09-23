import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_WAVE, OFFLINE_CAP, STORAGE } from '../src/data.js';
import { distance, findPath, fromWorld, key, toWorld } from '../src/hex.js';
import { generateWorld } from '../src/world.js';
import { build, buildProblem, catchUp, deserialise, newGame, partyChance, rates, sendParty, serialise, tick, train } from '../src/sim.js';

const run = (state, seconds, step = 0.25) => {
  const events = [];
  for (let t = 0; t < seconds; t += step) events.push(...tick(state, step));
  return events;
};

test('hex maths round-trips and paths avoid walls', () => {
  for (const [q, r] of [[0, 0], [3, -2], [-4, 5]]) {
    const { x, z } = toWorld(q, r);
    assert.deepEqual(fromWorld(x, z), [q, r]);
  }
  const wall = new Set(['1,0', '1,-1', '0,1']);
  const path = findPath([0, 0], [2, 0], (q, r) => (wall.has(key(q, r)) ? Infinity : 1));
  assert.ok(path && path.at(-1).join() === '2,0' && path.every(([q, r]) => !wall.has(key(q, r))));
});

test('every island has a grass start, wood and stone nearby, and three dungeons', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { tiles, dungeons } = generateWorld(seed);
    assert.equal(tiles.get('0,0').terrain, 'grass');
    const near = (terrain, d) => [...tiles.values()].some((t) => t.terrain === terrain && distance([t.q, t.r], [0, 0]) <= d);
    assert.ok(near('forest', 3), `forest ${seed}`);
    assert.ok(near('hills', 4), `hills ${seed}`);
    assert.equal(dungeons.length, 3, `dungeons ${seed}`);
  }
});

test('building takes time and then produces, joined by a road', () => {
  const state = newGame(7);
  const spot = [...state.tiles.values()].find((t) => !buildProblem(state, 'farm', t.q, t.r) && distance([t.q, t.r], [0, 0]) === 2);
  assert.ok(spot, 'somewhere to farm');
  const farm = build(state, 'farm', spot.q, spot.r);
  assert.equal(farm.state, 'building');
  run(state, 13);
  assert.equal(farm.state, 'ready');
  assert.ok(rates(state).food > 0);
  assert.ok(state.roads.size > 0);
  const food = state.res.food;
  run(state, 10);
  assert.ok(state.res.food > food);
});

test('the first wave comes after ten minutes of play, and trained knights fight it', () => {
  const state = newGame(3);
  state.res = { wood: 300, stone: 300, food: 300, gold: 300 };
  for (let i = 0; i < 3; i++) {
    const t = [...state.tiles.values()].find((x) => !buildProblem(state, 'home', x.q, x.r));
    build(state, 'home', t.q, t.r);
  }
  const spot = [...state.tiles.values()].find((t) => !buildProblem(state, 'barracks', t.q, t.r));
  const barracks = build(state, 'barracks', spot.q, spot.r);
  run(state, 45);
  assert.equal(barracks.state, 'ready');
  for (let i = 0; i < 3; i++) assert.ok(train(state, barracks, 'knight'), `train ${i}`);
  const events = run(state, FIRST_WAVE - state.time + 1);
  assert.ok(events.some((e) => e.type === 'wave'));
  assert.equal(state.units.length, 3);
  assert.ok(state.monsters.length >= 3);
  const later = run(state, 120);
  assert.ok(later.some((e) => e.type === 'monsterDied'), 'monsters die');
});

test('dungeon runs come back after their time, with loot on a win', () => {
  const state = newGame(5);
  const ids = [100, 101, 102, 103];
  for (const id of ids) state.units.push({ id, type: 'barbarian', x: 0, z: 0, hp: 115, state: 'idle', path: [], cooldown: 0, target: null });
  const d = state.dungeons[0];
  assert.ok(partyChance(state, d, ids) > 0.9);
  assert.ok(sendParty(state, d, ids));
  assert.ok(state.units.every((u) => u.state === 'away'));
  const gold = state.res.gold;
  const result = catchUp(state, 200).events.find((e) => e.type === 'dungeon');
  assert.ok(result);
  if (result.won) assert.ok(state.res.gold > gold);
  assert.equal(d.state, 'cooldown');
});

test('while closed, production is capped at 8 hours and no waves come', () => {
  const state = newGame(9);
  state.buildings.push({ id: 99, type: 'farm', q: 1, r: 0, level: 1, hp: 100, state: 'ready', left: 0, queue: [] });
  const { seconds } = catchUp(state, 3 * 24 * 3600);
  assert.equal(seconds, OFFLINE_CAP);
  assert.equal(state.res.food, STORAGE[0]);
  assert.equal(state.monsters.length, 0);
  assert.equal(state.time, 0);
});

test('saves and loads', () => {
  const state = newGame(11);
  run(state, 5);
  const copy = deserialise(serialise(state));
  assert.equal(copy.buildings.length, state.buildings.length);
  assert.equal(copy.revealed.size, state.revealed.size);
  assert.equal(copy.tiles.size, state.tiles.size);
  assert.deepEqual(copy.res, state.res);
});
