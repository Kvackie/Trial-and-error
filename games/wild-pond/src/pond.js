// The player's own pond: creatures, bait and the collection book. Plain data
// (no Phaser), saved in localStorage.
import { bookEntries, decode, encode, wildGenes } from './genes.js';

export const POND_CAP = 8;
export const GROW_MS = 90_000; // a baby takes this long to grow up
export const REST_MS = 45_000; // parents rest this long after breeding
export const BAIT_MAX = 3;
export const BAIT_EVERY = 10 * 60_000;
const KEY = 'wild-pond:state';

export function newPond(now = Date.now(), rng = Math.random) {
  const pond = { creatures: [], bait: BAIT_MAX, baitAt: now, found: [], nextId: 1 };
  for (let i = 0; i < 3; i++) addCreature(pond, wildGenes(rng), { now: now - GROW_MS, from: null });
  return pond;
}

export function loadPond(now = Date.now()) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.creatures) {
      saved.creatures = saved.creatures.map((c) => ({ ...c, genes: decode(c.genes) })).filter((c) => c.genes);
      return saved;
    }
  } catch {
    // Unreadable or no storage: start a new pond.
  }
  return newPond(now);
}

export function savePond(pond) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...pond, creatures: pond.creatures.map((c) => ({ ...c, genes: encode(c.genes) })) }));
  } catch {
    // Not saved (private mode); the pond lasts until the page closes.
  }
}

// Adds a creature and returns { creature, fresh } where fresh lists the book
// entries seen for the first time.
export function addCreature(pond, genes, { now = Date.now(), from = null, bred = false } = {}) {
  const creature = { id: pond.nextId++, genes, born: now, restUntil: 0, from, bred };
  pond.creatures.push(creature);
  const fresh = bookEntries(genes).filter((key) => !pond.found.includes(key));
  pond.found.push(...fresh);
  return { creature, fresh };
}

export const removeCreature = (pond, id) => (pond.creatures = pond.creatures.filter((c) => c.id !== id));

export const growLeft = (c, now = Date.now()) => Math.max(0, c.born + GROW_MS - now);
export const restLeft = (c, now = Date.now()) => Math.max(0, c.restUntil - now);
export const canBreed = (c, now = Date.now()) => !growLeft(c, now) && !restLeft(c, now);

// Tops up bait for the time that has passed.
export function updateBait(pond, now = Date.now()) {
  if (pond.bait >= BAIT_MAX) {
    pond.baitAt = now;
    return;
  }
  const earned = Math.floor((now - pond.baitAt) / BAIT_EVERY);
  if (earned > 0) {
    pond.bait = Math.min(BAIT_MAX, pond.bait + earned);
    pond.baitAt = pond.bait >= BAIT_MAX ? now : pond.baitAt + earned * BAIT_EVERY;
  }
}
