// Saved progress: current level, last checkpoint, lives left and deepest level reached.

const KEY = 'lantern-maze:progress';
export const MAX_LIVES = 3;
export const CHECKPOINT_EVERY = 5;

const fresh = () => ({ level: 1, checkpoint: 1, lives: MAX_LIVES, best: 1 });

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Number.isInteger(saved.level)) {
      const progress = { ...fresh(), ...saved };
      // Closed while the last heart was going out: finish that lost run now
      // (back to the checkpoint with full lives), as the game would have.
      if (!(progress.lives > 0)) Object.assign(progress, { level: progress.checkpoint, lives: MAX_LIVES });
      progress.lives = Math.min(MAX_LIVES, progress.lives);
      return progress;
    }
  } catch {
    // Missing or unreadable: start fresh.
  }
  return fresh();
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable (private mode); progress just won't persist.
  }
}

export function resetProgress() {
  const progress = fresh();
  saveProgress(progress);
  return progress;
}

// Levels 5, 10, 15… are checkpoints; losing returns to the last one reached.
export const isCheckpoint = (level) => level % CHECKPOINT_EVERY === 0;
