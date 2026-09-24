// Numbers for buildings, units, monsters and waves. Rates are per second.

export const RESOURCES = ['wood', 'stone', 'food', 'gold'];
export const START_RESOURCES = { wood: 90, stone: 40, food: 60, gold: 40 };
export const STORAGE = [300, 800, 2000]; // by castle level
export const OFFLINE_CAP = 8 * 3600; // seconds of production kept while the game is closed
export const MAX_LEVEL = 3;

// terrain: where it may stand. near: a terrain it needs next to it.
// produce: resource per second at level 1 (scaled by level). workers: people it needs.
export const BUILDINGS = {
  castle: { model: 'building_castle_blue', hp: 800, pop: 6, reveal: 3, upgrade: { wood: 150, stone: 150 }, buildable: false, attack: { damage: 10, range: 3, cooldown: 1.5 } },
  home: { model: 'building_home_A_blue', model2: 'building_home_B_blue', cost: { wood: 25 }, time: 12, hp: 150, pop: 4, produce: { gold: 0.06 } },
  farm: { model: 'building_grain', cost: { wood: 20 }, time: 12, hp: 100, workers: 1, produce: { food: 0.4 }, terrain: ['grass'] },
  lumbermill: { model: 'building_lumbermill_blue', cost: { wood: 20 }, time: 18, hp: 180, workers: 2, produce: { wood: 0.3 }, perNear: 'forest', near: 'forest' },
  mine: { model: 'building_mine_blue', cost: { wood: 40 }, time: 25, hp: 220, workers: 3, produce: { stone: 0.45 }, terrain: ['hills'] },
  windmill: { model: 'building_windmill_blue', cost: { wood: 45, stone: 15 }, time: 25, hp: 180, workers: 2, produce: { food: 0.9 }, terrain: ['grass'] },
  watermill: { model: 'building_watermill_blue', cost: { wood: 50, stone: 20 }, time: 25, hp: 180, workers: 2, produce: { food: 1.2 }, near: 'water' },
  market: { model: 'building_market_blue', cost: { wood: 60, stone: 40 }, time: 35, hp: 200, workers: 2, produce: { gold: 0.45 } },
  barracks: { model: 'building_barracks_blue', cost: { wood: 80, stone: 40 }, time: 40, hp: 300, workers: 1, trains: ['knight', 'barbarian'] },
  archery: { model: 'building_archeryrange_blue', cost: { wood: 90, stone: 30 }, time: 40, hp: 260, workers: 1, trains: ['rogue', 'scout'] },
  chapel: { model: 'building_church_blue', cost: { stone: 90, gold: 60 }, time: 50, hp: 260, workers: 1, trains: ['mage'] },
  tavern: { model: 'building_tavern_blue', cost: { wood: 60, stone: 30, gold: 20 }, time: 35, hp: 220, workers: 1, homeBonus: 1 },
  blacksmith: { model: 'building_blacksmith_blue', cost: { wood: 70, stone: 60 }, time: 40, hp: 260, workers: 2, research: true },
  catapult: { model: 'building_tower_catapult_blue', cost: { wood: 60, stone: 120, gold: 40 }, time: 50, hp: 420, workers: 2, reveal: 3, attack: { damage: 28, range: 5, cooldown: 4, splash: 1, shot: 'boulder' }, terrain: ['grass', 'hills', 'forest'] },
  // Walls and gates join up with their neighbours. Monsters can't pass either (they
  // break through when there's no way round); units walk through gates.
  wall: { model: 'wall_straight', cost: { stone: 12 }, time: 4, hp: 300, wall: true, fixed: true, terrain: ['grass', 'forest', 'hills'] },
  gate: { model: 'wall_straight_gate', cost: { wood: 20, stone: 20 }, time: 8, hp: 350, wall: true, gate: true, fixed: true, terrain: ['grass', 'forest', 'hills'] },
  // Bridges go on water or river next to land (or another bridge) and can be walked over.
  bridge: { model: 'building_bridge_A', cost: { wood: 40, stone: 10 }, time: 15, hp: 200, fixed: true, bridge: true, terrain: ['water', 'river'] },
  tower: { model: 'building_tower_A_blue', cost: { wood: 30, stone: 60 }, time: 35, hp: 350, workers: 1, reveal: 3, attack: { damage: 11, range: 3, cooldown: 1.4 }, terrain: ['grass', 'hills', 'forest'] },
};
export const BUILD_ORDER = ['home', 'farm', 'lumbermill', 'mine', 'windmill', 'watermill', 'market', 'tavern', 'wall', 'gate', 'bridge', 'tower', 'catapult', 'barracks', 'archery', 'chapel', 'blacksmith'];
export const DEFAULT_TERRAIN = ['grass', 'forest'];
export const BUILD_RANGE = 2; // new buildings go within this many hexes of an existing one

