// Numbers for buildings, units, monsters and waves. Rates are per second.

export const RESOURCES = ['wood', 'stone', 'food', 'gold'];
export const START_RESOURCES = { wood: 90, stone: 40, food: 60, gold: 40 };
export const STORAGE = [300, 800, 2000]; // by castle level
export const OFFLINE_CAP = 8 * 3600; // seconds of production kept while the game is closed
export const MAX_LEVEL = 3;

// terrain: where it may stand. near: a terrain it needs next to it.
// produce: resource per second at level 1 (scaled by level). workers: people it needs.
export const BUILDINGS = {
  castle: { model: 'building_castle_blue', hp: 800, pop: 6, reveal: 3, upgrade: { wood: 150, stone: 150 }, buildable: false },
  home: { model: 'building_home_A_blue', model2: 'building_home_B_blue', cost: { wood: 25 }, time: 12, hp: 150, pop: 4, produce: { gold: 0.08 } },
  farm: { model: 'building_grain', cost: { wood: 20 }, time: 12, hp: 100, workers: 1, produce: { food: 0.5 }, terrain: ['grass'] },
  lumbermill: { model: 'building_lumbermill_blue', cost: { wood: 20 }, time: 18, hp: 180, workers: 2, produce: { wood: 0.25 }, perNear: 'forest', near: 'forest' },
  mine: { model: 'building_mine_blue', cost: { wood: 40 }, time: 25, hp: 220, workers: 3, produce: { stone: 0.45 }, terrain: ['hills'] },
  windmill: { model: 'building_windmill_blue', cost: { wood: 45, stone: 15 }, time: 25, hp: 180, workers: 2, produce: { food: 1.1 }, terrain: ['grass'] },
  watermill: { model: 'building_watermill_blue', cost: { wood: 50, stone: 20 }, time: 25, hp: 180, workers: 2, produce: { food: 1.5 }, near: 'water' },
  market: { model: 'building_market_blue', cost: { wood: 60, stone: 40 }, time: 35, hp: 200, workers: 2, produce: { gold: 0.6 } },
  barracks: { model: 'building_barracks_blue', cost: { wood: 80, stone: 40 }, time: 40, hp: 300, workers: 1, trains: ['knight', 'barbarian'] },
  archery: { model: 'building_archeryrange_blue', cost: { wood: 90, stone: 30 }, time: 40, hp: 260, workers: 1, trains: ['rogue', 'scout'] },
  chapel: { model: 'building_church_blue', cost: { stone: 90, gold: 60 }, time: 50, hp: 260, workers: 1, trains: ['mage'] },
  tower: { model: 'building_tower_A_blue', cost: { wood: 30, stone: 60 }, time: 35, hp: 350, workers: 1, reveal: 3, attack: { damage: 9, range: 3, cooldown: 1.4 }, terrain: ['grass', 'hills', 'forest'] },
};
export const BUILD_ORDER = ['home', 'farm', 'lumbermill', 'mine', 'windmill', 'watermill', 'market', 'tower', 'barracks', 'archery', 'chapel'];
export const DEFAULT_TERRAIN = ['grass', 'forest'];
export const BUILD_RANGE = 2; // new buildings go within this many hexes of an existing one

// speed in hexes per second, range in hexes.
export const UNITS = {
  knight: { hp: 150, damage: 12, range: 1, speed: 1.1, cost: { food: 30, gold: 20 }, time: 20, attack: '1H_Melee_Attack_Chop', weapons: ['1H_Sword', 'Round_Shield'] },
  barbarian: { hp: 115, damage: 18, range: 1, speed: 1.2, cost: { food: 35, gold: 25 }, time: 22, attack: '2H_Melee_Attack_Chop', weapons: ['2H_Axe'] },
  rogue: { hp: 75, damage: 10, range: 3, speed: 1.3, cost: { food: 25, gold: 30 }, time: 20, attack: '1H_Ranged_Shoot', weapons: ['1H_Crossbow'], shoots: 'bolt' },
  scout: { hp: 65, damage: 6, range: 1, speed: 1.9, reveal: 3, cost: { food: 20, gold: 15 }, time: 12, attack: '1H_Melee_Attack_Chop', weapons: ['Knife'] },
  mage: { hp: 65, damage: 15, range: 3, splash: 1, speed: 1.1, cost: { food: 30, gold: 60 }, time: 30, attack: 'Spellcast_Shoot', weapons: ['2H_Staff'], shoots: 'spell' },
};
export const ATTACK_COOLDOWN = 1.2;
export const AGGRO_RANGE = 3;
export const UNIT_REVEAL = 2;

export const MONSTERS = {
  slime: { hp: 45, damage: 6, range: 1, speed: 0.8, bounty: 4 },
  spirit: { hp: 32, damage: 9, range: 1, speed: 1.5, bounty: 6 },
  golem: { hp: 240, damage: 22, range: 1, speed: 0.55, bounty: 25 },
};

// Waves start after this much play time, then come regularly and grow.
export const FIRST_WAVE = 10 * 60;
export const WAVE_EVERY = 4 * 60;
export function waveMonsters(n) {
  return [
    ...Array(2 + n).fill('slime'),
    ...Array(Math.max(0, n - 2)).fill('spirit'),
    ...Array(Math.max(0, Math.floor((n - 3) / 2))).fill('golem'),
  ];
}
export const waveStrength = (n) => 1.1 ** (n - 1);

// Dungeons: send a party; after a while they come back with loot, or not everyone does.
export const DUNGEON_MAX_TIER = 6;
export const dungeonTime = (tier) => 45 + 30 * tier;
export const dungeonNeed = (tier) => 160 * 1.7 ** (tier - 1);
export const DUNGEON_COOLDOWN = 5 * 60;
export const dungeonLoot = (tier) => ({ gold: 50 * tier, stone: 30 * tier, wood: 30 * tier, food: 40 * tier });

// Cost to upgrade a building to `level` (2 or 3).
export function upgradeCost(type, level) {
  const def = BUILDINGS[type];
  const base = def.upgrade ?? def.cost;
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round(v * (level === 2 ? 1.8 : 3.5))]));
}
export const upgradeTime = (type, level) => Math.round((BUILDINGS[type].time ?? 40) * (level === 2 ? 1.5 : 2.5));
