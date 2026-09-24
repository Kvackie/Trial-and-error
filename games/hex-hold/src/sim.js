// Hex Hold's rules: the whole game state and how it changes over time. No Three.js
// here, so it can be tested in Node. The view reads the state and the events that
// tick() reports; the UI calls the actions (build, upgrade, train, move, send).
import {
  AGGRO_RANGE,
  ATTACK_COOLDOWN,
  BUILD_RANGE,
  BUILDINGS,
  DEFAULT_TERRAIN,
  DUNGEON_COOLDOWN,
  DUNGEON_MAX_TIER,
  FIRST_WAVE,
  MAX_LEVEL,
  MONSTERS,
  OFFLINE_CAP,
  RESOURCES,
  START_RESOURCES,
  GOALS,
  TRADE_AMOUNT,
  tradeGet,
  DUNGEON_XP,
  HERO_NAMES,
  KILL_XP,
  LEVEL_BONUS,
  LEVEL_XP,
  RESEARCH_BONUS,
  RESEARCH_MAX,
  researchCost,
  researchTime,
  STORAGE,
  UNIT_REVEAL,
  UNITS,
  WAVE_EVERY,
  dungeonLoot,
  dungeonNeed,
  dungeonTime,
  upgradeCost,
  upgradeTime,
  waveMonsters,
  waveStrength,
} from './data.js';
import { distance, findPath, fromWorld, key, neighbours, parse, spiral, toWorld } from './hex.js';
import { generateWorld, isPassable, seeded } from './world.js';

// --- Creating, saving and loading ----------------------------------------------------

export function newGame(seed = Math.floor(Math.random() * 2 ** 31)) {
  const { tiles, dungeons } = generateWorld(seed);
  const state = {
    version: 1,
    seed,
    time: 0, // seconds played (drives the waves)
    savedAt: Date.now(),
    res: { ...START_RESOURCES },
    tiles,
    revealed: new Set(),
    buildings: [],
    units: [],
    monsters: [],
    shots: [],
    dungeons: dungeons.map((k) => ({ key: k, tier: 1, state: 'ready', left: 0, party: [] })),
    wave: { number: 0, next: FIRST_WAVE },
    research: { weapons: 0, armour: 0 },
    stats: { kills: 0, dungeonWins: 0, deepest: 0, titans: 0 },
    goals: [],
    nextId: 1,
  };
  addBuilding(state, 'castle', 0, 0, { ready: true });
  reveal(state, 0, 0, BUILDINGS.castle.reveal);
  return state;
}

export function serialise(state) {
  return JSON.stringify({
    ...state,
    savedAt: Date.now(),
    tiles: undefined,
    units: state.units.map((u) => ({ ...u, target: null })),
    monsters: state.monsters.map((m) => ({ ...m, target: null })),
    revealed: [...state.revealed],
    shots: [],
    cleared: [...state.tiles.values()].filter((t) => t.cleared).map((t) => key(t.q, t.r)),
  });
}

export function deserialise(text) {
  const saved = JSON.parse(text);
  const { tiles } = generateWorld(saved.seed);
  for (const k of saved.cleared ?? []) {
    const tile = tiles.get(k);
    if (tile) Object.assign(tile, { terrain: 'grass', cleared: true });
  }
  delete saved.cleared;
  for (const a of [...saved.units, ...saved.monsters]) a.target = null;
  delete saved.roads; // older saves had roads
  return { ...saved, tiles, revealed: new Set(saved.revealed), shots: [] };
}

// --- Queries ----------------------------------------------------------------------------

export const tileAt = (state, q, r) => state.tiles.get(key(q, r));
export const buildingAt = (state, q, r) => state.buildings.find((b) => b.q === q && b.r === r);
export const dungeonAt = (state, q, r) => state.dungeons.find((d) => d.key === key(q, r));
export const storage = (state) => STORAGE[castle(state).level - 1];
export const castle = (state) => state.buildings.find((b) => b.type === 'castle');
const stat = (state) => (state.stats ??= { kills: 0, dungeonWins: 0, deepest: 0, titans: 0 });

// --- Trading and goals ------------------------------------------------------------------

export function tradeProblem(state, market, give, get) {
  if (!market || market.state !== 'ready') return 'busy';
  if (give === get) return 'occupied';
  if (state.res[give] < TRADE_AMOUNT) return 'noResources';
  return null;
}

