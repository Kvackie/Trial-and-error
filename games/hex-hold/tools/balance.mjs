// Balance check: a simple scripted player plays Hex Hold at high speed on several
// islands and reports how the economy grows and how the waves go.
//
//   node games/hex-hold/tools/balance.mjs [minutes=60] [seeds=10] [style=balanced|economy|idle]
//
// balanced: builds up and keeps an army (roughly how a player would play)
// economy:  only builds the economy, no army or towers (how hard the waves punish that)
// idle:     builds nothing at all after the start
import { BUILDINGS, GOALS, RESOURCES, upgradeCost } from '../src/data.js';
import { distance } from '../src/hex.js';
import * as sim from '../src/sim.js';

const minutes = Number(process.argv[2] ?? 60);
const seeds = Number(process.argv[3] ?? 10);
const style = process.argv[4] ?? 'balanced';
const STEP = 0.25;

function spotFor(state, type) {
  const home = sim.castle(state);
  const spots = [...state.tiles.values()].filter((t) => !sim.buildProblem(state, type, t.q, t.r));
  spots.sort((a, b) => distance([a.q, a.r], [home.q, home.r]) - distance([b.q, b.r], [home.q, home.r]));
  return spots[0];
}

function tryBuild(state, type) {
  const spot = spotFor(state, type);
  return spot ? sim.build(state, type, spot.q, spot.r) : null;
}

const count = (state, type) => state.buildings.filter((b) => b.type === type).length;
// Every builder has work already.
const busy = (state) => sim.constructionJobs(state).length >= sim.builders(state);

// One decision every couple of seconds, like a player tapping around.
function decide(state, log) {
  if (style === 'idle') return;
  const pop = sim.population(state);
  const wave = state.wave.number;
  const army = style === 'balanced';

  // Housing first when workers run short.
  if (pop.used + 3 > pop.cap && !busy(state)) {
    const type = count(state, 'home') >= 5 && count(state, 'tavern') === 0 ? 'tavern' : 'home';
    if (tryBuild(state, type)) return log(type);
  }
  const plan = [
    ['farm', 1],
    ['lumbermill', 1],
    ['home', 1],
    ['mine', 1],
    ['lumbermill', 2],
    ['farm', 2],
    ['home', 2],
    ...(army ? [['barracks', 1], ['tower', 1]] : []),
    ['windmill', 1],
    ['market', 1],
    ['mine', 2],
    ['home', 4],
    ...(army ? [['tower', 2], ['archery', 1], ['blacksmith', 1], ['catapult', 1], ['tower', 3], ['chapel', 1]] : []),
    ['windmill', 2],
    ['market', 2],
  ];
  if (!busy(state)) {
    for (const [type, n] of plan) {
      if (count(state, type) < n) {
        if (tryBuild(state, type)) return log(type);
        break; // wait for this one
      }
    }
  }
  // Wonders once the castle allows them.
  if (!busy(state)) for (const type of ['wishingwell', 'beacon', 'cathedral', 'bazaar']) if (count(state, type) === 0 && tryBuild(state, type)) return log(type);
  // Castle upgrade when storage is the limit.
  const castle = sim.castle(state);
  if (RESOURCES.some((r) => state.res[r] >= sim.storage(state) * 0.95) && castle.level < 3 && sim.upgrade(state, castle)) return log('castle+');

  if (army) {
    const wanted = 2 + Math.floor(wave * 1.2);
    const trainers = state.buildings.filter((b) => BUILDINGS[b.type].trains && b.state === 'ready');
    if (state.units.length < wanted) {
      for (const b of trainers) {
        const unit = BUILDINGS[b.type].trains[state.units.length % BUILDINGS[b.type].trains.length];
        if (sim.train(state, b, unit)) return log(`train ${unit}`);
      }
    }
    const smith = state.buildings.find((b) => b.type === 'blacksmith' && b.state === 'ready');
    if (smith) for (const track of ['weapons', 'armour']) if (sim.startResearch(state, smith, track)) return log(`research ${track}`);
    // Nests: take the army to a nest that's been found, between waves, once it's big enough.
    const idleArmy = state.units.filter((u) => u.state !== 'away');
    const nest = state.nests.find((n) => state.revealed.has(`${n.q},${n.r}`));
    if (nest && !sim.waveOn(state) && state.wave.next > 90 && idleArmy.length >= 8 && !idleArmy.some((u) => u.order)) {
      sim.moveUnits(state, idleArmy.map((u) => u.id), nest.q, nest.r);
      return log('attack nest');
    }
    // Dungeons: send spare units when the odds are good, keeping some at home.
    const idle = state.units.filter((u) => u.state === 'idle');
    const dungeon = state.dungeons.find((d) => d.state === 'ready' && state.revealed.has(d.key));
    if (dungeon && idle.length >= 4 && !state.monsters.length) {
      const party = idle.slice(0, Math.max(2, idle.length - 2)).map((u) => u.id);
      if (sim.partyChance(state, dungeon, party) >= 0.6 && sim.sendParty(state, dungeon, party)) return log(`dungeon t${dungeon.tier}`);
    }
  }
  // Upgrades with spare resources.
  for (const b of state.buildings) {
    if (b.type === 'castle' || !BUILDINGS[b.type].produce) continue;
    const cost = upgradeCost(b.type, b.level + 1);
    const spare = Object.entries(cost).every(([r, v]) => state.res[r] >= v * 1.5);
    if (b.level < 3 && spare && sim.upgrade(state, b)) return log(`${b.type}+`);
  }
  // Repair what the monsters broke.
  for (const b of state.buildings) if (b.state === 'destroyed' && sim.repair(state, b)) return log(`repair ${b.type}`);
}

