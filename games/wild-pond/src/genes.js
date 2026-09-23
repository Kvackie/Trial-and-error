// Wild Pond genetics. No Phaser here: the game and the online service
// (leaderboard/src/pond.js) both use this file.
//
// A creature's genes are one value per trait, written as a short string such as
// "round.coral.spots.sun.small.two.none.none.100" so they are easy to store and check.

// Rare values never appear in the wild: only a mutation while breeding creates them.
export const TRAITS = {
  body: { common: ['round', 'long', 'drop', 'puff'], rare: ['star'] },
  colour: { common: ['coral', 'sun', 'leaf', 'sea', 'violet', 'rose'], rare: ['frost', 'ember', 'night'] },
  pattern: { common: ['plain', 'spots', 'stripes', 'patches'], rare: ['sparkles'] },
  accent: null, // pattern colour: any colour, not counted in the book
  fins: { common: ['small', 'frills', 'whiskers'], rare: ['wings'] },
  eyes: { common: ['two', 'one'], rare: ['three'] },
  crest: { common: ['none', 'antennae', 'horns'], rare: ['crown'] },
  glow: { common: ['none'], rare: ['glow'] },
};
TRAITS.accent = TRAITS.colour;

export const ORDER = ['body', 'colour', 'pattern', 'accent', 'fins', 'eyes', 'crest', 'glow'];
export const BOOK_TRAITS = ORDER.filter((trait) => trait !== 'accent');

// Every entry in the collection book, as "trait:value".
export const BOOK = BOOK_TRAITS.flatMap((trait) => [...TRAITS[trait].common, ...TRAITS[trait].rare].map((value) => `${trait}:${value}`));
export const RARE = new Set(BOOK_TRAITS.flatMap((trait) => TRAITS[trait].rare.map((value) => `${trait}:${value}`)));

export const MUTATION = 0.1; // chance per trait per birth
const RARE_WEIGHT = 1;
const COMMON_WEIGHT = 3;
const SIZE = { min: 75, max: 125 };

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

export function wildGenes(rng = Math.random) {
  const genes = {};
  for (const trait of ORDER) genes[trait] = pick(TRAITS[trait].common, rng);
  genes.size = Math.round(85 + rng() * 30);
  return genes;
}

function mutate(trait, rng) {
  const { common, rare } = TRAITS[trait];
  const total = common.length * COMMON_WEIGHT + rare.length * RARE_WEIGHT;
  let roll = rng() * total;
  for (const value of common) if ((roll -= COMMON_WEIGHT) < 0) return value;
  for (const value of rare) if ((roll -= RARE_WEIGHT) < 0) return value;
  return common[0];
}

// Each trait comes from one parent at random, sometimes mutated. Size is the
// parents' average, give or take a little.
export function breed(a, b, rng = Math.random) {
  const child = {};
  for (const trait of ORDER) child[trait] = rng() < MUTATION ? mutate(trait, rng) : rng() < 0.5 ? a[trait] : b[trait];
  const size = (a.size + b.size) / 2 + (rng() - 0.5) * 16;
  child.size = Math.round(Math.min(SIZE.max, Math.max(SIZE.min, size)));
  return child;
}

export const encode = (genes) => [...ORDER.map((trait) => genes[trait]), genes.size].join('.');

// Returns the genes, or null if the string isn't a possible creature.
export function decode(text) {
  if (typeof text !== 'string' || text.length > 120) return null;
  const parts = text.split('.');
  if (parts.length !== ORDER.length + 1) return null;
  const genes = {};
  for (const [i, trait] of ORDER.entries()) {
    const { common, rare } = TRAITS[trait];
    if (!common.includes(parts[i]) && !rare.includes(parts[i])) return null;
    genes[trait] = parts[i];
  }
  const size = Number(parts[ORDER.length]);
  if (!Number.isInteger(size) || size < SIZE.min || size > SIZE.max) return null;
  genes.size = size;
  return genes;
}

// The book entries a creature shows.
export const bookEntries = (genes) => BOOK_TRAITS.map((trait) => `${trait}:${genes[trait]}`);
