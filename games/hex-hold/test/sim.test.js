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

test('building takes time and then produces', () => {
  const state = newGame(7);
  const spot = [...state.tiles.values()].find((t) => !buildProblem(state, 'farm', t.q, t.r) && distance([t.q, t.r], [0, 0]) === 2);
  assert.ok(spot, 'somewhere to farm');
  const farm = build(state, 'farm', spot.q, spot.r);
  assert.equal(farm.state, 'building');
  run(state, 13);
  assert.equal(farm.state, 'ready');
  assert.ok(rates(state).food > 0);
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
  // Nobody is left standing between two hexes.
  for (const a of [...state.units, ...state.monsters].filter((x) => !x.path.length)) {
    const c = toWorld(...fromWorld(a.x, a.z));
    assert.ok(Math.hypot(a.x - c.x, a.z - c.z) < 0.01, `${a.type} at ${a.x},${a.z}`);
  }
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

test('the island rises in steps of one level from the beach', async () => {
  const { neighbours } = await import('../src/hex.js');
  for (let seed = 1; seed <= 20; seed++) {
    const { tiles } = generateWorld(seed);
    const levels = new Set();
    for (const t of tiles.values()) {
      if (t.terrain === 'water') continue;
      levels.add(t.level);
      for (const [q, r] of neighbours(t.q, t.r)) {
        const n = tiles.get(key(q, r));
        if (!n || n.terrain === 'water') assert.equal(t.level, 0, `shore ${seed}`);
        else assert.ok(Math.abs(n.level - t.level) <= 1, `step ${seed}`);
      }
    }
    assert.ok(levels.size >= 2, `varied ${seed}`);
  }
});

test('heroes level up from kills, and blacksmith research makes every unit stronger', async () => {
  const { maxHp, damageOf, heroLevel, startResearch } = await import('../src/sim.js');
  const state = newGame(21);
  const u = { id: 500, type: 'knight', name: 'Test', xp: 0, x: 0, z: 0, hp: 150, state: 'idle', path: [], cooldown: 0, target: null };
  state.units.push(u);
  const hp1 = maxHp(state, u);
  const dmg1 = damageOf(state, u);
  u.xp = 130;
  assert.equal(heroLevel(u), 3);
  assert.ok(maxHp(state, u) > hp1 && damageOf(state, u) > dmg1);
  const smith = { id: 501, type: 'blacksmith', q: 1, r: 0, level: 1, hp: 260, state: 'ready', left: 0, queue: [] };
  state.buildings.push(smith);
  state.res = { wood: 300, stone: 300, food: 300, gold: 300 };
  const before = damageOf(state, u);
  assert.ok(startResearch(state, smith, 'weapons'));
  const events = run(state, 46);
  assert.ok(events.some((e) => e.type === 'researched'));
  assert.ok(damageOf(state, u) > before);
});

test('every fifth wave brings a titan, and catapults hit several monsters', async () => {
  const { waveMonsters } = await import('../src/data.js');
  assert.ok(waveMonsters(5).includes('titan'));
  assert.ok(!waveMonsters(4).includes('titan'));
  const state = newGame(4);
  state.buildings.push({ id: 700, type: 'catapult', q: 0, r: 1, level: 1, hp: 420, state: 'ready', left: 0, queue: [] });
  const { x, z } = toWorld(2, 1);
  for (let i = 0; i < 3; i++) state.monsters.push({ id: 800 + i, type: 'slime', x, z, hp: 100, maxHp: 100, path: [], cooldown: 99, target: null, strength: 1 });
  run(state, 2);
  assert.ok(state.monsters.every((m) => m.hp < 100), 'splash hit all three');
});

test('taverns make homes hold more, markets trade, and goals pay out once', async () => {
  const { population, trade } = await import('../src/sim.js');
  const state = newGame(8);
  const add = (id, type, q, r) => state.buildings.push({ id, type, q, r, level: 1, hp: 100, state: 'ready', left: 0, queue: [] });
  add(600, 'home', 1, 0);
  add(601, 'home', -1, 0);
  const before = population(state).cap;
  add(602, 'tavern', 0, 1);
  assert.equal(population(state).cap, before + 2);
  add(603, 'market', 0, -1);
  state.res.wood = 100;
  const got = trade(state, state.buildings.at(-1), 'wood', 'gold');
  assert.ok(got > 0 && state.res.wood === 70);
  const events = run(state, 2);
  assert.ok(events.some((e) => e.type === 'goal' && e.goal.id === 'homes'));
  assert.ok(!run(state, 2).some((e) => e.type === 'goal' && e.goal.id === 'homes'));
});

test('walls stop monsters until they break through; gates let units pass', async () => {
  const { moveUnits } = await import('../src/sim.js');
  const state = newGame(12);
  const ring = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  ring.forEach(([q, r], i) => {
    const tile = state.tiles.get(key(q, r));
    tile.terrain = 'grass';
    state.buildings.push({ id: 900 + i, type: i === 0 ? 'gate' : 'wall', q, r, level: 1, hp: 300, state: 'ready', left: 0, queue: [] });
  });
  // A unit inside can walk out through the gate.
  state.units.push({ id: 950, type: 'scout', name: 'S', xp: 0, ...toWorld(0, 0), hp: 60, state: 'idle', path: [], cooldown: 0, target: null });
  assert.ok(moveUnits(state, [950], 3, 0));
  assert.ok(state.units[0].path.some(([q, r]) => q === 1 && r === 0), 'goes through the gate');
  state.units = [];
  // A monster outside has to break a wall or the gate to reach the castle.
  const { x, z } = toWorld(3, -1);
  state.monsters.push({ id: 960, type: 'golem', x, z, hp: 5000, maxHp: 5000, path: [], cooldown: 0, target: null, strength: 1 });
  const events = run(state, 60);
  assert.ok(events.some((e) => e.type === 'attack' && e.monster));
  const castle = state.buildings.find((b) => b.type === 'castle');
  const walls = state.buildings.filter((b) => b.id >= 900);
  assert.ok(walls.some((w) => w.hp < 300) || castle.hp < 800);
  assert.ok(!walls.every((w) => w.hp === 300) , 'a wall or the gate took the hits');
});