// speed in hexes per second, range in hexes.
export const UNITS = {
  knight: { hp: 150, damage: 12, range: 1, speed: 1.1, cost: { food: 30, gold: 35 }, time: 20, attack: '1H_Melee_Attack_Chop', weapons: ['1H_Sword', 'Round_Shield'] },
  barbarian: { hp: 115, damage: 18, range: 1, speed: 1.2, cost: { food: 35, gold: 40 }, time: 22, attack: '2H_Melee_Attack_Chop', weapons: ['2H_Axe'] },
  rogue: { hp: 75, damage: 10, range: 3, speed: 1.3, cost: { food: 25, gold: 45 }, time: 20, attack: '1H_Ranged_Shoot', weapons: ['1H_Crossbow'], shoots: 'bolt' },
  scout: { hp: 65, damage: 6, range: 1, speed: 1.9, reveal: 3, cost: { food: 20, gold: 25 }, time: 12, attack: '1H_Melee_Attack_Chop', weapons: ['Knife'] },
  mage: { hp: 65, damage: 15, range: 3, splash: 1, speed: 1.1, cost: { food: 30, gold: 80 }, time: 30, attack: 'Spellcast_Shoot', weapons: ['2H_Staff'], shoots: 'spell' },
};
export const ATTACK_COOLDOWN = 1.2;
export const UPKEEP = 0.07; // food each unit eats per second
export const SIEGE = 0.5; // share of a monster's damage that buildings take
export const AGGRO_RANGE = 3;
export const UNIT_REVEAL = 2;

export const MONSTERS = {
  slime: { hp: 45, damage: 6, range: 1, speed: 0.8, bounty: 4 },
  spirit: { hp: 32, damage: 9, range: 1, speed: 1.5, bounty: 6 },
  golem: { hp: 240, damage: 22, range: 1, speed: 0.55, bounty: 25 },
  titan: { hp: 800, damage: 30, range: 1, speed: 0.45, bounty: 150, boss: true },
};
export const BOSS_EVERY = 5; // every 5th wave brings a boss

// Waves start after this much play time, then come regularly and grow.
export const FIRST_WAVE = 10 * 60;
export const WAVE_EVERY = 4 * 60;
export function waveMonsters(n) {
  return [
    ...Array(2 + Math.floor(n * 0.8)).fill('slime'),
    ...Array(Math.max(0, Math.floor((n - 2) * 0.7))).fill('spirit'),
    ...Array(Math.max(0, Math.floor((n - 3) / 3))).fill('golem'),
    ...Array(n % BOSS_EVERY === 0 ? 1 + Math.floor(n / 15) : 0).fill('titan'),
  ];
}
export const waveStrength = (n) => 1.05 ** (n - 1);

// Dungeons: send a party; after a while they come back with loot, or not everyone does.
export const DUNGEON_MAX_TIER = 6;
export const dungeonTime = (tier) => 45 + 30 * tier;
export const dungeonNeed = (tier) => 200 * 1.9 ** (tier - 1);
export const DUNGEON_COOLDOWN = 5 * 60;
export const dungeonLoot = (tier) => ({ gold: 50 * tier, stone: 30 * tier, wood: 30 * tier, food: 40 * tier });

