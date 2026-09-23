// The player's shop: gold, ingredients, potions in stock and the cauldron.
// Plain data (no Phaser), saved in localStorage.
import { INGREDIENTS, POTIONS, potionById } from './data.js';
import { MAX_IN_CAULDRON, START_GOLD, brewResult, dayNumber, decay, merchantStock } from './economy.js';

const KEY = 'potion-market:state';
export const PITY_GOLD = 60;

export function newShop() {
  return {
    gold: START_GOLD,
    earned: 0, // gold from sales, ever (the leaderboard score)
    known: POTIONS.filter((p) => !p.learn).map((p) => p.id),
    brewed: [], // recipes this player has brewed at least once
    recipe: POTIONS[0].id,
    inventory: {},
    stock: {}, // potion id -> { count, quality }
    cauldron: [],
    pityDay: -1,
    local: {}, // offline market: potion id -> { pressure, at }
  };
}

export function loadShop() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.gold === 'number') return { ...newShop(), ...saved };
  } catch {
    // Unreadable or no storage: open a new shop.
  }
  return newShop();
}

export function saveShop(shop) {
  try {
    localStorage.setItem(KEY, JSON.stringify(shop));
  } catch {
    // Not saved (private mode).
  }
}

export const count = (shop, id) => shop.inventory[id] ?? 0;

export function buy(shop, id, price) {
  if (shop.gold < price) return false;
  shop.gold -= price;
  shop.inventory[id] = count(shop, id) + 1;
  return true;
}

export function learn(shop, id) {
  const { learn: price } = potionById[id];
  if (shop.known.includes(id) || shop.gold < price) return false;
  shop.gold -= price;
  shop.known.push(id);
  shop.recipe = id;
  return true;
}

// Returns null when added, otherwise the reason it couldn't be.
export function addToCauldron(shop, id) {
  if (shop.cauldron.length >= MAX_IN_CAULDRON) return 'cauldronFull';
  if (!count(shop, id)) return 'noneLeft';
  shop.inventory[id] -= 1;
  shop.cauldron.push(id);
  return null;
}

// Emptying gives the ingredients back.
export function emptyCauldron(shop) {
  for (const id of shop.cauldron) shop.inventory[id] = count(shop, id) + 1;
  shop.cauldron = [];
}

export const preview = (shop) => brewResult(shop.recipe, shop.cauldron);

// Brews the cauldron into potions. Returns the result, or null if it doesn't match.
export function brew(shop) {
  const result = preview(shop);
  if (!result.ok) return null;
  const held = shop.stock[shop.recipe] ?? { count: 0, quality: 0 };
  const total = held.count + result.count;
  shop.stock[shop.recipe] = { count: total, quality: (held.quality * held.count + result.quality * result.count) / total };
  shop.cauldron = [];
  result.first = !shop.brewed.includes(shop.recipe);
  if (result.first) shop.brewed.push(shop.recipe);
  return result;
}

export function recordSale(shop, id, sold, total) {
  const held = shop.stock[id];
  held.count -= sold;
  if (held.count <= 0) delete shop.stock[id];
  shop.gold += total;
  shop.earned += total;
}

// Out of gold with nothing to brew or sell: the merchant helps out once a day.
export function helpIfBroke(shop, day = dayNumber()) {
  const cheapest = Math.min(...merchantStock(day).map((o) => o.price));
  const hasSomething = Object.values(shop.inventory).some((n) => n > 0) || Object.keys(shop.stock).length || shop.cauldron.length;
  if (shop.gold >= cheapest * 3 || hasSomething || shop.pityDay === day) return 0;
  shop.pityDay = day;
  shop.gold += PITY_GOLD;
  return PITY_GOLD;
}

// Offline market pressure, kept on this device.
export function localPressure(shop, id, now = Date.now()) {
  const entry = shop.local[id];
  return entry ? decay(entry.pressure, (now - entry.at) / 1000) : 0;
}

export function addLocalPressure(shop, id, amount, now = Date.now()) {
  shop.local[id] = { pressure: localPressure(shop, id, now) + amount, at: now };
}

export const INGREDIENT_IDS = INGREDIENTS.map((i) => i.id);
