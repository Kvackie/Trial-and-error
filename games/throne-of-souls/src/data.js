// Every number in the game. tools/balance.mjs plays the game with these; re-run it after
// changing them.

// The battlefield: 14 columns × 9 rows. Heroes walk from the right (x = 14) to the left.
export const COLS = 14;
export const ROWS = 9;
export const X = {
  lord: 1, // centre of the lord's two columns
  support: 2.5, // support structures (and ranged monsters once the wall is broken)
  wall: [3.5, 4.5], // the wall's two columns
  wallFront: 5, // heroes stop here to hit the wall
  melee: 6.5, // melee monsters
  trap: 7.5, // traps
  spawn: 13.9,
};

export const START_SOULS = 150;
export const WAVE_GAP = 3; // seconds between a cleared wave and the next start
export const SPAWN_GAP = 0.9; // seconds between heroes of one wave
export const FALL_BACK = 3; // waves lost when the lord falls
export const OFFLINE_HOURS = 8;

export const heroCount = (wave) => Math.round(4 + wave / 2);
export const heroHpScale = (wave) => 1.09 ** (wave - 1);
export const heroDmgScale = (wave) => 1.07 ** (wave - 1);
export const soulScale = (wave) => 1.08 ** wave;
export const BOSS_EVERY = 10;
export const BOSS = { hp: 15, dmg: 3, souls: 20, xp: 10 };

// --- The demon lord -----------------------------------------------------------------
export const LORD = { hp: 500, dmg: 30, rate: 1.2, perLevel: 1.1 };
export const lordXpToLevel = (level) => Math.round(60 * level ** 1.6);
export const LORD_XP_SHARE = 0.4;
export const RUNE_SLOT_LEVELS = [1, 10, 25];

// --- Spells ---------------------------------------------------------------------------
export const SPELLS = {
  hellfire: { unlock: 1, cooldown: 20, dmg: 4, radius: 2 },
  bonewall: { unlock: 5, cooldown: 45, shield: 0.3, seconds: 8 },
  souldrain: { unlock: 10, cooldown: 35, dps: 2, seconds: 5, targets: 3 },
};
export const SPELL_ORDER = ['hellfire', 'bonewall', 'souldrain'];

// --- Monsters -------------------------------------------------------------------------
// range is in columns; hits = targets per attack; slow = fraction and seconds.
export const MONSTERS = {
  orc: { kind: 'melee', hp: 220, dmg: 18, rate: 1.0, cost: 60, unlock: 1, sprite: 'orc_warrior' },
  ogre: { kind: 'melee', hp: 520, dmg: 26, rate: 1.8, cost: 250, unlock: 3, hits: 2, sprite: 'ogre' },
  imp: { kind: 'melee', hp: 140, dmg: 12, rate: 0.45, cost: 600, unlock: 8, sprite: 'imp' },
  skeleton: { kind: 'ranged', hp: 110, dmg: 14, rate: 1.1, cost: 50, unlock: 1, range: 8, sprite: 'skelet' },
  shaman: { kind: 'ranged', hp: 120, dmg: 20, rate: 1.6, cost: 300, unlock: 5, range: 6, slow: [0.2, 2], sprite: 'orc_shaman' },
  necro: { kind: 'ranged', hp: 130, dmg: 16, rate: 1.5, cost: 900, unlock: 12, range: 6, splash: 1, sprite: 'necromancer' },
};
export const MONSTER_ORDER = ['orc', 'ogre', 'imp', 'skeleton', 'shaman', 'necro'];
export const MELEE_REACH = 1.1; // how far in front of a melee monster it can hit
export const UPGRADE_STEP = 0.08; // +8% health and damage per upgrade
export const upgradeCost = (base, level) => Math.round(base * 1.18 ** (level + 1));
export const MONSTER_LEVEL_STEP = 0.05; // +5% per XP level
export const monsterXpToLevel = (level) => Math.round(40 * level ** 1.5);
export const WALL_SHARE = 0.25; // share of a ranged monster's health added to the wall

// Deploy slots, per kind: 2 to start, bought up to 9 (one per row).
export const SLOT_START = 2;
export const SLOT_MAX = 9;
export const slotCost = (owned) => Math.round(800 * 3 ** (owned - SLOT_START));

// --- The wall -------------------------------------------------------------------------
export const WALL = { cost: 300, hp: 1000, perLevel: 0.25, rebuild: 30 };
export const wallUpgradeCost = (level) => Math.round(200 * 1.5 ** (level + 1));

// --- Structures -----------------------------------------------------------------------
// place: wall (on the wall), support (behind it) or trap (in front of it).
export const STRUCTURES = {
  ballista: { place: 'wall', cost: 400, dmg: 45, rate: 2, range: 11, step: 0.25 },
  brazier: { place: 'wall', cost: 900, dps: 12, radius: 1.5, range: 6, step: 0.25 },
  turret: { place: 'wall', cost: 1500, dmg: 20, rate: 1.5, range: 7, chain: 3, step: 0.25 },
  altar: { place: 'support', cost: 600, heal: 0.01, step: 0.2 },
  drum: { place: 'support', cost: 1200, bonus: 0.15, stepBonus: 0.05 },
  well: { place: 'support', cost: 1000, bonus: 0.1, stepBonus: 0.05 },
  spikes: { place: 'trap', cost: 250, dmg: 30, step: 0.3 },
  tar: { place: 'trap', cost: 500, slow: 0.4, stepSlow: 0.05, maxSlow: 0.6 },
  bones: { place: 'trap', cost: 700, stun: 2, stepStun: 0.3, maxStun: 4 },
};
export const STRUCTURE_ORDER = ['ballista', 'brazier', 'turret', 'altar', 'drum', 'well', 'spikes', 'tar', 'bones'];
export const structureUpgradeCost = (base, level) => Math.round(base * 1.6 ** level);

