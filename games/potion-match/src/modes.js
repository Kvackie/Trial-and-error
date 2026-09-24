// The two ways to play. No Phaser here, so the rules can be tested in Node.
//   classic: every swap costs a move; specials and long chains earn moves back.
//   zen:     only a swap that makes no match costs a move, so careful play never ends.
export const MODES = {
  classic: { moves: 30, everySwapCosts: true, bestKey: 'potion-match:best-classic', leaderboard: 'potion-match-classic' },
  zen: { moves: 30, everySwapCosts: false, bestKey: 'potion-match:best', leaderboard: 'potion-match' },
};
export const MODE_KEY = 'potion-match:mode';
export const CHAIN_FOR_BONUS = 3; // a chain this long (x3) earns a move in Classic

// Moves a Classic swap earns back: one per special made, one for a chain of 3 or more.
export function bonusMoves(steps) {
  const clears = steps.filter((s) => s.type === 'clear');
  const specials = clears.reduce((n, s) => n + s.created.length, 0);
  const chain = Math.max(0, ...clears.map((s) => s.cascade));
  return specials + (chain >= CHAIN_FOR_BONUS ? 1 : 0);
}

export function loadMode() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return MODES[mode] ? mode : 'classic';
  } catch {
    return 'classic';
  }
}

export function saveMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Not remembered (private mode).
  }
}
