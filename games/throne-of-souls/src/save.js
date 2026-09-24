import { deserialize, newState, serialize } from './sim.js';

const KEY = 'throne-of-souls:save';

export function loadGame() {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return deserialize(text) ?? newState();
  } catch {
    // A broken or unreadable save starts a new game.
  }
  return newState();
}

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, serialize(state));
  } catch {
    // Storage full or unavailable: keep playing without saving.
  }
}
