// Plays Throne of Souls at high speed with a scripted player and reports how far it
// gets over time. Re-run it after changing numbers in src/data.js.
//   node games/throne-of-souls/tools/balance.mjs [minutes] [seed]
import * as S from '../src/sim.js';
import * as D from '../src/data.js';

const minutes = Number(process.argv[2] ?? 120);
const seed = Number(process.argv[3] ?? 1);
const state = S.newState(seed);
state.auto = true;
const DT = 0.1;

// A sensible player: keep the slots full, build the wall, add structures, upgrade what's
// cheapest, merge runes and equip the best ones, and move on once a wave is easy.
function freeCell(item) {
  for (const col of S.columnsFor(item)) {
    for (const row of [4, 3, 5, 2, 6, 1, 7, 0, 8]) if (!S.placeProblem(state, item, col, row)) return [col, row];
  }
  return null;
}

function tryPlace(item) {
  const cell = freeCell(item);
  return cell ? S.place(state, item, ...cell) : false;
}

function best(types) {
  return types.filter((t) => S.lordUnlocked(state, D.MONSTERS[t].unlock)).at(-1);
}

function shop() {
  if (!state.wall.built && state.souls >= D.WALL.cost) S.buildWall(state);
  for (const kind of ['melee', 'ranged']) {
    const types = D.MONSTER_ORDER.filter((t) => D.MONSTERS[t].kind === kind);
    const type = best(types);
    if (S.placedCount(state, kind) < state.slots[kind]) {
      const spare = state.monsters.find((m) => !m.cell && D.MONSTERS[m.type].kind === kind);
      const m = spare ?? S.recruit(state, type);
      if (m) tryPlace(m);
    }
  }
  // The cheapest of: a type upgrade, a slot, a structure, a wall level.
  const options = [];
  for (const type of new Set(state.monsters.filter((m) => m.cell).map((m) => m.type))) options.push([S.typeUpgradeCost(state, type), () => S.upgradeType(state, type)]);
  for (const kind of ['melee', 'ranged']) if (state.slots[kind] < D.SLOT_MAX) options.push([S.slotPrice(state, kind) * 1.5, () => S.buySlot(state, kind)]);
  if (state.wall.built) {
    options.push([S.wallUpgrade(state) * 1.2, () => S.upgradeWall(state)]);
    for (const [kind, type] of [['wall', 'ballista'], ['support', 'altar'], ['trap', 'spikes'], ['support', 'drum'], ['trap', 'tar']]) {
      if (S.placedCount(state, kind) < state.slots[kind]) {
        options.push([S.structureCost(state, type), () => {
          const s = S.buyStructure(state, type);
          return s && tryPlace(s);
        }]);
      }
    }
    for (const s of state.structures) if (s.cell) options.push([S.structureUpgrade(state, s) * 1.3, () => S.upgradeStructure(state, s.id)]);
  }
  options.sort((a, b) => a[0] - b[0]);
  for (const [cost, buy] of options.slice(0, 3)) if (state.souls >= cost) buy();
  // Runes: merge what can be merged, then put the best Fury/Vigor on the lord and front line.
  for (const type of D.RUNES) for (let r = 0; r < 4; r++) while (S.mergeRunes(state, type, r));
  const loose = state.runes.filter((r) => !S.runeHolder(state, r.id)).sort((a, b) => b.rarity - a.rarity);
  const holders = [state.lord, ...state.monsters.filter((m) => m.cell)];
  for (const rune of loose) {
    for (const h of holders) {
      const slots = S.runeSlots(h === state.lord ? state.lord.level : h.level);
      const free = h.runes.findIndex((id, i) => i < slots && id == null);
      if (free >= 0) {
        S.equipRune(state, rune.id, h, free);
        break;
      }
    }
  }
  while (S.talentPoints(state) > 0) {
    const next = ['monsterDmg', 'monsterHp', 'lordDmg', 'souls', 'wallHp', 'cooldown', 'recruitCost', 'runeDrop', 'burn', 'bossReset', 'structCost', 'rebuild', 'trapDmg', 'slotCost', 'offline', 'mergeRefund']
      .find((id) => S.learnTalent(state, id));
    if (!next) break;
  }
}

let t = 0;
let falls = 0;
let lastReport = 0;
let clearTimes = [];
let waveStart = 0;
const rows = [];
while (t < minutes * 60) {
  S.step(state, DT);
  t += DT;
  for (const e of state.battle.events) {
    if (e.type === 'fall') falls += 1;
    if (e.type === 'waveStart') waveStart = t;
    if (e.type === 'waveCleared') {
      clearTimes.push(t - waveStart);
      // Move on when the wave went down quickly, as a player would.
      if (t - waveStart < 25 + state.wave * 0.5) S.nextWave(state);
    }
  }
  state.battle.events.length = 0;
  if (Math.floor(t) % 5 === 0) shop();
  if (t - lastReport >= 600 || t >= minutes * 60) {
    lastReport = t;
    const deployed = state.monsters.filter((m) => m.cell).map((m) => m.type[0] + m.level).join(' ');
    rows.push({
      min: Math.round(t / 60),
      wave: state.wave,
      best: state.bestWave,
      lord: state.lord.level,
      souls: Math.round(state.souls),
      wall: state.wall.built ? `${state.wall.level}/${S.wallMax(state)}` : '-',
      structs: state.structures.filter((s) => s.cell).length,
      runes: state.runes.length,
      falls,
      clear: clearTimes.length ? Math.round(clearTimes.reduce((a, b) => a + b, 0) / clearTimes.length) : '-',
      deployed,
    });
    clearTimes = [];
  }
}
console.table(rows);
const rate = state.rate;
if (rate) console.log(`Offline at wave ${rate.wave}: ${Math.round((rate.souls / rate.secs) * 3600)} souls/h, ${Math.round((rate.xp / rate.secs) * 3600)} XP/h`);