export function trade(state, market, give, get) {
  if (tradeProblem(state, market, give, get)) return 0;
  const amount = tradeGet(give, get, market.level);
  state.res[give] -= TRADE_AMOUNT;
  addResources(state, { [get]: amount });
  return amount;
}

function checkGoals(state, events) {
  state.goals ??= [];
  for (const goal of GOALS) {
    if (state.goals.includes(goal.id) || !goal.check(state)) continue;
    state.goals.push(goal.id);
    addResources(state, goal.reward);
    events.push({ type: 'goal', goal });
  }
}

// --- Heroes: levels and research -----------------------------------------------------------

export const heroLevel = (u) => LEVEL_XP.filter((xp) => (u.xp ?? 0) >= xp).length;
const research = (state) => state.research ?? { weapons: 0, armour: 0 };
export const maxHp = (state, u) => Math.round(UNITS[u.type].hp * (1 + LEVEL_BONUS * (heroLevel(u) - 1)) * (1 + RESEARCH_BONUS * research(state).armour));
export const damageOf = (state, u) => Math.round(UNITS[u.type].damage * (1 + LEVEL_BONUS * (heroLevel(u) - 1)) * (1 + RESEARCH_BONUS * research(state).weapons));

function giveXp(state, u, amount, events) {
  if (!u || u.dead) return;
  const before = heroLevel(u);
  const hurt = maxHp(state, u) - u.hp;
  u.xp = (u.xp ?? 0) + amount;
  if (heroLevel(u) > before) {
    u.hp = maxHp(state, u) - hurt;
    events.push({ type: 'levelUp', unit: u, level: heroLevel(u) });
  }
}

export function researchProblem(state, b, track) {
  if (b.state !== 'ready') return 'busy';
  if (b.research) return 'busy';
  const tier = research(state)[track] + 1;
  if (tier > RESEARCH_MAX) return 'maxLevel';
  if (!canAfford(state, researchCost(tier))) return 'noResources';
  return null;
}

export function startResearch(state, b, track) {
  if (researchProblem(state, b, track)) return false;
  const tier = research(state)[track] + 1;
  pay(state, researchCost(tier));
  b.research = { track, left: researchTime(tier) };
  return true;
}

const working = (b) => b.state === 'ready' || b.state === 'upgrading';

export function population(state) {
  let cap = 0;
  let used = 0;
  let homes = 0;
  let tavern = 0;
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (working(b) && def.pop) cap += def.pop * b.level;
    if (working(b) && b.type === 'home') homes++;
    if (working(b) && def.homeBonus) tavern += def.homeBonus * b.level;
    if (b.state !== 'destroyed' && def.workers) used += def.workers;
  }
  // Taverns make homes hold more people (up to 3 more each).
  cap += homes * Math.min(3, tavern);
  used += state.units.length;
  return { cap, used };
}

// Production per second for each resource, with the worker shortfall applied.
export function rates(state) {
  const out = Object.fromEntries(RESOURCES.map((r) => [r, 0]));
  const { cap, used } = population(state);
  const staffed = used > cap ? Math.max(0, cap - state.units.length) / Math.max(1, used - state.units.length) : 1;
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!working(b) || !def.produce) continue;
    let factor = b.level === 1 ? 1 : b.level === 2 ? 1.8 : 2.6;
    if (def.perNear) factor *= Math.min(3, neighbours(b.q, b.r).filter(([q, r]) => tileAt(state, q, r)?.terrain === def.perNear).length);
    if (def.workers) factor *= staffed;
    for (const [res, amount] of Object.entries(def.produce)) out[res] += amount * factor;
  }
  return out;
}

export const canAfford = (state, cost) => Object.entries(cost).every(([r, v]) => state.res[r] >= v);
const pay = (state, cost) => Object.entries(cost).forEach(([r, v]) => (state.res[r] -= v));
const addResources = (state, gain) => {
  const cap = storage(state);
  for (const [r, v] of Object.entries(gain)) state.res[r] = Math.min(cap, state.res[r] + v);
};

