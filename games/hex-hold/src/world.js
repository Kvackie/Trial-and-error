// Generates the starting island: terrain for every hex and where the dungeons are.
import { distance, key, neighbours, spiral } from './hex.js';

export const RADIUS = 9;

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

// Smooth random values per hex: random numbers averaged with their neighbours.
function noise(hexes, rng, passes = 2) {
  let values = new Map(hexes.map(([q, r]) => [key(q, r), rng()]));
  for (let p = 0; p < passes; p++) {
    const next = new Map();
    for (const [q, r] of hexes) {
      const around = neighbours(q, r).map((n) => values.get(key(...n))).filter((v) => v !== undefined);
      next.set(key(q, r), (values.get(key(q, r)) * 2 + around.reduce((a, b) => a + b, 0)) / (2 + around.length));
    }
    values = next;
  }
  return values;
}

// tiles: Map "q,r" -> { q, r, terrain: water | grass | forest | hills | mountain, dungeon? }
export function generateWorld(seed) {
  const rng = seeded(seed);
  const hexes = spiral(0, 0, RADIUS);
  const shape = noise(hexes, rng, 2);
  const green = noise(hexes, rng, 2);
  const height = noise(hexes, rng, 2);
  const tiles = new Map();
  for (const [q, r] of hexes) {
    const d = distance([q, r], [0, 0]);
    const k = key(q, r);
    const land = d <= 2 || (d < RADIUS - 1 && 1 - d / RADIUS + (shape.get(k) - 0.5) * 0.9 > 0.32);
    let terrain = 'water';
    if (land) {
      terrain = 'grass';
      if (d > 2) {
        const h = height.get(k);
        if (h > 0.6) terrain = 'mountain';
        else if (h > 0.54) terrain = 'hills';
        else if (green.get(k) > 0.53) terrain = 'forest';
      }
    }
    tiles.set(k, { q, r, terrain });
  }
  // Make sure the start has wood and stone within reach.
  const ensure = (terrain, maxDist, count) => {
    const near = [...tiles.values()].filter((t) => t.terrain !== 'water' && distance([t.q, t.r], [0, 0]) >= 2 && distance([t.q, t.r], [0, 0]) <= maxDist);
    let have = near.filter((t) => t.terrain === terrain).length;
    for (const t of near.sort(() => rng() - 0.5)) {
      if (have >= count) break;
      if (t.terrain === 'grass' && distance([t.q, t.r], [0, 0]) > 2) {
        t.terrain = terrain;
        have++;
      }
    }
  };
  ensure('forest', 3, 3);
  ensure('hills', 4, 2);

  // Dungeons: on land, away from the castle and from each other.
  const spots = [...tiles.values()]
    .filter((t) => (t.terrain === 'grass' || t.terrain === 'hills' || t.terrain === 'forest') && distance([t.q, t.r], [0, 0]) >= 4)
    .sort(() => rng() - 0.5);
  const dungeons = [];
  for (const t of spots) {
    if (dungeons.length >= 3) break;
    if (dungeons.every((d) => distance([d.q, d.r], [t.q, t.r]) >= 4)) {
      t.terrain = 'grass';
      t.dungeon = true;
      dungeons.push(t);
    }
  }
  assignHeights(tiles, height);
  return { tiles, dungeons: dungeons.map((t) => key(t.q, t.r)) };
}

// Land rises in steps from the beach: every hex gets a level (0 = beach height) that
// grows inland, more on hills and mountains, and never more than one step above a
// neighbour, so the island climbs in terraces rather than cliffs.
export const MAX_LEVEL = 4;
export const LEVEL_HEIGHT = 0.45;

function assignHeights(tiles, noiseMap) {
  const land = [...tiles.values()].filter((t) => t.terrain !== 'water');
  for (const t of land) {
    const k = key(t.q, t.r);
    let level = Math.round((noiseMap.get(k) - 0.5) * 16 + 1.8);
    if (t.terrain === 'hills') level += 1;
    if (t.terrain === 'mountain') level += 2;
    t.level = Math.max(0, Math.min(MAX_LEVEL, level));
  }
  for (const t of tiles.values()) if (t.terrain === 'water') t.level = -1;
  // Limit each step to one level, working outwards from the sea.
  for (let pass = 0; pass < MAX_LEVEL + 2; pass++) {
    for (const t of land) {
      const lowest = Math.min(...neighbours(t.q, t.r).map(([q, r]) => tiles.get(key(q, r))?.level ?? -1));
      t.level = Math.min(t.level, lowest + 1);
    }
  }
}

// Height of the top of a hex (water is a little below the beach).
export const tileTop = (tile) => (!tile || tile.terrain === 'water' ? -0.2 : tile.level * LEVEL_HEIGHT);

export const isLand = (tile) => tile && tile.terrain !== 'water';
export const isPassable = (tile) => tile && tile.terrain !== 'water' && tile.terrain !== 'mountain';
