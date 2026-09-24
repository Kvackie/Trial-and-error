import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/sim.js';
import * as D from '../src/data.js';

const run = (state, seconds, dt = 0.05) => {
  for (let t = 0; t < seconds; t += dt) {
    S.step(state, dt);
    state.battle.events.length = 0;
  }
};

test('a new game has a lord, a deployed orc and some souls', () => {
  const s = S.newState(1);
  assert.equal(s.lord.level, 1);
  assert.equal(s.monsters.length, 1);
  assert.deepEqual(s.monsters[0].cell, { col: 'melee', row: 4 });
  assert.equal(s.souls, D.START_SOULS);
});

test('the first waves are cleared and repeat until the player moves on', () => {
  const s = S.newState(2);
  run(s, 60);
  assert.equal(s.bestWave, 1);
  assert.equal(s.wave, 1);
  assert.ok(s.souls > D.START_SOULS);
  assert.ok(S.canAdvance(s));
  S.nextWave(s);
  assert.equal(s.wave, 2);
  assert.ok(!S.canAdvance(s));
  assert.ok(!S.nextWave(s));
});

test('slots limit how many of each kind are deployed', () => {
  const s = S.newState(3);
  s.souls = 10000;
  const a = S.recruit(s, 'orc');
  const b = S.recruit(s, 'orc');
  assert.ok(S.place(s, a, 'melee', 0));
  assert.equal(S.placeProblem(s, b, 'melee', 1), 'slots');
  assert.equal(S.placeProblem(s, b, 'melee', 0), 'taken');
  assert.equal(S.placeProblem(s, b, 'w0', 1), 'cell');
  assert.ok(S.buySlot(s, 'melee'));
  assert.ok(S.place(s, b, 'melee', 1));
  // Slot prices triple each time.
  assert.equal(S.slotPrice(s, 'melee'), 2400);
});

test('monsters unlock with the lord level', () => {
  const s = S.newState(4);
  s.souls = 10000;
  assert.equal(S.recruit(s, 'ogre'), null);
  s.lord.level = 3;
  assert.ok(S.recruit(s, 'ogre'));
});

test('ranged monsters add a quarter of their health to the wall', () => {
  const s = S.newState(5);
  s.souls = 10000;
  assert.ok(S.buildWall(s));
  assert.equal(S.wallMax(s), D.WALL.hp);
  const archer = S.recruit(s, 'skeleton');
  S.place(s, archer, 'w1', 2);
  assert.equal(S.wallMax(s), D.WALL.hp + Math.round(D.MONSTERS.skeleton.hp * D.WALL_SHARE));
  assert.equal(s.wall.hp, S.wallMax(s));
});

test('wall structures need the wall, and share its cells with ranged monsters', () => {
  const s = S.newState(6);
  s.souls = 10000;
  const ballista = S.buyStructure(s, 'ballista');
  assert.equal(S.placeProblem(s, ballista, 'w0', 0), 'noWall');
  S.buildWall(s);
  assert.ok(S.place(s, ballista, 'w0', 0));
  const archer = S.recruit(s, 'skeleton');
  assert.equal(S.placeProblem(s, archer, 'w0', 0), 'taken');
  assert.ok(S.place(s, archer, 'w1', 0));
});

test('a broken wall rebuilds itself and ranged monsters fall back meanwhile', () => {
  const s = S.newState(7);
  s.souls = 10000;
  S.buildWall(s);
  const archer = S.recruit(s, 'skeleton');
  S.place(s, archer, 'w1', 2);
  s.wall.hp = 0;
  s.wall.rebuild = D.WALL.rebuild;
  assert.ok(!S.wallStanding(s));
  assert.ok(S.itemX(s, archer) < D.X.wall[0]);
  run(s, D.WALL.rebuild + 0.1);
  assert.ok(S.wallStanding(s));
  assert.equal(s.wall.hp, S.wallMax(s));
});

test('the lord falling sends the player back three waves', () => {
  const s = S.newState(8);
  s.wave = 12;
  s.bestWave = 12;
  s.lord.hp = 1;
  s.monsters[0].cell = null;
  for (let t = 0; t < 60 && s.wave === 12; t += 0.05) S.step(s, 0.05);
  assert.equal(s.wave, 9);
  assert.equal(s.bestWave, 12);
  assert.equal(s.lord.hp, S.lordStats(s).hp);
});

test('three runes merge into one of the next rarity, and break down for souls', () => {
  const s = S.newState(9);
  for (let i = 0; i < 3; i++) S.addRune(s, 'fury', 0);
  const merged = S.mergeRunes(s, 'fury', 0);
  assert.equal(merged.rarity, 1);
  assert.equal(s.runes.length, 1);
  const before = s.souls;
  S.breakRune(s, merged.id);
  assert.equal(s.souls, before + D.RARITY_SOULS[1]);
  assert.equal(s.runes.length, 0);
});

test('equipped runes count, and need a free slot', () => {
  const s = S.newState(10);
  const rune = S.addRune(s, 'fury', 4);
  const base = S.lordStats(s).dmg;
  assert.ok(S.equipRune(s, rune.id, s.lord, 0));
  assert.ok(Math.abs(S.lordStats(s).dmg - base * 1.5) < 1e-9);
  assert.ok(!S.equipRune(s, rune.id, s.lord, 1)); // the second slot opens at level 10
  // Equipped runes can't be merged away.
  S.addRune(s, 'fury', 4);
  S.addRune(s, 'fury', 4);
  assert.equal(S.mergeRunes(s, 'fury', 4), null);
});

test('talents cost one point per lord level', () => {
  const s = S.newState(11);
  assert.ok(!S.learnTalent(s, 'souls'));
  s.lord.level = 3;
  assert.ok(S.learnTalent(s, 'souls'));
  assert.ok(S.learnTalent(s, 'burn'));
  assert.ok(!S.learnTalent(s, 'burn'));
  assert.equal(S.talentPoints(s), 0);
});

test('hellfire hits heroes near where it lands', () => {
  const s = S.newState(12);
  s.monsters[0].cell = null;
  run(s, 3);
  const heroes = s.battle.heroes;
  assert.ok(heroes.length);
  const h = heroes[0];
  const hp = h.hp;
  assert.ok(S.castSpell(s, 'hellfire', { x: h.x, y: h.y }));
  assert.ok(h.hp < hp);
  assert.ok(!S.castSpell(s, 'hellfire', { x: h.x, y: h.y })); // cooling down
});

test('a boss comes every 10th wave', () => {
  const s = S.newState(13);
  assert.ok(S.waveHeroes(s, 10).some((e) => typeof e === 'object'));
  assert.ok(!S.waveHeroes(s, 9).some((e) => typeof e === 'object'));
  assert.equal(S.depthOf(25).id, 'holy');
  assert.equal(S.depthOf(61).id, 'adventurers');
});

test('saves load back, and time away earns at the current wave', () => {
  const s = S.newState(14);
  run(s, 60);
  assert.ok(s.rate);
  const text = S.serialize(s, 1000);
  const loaded = S.deserialize(text);
  assert.equal(loaded.souls, s.souls);
  assert.equal(loaded.monsters.length, 1);
  const souls = loaded.souls;
  const summary = S.applyOffline(loaded, 1000 + 3600 * 1000);
  assert.ok(summary.souls > 0);
  assert.equal(loaded.souls, souls + summary.souls);
  // Capped at 8 hours.
  const capped = S.deserialize(text);
  const long = S.applyOffline(capped, 1000 + 48 * 3600 * 1000);
  assert.equal(long.seconds, 8 * 3600);
});