// Cost to upgrade a building to `level` (2 or 3).
export function upgradeCost(type, level) {
  const def = BUILDINGS[type];
  const base = def.upgrade ?? def.cost;
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * (level === 2 ? 1.8 : 3.5))]));
}
export const upgradeTime = (type, level) => Math.round((BUILDINGS[type].time ?? 40) * (level === 2 ? 1.5 : 2.5));

// Heroes grow with experience: from kills (their share of the monster's bounty) and
// dungeon runs. Each level above the first adds to health and damage.
export const LEVEL_XP = [0, 60, 180, 380, 700]; // experience needed for levels 1..5
export const LEVEL_BONUS = 0.12;
export const KILL_XP = 3; // × the monster's bounty
export const DUNGEON_XP = 20; // × the tier, for a win (a third of it for a loss)
export const HERO_NAMES = ['Aldric', 'Bryn', 'Cora', 'Dag', 'Edda', 'Finn', 'Greta', 'Hugo', 'Ivar', 'Juno', 'Kai', 'Lina', 'Mats', 'Nora', 'Otto', 'Pia', 'Rune', 'Sigrid', 'Tove', 'Ulf', 'Vera', 'Wilma', 'Yrsa', 'Ebbe', 'Saga', 'Leif', 'Alva', 'Torsten'];

// Blacksmith research: every tier makes all units hit harder (weapons) or last longer (armour).
export const RESEARCH = ['weapons', 'armour'];
export const RESEARCH_MAX = 3;
export const RESEARCH_BONUS = 0.15;
export const researchCost = (tier) => ({ stone: 60 * tier, gold: 50 * tier });
export const researchTime = (tier) => 45 * tier;

// Market trading: give TRADE_AMOUNT of one resource for some of another.
export const TRADE_AMOUNT = 30;
export const TRADE_VALUE = { wood: 1, stone: 1.4, food: 1, gold: 2 };
export const tradeGet = (give, get, marketLevel) => Math.floor(((TRADE_AMOUNT * TRADE_VALUE[give]) / TRADE_VALUE[get]) * (0.5 + 0.1 * marketLevel));

// Goals: done automatically the moment they're true, each with a reward.
export const GOALS = [
  { id: 'homes', reward: { wood: 40 }, check: (s) => count(s, 'home') >= 2 },
  { id: 'farm', reward: { food: 40 }, check: (s) => count(s, 'farm') + count(s, 'windmill') + count(s, 'watermill') >= 1 },
  { id: 'wood', reward: { stone: 40 }, check: (s) => count(s, 'lumbermill') >= 1 },
  { id: 'stone', reward: { wood: 50 }, check: (s) => count(s, 'mine') >= 1 },
  { id: 'army', reward: { gold: 50 }, check: (s) => s.units.length >= 3 },
  { id: 'kills', reward: { gold: 60 }, check: (s) => (s.stats?.kills ?? 0) >= 10 },
  { id: 'dungeon', reward: { stone: 80 }, check: (s) => (s.stats?.dungeonWins ?? 0) >= 1 },
  { id: 'research', reward: { gold: 80 }, check: (s) => (s.research?.weapons ?? 0) + (s.research?.armour ?? 0) >= 1 },
  { id: 'castle', reward: { wood: 150 }, check: (s) => s.buildings.some((b) => b.type === 'castle' && b.level >= 2) },
  { id: 'hero', reward: { food: 120 }, check: (s) => s.units.some((u) => (u.xp ?? 0) >= LEVEL_XP[2]) },
  { id: 'wave5', reward: { gold: 150 }, check: (s) => s.wave.number >= 5 && !s.monsters.length },
  { id: 'people', reward: { stone: 150 }, check: (s) => s.buildings.filter((b) => b.state !== 'destroyed').reduce((n, b) => n + (BUILDINGS[b.type].pop ?? 0) * b.level, 0) >= 30 },
  { id: 'deep', reward: { gold: 200 }, check: (s) => (s.stats?.deepest ?? 0) >= 3 },
  { id: 'titan', reward: { gold: 300 }, check: (s) => (s.stats?.titans ?? 0) >= 1 },
];
function count(state, type) {
  return state.buildings.filter((b) => b.type === type && b.state !== 'building').length;
}