// Why this building can't go on this hex, or null if it can.
export function buildProblem(state, type, q, r) {
  const def = BUILDINGS[type];
  const tile = tileAt(state, q, r);
  if (!tile || !state.revealed.has(key(q, r))) return 'hidden';
  if (!isPassable(tile) || tile.dungeon || buildingAt(state, q, r)) return 'occupied';
  // Walls can go a little further out, but don't stretch the town themselves.
  const reach = def.wall ? BUILD_RANGE + 1 : BUILD_RANGE;
  if (!state.buildings.some((b) => !BUILDINGS[b.type].wall && distance([b.q, b.r], [q, r]) <= reach)) return 'tooFar';
  const terrain = def.terrain ?? DEFAULT_TERRAIN;
  if (!terrain.includes(tile.terrain)) return `terrain_${type}`;
  if (def.near && !neighbours(q, r).some(([nq, nr]) => tileAt(state, nq, nr)?.terrain === def.near)) return `near_${def.near}`;
  if (def.workers) {
    const { cap, used } = population(state);
    if (used + def.workers > cap) return 'noWorkers';
  }
  if (!canAfford(state, def.cost)) return 'noResources';
  return null;
}

// --- Actions -----------------------------------------------------------------------------

function addBuilding(state, type, q, r, { ready = false } = {}) {
  const def = BUILDINGS[type];
  const b = { id: state.nextId++, type, q, r, level: 1, hp: def.hp, state: ready ? 'ready' : 'building', left: ready ? 0 : def.time, queue: [] };
  state.buildings.push(b);
  return b;
}

export function build(state, type, q, r) {
  if (buildProblem(state, type, q, r)) return null;
  pay(state, BUILDINGS[type].cost);
  const tile = tileAt(state, q, r);
  if (tile.terrain === 'forest' && type !== 'lumbermill') {
    tile.terrain = 'grass';
    tile.cleared = true;
  }
  return addBuilding(state, type, q, r);
}

export function upgradeProblem(state, b) {
  if (BUILDINGS[b.type].fixed) return 'maxLevel';
  if (b.state !== 'ready') return 'busy';
  if (b.level >= MAX_LEVEL) return 'maxLevel';
  if (!canAfford(state, upgradeCost(b.type, b.level + 1))) return 'noResources';
  return null;
}

export function upgrade(state, b) {
  if (upgradeProblem(state, b)) return false;
  pay(state, upgradeCost(b.type, b.level + 1));
  b.state = 'upgrading';
  b.left = upgradeTime(b.type, b.level + 1);
  return true;
}

export const repairCost = (b) => Object.fromEntries(Object.entries(BUILDINGS[b.type].cost ?? { stone: 100 }).map(([k, v]) => [k, Math.ceil(v / 2)]));

export function repair(state, b) {
  if (b.state !== 'destroyed' || !canAfford(state, repairCost(b))) return false;
  pay(state, repairCost(b));
  b.state = 'building';
  b.left = Math.ceil((BUILDINGS[b.type].time ?? 30) / 2);
  return true;
}

export function trainProblem(state, b, unit) {
  if (b.state !== 'ready') return 'busy';
  if (b.queue.length >= 3) return 'queueFull';
  const { cap, used } = population(state);
  if (used + b.queue.length >= cap) return 'noPeople';
  if (!canAfford(state, UNITS[unit].cost)) return 'noResources';
  return null;
}

export function train(state, b, unit) {
  if (trainProblem(state, b, unit)) return false;
  pay(state, UNITS[unit].cost);
  b.queue.push({ unit, left: UNITS[unit].time });
  return true;
}

// Walls block monsters and units; gates only block monsters. Ruined walls block nobody.
const passCost = (state, monster = false) => (q, r) => {
  if (!isPassable(tileAt(state, q, r))) return Infinity;
  const b = buildingAt(state, q, r);
  const def = b && b.state !== 'destroyed' && BUILDINGS[b.type];
  if (def?.wall && (monster || !def.gate)) return Infinity;
  return 1;
};

// Orders units to walk to a hex (they fight whatever they meet on the way).
export function moveUnits(state, ids, q, r) {
  let moved = 0;
  const targets = [[q, r], ...spiral(q, r, 2).filter(([a, b]) => a !== q || b !== r)];
  ids.forEach((id, i) => {
    const u = state.units.find((x) => x.id === id);
    if (!u || u.state === 'away') return;
    const goal = targets[i % targets.length];
    if (!isPassable(tileAt(state, ...goal))) return;
    const path = findPath(fromWorld(u.x, u.z), goal, passCost(state));
    if (path) {
      u.path = path;
      u.order = true;
      u.target = null;
      moved++;
    }
  });
  return moved;
}