function play(seed) {
  const state = sim.newGame(seed);
  const report = { seed, milestones: {}, waves: [], stuck: 0, dungeons: { won: 0, lost: 0 }, levels: [] };
  const log = (what) => {
    if (!report.milestones[what]) report.milestones[what] = Math.round(state.time);
  };
  let decideTimer = 0;
  let wave = null;
  const end = minutes * 60;
  while (state.time < end) {
    const events = sim.tick(state, STEP);
    for (const e of events) {
      if (e.type === 'wave') {
        wave = { n: e.number, monsters: state.monsters.filter((m) => !m.guard).length, lostBuildings: 0, lostUnits: 0, start: state.time };
        // Like a player would: send the army to meet the wave (after a short reaction time).
        if (style === 'balanced') state.pendingMarch = { at: e.at, in: 5 };
      }
      if (e.type === 'destroyed' && wave) wave.lostBuildings++;
      if (e.type === 'unitDied' && wave) wave.lostUnits++;
      if (e.type === 'dungeon') report.dungeons[e.won ? 'won' : 'lost']++;
    }
    for (const e of events) if (e.type === 'nestDestroyed') log(`nest destroyed ${(report.nests = (report.nests ?? 0) + 1)}`);
    if (wave && !sim.waveOn(state)) {
      wave.seconds = Math.round(state.time - wave.start);
      report.waves.push(wave);
      wave = null;
    }
    if (state.pendingMarch && (state.pendingMarch.in -= STEP) <= 0) {
      const ids = state.units.filter((u) => u.state !== 'away').map((u) => u.id);
      sim.moveUnits(state, ids, ...state.pendingMarch.at);
      state.pendingMarch = null;
    }
    decideTimer -= STEP;
    if (decideTimer <= 0) {
      decideTimer = 2;
      const before = JSON.stringify(state.res);
      decide(state, log);
      // "Stuck": nothing affordable to do while storage is full.
      if (JSON.stringify(state.res) === before && RESOURCES.every((r) => state.res[r] >= sim.storage(state) * 0.95)) report.stuck += 2;
    }
    if (Math.round(state.time) % 600 === 0 && Math.abs(state.time - Math.round(state.time)) < STEP / 2) {
      report[`t${Math.round(state.time / 60)}`] = {
        res: Object.fromEntries(RESOURCES.map((r) => [r, Math.round(state.res[r])])),
        rate: Object.fromEntries(Object.entries(sim.rates(state)).map(([r, v]) => [r, Math.round(v * 60)])),
        pop: sim.population(state),
        buildings: state.buildings.length,
        units: state.units.length,
      };
    }
  }
  if (wave) report.waves.push({ ...wave, seconds: 'unfinished', left: state.monsters.length });
  report.levels = state.units.map((u) => sim.heroLevel(u));
  report.final = { buildings: state.buildings.filter((b) => b.state !== 'destroyed').length, destroyed: state.buildings.filter((b) => b.state === 'destroyed').length, units: state.units.length, research: state.research, goals: (state.goals ?? []).length };
  return report;
}

