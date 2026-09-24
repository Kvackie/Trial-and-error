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
    assert.ok(dungeons.length >= 3, `dungeons ${seed}`);
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
  run(state, 90); // one builder at first: the homes go up before the barracks
  assert.equal(barracks.state, 'ready');
  for (let i = 0; i < 3; i++) assert.ok(train(state, barracks, 'knight'), `train ${i}`);
  const events = run(state, FIRST_WAVE - state.time + 1);
  assert.ok(events.some((e) => e.type === 'wave'));
  assert.equal(state.units.length, 3);
  assert.ok(state.monsters.length >= 2);
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
  u.xp = 200;
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

test('new islands have rivers and islets; bridges make water walkable', async () => {
  const { canWalk } = await import('../src/sim.js');
  let rivers = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const { tiles, dungeons } = generateWorld(seed);
    if ([...tiles.values()].some((t) => t.terrain === 'river')) rivers++;
    assert.ok([...tiles.values()].filter((t) => t.islet).length >= 14, `islets ${seed}`);
    assert.ok(dungeons.length >= 5, `islet dungeons ${seed}`);
  }
  assert.ok(rivers >= 10, `rivers on ${rivers}/20`);
  // Old saves keep their island exactly.
  const old = generateWorld(3, 1);
  assert.ok(![...old.tiles.values()].some((t) => t.islet || t.terrain === 'river'));
  const state = newGame(6);
  const water = [...state.tiles.values()].find((t) => t.terrain === 'water' && distance([t.q, t.r], [0, 0]) <= 9);
  assert.equal(canWalk(state, water.q, water.r), false);
  state.buildings.push({ id: 990, type: 'bridge', q: water.q, r: water.r, level: 1, hp: 200, state: 'ready', left: 0, queue: [] });
  assert.equal(canWalk(state, water.q, water.r), true);
});

test('the tutorial moves on as each step is done, and old saves skip it', async () => {
  const { tutorialStep } = await import('../src/tutorial.js');
  const state = newGame(31);
  assert.equal(tutorialStep(state).id, 'farm');
  const spot = [...state.tiles.values()].find((t) => !buildProblem(state, 'farm', t.q, t.r));
  build(state, 'farm', spot.q, spot.r);
  const events = run(state, 1.5);
  assert.ok(events.some((e) => e.type === 'tutorial' && e.step.id === 'farm'));
  assert.equal(tutorialStep(state).id, 'home');
  const old = deserialise(serialise(state).replace('"tutorial":{"step":1,"done":false},', ''));
  assert.equal(tutorialStep(old), null);
});

test('one builder works at a time until there are more homes; the rest wait their turn', async () => {
  const { builders, waitingForBuilder } = await import('../src/sim.js');
  const state = newGame(41);
  state.res = { wood: 500, stone: 500, food: 500, gold: 500 };
  assert.equal(builders(state), 1);
  const place = (type) => {
    const spot = [...state.tiles.values()].find((t) => !buildProblem(state, type, t.q, t.r));
    return build(state, type, spot.q, spot.r);
  };
  const first = place('home');
  run(state, 0.5);
  const second = place('home');
  assert.equal(waitingForBuilder(state, first), false);
  assert.equal(waitingForBuilder(state, second), true);
  const left = second.left;
  run(state, 5);
  assert.equal(second.left, left, 'a queued building makes no progress');
  run(state, 12);
  assert.equal(first.state, 'ready');
  assert.equal(waitingForBuilder(state, second), false);
  run(state, 13);
  assert.equal(second.state, 'ready');
  assert.equal(builders(state), 2);
});

test('nests hide in the dark, send out the waves, and pay out when destroyed', async () => {
  const { NESTS, NEST_RESPAWN, nestHp } = await import('../src/data.js');
  const { nestAt } = await import('../src/sim.js');
  const state = newGame(52);
  assert.equal(state.nests.length, NESTS);
  for (const n of state.nests) {
    assert.ok(!state.revealed.has(key(n.q, n.r)), 'starts hidden');
    assert.ok(distance([n.q, n.r], [0, 0]) >= 5);
    assert.equal(nestAt(state, n.q, n.r), n);
  }
  const events = run(state, FIRST_WAVE + 1);
  const wave = events.find((e) => e.type === 'wave');
  assert.ok(wave.nest, 'the first wave comes out of a nest');
  assert.ok(state.nests.some((n) => distance([n.q, n.r], wave.at) === 0));
  assert.ok(state.nests.every((n) => n.level === 2), 'nests grow while you play');
  assert.equal(state.nests[0].maxHp, nestHp(2));

  // A knight next to a nest attacks it by itself; with the nest gone its guards go too.
  state.monsters = [];
  const nest = state.nests[0];
  nest.hp = 5;
  const { x, z } = toWorld(nest.q + 1, nest.r);
  state.units.push({ id: 900, type: 'knight', name: 'Test', xp: 0, x, z, hp: 150, state: 'idle', path: [], cooldown: 0, target: null });
  const gold = state.res.gold;
  const after = run(state, 5);
  assert.ok(after.some((e) => e.type === 'nestDestroyed'));
  assert.equal(state.nests.length, NESTS - 1);
  assert.ok(state.res.gold > gold);
  assert.equal(state.stats.nests, 1);
  assert.equal(state.nestTimer > NEST_RESPAWN - 10, true);
  run(state, NEST_RESPAWN);
  assert.equal(state.nests.length, NESTS, 'a new nest takes root');
});

test('wonders need a level 3 castle, one of each, and help the whole island', async () => {
  const { castle, rates } = await import('../src/sim.js');
  const state = newGame(61);
  state.res = { wood: 2000, stone: 2000, food: 2000, gold: 2000 };
  const spot = [...state.tiles.values()].find((t) => !buildProblem(state, 'home', t.q, t.r) && t.terrain === 'grass');
  assert.equal(buildProblem(state, 'wishingwell', spot.q, spot.r), 'wonderCastle');
  castle(state).level = 3;
  assert.equal(buildProblem(state, 'wishingwell', spot.q, spot.r), null);
  const farmSpot = [...state.tiles.values()].find((t) => t !== spot && !buildProblem(state, 'farm', t.q, t.r));
  state.buildings.push({ id: 800, type: 'farm', q: farmSpot.q, r: farmSpot.r, level: 1, hp: 100, state: 'ready', left: 0, queue: [] });
  state.buildings.push({ id: 801, type: 'home', q: 5, r: 5, level: 1, hp: 100, state: 'ready', left: 0, queue: [] });
  const before = rates(state).food;
  const well = build(state, 'wishingwell', spot.q, spot.r);
  const other = [...state.tiles.values()].find((t) => t.terrain === 'grass' && !buildProblem(state, 'home', t.q, t.r));
  assert.equal(buildProblem(state, 'wishingwell', other.q, other.r), 'wonderBuilt');
  well.state = 'ready';
  assert.ok(Math.abs(rates(state).food - before * 1.25) < 1e-9);
});

test('a town with no working lumber mill still gets some wood', async () => {
  const { rates } = await import('../src/sim.js');
  const state = newGame(71);
  assert.ok(rates(state).wood > 0, 'the castle makes a little');
  // Every person in the army: workplaces stand idle, the castle still produces.
  state.units = Array.from({ length: 8 }, (_, i) => ({ id: 500 + i, type: 'knight', x: 0, z: 0, hp: 150, state: 'idle', path: [] }));
  assert.ok(rates(state).wood > 0);
});