export function sendParty(state, dungeon, ids) {
  if (dungeon.state !== 'ready' || !ids.length) return false;
  const party = state.units.filter((u) => ids.includes(u.id) && u.state !== 'away');
  if (!party.length) return false;
  for (const u of party) {
    u.state = 'away';
    u.path = [];
    u.target = null;
  }
  dungeon.state = 'running';
  dungeon.left = dungeonTime(dungeon.tier);
  dungeon.party = party.map((u) => u.id);
  return true;
}

// Chance a party clears a dungeon: their strength against what the tier needs.
export function partyChance(state, dungeon, ids) {
  const power = state.units.filter((u) => ids.includes(u.id)).reduce((sum, u) => sum + (u.hp + damageOf(state, u) * 8), 0);
  return Math.max(0.05, Math.min(0.95, (power / dungeonNeed(dungeon.tier)) * 0.6));
}

// --- Time passing ------------------------------------------------------------------------

export function reveal(state, q, r, radius) {
  let changed = false;
  for (const [a, b] of spiral(q, r, radius)) {
    const k = key(a, b);
    if (state.tiles.has(k) && !state.revealed.has(k)) {
      state.revealed.add(k);
      changed = true;
    }
  }
  return changed;
}

function spawnUnit(state, b, type, events) {
  const spot = [[b.q, b.r], ...spiral(b.q, b.r, 2)].find(([q, r]) => isPassable(tileAt(state, q, r)) && !buildingAt(state, q, r)) ?? [b.q, b.r];
  const { x, z } = toWorld(...spot);
  const name = HERO_NAMES[(state.nextId * 7 + state.units.length * 3) % HERO_NAMES.length];
  const u = { id: state.nextId++, type, name, xp: 0, x, z, hp: 0, state: 'idle', path: [], cooldown: 0, target: null };
  u.hp = maxHp(state, u);
  state.units.push(u);
  events.push({ type: 'trained', unit: u });
  return u;
}

function economy(state, dt, events) {
  const gain = rates(state);
  addResources(state, Object.fromEntries(Object.entries(gain).map(([r, v]) => [r, v * dt])));

  for (const b of state.buildings) {
    if (b.state === 'building' || b.state === 'upgrading') {
      b.left -= dt;
      if (b.left <= 0) {
        if (b.state === 'upgrading') b.level++;
        const fresh = b.state === 'building';
        b.state = 'ready';
        b.left = 0;
        b.hp = BUILDINGS[b.type].hp * b.level;
        events.push({ type: fresh ? 'built' : 'upgraded', building: b });
        if (BUILDINGS[b.type].reveal) reveal(state, b.q, b.r, BUILDINGS[b.type].reveal);
        else reveal(state, b.q, b.r, 2);
      }
    }
    if (b.state === 'ready' && b.research) {
      b.research.left -= dt;
      if (b.research.left <= 0) {
        const r = research(state);
        r[b.research.track]++;
        state.research = r;
        // Better armour raises everyone's health by the same share.
        if (b.research.track === 'armour') for (const u of state.units) u.hp = Math.round(u.hp * (1 + RESEARCH_BONUS / (1 + RESEARCH_BONUS * (r.armour - 1))));
        events.push({ type: 'researched', track: b.research.track, tier: r[b.research.track] });
        b.research = null;
      }
    }
    if (b.state === 'ready' && b.queue.length) {
      const job = b.queue[0];
      job.left -= dt;
      if (job.left <= 0) {
        b.queue.shift();
        spawnUnit(state, b, job.unit, events);
      }
    }
  }

  for (const d of state.dungeons) {
    if (d.state === 'cooldown') {
      d.left -= dt;
      if (d.left <= 0) {
        d.state = 'ready';
        d.left = 0;
      }
    }
    if (d.state === 'running') {
      d.left -= dt;
      if (d.left <= 0) finishDungeon(state, d, events);
    }
  }
}