const reports = [];
for (let seed = 1; seed <= seeds; seed++) reports.push(play(seed * 1013));

// Summary across islands.
const avg = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : '-');
const milestoneNames = [...new Set(reports.flatMap((r) => Object.keys(r.milestones)))];
console.log(`style=${style} minutes=${minutes} islands=${seeds}\n`);
console.log('First time (s) each thing happened, average (islands that got there):');
for (const m of milestoneNames) {
  const times = reports.map((r) => r.milestones[m]).filter((t) => t !== undefined);
  console.log(`  ${m.padEnd(20)} ${String(avg(times)).padStart(5)}  (${times.length}/${seeds})`);
}
for (const t of [10, 20, 30, 40, 50, 60].filter((m) => m <= minutes)) {
  const snaps = reports.map((r) => r[`t${t}`]).filter(Boolean);
  if (!snaps.length) continue;
  const line = (k) => RESOURCES.map((r) => `${r} ${avg(snaps.map((s) => s[k][r]))}`).join(', ');
  console.log(`\nAt ${t} min: stock ${line('res')}\n           per min ${line('rate')}\n           people ${avg(snaps.map((s) => s.pop.used))}/${avg(snaps.map((s) => s.pop.cap))}, buildings ${avg(snaps.map((s) => s.buildings))}, units ${avg(snaps.map((s) => s.units))}`);
}
console.log('\nWaves (average over islands): monsters, seconds to clear, buildings lost, units lost');
const maxWave = Math.max(...reports.map((r) => r.waves.length));
for (let n = 1; n <= maxWave; n++) {
  const ws = reports.map((r) => r.waves.find((w) => w.n === n)).filter(Boolean);
  const unfinished = ws.filter((w) => w.seconds === 'unfinished').length;
  console.log(`  wave ${String(n).padStart(2)}: ${avg(ws.map((w) => w.monsters))} monsters, ${avg(ws.filter((w) => w.seconds !== 'unfinished').map((w) => w.seconds))} s, ${avg(ws.map((w) => w.lostBuildings))} buildings, ${avg(ws.map((w) => w.lostUnits))} units${unfinished ? `, ${unfinished} still fighting at the end` : ''}`);
}
console.log(`\nDungeons: ${reports.reduce((a, r) => a + r.dungeons.won, 0)} won, ${reports.reduce((a, r) => a + r.dungeons.lost, 0)} lost`);
console.log(`Stuck with full storage: ${avg(reports.map((r) => r.stuck))} s per game`);
console.log(`End: buildings ${avg(reports.map((r) => r.final.buildings))}, destroyed ${avg(reports.map((r) => r.final.destroyed))}, units ${avg(reports.map((r) => r.final.units))}, goals ${avg(reports.map((r) => r.final.goals))}/${GOALS.length}, nests destroyed ${avg(reports.map((r) => r.nests ?? 0))}, hero levels ${JSON.stringify(reports.flatMap((r) => r.levels).reduce((m, l) => ((m[l] = (m[l] ?? 0) + 1), m), {}))}`);
