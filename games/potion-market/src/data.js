// Potion Market's potions and ingredients, from Kvackie/eternal-alchemy
// (src/data/recipes.json and ingredients.json). No Phaser here: the online
// market (leaderboard/src/market.js) uses this file too.

// Essence order: fire, water, earth, air, shadow.
export const ELEMENTS = ['ignis', 'aqua', 'terra', 'aer', 'umbra'];

// target: the essence balance the brew must match (only the proportions count).
// tolerance: how far off (in degrees) a brew may be and still work.
// value: base price of one potion. learn: gold to learn the recipe (0 = known from the start).
export const POTIONS = [
  { id: 'healthTonic', target: [0, 2, 1, 0, 0], tolerance: 14, value: 22, learn: 0 },
  { id: 'emberDraught', target: [3, 0, 1, 0, 0], tolerance: 16, value: 30, learn: 0 },
  { id: 'sunfireTincture', target: [1, 1, 0, 0, 0], tolerance: 14, value: 26, learn: 0 },
  { id: 'ironskinSalve', target: [0, 0, 1, 0, 0], tolerance: 13, value: 34, learn: 150 },
  { id: 'deepwaterCordial', target: [0, 1, 0, 0, 0], tolerance: 15, value: 38, learn: 200 },
  { id: 'windDraught', target: [0, 1, 0, 4, 0], tolerance: 15, value: 44, learn: 300 },
  { id: 'mirebloomElixir', target: [0, 2, 0, 0, 1], tolerance: 14, value: 48, learn: 400 },
  { id: 'featherstoneDraught', target: [0, 0, 1, 1, 0], tolerance: 14, value: 52, learn: 500 },
  { id: 'stormfireFlask', target: [1, 0, 0, 1, 0], tolerance: 14, value: 56, learn: 650 },
  { id: 'shadowPhiltre', target: [0, 0, 1, 0, 3], tolerance: 15, value: 58, learn: 800 },
  { id: 'nightGlass', target: [0, 0, 0, 0, 1], tolerance: 13, value: 78, learn: 1100 },
  { id: 'wraithwindVial', target: [0, 0, 0, 1, 1], tolerance: 14, value: 84, learn: 1400 },
];

export const INGREDIENTS = [
  { id: 'pepper', essence: [24, 0, 0, 0, 0], price: 23 },
  { id: 'emberroot', essence: [14, 0, 4, 0, 0], price: 6 },
  { id: 'bluepetal', essence: [0, 24, 0, 0, 0], price: 23 },
  { id: 'dewcap', essence: [0, 11, 6, 0, 0], price: 5 },
  { id: 'moonpetal', essence: [0, 14, 0, 0, 8], price: 12 },
  { id: 'broadleaf', essence: [0, 0, 16, 0, 0], price: 8 },
  { id: 'barrowAsh', essence: [3, 0, 9, 0, 12], price: 22 },
  { id: 'galeThistle', essence: [0, 2, 0, 15, 0], price: 11 },
  { id: 'ashfern', essence: [9, 0, 0, 11, 0], price: 13 },
  { id: 'violetUmbrella', essence: [0, 0, 7, 17, 0], price: 23 },
  { id: 'roseSalt', essence: [0, 0, 0, 8, 16], price: 23 },
  { id: 'nullstone', essence: [0, 0, 0, 0, 24], price: 46 },
];

export const potionById = Object.fromEntries(POTIONS.map((p) => [p.id, p]));
export const ingredientById = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