function finishDungeon(state, d, events, rng = Math.random) {
  const party = state.units.filter((u) => d.party.includes(u.id));
  const chance = partyChance(state, d, d.party);
  const won = rng() < chance;
  const lost = [];
  const [q, r] = parse(d.key);
  const exit = toWorld(q, r);
  for (const u of party) {
    if (!won && rng() < 0.5) {
      lost.push(u);
      continue;
    }
    u.state = 'idle';
    giveXp(state, u, Math.round(DUNGEON_XP * d.tier * (won ? 1 : 1 / 3)), events);
    u.hp = won ? maxHp(state, u) : Math.ceil(maxHp(state, u) * 0.3);
    u.x = exit.x;
    u.z = exit.z;
  }
  state.units = state.units.filter((u) => !lost.includes(u));
  let loot = null;
  if (won) {
    const stats = stat(state);
    stats.dungeonWins++;
    stats.deepest = Math.max(stats.deepest, d.tier);
    loot = dungeonLoot(d.tier);
    addResources(state, loot);
    d.tier = Math.min(DUNGEON_MAX_TIER, d.tier + 1);
  }
  events.push({ type: 'dungeon', dungeon: d, won, loot, lost: lost.length, back: party.length - lost.length });
  d.state = 'cooldown';
  d.left = DUNGEON_COOLDOWN;
  d.party = [];
}

function spawnWave(state, events) {
  state.wave.number++;
  const n = state.wave.number;
  const shore = [...state.tiles.values()].filter(
    (t) => isPassable(t) && !t.dungeon && !buildingAt(state, t.q, t.r) && distance([t.q, t.r], [0, 0]) >= 4 && neighbours(t.q, t.r).some(([q, r]) => tileAt(state, q, r)?.terrain === 'water' || !tileAt(state, q, r)),
  );
  const home = castle(state);
  shore.sort((a, b) => distance([b.q, b.r], [home.q, home.r]) - distance([a.q, a.r], [home.q, home.r]));
  // All from one side of the island, so there's a direction to defend.
  const start = shore[Math.floor(Math.random() * Math.min(shore.length, 6))];
  const spots = shore.filter((t) => distance([t.q, t.r], [start.q, start.r]) <= 3);
  const strength = waveStrength(n);
  waveMonsters(n).forEach((type, i) => {
    const t = spots[i % spots.length];
    const { x, z } = toWorld(t.q, t.r);
    const hp = Math.round(MONSTERS[type].hp * strength);
    state.monsters.push({ id: state.nextId++, type, x, z, hp, maxHp: hp, path: [], cooldown: 1 + Math.random(), target: null, strength });
  });
  reveal(state, start.q, start.r, 1);
  events.push({ type: 'wave', number: n, at: [start.q, start.r], boss: waveMonsters(n).includes('titan') });
}

const hexOf = (a) => fromWorld(a.x, a.z);
const hexDist = (a, b) => distance(hexOf(a), hexOf(b));
const worldDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) / 2; // in hexes

// Actors stand in the middle of hexes; these help them finish a step before stopping.
const centreOf = (a) => toWorld(...hexOf(a));
const atCentre = (a) => {
  const c = centreOf(a);
  return Math.hypot(a.x - c.x, a.z - c.z) < 0.01;
};
function settle(a, speed, dt) {
  // Keep going to the hex it was heading for, or back to the nearest middle.
  a.path = a.path.length ? a.path.slice(0, 1) : [hexOf(a)];
  walk(null, a, speed, dt);
}

// Moves an actor along its path, from hex middle to hex middle. Returns true while it is still walking.
function walk(_state, actor, speed, dt) {
  if (!actor.path.length) return false;
  const [q, r] = actor.path[0];
  const goal = toWorld(q, r);
  const dx = goal.x - actor.x;
  const dz = goal.z - actor.z;
  const len = Math.hypot(dx, dz);
  const step = speed * 2 * dt;
  actor.heading = Math.atan2(dx, dz);
  if (len <= step) {
    actor.x = goal.x;
    actor.z = goal.z;
    actor.path.shift();
  } else {
    actor.x += (dx / len) * step;
    actor.z += (dz / len) * step;
  }
  return true;
}

function damageBuilding(state, b, amount, events) {
  if (b.state === 'destroyed') return;
  b.hp -= amount;
  if (b.hp <= 0) {
    b.hp = 0;
    b.state = 'destroyed';
    b.queue = [];
    b.left = 0;
    events.push({ type: 'destroyed', building: b });
  }
}

function hitMonster(state, m, amount, events, by = null) {
  m.hp -= amount;
  if (m.hp <= 0 && !m.dead) {
    m.dead = true;
    addResources(state, { gold: MONSTERS[m.type].bounty });
    events.push({ type: 'monsterDied', monster: m });
    const stats = stat(state);
    stats.kills++;
    if (MONSTERS[m.type].boss) stats.titans++;
    const killer = by && state.units.find((u) => u.id === by);
    giveXp(state, killer, MONSTERS[m.type].bounty * KILL_XP, events);
  }
}