// --- Heroes ---------------------------------------------------------------------------
// speed in columns per second; range 0 = melee; wallMul/structMul multiply damage to them.
export const HEROES = {
  knight: { hp: 90, dmg: 10, rate: 1.0, speed: 1.0, range: 0, souls: 6, xp: 4, sprite: 'knight_m' },
  archer: { hp: 55, dmg: 8, rate: 1.2, speed: 1.1, range: 4, souls: 5, xp: 3, sprite: 'elf_m' },
  wizard: { hp: 50, dmg: 14, rate: 1.6, speed: 0.9, range: 3.5, wallMul: 2, souls: 6, xp: 4, sprite: 'wizzard_m' },
  dwarf: { hp: 160, dmg: 9, rate: 1.1, speed: 0.7, range: 0, wallMul: 2, structMul: 2, souls: 9, xp: 6, sprite: 'dwarf_m' },
  cleric: { hp: 70, dmg: 6, rate: 1.4, speed: 0.9, range: 3, heal: 0.06, souls: 7, xp: 5, sprite: 'cleric' },
  angel: { hp: 80, dmg: 12, rate: 1.0, speed: 1.3, range: 0, flies: true, souls: 8, xp: 5, sprite: 'angel' },
  crusader: { hp: 180, dmg: 14, rate: 1.2, speed: 0.8, range: 0, souls: 10, xp: 7, sprite: 'crusader' },
  chort: { hp: 100, dmg: 16, rate: 0.9, speed: 1.4, range: 0, souls: 8, xp: 5, sprite: 'chort' },
  lizard: { hp: 120, dmg: 12, rate: 0.7, speed: 1.1, range: 0, souls: 8, xp: 5, sprite: 'lizard_m' },
  masked: { hp: 200, dmg: 18, rate: 1.3, speed: 0.75, range: 0, souls: 11, xp: 7, sprite: 'masked_orc' },
  // Bosses (with 15× health, 3× damage) and their moves.
  paladin: { hp: 90, dmg: 10, rate: 1.0, speed: 0.8, range: 0, souls: 6, xp: 4, boss: 'heal', sprite: 'knight_f' },
  archmage: { hp: 60, dmg: 14, rate: 1.6, speed: 0.8, range: 4, wallMul: 2, souls: 6, xp: 4, boss: 'breaker', sprite: 'wizzard_f' },
  archangel: { hp: 90, dmg: 13, rate: 1.0, speed: 1.1, range: 0, flies: true, souls: 8, xp: 5, boss: 'fly', sprite: 'angel' },
  prince: { hp: 110, dmg: 16, rate: 1.0, speed: 0.9, range: 0, souls: 8, xp: 5, boss: 'summon', sprite: 'chort' },
  // A very rare visitor who drops a rune.
  platino: { hp: 40, dmg: 1, rate: 2, speed: 1.6, range: 0, souls: 30, xp: 10, rare: true, sprite: 'platino' },
};
export const DEPTHS = [
  { id: 'adventurers', heroes: ['knight', 'archer', 'wizard', 'dwarf'], bosses: ['paladin', 'archmage'] },
  { id: 'holy', heroes: ['cleric', 'angel', 'crusader', 'knight'], bosses: ['archangel', 'archangel'] },
  { id: 'demons', heroes: ['chort', 'lizard', 'masked'], bosses: ['prince', 'prince'] },
];
export const PLATINO_CHANCE = 1 / 1000;

// --- Runes ----------------------------------------------------------------------------
export const RUNES = ['fury', 'vigor', 'haste', 'leech', 'greed', 'thorns'];
export const RARITY_BONUS = [0.05, 0.1, 0.18, 0.3, 0.5];
export const RARITY_SOULS = [20, 60, 200, 700, 2500];
export const RARITY_DROP = [0.7, 0.22, 0.06, 0.02]; // mythic only from merging
export const RUNE_DROP = 0.01;

// --- Talents --------------------------------------------------------------------------
export const TALENTS = {
  tyranny: [
    { id: 'lordDmg', max: 5, step: 0.05 },
    { id: 'cooldown', max: 5, step: 0.05 },
    { id: 'burn', max: 1 },
    { id: 'bossReset', max: 1 },
  ],
  legion: [
    { id: 'monsterHp', max: 5, step: 0.05 },
    { id: 'monsterDmg', max: 5, step: 0.05 },
    { id: 'recruitCost', max: 3, step: 0.1 },
    { id: 'slotCost', max: 1, step: 0.2 },
  ],
  greed: [
    { id: 'souls', max: 5, step: 0.05 },
    { id: 'runeDrop', max: 3, step: 0.01 },
    { id: 'offline', max: 2, step: 2 },
    { id: 'mergeRefund', max: 1, step: 0.2 },
  ],
  fortress: [
    { id: 'wallHp', max: 5, step: 0.08 },
    { id: 'rebuild', max: 3, step: 0.1 },
    { id: 'structCost', max: 3, step: 0.1 },
    { id: 'trapDmg', max: 1, step: 0.5 },
  ],
};
export const TALENT_BRANCHES = ['tyranny', 'legion', 'greed', 'fortress'];
