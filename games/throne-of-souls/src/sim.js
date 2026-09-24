// Throne of Souls: the rules, with no drawing. The scene calls step() every frame and
// reads state.battle.events for effects and sounds; tests and tools/balance.mjs drive
// the same functions in Node.
import * as D from './data.js';

export const SAVE_VERSION = 1;

// --- Random numbers (seeded, so tests and the balance script repeat) --------------------
export function random(state) {
  let t = (state.seed = (state.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (state, list) => list[Math.floor(random(state) * list.length)];

// --- New game, save and load ----------------------------------------------------------------
export function newState(seed = Date.now()) {
  const state = {
    version: SAVE_VERSION,
    seed: seed | 0,
    souls: D.START_SOULS,
    wave: 1,
    bestWave: 0,
    nextId: 1,
    lord: { level: 1, xp: 0, hp: D.LORD.hp, runes: [null, null, null] },
    cooldowns: { hellfire: 0, bonewall: 0, souldrain: 0 },
    auto: false,
    talents: {},
    upgrades: Object.fromEntries(D.MONSTER_ORDER.map((m) => [m, 0])),
    slots: { melee: D.SLOT_START, ranged: D.SLOT_START, wall: D.SLOT_START, support: D.SLOT_START, trap: D.SLOT_START },
    wall: { built: false, level: 0, hp: 0, rebuild: 0 },
    monsters: [],
    structures: [],
    runes: [],
    rate: null, // what a clear of the current wave earns, for offline progress
    savedAt: 0,
  };
  // A free orc warrior to start with, already in front of the throne.
  const orc = addMonster(state, 'orc');
  orc.cell = { col: 'melee', row: 4 };
  state.lord.hp = lordStats(state).hp;
  resetBattle(state);
  return state;
}

export function serialize(state, now = Date.now()) {
  const { battle, ...rest } = state;
  return JSON.stringify({ ...rest, savedAt: now });
}

export function deserialize(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== SAVE_VERSION) return null;
  const state = { ...newState(0), ...data };
  resetBattle(state);
  return state;
}

// --- Stats ---------------------------------------------------------------------------------
export const talent = (state, id) => state.talents[id] ?? 0;
function talentStep(id) {
  for (const branch of Object.values(D.TALENTS)) for (const t of branch) if (t.id === id) return t.step ?? 1;
  return 0;
}
const tv = (state, id) => talent(state, id) * talentStep(id);

export const runeById = (state, id) => state.runes.find((r) => r.id === id);
function runeBonus(state, holder, type) {
  let sum = 0;
  for (const id of holder.runes) {
    const rune = id != null && runeById(state, id);
    if (rune && rune.type === type) sum += D.RARITY_BONUS[rune.rarity];
  }
  return sum;
}
// Greed runes count wherever they are equipped.
export function soulBonus(state) {
  let greed = runeBonus(state, state.lord, 'greed');
  for (const m of state.monsters) if (m.runes) greed += runeBonus(state, m, 'greed');
  let wells = 0;
  for (const s of state.structures) if (s.cell && s.type === 'well') wells += D.STRUCTURES.well.bonus + s.level * D.STRUCTURES.well.stepBonus;
  return greed + wells + tv(state, 'souls');
}
export function drumBonus(state) {
  let bonus = 0;
  for (const s of state.structures) if (s.cell && s.type === 'drum') bonus += D.STRUCTURES.drum.bonus + s.level * D.STRUCTURES.drum.stepBonus;
  return bonus;
}

export function lordStats(state) {
  const { lord } = state;
  const grow = D.LORD.perLevel ** (lord.level - 1);
  return {
    hp: Math.round(D.LORD.hp * grow * (1 + runeBonus(state, lord, 'vigor'))),
    dmg: D.LORD.dmg * grow * (1 + runeBonus(state, lord, 'fury') + tv(state, 'lordDmg') + drumBonus(state)),
    rate: D.LORD.rate / (1 + runeBonus(state, lord, 'haste')),
    leech: runeBonus(state, lord, 'leech'),
    thorns: runeBonus(state, lord, 'thorns'),
  };
}

export function monsterStats(state, m) {
  const base = D.MONSTERS[m.type];
  const grow = (1 + D.UPGRADE_STEP * state.upgrades[m.type]) * (1 + D.MONSTER_LEVEL_STEP * (m.level - 1));
  return {
    ...base,
    hp: Math.round(base.hp * grow * (1 + runeBonus(state, m, 'vigor') + tv(state, 'monsterHp'))),
    dmg: base.dmg * grow * (1 + runeBonus(state, m, 'fury') + tv(state, 'monsterDmg') + drumBonus(state)),
    rate: base.rate / (1 + runeBonus(state, m, 'haste')),
    leech: runeBonus(state, m, 'leech'),
    thorns: runeBonus(state, m, 'thorns'),
  };
}

export const runeSlots = (level) => D.RUNE_SLOT_LEVELS.filter((l) => level >= l).length;

export function wallMax(state) {
  if (!state.wall.built) return 0;
  let hp = D.WALL.hp * (1 + D.WALL.perLevel * state.wall.level) * (1 + tv(state, 'wallHp'));
  for (const m of state.monsters) if (m.cell && isWallCol(m.cell.col)) hp += D.WALL_SHARE * monsterStats(state, m).hp;
  return Math.round(hp);
}
export const wallStanding = (state) => state.wall.built && state.wall.rebuild <= 0;

export function structureHp(s) {
  return Math.round(400 * 1.15 ** s.level);
}

// --- Costs ---------------------------------------------------------------------------------
export const recruitCost = (state, type) => Math.round(D.MONSTERS[type].cost * (1 - tv(state, 'recruitCost')));
export const typeUpgradeCost = (state, type) =>
  Math.round(D.upgradeCost(D.MONSTERS[type].cost, state.upgrades[type]) * (1 - tv(state, 'recruitCost')));
export const slotPrice = (state, kind) => Math.round(D.slotCost(state.slots[kind]) * (1 - tv(state, 'slotCost')));
export const structureCost = (state, type) => Math.round(D.STRUCTURES[type].cost * (1 - tv(state, 'structCost')));
export const structureUpgrade = (state, s) =>
  Math.round(D.structureUpgradeCost(D.STRUCTURES[s.type].cost, s.level + 1) * (1 - tv(state, 'structCost')));
export const wallUpgrade = (state) => D.wallUpgradeCost(state.wall.level);

function pay(state, cost) {
  if (state.souls < cost) return false;
  state.souls -= cost;
  return true;
}

// --- Monsters, structures and the grid -------------------------------------------------------
// Grid columns by name: melee monsters, the wall's two columns, support structures, traps.
export const CELL_X = { support: D.X.support, w0: D.X.wall[0], w1: D.X.wall[1], melee: D.X.melee, trap: D.X.trap };
export const isWallCol = (col) => col === 'w0' || col === 'w1';

function addMonster(state, type) {
  const m = { id: state.nextId++, type, level: 1, xp: 0, runes: [null, null, null], cell: null, hp: 0, dead: false };
  m.hp = monsterStats(state, m).hp;
  state.monsters.push(m);
  return m;
}

export const lordUnlocked = (state, level) => state.lord.level >= level;

export function recruit(state, type) {
  const base = D.MONSTERS[type];
  if (!base || !lordUnlocked(state, base.unlock) || !pay(state, recruitCost(state, type))) return null;
  return addMonster(state, type);
}

export function upgradeType(state, type) {
  if (!pay(state, typeUpgradeCost(state, type))) return false;
  state.upgrades[type] += 1;
  for (const m of state.monsters) if (m.type === type && !m.dead) m.hp = Math.min(monsterStats(state, m).hp, m.hp + monsterStats(state, m).hp * D.UPGRADE_STEP);
  return true;
}

export function buyStructure(state, type) {
  if (!D.STRUCTURES[type] || !pay(state, structureCost(state, type))) return null;
  const s = { id: state.nextId++, type, level: 0, cell: null, hp: 0 };
  s.hp = structureHp(s);
  state.structures.push(s);
  return s;
}

export function upgradeStructure(state, id) {
  const s = state.structures.find((x) => x.id === id);
  if (!s || !pay(state, structureUpgrade(state, s))) return false;
  s.level += 1;
  s.hp = structureHp(s);
  return true;
}

export function buySlot(state, kind) {
  if (state.slots[kind] >= D.SLOT_MAX || !pay(state, slotPrice(state, kind))) return false;
  state.slots[kind] += 1;
  return true;
}

export function buildWall(state) {
  if (state.wall.built || !pay(state, D.WALL.cost)) return false;
  state.wall.built = true;
  state.wall.hp = wallMax(state);
  return true;
}

export function upgradeWall(state) {
  if (!state.wall.built || !pay(state, wallUpgrade(state))) return false;
  const before = wallMax(state);
  state.wall.level += 1;
  if (wallStanding(state)) state.wall.hp += wallMax(state) - before;
  return true;
}

export function occupant(state, col, row) {
  return (
    state.monsters.find((m) => m.cell && m.cell.col === col && m.cell.row === row) ??
    state.structures.find((s) => s.cell && s.cell.col === col && s.cell.row === row) ??
    null
  );
}

// Which slot kind a monster or structure uses, and which columns it may go in.
export function slotKind(item) {
  if (D.MONSTERS[item.type]) return D.MONSTERS[item.type].kind;
  const place = D.STRUCTURES[item.type].place;
  return place;
}
export function columnsFor(item) {
  const kind = slotKind(item);
  if (kind === 'melee') return ['melee'];
  if (kind === 'ranged' || kind === 'wall') return ['w0', 'w1'];
  return [kind];
}
const isStructure = (item) => Boolean(D.STRUCTURES[item.type]);
export const placedCount = (state, kind) =>
  [...state.monsters, ...state.structures].filter((x) => x.cell && slotKind(x) === kind).length;

// Why an item can't go in a cell, or null if it can.
export function placeProblem(state, item, col, row) {
  if (!columnsFor(item).includes(col) || row < 0 || row >= D.ROWS) return 'cell';
  const there = occupant(state, col, row);
  if (there && there !== item) return 'taken';
  if (isStructure(item) && D.STRUCTURES[item.type].place === 'wall' && !state.wall.built) return 'noWall';
  const kind = slotKind(item);
  if (!item.cell && placedCount(state, kind) >= state.slots[kind]) return 'slots';
  return null;
}

export function place(state, item, col, row) {
  if (placeProblem(state, item, col, row)) return false;
  const before = wallMax(state);
  item.cell = { col, row };
  if (state.wall.built && wallStanding(state)) state.wall.hp = Math.max(0, state.wall.hp + wallMax(state) - before);
  return true;
}

export function unplace(state, item) {
  if (!item.cell) return false;
  const before = wallMax(state);
  item.cell = null;
  if (wallStanding(state)) state.wall.hp = Math.min(wallMax(state), Math.max(1, state.wall.hp + wallMax(state) - before));
  return true;
}

// Where an item stands on the field, in columns and rows.
export function itemX(state, item) {
  if (!D.MONSTERS[item.type] || !isWallCol(item.cell.col)) return CELL_X[item.cell.col];
  // Ranged monsters fall back behind a broken wall, next to the support structures.
  return state.wall.built && !wallStanding(state) ? D.X.support - 0.35 : CELL_X[item.cell.col];
}

// --- Runes --------------------------------------------------------------------------------
export function addRune(state, type, rarity) {
  const rune = { id: state.nextId++, type, rarity };
  state.runes.push(rune);
  return rune;
}

export function runeHolder(state, runeId) {
  if (state.lord.runes.includes(runeId)) return state.lord;
  return state.monsters.find((m) => m.runes.includes(runeId)) ?? null;
}

export function equipRune(state, runeId, holder, slot) {
  const levels = holder === state.lord ? state.lord.level : holder.level;
  if (slot >= runeSlots(levels) || !runeById(state, runeId)) return false;
  unequipRune(state, runeId);
  holder.runes[slot] = runeId;
  return true;
}

export function unequipRune(state, runeId) {
  const holder = runeHolder(state, runeId);
  if (!holder) return false;
  holder.runes = holder.runes.map((id) => (id === runeId ? null : id));
  return true;
}

// Unequipped runes of one type and rarity, oldest first.
export const looseRunes = (state, type, rarity) =>
  state.runes.filter((r) => r.type === type && r.rarity === rarity && !runeHolder(state, r.id));

export function mergeRunes(state, type, rarity) {
  const loose = looseRunes(state, type, rarity);
  if (rarity >= D.RARITY_BONUS.length - 1 || loose.length < 3) return null;
  const used = loose.slice(0, 3);
  // The Greed talent sometimes gives one of the three back.
  if (talent(state, 'mergeRefund') && random(state) < talentStep('mergeRefund')) used.pop();
  state.runes = state.runes.filter((r) => !used.includes(r));
  return addRune(state, type, rarity + 1);
}

export function breakRune(state, runeId) {
  const rune = runeById(state, runeId);
  if (!rune) return false;
  unequipRune(state, runeId);
  state.runes = state.runes.filter((r) => r !== rune);
  state.souls += D.RARITY_SOULS[rune.rarity];
  return true;
}

function dropRune(state) {
  const roll = random(state);
  let rarity = 0;
  for (let acc = 0; rarity < D.RARITY_DROP.length; rarity++) {
    acc += D.RARITY_DROP[rarity];
    if (roll < acc) break;
  }
  return addRune(state, pick(state, D.RUNES), Math.min(rarity, D.RARITY_DROP.length - 1));
}

// --- Talents ------------------------------------------------------------------------------
export const talentPoints = (state) => state.lord.level - 1 - Object.values(state.talents).reduce((a, b) => a + b, 0);

export function learnTalent(state, id) {
  const t = Object.values(D.TALENTS).flat().find((x) => x.id === id);
  if (!t || talent(state, id) >= t.max || talentPoints(state) < 1) return false;
  state.talents[id] = talent(state, id) + 1;
  return true;
}

// --- XP -------------------------------------------------------------------------------------
function giveLordXp(state, xp, events) {
  const { lord } = state;
  lord.xp += xp;
  while (lord.xp >= D.lordXpToLevel(lord.level)) {
    lord.xp -= D.lordXpToLevel(lord.level);
    const before = lordStats(state).hp;
    lord.level += 1;
    lord.hp += lordStats(state).hp - before;
    events?.push({ type: 'lordLevel', level: lord.level });
  }
}

function giveMonsterXp(state, xp, events) {
  const deployed = state.monsters.filter((m) => m.cell);
  if (!deployed.length) return giveLordXp(state, xp, events);
  const each = xp / deployed.length;
  for (const m of deployed) {
    m.xp += each;
    while (m.xp >= D.monsterXpToLevel(m.level)) {
      m.xp -= D.monsterXpToLevel(m.level);
      m.level += 1;
      events?.push({ type: 'monsterLevel', id: m.id, level: m.level });
    }
  }
}

export function giveXp(state, xp, events) {
  giveLordXp(state, xp * D.LORD_XP_SHARE, events);
  giveMonsterXp(state, xp * (1 - D.LORD_XP_SHARE), events);
}

// --- Waves ----------------------------------------------------------------------------------
export const depthOf = (wave) => D.DEPTHS[Math.floor((wave - 1) / 20) % D.DEPTHS.length];
export const isBossWave = (wave) => wave % D.BOSS_EVERY === 0;

export function waveHeroes(state, wave) {
  const depth = depthOf(wave);
  const list = [];
  for (let i = 0; i < D.heroCount(wave); i++) list.push(random(state) < D.PLATINO_CHANCE ? 'platino' : pick(state, depth.heroes));
  if (isBossWave(wave)) list.push({ boss: depth.bosses[(wave / D.BOSS_EVERY - 1) % 2] });
  return list;
}

export function resetBattle(state) {
  state.battle = {
    phase: 'gap',
    timer: 1.5,
    queue: [],
    spawnTimer: 0,
    heroes: [],
    burns: [],
    shield: null,
    drain: null,
    lordCd: 0,
    run: null,
    events: [],
    time: 0,
  };
}

function startWave(state) {
  const b = state.battle;
  b.phase = 'fight';
  b.queue = waveHeroes(state, state.wave);
  b.spawnTimer = 0;
  b.heroes = [];
  b.burns = [];
  b.run = { time: 0, souls: 0, xp: 0, kills: 0 };
  // Everything that fell comes back for the new wave.
  for (const m of state.monsters) {
    if (m.dead) {
      m.dead = false;
      m.hp = monsterStats(state, m).hp;
    }
  }
  for (const s of state.structures) s.hp = structureHp(s);
  b.events.push({ type: 'waveStart', wave: state.wave, boss: isBossWave(state.wave) });
}

function spawnHero(state, entry) {
  const b = state.battle;
  const type = typeof entry === 'string' ? entry : entry.boss;
  const boss = typeof entry !== 'string';
  const base = D.HEROES[type];
  const row = Math.floor(random(state) * D.ROWS);
  const hpMul = D.heroHpScale(state.wave) * (boss ? D.BOSS.hp : 1);
  const hp = Math.round(base.hp * hpMul);
  const hero = {
    id: state.nextId++,
    type,
    boss,
    row,
    y: row,
    x: D.X.spawn - random(state) * 0.3,
    hp,
    max: hp,
    dmg: base.dmg * D.heroDmgScale(state.wave) * (boss ? D.BOSS.dmg : 1),
    cd: 0.5,
    moveCd: 0,
    slow: 0,
    slowT: 0,
    stun: 0,
    trapsHit: [],
    fighting: false,
  };
  b.heroes.push(hero);
  return hero;
}

// Tap "Next wave": leave the current wave (no rewards for heroes still alive) and go on.
export const canAdvance = (state) => state.bestWave >= state.wave;
export function nextWave(state) {
  if (!canAdvance(state)) return false;
  state.wave += 1;
  state.battle.heroes = [];
  state.battle.queue = [];
  state.battle.phase = 'gap';
  state.battle.timer = 1;
  return true;
}

function lordFalls(state) {
  const b = state.battle;
  state.wave = Math.max(1, state.wave - D.FALL_BACK);
  state.lord.hp = lordStats(state).hp;
  for (const m of state.monsters) {
    m.dead = false;
    m.hp = monsterStats(state, m).hp;
  }
  if (state.wall.built) {
    state.wall.rebuild = 0;
    state.wall.hp = wallMax(state);
  }
  b.heroes = [];
  b.queue = [];
  b.phase = 'gap';
  b.timer = D.WAVE_GAP;
  b.events.push({ type: 'fall', wave: state.wave });
}

function waveCleared(state) {
  const b = state.battle;
  state.bestWave = Math.max(state.bestWave, state.wave);
  // Remember what a clear of this wave earns, for progress while the game is closed.
  const run = b.run;
  if (run && run.time > 0) {
    const secs = run.time + D.WAVE_GAP;
    const prev = state.rate?.wave === state.wave ? state.rate : null;
    const mix = (a, c) => (prev ? a * 0.7 + c * 0.3 : c);
    state.rate = {
      wave: state.wave,
      secs: mix(prev?.secs, secs),
      souls: mix(prev?.souls, run.souls),
      xp: mix(prev?.xp, run.xp),
      kills: mix(prev?.kills, run.kills),
    };
  }
  b.phase = 'gap';
  b.timer = D.WAVE_GAP;
  b.events.push({ type: 'waveCleared', wave: state.wave });
}

// --- Combat --------------------------------------------------------------------------------
const alive = (m) => m.cell && !m.dead;
const rowOf = (h) => Math.round(h.y);

// Units are placed on a grid whose rows are about twice as tall as its columns are wide.
const ROW_H = 1.8;
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, (y1 - y2) * ROW_H);

// What a hero goes for in its row: melee line, then the wall, then structures and
// ranged monsters, then the lord.
export function heroTarget(state, h) {
  const row = rowOf(h);
  const base = D.HEROES[h.type];
  if (!base.flies) {
    const m = state.monsters.find((x) => alive(x) && x.cell.col === 'melee' && x.cell.row === row);
    if (m) return { kind: 'monster', item: m, x: D.X.melee };
  }
  if (wallStanding(state)) return { kind: 'wall', x: D.X.wallFront };
  let best = null;
  for (const item of [...state.monsters, ...state.structures]) {
    if (!item.cell || item.cell.row !== row || item.cell.col === 'melee' || item.cell.col === 'trap') continue;
    if (item.dead || (isStructure(item) && item.hp <= 0)) continue;
    const x = itemX(state, item);
    if (x < h.x && (!best || x > best.x)) best = { kind: isStructure(item) ? 'structure' : 'monster', item, x };
  }
  return best ?? { kind: 'lord', x: D.X.lord + 0.4 };
}

// Melee heroes with nobody to fight in their row drift to the nearest row that has one.
function chooseRow(state, h) {
  const base = D.HEROES[h.type];
  if (base.flies || base.range > 0 || h.x < D.X.trap + 1) return;
  const rows = state.monsters.filter((m) => alive(m) && m.cell.col === 'melee').map((m) => m.cell.row);
  if (!rows.length || rows.includes(h.row)) return;
  h.row = rows.reduce((best, r) => (Math.abs(r - h.y) < Math.abs(best - h.y) ? r : best), rows[0]);
}

function damageMonster(state, m, amount, events, fromMelee, hero) {
  const b = state.battle;
  if (b.shield && m.cell.col === 'melee') amount = absorb(b, amount);
  if (amount <= 0) return;
  m.hp -= amount;
  events.push({ type: 'hit', target: 'monster', id: m.id, amount });
  const stats = monsterStats(state, m);
  if (fromMelee && hero && stats.thorns > 0) damageHero(state, hero, amount * stats.thorns, events);
  if (m.hp <= 0) {
    m.dead = true;
    m.hp = 0;
    events.push({ type: 'monsterDied', id: m.id });
  }
}

function absorb(b, amount) {
  const used = Math.min(b.shield.hp, amount);
  b.shield.hp -= used;
  if (b.shield.hp <= 0) b.shield = null;
  return amount - used;
}

function damageWall(state, amount, events) {
  const b = state.battle;
  if (b.shield) amount = absorb(b, amount);
  if (amount <= 0) return;
  state.wall.hp -= amount;
  events.push({ type: 'hit', target: 'wall', amount });
  if (state.wall.hp <= 0) {
    state.wall.hp = 0;
    state.wall.rebuild = D.WALL.rebuild * (1 - tv(state, 'rebuild'));
    events.push({ type: 'wallBroken' });
  }
}

function damageLord(state, amount, events, hero) {
  state.lord.hp -= amount;
  events.push({ type: 'hit', target: 'lord', amount });
  const { thorns } = lordStats(state);
  if (hero && D.HEROES[hero.type].range === 0 && thorns > 0) damageHero(state, hero, amount * thorns, events);
  if (state.lord.hp <= 0) lordFalls(state);
}

export function damageHero(state, h, amount, events, source) {
  if (h.hp <= 0) return;
  h.hp -= amount;
  events.push({ type: 'hit', target: 'hero', id: h.id, amount });
  if (source?.leech) healSource(state, source, amount * source.leech);
  if (h.hp <= 0) killHero(state, h, events);
}

function healSource(state, source, amount) {
  if (source.who === 'lord') state.lord.hp = Math.min(lordStats(state).hp, state.lord.hp + amount);
  else if (source.who && !source.who.dead) source.who.hp = Math.min(monsterStats(state, source.who).hp, source.who.hp + amount);
}

function killHero(state, h, events) {
  const b = state.battle;
  const base = D.HEROES[h.type];
  const souls = Math.round(base.souls * D.soulScale(state.wave) * (h.boss ? D.BOSS.souls : 1) * (1 + soulBonus(state)));
  const xp = base.xp * D.soulScale(state.wave) * (h.boss ? D.BOSS.xp : 1);
  state.souls += souls;
  giveXp(state, xp, events);
  if (b.run) {
    b.run.souls += souls;
    b.run.xp += xp;
    b.run.kills += 1;
  }
  events.push({ type: 'kill', id: h.id, x: h.x, y: h.y, souls, boss: h.boss });
  const chance = D.RUNE_DROP + tv(state, 'runeDrop');
  if (h.boss || base.rare || random(state) < chance) {
    const rune = dropRune(state);
    events.push({ type: 'rune', id: rune.id, x: h.x, y: h.y });
  }
  if (h.boss && talent(state, 'bossReset')) for (const k of Object.keys(state.cooldowns)) state.cooldowns[k] = 0;
}

// Heroes nearest the throne first.
const byFront = (heroes) => heroes.filter((h) => h.hp > 0).sort((a, b) => a.x - b.x);

function heroesStep(state, dt, events) {
  const b = state.battle;
  for (const h of b.heroes) {
    if (h.hp <= 0) continue;
    const base = D.HEROES[h.type];
    if (h.stun > 0) {
      h.stun -= dt;
      continue;
    }
    if (h.slowT > 0) h.slowT -= dt;
    chooseRow(state, h);
    // Drift towards the chosen row.
    if (Math.abs(h.y - h.row) > 0.01) h.y += Math.sign(h.row - h.y) * Math.min(Math.abs(h.row - h.y), dt * 1.2);
    const target = heroTarget(state, h);
    const reach = base.range > 0 ? base.range : 0.8;
    h.fighting = h.x - target.x <= reach;
    h.cd -= dt;
    if (!h.fighting) {
      let speed = base.speed * (h.slowT > 0 ? 1 - h.slow : 1);
      speed *= 1 - trapSlow(state, h);
      h.x = Math.max(target.x + reach * 0.95, h.x - speed * dt);
      traps(state, h, events);
    } else if (h.cd <= 0) {
      h.cd = base.rate;
      events.push({ type: 'heroAttack', id: h.id, ranged: base.range > 0, tx: target.x, ty: h.y, target: target.kind });
      const melee = base.range === 0;
      if (target.kind === 'monster') damageMonster(state, target.item, h.dmg, events, melee, h);
      else if (target.kind === 'wall') damageWall(state, h.dmg * (base.wallMul ?? 1), events);
      else if (target.kind === 'structure') {
        target.item.hp -= h.dmg * (base.structMul ?? 1);
        events.push({ type: 'hit', target: 'structure', id: target.item.id, amount: h.dmg });
        if (target.item.hp <= 0) events.push({ type: 'structureDown', id: target.item.id });
      } else damageLord(state, h.dmg, events, h);
      if (b.phase !== 'fight') return; // the lord fell
    }
    heroSpecial(state, h, dt, events);
  }
}

function heroSpecial(state, h, dt, events) {
  const b = state.battle;
  const base = D.HEROES[h.type];
  h.special = (h.special ?? 0) + dt;
  if (base.heal && h.special >= 1) {
    h.special = 0;
    const hurt = b.heroes.filter((o) => o.hp > 0 && o.hp < o.max && dist(o.x, o.y, h.x, h.y) < 3).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
    if (hurt) {
      hurt.hp = Math.min(hurt.max, hurt.hp + hurt.max * base.heal);
      events.push({ type: 'heroHeal', id: hurt.id });
    }
  }
  if (!h.boss) return;
  if (base.boss === 'heal' && h.special >= 6) {
    h.special = 0;
    for (const o of b.heroes) if (o.hp > 0) o.hp = Math.min(o.max, o.hp + o.max * 0.2);
    events.push({ type: 'bossMove', move: 'heal', id: h.id });
  } else if (base.boss === 'breaker' && h.special >= 8) {
    h.special = 0;
    if (wallStanding(state)) damageWall(state, h.dmg * 5, events);
    events.push({ type: 'bossMove', move: 'breaker', id: h.id });
  } else if (base.boss === 'summon' && h.special >= 10) {
    h.special = 0;
    for (let i = 0; i < 3; i++) {
      const c = spawnHero(state, 'chort');
      c.x = h.x + 0.3 * i;
      c.row = Math.max(0, Math.min(D.ROWS - 1, h.row + i - 1));
      c.y = c.row;
    }
    events.push({ type: 'bossMove', move: 'summon', id: h.id });
  }
}

function trapAt(state, row) {
  return state.structures.find((s) => s.cell && s.cell.col === 'trap' && s.cell.row === row);
}

function trapSlow(state, h) {
  if (D.HEROES[h.type].flies) return 0;
  const trap = trapAt(state, rowOf(h));
  if (!trap || trap.type !== 'tar' || Math.abs(h.x - D.X.trap) > 0.5) return 0;
  const t = D.STRUCTURES.tar;
  return Math.min(t.maxSlow, t.slow + t.stepSlow * trap.level);
}

function traps(state, h, events) {
  if (D.HEROES[h.type].flies || h.x > D.X.trap + 0.5) return;
  const trap = trapAt(state, rowOf(h));
  if (!trap || h.trapsHit.includes(trap.id)) return;
  h.trapsHit.push(trap.id);
  const t = D.STRUCTURES[trap.type];
  if (trap.type === 'spikes') {
    events.push({ type: 'trap', id: trap.id });
    damageHero(state, h, t.dmg * (1 + t.step * trap.level) * (1 + tv(state, 'trapDmg')) * D.heroDmgScale(state.wave), events);
  } else if (trap.type === 'bones') {
    events.push({ type: 'trap', id: trap.id });
    h.stun = Math.min(t.maxStun, t.stun + t.stepStun * trap.level);
  }
}

function defendersStep(state, dt, events) {
  const b = state.battle;
  const front = () => byFront(b.heroes);

  // The lord shoots the hero nearest the throne.
  const lord = lordStats(state);
  b.lordCd -= dt;
  if (b.lordCd <= 0 && front().length) {
    const h = front()[0];
    b.lordCd = lord.rate;
    events.push({ type: 'shot', from: 'lord', x: D.X.lord, y: 4, tx: h.x, ty: h.y, kind: 'fire' });
    damageHero(state, h, lord.dmg, events, { who: 'lord', leech: lord.leech });
  }

  for (const m of state.monsters) {
    if (!alive(m)) continue;
    const s = monsterStats(state, m);
    m.cd = (m.cd ?? 0) - dt;
    if (m.cd > 0) continue;
    const x = itemX(state, m);
    const row = m.cell.row;
    let targets;
    if (s.kind === 'melee') {
      targets = front().filter((h) => rowOf(h) === row && h.x - x <= D.MELEE_REACH + 0.2 && h.x > x - 0.5);
      targets = targets.slice(0, s.hits ?? 1);
    } else {
      const h = front().find((o) => o.x - x <= s.range && o.x > x - 0.5);
      targets = h ? [h] : [];
    }
    if (!targets.length) continue;
    m.cd = s.rate;
    for (const h of targets) {
      events.push({ type: 'shot', from: 'monster', id: m.id, x, y: row, tx: h.x, ty: h.y, kind: s.kind === 'melee' ? 'melee' : m.type });
      damageHero(state, h, s.dmg, events, { who: m, leech: s.leech });
      if (s.slow) {
        h.slow = s.slow[0];
        h.slowT = s.slow[1];
      }
      if (s.splash) for (const o of front()) if (o !== h && dist(o.x, o.y, h.x, h.y) <= s.splash) damageHero(state, o, s.dmg * 0.5, events, { who: m });
    }
  }

  // Structures on the wall fire only while it stands.
  const standing = wallStanding(state);
  for (const st of state.structures) {
    if (!st.cell || st.hp <= 0) continue;
    const t = D.STRUCTURES[st.type];
    st.cd = (st.cd ?? 0) - dt;
    if (t.place === 'support' && st.type === 'altar' && st.cd <= 0) {
      st.cd = 1;
      const heal = t.heal * (1 + t.step * st.level);
      if (standing) state.wall.hp = Math.min(wallMax(state), state.wall.hp + wallMax(state) * heal);
      for (const m of state.monsters) if (alive(m)) m.hp = Math.min(monsterStats(state, m).hp, m.hp + monsterStats(state, m).hp * heal);
      continue;
    }
    if (t.place !== 'wall' || !standing || st.cd > 0) continue;
    const x = CELL_X[st.cell.col];
    const inRange = front().filter((h) => h.x - x <= t.range);
    if (!inRange.length) continue;
    const grow = 1 + t.step * st.level;
    const scale = D.heroDmgScale(state.wave) * (1 + drumBonus(state));
    if (st.type === 'ballista') {
      st.cd = t.rate;
      const h = inRange[0];
      events.push({ type: 'shot', from: 'structure', id: st.id, x, y: st.cell.row, tx: h.x, ty: h.y, kind: 'bolt' });
      damageHero(state, h, t.dmg * grow * scale, events);
    } else if (st.type === 'brazier') {
      st.cd = 1;
      const h = inRange[0];
      events.push({ type: 'burn', x: h.x, y: h.y, radius: t.radius });
      for (const o of front()) if (dist(o.x, o.y, h.x, h.y) <= t.radius) damageHero(state, o, t.dps * grow * scale, events);
    } else if (st.type === 'turret') {
      st.cd = t.rate;
      let from = { x, y: st.cell.row };
      for (const h of inRange.slice(0, t.chain)) {
        events.push({ type: 'shot', from: 'structure', id: st.id, x: from.x, y: from.y, tx: h.x, ty: h.y, kind: 'soul' });
        damageHero(state, h, t.dmg * grow * scale, events);
        from = h;
      }
    }
  }
}

// --- Spells -------------------------------------------------------------------------------
export const spellCooldown = (state, id) => D.SPELLS[id].cooldown * (1 - tv(state, 'cooldown'));
export const spellReady = (state, id) => lordUnlocked(state, D.SPELLS[id].unlock) && state.cooldowns[id] <= 0;

export function castSpell(state, id, target) {
  if (!spellReady(state, id) || state.battle.phase !== 'fight') return false;
  const b = state.battle;
  const events = b.events;
  const lordDmg = lordStats(state).dmg;
  const spell = D.SPELLS[id];
  if (id === 'hellfire') {
    const t = target ?? bestCluster(state);
    if (!t) return false;
    events.push({ type: 'spell', spell: id, x: t.x, y: t.y });
    for (const h of byFront(b.heroes)) if (dist(h.x, h.y, t.x, t.y) <= spell.radius) damageHero(state, h, lordDmg * spell.dmg, events);
    if (talent(state, 'burn')) b.burns.push({ x: t.x, y: t.y, t: 3, dps: lordDmg });
  } else if (id === 'bonewall') {
    const max = state.wall.built ? wallMax(state) : D.WALL.hp;
    b.shield = { hp: max * spell.shield, t: spell.seconds, max: max * spell.shield };
    events.push({ type: 'spell', spell: id });
  } else if (id === 'souldrain') {
    const targets = byFront(b.heroes).slice(0, spell.targets);
    if (!targets.length) return false;
    b.drain = { t: spell.seconds, ids: targets.map((h) => h.id), dps: lordDmg * spell.dps };
    events.push({ type: 'spell', spell: id });
  }
  state.cooldowns[id] = spellCooldown(state, id);
  return true;
}

// Where Hellfire hits the most heroes.
export function bestCluster(state) {
  const heroes = byFront(state.battle.heroes);
  let best = null;
  let bestCount = 0;
  for (const h of heroes) {
    const count = heroes.filter((o) => dist(o.x, o.y, h.x, h.y) <= D.SPELLS.hellfire.radius).length;
    if (count > bestCount) {
      best = { x: h.x, y: h.y };
      bestCount = count;
    }
  }
  return best;
}

function spellsStep(state, dt, events) {
  const b = state.battle;
  for (const k of Object.keys(state.cooldowns)) state.cooldowns[k] = Math.max(0, state.cooldowns[k] - dt);
  if (b.shield && (b.shield.t -= dt) <= 0) b.shield = null;
  if (b.drain) {
    b.drain.t -= dt;
    let drained = 0;
    for (const h of b.heroes) {
      if (h.hp > 0 && b.drain.ids.includes(h.id)) {
        const amount = Math.min(h.hp, b.drain.dps * dt);
        drained += amount;
        damageHero(state, h, amount, events);
      }
    }
    // Half heals the lord, half is shared by the monsters.
    state.lord.hp = Math.min(lordStats(state).hp, state.lord.hp + drained / 2);
    const living = state.monsters.filter(alive);
    for (const m of living) m.hp = Math.min(monsterStats(state, m).hp, m.hp + drained / 2 / living.length);
    if (b.drain.t <= 0) b.drain = null;
  }
  for (const burn of b.burns) {
    burn.t -= dt;
    for (const h of byFront(b.heroes)) if (dist(h.x, h.y, burn.x, burn.y) <= D.SPELLS.hellfire.radius) damageHero(state, h, burn.dps * dt, events);
  }
  b.burns = b.burns.filter((x) => x.t > 0);
  if (state.auto && b.heroes.some((h) => h.hp > 0)) {
    for (const id of D.SPELL_ORDER) {
      if (!spellReady(state, id)) continue;
      // Bone wall waits until heroes are at the front line.
      if (id === 'bonewall' && !b.heroes.some((h) => h.hp > 0 && h.fighting)) continue;
      castSpell(state, id);
    }
  }
}

// --- The main step -------------------------------------------------------------------------
export function step(state, dt) {
  const b = state.battle;
  const events = b.events;
  b.time += dt;
  if (state.wall.built && state.wall.rebuild > 0) {
    state.wall.rebuild -= dt;
    if (state.wall.rebuild <= 0) {
      state.wall.rebuild = 0;
      state.wall.hp = wallMax(state);
      events.push({ type: 'wallRebuilt' });
    }
  }
  if (b.phase === 'gap') {
    b.timer -= dt;
    spellsStep(state, dt, events);
    if (b.timer <= 0) startWave(state);
    return;
  }
  b.run.time += dt;
  b.spawnTimer -= dt;
  if (b.queue.length && b.spawnTimer <= 0) {
    spawnHero(state, b.queue.shift());
    b.spawnTimer = D.SPAWN_GAP;
  }
  heroesStep(state, dt, events);
  if (b.phase !== 'fight') return;
  defendersStep(state, dt, events);
  spellsStep(state, dt, events);
  b.heroes = b.heroes.filter((h) => h.hp > 0);
  if (!b.queue.length && !b.heroes.length) waveCleared(state);
}

// --- While the game was closed ------------------------------------------------------------------
export const offlineCapHours = (state) => D.OFFLINE_HOURS + tv(state, 'offline');

// Adds what the time away earned at the wave the player left on, and returns a summary.
export function applyOffline(state, now = Date.now()) {
  if (!state.savedAt || !state.rate || state.rate.wave !== state.wave) return null;
  const seconds = Math.min((now - state.savedAt) / 1000, offlineCapHours(state) * 3600);
  if (seconds < 60) return null;
  const clears = seconds / state.rate.secs;
  const souls = Math.round(clears * state.rate.souls);
  const xp = clears * state.rate.xp;
  const kills = clears * state.rate.kills;
  const levelBefore = state.lord.level;
  state.souls += souls;
  giveXp(state, xp);
  const expected = kills * (D.RUNE_DROP + tv(state, 'runeDrop'));
  let runes = Math.floor(expected) + (random(state) < expected % 1 ? 1 : 0);
  runes = Math.min(runes, 50);
  for (let i = 0; i < runes; i++) dropRune(state);
  return { seconds, souls, xp: Math.round(xp), runes, levels: state.lord.level - levelBefore };
}
