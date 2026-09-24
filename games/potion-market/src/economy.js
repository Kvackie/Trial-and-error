// Brewing and market rules for Potion Market. No Phaser here: the online market
// (leaderboard/src/market.js) uses the same prices as the game's offline fallback.
import { INGREDIENTS, POTIONS, ingredientById, potionById } from './data.js';

export const START_GOLD = 120;
export const MAX_IN_CAULDRON = 8;
export const ESSENCE_PER_POTION = 24; // a brew makes one potion per this much essence
export const MAX_YIELD = 6;
export const MAX_SELL = 30; // potions per sale

// --- Brewing ---------------------------------------------------------------------

export function mixOf(ingredientIds) {
  const mix = [0, 0, 0, 0, 0];
  for (const id of ingredientIds) ingredientById[id].essence.forEach((v, i) => (mix[i] += v));
  return mix;
}

// Angle in degrees between the brew's essence and the recipe's target (0 = perfect).
export function angle(mix, target) {
  const dot = mix.reduce((sum, v, i) => sum + v * target[i], 0);
  const length = (v) => Math.hypot(...v);
  if (!length(mix)) return 90;
  return (Math.acos(Math.min(1, dot / (length(mix) * length(target)))) * 180) / Math.PI;
}

// What the cauldron would make: { ok, quality 0..1, count, angle }.
export function brewResult(potionId, ingredientIds) {
  const potion = potionById[potionId];
  const mix = mixOf(ingredientIds);
  const off = angle(mix, potion.target);
  const total = mix.reduce((a, b) => a + b, 0);
  const count = Math.min(MAX_YIELD, Math.floor(total / ESSENCE_PER_POTION));
  const quality = Math.max(0, 1 - off / potion.tolerance);
  return { ok: off <= potion.tolerance && count > 0, quality, count, angle: off, mix };
}

// --- Market ----------------------------------------------------------------------

// Every sale adds "pressure" to that potion's price; it halves every HALF_LIFE.
// With no recent sales a potion sells for 1.5 × its value, falling as players sell.
export const HALF_LIFE = 6 * 3600; // seconds
const PRESSURE_SCALE = 40;
export const HOT_BONUS = 1.8;

export const decay = (pressure, seconds) => pressure * 0.5 ** (Math.max(0, seconds) / HALF_LIFE);
export const demand = (pressure) => 1.5 / (1 + pressure / PRESSURE_SCALE);
export const qualityFactor = (quality) => 0.6 + 0.6 * Math.min(1, Math.max(0, quality));

export const dayNumber = (ms = Date.now()) => Math.floor(ms / 86_400_000);

// Small repeatable random numbers from a seed.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

// One potion is in high demand each day (UTC), the same for everyone.
export const hotPotion = (day = dayNumber()) => POTIONS[Math.floor(seeded(day * 31 + 7)() * POTIONS.length)].id;

// Price of one potion of this quality, given the market pressure.
export function unitPrice(potionId, pressure, quality, day = dayNumber()) {
  const hot = hotPotion(day) === potionId ? HOT_BONUS : 1;
  return Math.max(1, Math.round(potionById[potionId].value * hot * demand(pressure) * qualityFactor(quality)));
}

// Selling several at once: each one sold pushes the price down a little.
export function saleTotal(potionId, pressure, quality, count, day = dayNumber()) {
  let total = 0;
  for (let i = 0; i < count; i++) total += unitPrice(potionId, pressure + i, quality, day);
  return total;
}

// Always in stock: cheap ingredients that brew a starting recipe on their own
// (Ember draught, Health tonic), so a shop can never run out of things to make.
export const STAPLES = ['emberroot', 'dewcap'];

// The ingredient merchant's stock for the day: the staples and 6 more of the
// ingredients, prices 70–130 % of normal. The same for everyone that day.
export function merchantStock(day = dayNumber()) {
  const rng = seeded(day * 17 + 3);
  const shuffled = INGREDIENTS.map((ing) => ({ ing, r: STAPLES.includes(ing.id) ? -1 : rng() })).sort((a, b) => a.r - b.r);
  return shuffled
    .slice(0, 8)
    .map(({ ing }) => ({ id: ing.id, price: Math.max(1, Math.round(ing.price * (0.7 + rng() * 0.6))) }))
    .sort((a, b) => INGREDIENTS.findIndex((i) => i.id === a.id) - INGREDIENTS.findIndex((i) => i.id === b.id));
}