function combat(state, dt, events) {
  const alive = (a) => !a.dead && a.hp > 0;
  const buildingTargets = state.buildings.filter((b) => b.state !== 'destroyed');

  // Monsters: go for a nearby defender, otherwise the nearest building.
  for (const m of state.monsters) {
    if (!alive(m)) continue;
    const def = MONSTERS[m.type];
    m.cooldown -= dt;
    const units = state.units.filter((u) => u.state !== 'away' && alive(u));
    const nearUnit = units.filter((u) => worldDist(u, m) <= 2.5).sort((a, b) => worldDist(a, m) - worldDist(b, m))[0];
    const siege = m.siege && buildingTargets.find((b) => b.id === m.siege);
    if (!siege) m.siege = null;
    let target = siege ? { kind: 'wall', ref: siege } : nearUnit ? { kind: 'unit', ref: nearUnit } : null;
    if (!target && buildingTargets.length) {
      const b = buildingTargets.reduce((best, o) => (distance([o.q, o.r], hexOf(m)) < distance([best.q, best.r], hexOf(m)) ? o : best));
      target = { kind: 'building', ref: b };
    }
    if (!target) {
      settle(m, def.speed, dt);
      continue;
    }
    const goal = target.kind === 'unit' ? hexOf(target.ref) : [target.ref.q, target.ref.r];
    const inReach = distance(hexOf(m), goal) <= (target.kind === 'unit' ? def.range : 1);
    if (inReach && atCentre(m)) {
      m.path = [];
      const pos = toWorld(...goal);
      m.heading = Math.atan2(pos.x - m.x, pos.z - m.z);
      if (m.cooldown <= 0) {
        m.cooldown = ATTACK_COOLDOWN * 1.3;
        const dmg = Math.round(def.damage * m.strength);
        events.push({ type: 'attack', actor: m, monster: true });
        if (target.kind === 'unit') hurtUnit(state, target.ref, dmg, events);
        else damageBuilding(state, target.ref, dmg, events);
      }
    } else if (inReach) {
      settle(m, def.speed, dt);
    } else {
      const last = m.path.at(-1);
      if ((!last || m.repath <= 0) && atCentre(m)) {
        const path = findPath(hexOf(m), goal, passCost(state, true), 800);
        if (!path && target.kind !== 'wall') {
          // Walled off: go and break down the nearest wall or gate instead.
          const walls = buildingTargets.filter((b) => BUILDINGS[b.type].wall);
          if (walls.length) m.siege = walls.reduce((best, o) => (distance([o.q, o.r], hexOf(m)) < distance([best.q, best.r], hexOf(m)) ? o : best)).id;
        }
        m.path = path ?? [];
        m.repath = 1.5;
        if (target.kind !== 'unit' && m.path.length) m.path.pop(); // stop next to it
      }
      m.repath -= dt;
      if (m.path.length) walk(state, m, def.speed, dt);
      else settle(m, def.speed, dt);
    }
  }

  // Units: follow orders; when free, fight monsters that come close. Like monsters,
  // they only ever stop in the middle of a hex.
  for (const u of state.units) {
    if (u.state === 'away' || !alive(u)) continue;
    const def = UNITS[u.type];
    u.cooldown -= dt;
    const monsters = state.monsters.filter(alive);
    let foe = u.target && alive(u.target) ? u.target : null;
    if (!foe && (!u.order || !u.path.length)) {
      foe = monsters.filter((m) => worldDist(m, u) <= AGGRO_RANGE).sort((a, b) => worldDist(a, u) - worldDist(b, u))[0] ?? null;
    }
    u.target = foe;
    const inReach = foe && distance(hexOf(u), hexOf(foe)) <= def.range;
    if (foe && inReach && !u.order) {
      if (!atCentre(u)) {
        u.state = 'moving';
        settle(u, def.speed, dt);
        continue;
      }
      u.path = [];
      u.state = 'fighting';
      u.heading = Math.atan2(foe.x - u.x, foe.z - u.z);
      if (u.cooldown <= 0) {
        u.cooldown = ATTACK_COOLDOWN;
        events.push({ type: 'attack', actor: u });
        if (def.shoots) {
          state.shots.push({ kind: def.shoots, from: { x: u.x, z: u.z }, to: foe, t: 0, damage: damageOf(state, u), splash: def.splash ?? 0, by: u.id });
        } else {
          hitMonster(state, foe, damageOf(state, u), events, u.id);
        }
      }
    } else if (foe && !u.order) {
      u.state = 'moving';
      if ((!u.path.length || u.repath <= 0) && atCentre(u)) {
        u.path = findPath(hexOf(u), hexOf(foe), passCost(state), 600) ?? [];
        u.repath = 1;
      }
      u.repath -= dt;
      if (u.path.length) walk(state, u, def.speed, dt);
      else settle(u, def.speed, dt);
    } else if (u.path.length) {
      u.state = 'moving';
      walk(state, u, def.speed, dt);
      if (!u.path.length) u.order = false;
    } else if (!atCentre(u)) {
      u.state = 'moving';
      settle(u, def.speed, dt);
    } else {
      u.state = 'idle';
    }
    const [q, r] = hexOf(u);
    if (reveal(state, q, r, def.reveal ?? UNIT_REVEAL)) events.push({ type: 'revealed' });
  }

  // Towers shoot the nearest monster in range.
  for (const b of state.buildings) {
    const attack = BUILDINGS[b.type].attack;
    if (!attack || b.state !== 'ready') continue;
    b.cooldown = (b.cooldown ?? 0) - dt;
    if (b.cooldown > 0) continue;
    const at = toWorld(b.q, b.r);
    const foe = state.monsters.filter((m) => alive(m) && worldDist(m, at) <= attack.range).sort((a, c) => worldDist(a, at) - worldDist(c, at))[0];
    if (foe) {
      b.cooldown = attack.cooldown;
      state.shots.push({ kind: attack.shot ?? 'arrow', from: { x: at.x, z: at.z, y: 2 }, to: foe, t: 0, damage: attack.damage * b.level, splash: attack.splash ?? 0, slow: attack.shot === 'boulder' });
    }
  }

  // Projectiles fly for a short while, then hit.
  for (const s of state.shots) {
    s.t += dt / (s.slow ? 1.1 : 0.45);
    if (s.t >= 1 && !s.done) {
      s.done = true;
      if (s.splash) {
        for (const m of state.monsters) if (alive(m) && worldDist(m, s.to) <= s.splash) hitMonster(state, m, s.damage, events, s.by);
      } else if (alive(s.to)) hitMonster(state, s.to, s.damage, events, s.by);
    }
  }
  state.shots = state.shots.filter((s) => !s.done);
  state.monsters = state.monsters.filter((m) => !m.dead);
}

