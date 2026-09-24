// The player's shop: gold, ingredients, potions in stock and the cauldron.
// Plain data (no Phaser), saved in localStorage.
import { INGREDIENTS, POTIONS, ingredientById, potionById } from './data.js';
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

// The merchant buys ingredients back for half their usual price.
export const SELL_BACK = 0.5;
export const sellBackPrice = (id) => Math.max(1, Math.floor(ingredientById[id].price * SELL_BACK));

export function sellIngredient(shop, id) {
  if (!count(shop, id)) return 0;
  const price = sellBackPrice(id);
  shop.inventory[id] -= 1;
  shop.gold += price;
  return price;
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

// Whether the ingredients on hand (and in the cauldron) can brew any known recipe.
// Tries every one- and two-ingredient mix that fits in the cauldron.
export function canBrewSomething(shop) {
  const have = { ...shop.inventory };
  for (const id of shop.cauldron) have[id] = (have[id] ?? 0) + 1;
  const ids = Object.keys(have).filter((id) => have[id] > 0);
  for (const recipe of shop.known) {
    for (const a of ids) {
      for (const b of ids) {
        for (let na = 1; na <= Math.min(have[a], MAX_IN_CAULDRON); na++) {
          const maxB = a === b ? 0 : Math.min(have[b], MAX_IN_CAULDRON - na);
          for (let nb = 0; nb <= maxB; nb++) {
            if (brewResult(recipe, [...Array(na).fill(a), ...Array(nb).fill(b)]).ok) return true;
          }
        }
      }
    }
  }
  return false;
}

// Stuck: no potions to sell, nothing brewable on hand and too little gold to buy a
// brew's worth. The merchant then helps out, as often as it happens.
export function helpIfBroke(shop, day = dayNumber()) {
  const cheapest = Math.min(...merchantStock(day).map((o) => o.price));
  if (shop.gold >= cheapest * 3 || Object.keys(shop.stock).length || canBrewSomething(shop)) return 0;
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