function hurtUnit(state, u, amount, events) {
  u.hp -= amount;
  events.push({ type: 'hurt', unit: u });
  if (u.hp <= 0 && !u.dead) {
    u.dead = true;
    events.push({ type: 'unitDied', unit: u });
    state.units = state.units.filter((x) => x !== u);
  }
}

// Advances the game by dt seconds of play. Returns what happened, for the view.
export function tick(state, dt) {
  const events = [];
  economy(state, dt, events);
  state.time += dt;
  state.wave.next -= dt;
  if (state.wave.next <= 0) {
    spawnWave(state, events);
    state.wave.next = WAVE_EVERY;
  }
  combat(state, dt, events);
  state.goalTimer = (state.goalTimer ?? 0) - dt;
  if (state.goalTimer <= 0) {
    state.goalTimer = 1;
    checkGoals(state, events);
  }
  // A slow heal for units standing idle near buildings.
  for (const u of state.units) {
    if (u.state === 'idle' && u.hp < maxHp(state, u) && state.buildings.some((b) => b.state !== 'destroyed' && hexDist(u, toWorld(b.q, b.r)) <= 1)) {
      u.hp = Math.min(maxHp(state, u), u.hp + 2 * dt);
    }
  }
  return events;
}

// While the game was closed: production, building, training and dungeon runs carry on
// (up to OFFLINE_CAP), but no time passes for the waves and nothing fights.
export function catchUp(state, seconds) {
  const events = [];
  let left = Math.min(OFFLINE_CAP, Math.max(0, seconds));
  const before = { ...state.res };
  while (left > 0) {
    const step = Math.min(5, left);
    economy(state, step, events);
    left -= step;
  }
  const gained = Object.fromEntries(RESOURCES.map((r) => [r, Math.floor(state.res[r] - before[r])]));
  return { seconds: Math.min(OFFLINE_CAP, seconds), gained, events };
}

export { seeded };
