import Phaser from 'phaser';
import { bindKeys } from './keyboard.js';
import { leaderboardEnabled, promptSubmit } from './leaderboard.js';
import { bindText, t } from './i18n.js';
import { playSound } from './sound.js';

// Game Over screen shared by the games: score, best score (kept per game in
// localStorage) and tap (or Space) to play again. Start it with scene.start('GameOver', { score }).
// With leaderboard: { game, theme }, a new best offers to go on the global leaderboard.
export function createGameOverScene(bestKey, restartScene = 'Game', { leaderboard } = {}) {
  return class GameOverScene extends Phaser.Scene {
    constructor() {
      super('GameOver');
    }

    create({ score }) {
      const { width, height } = this.scale.gameSize;
      const previous = readBest(bestKey);
      const best = Math.max(score, previous);
      writeBest(bestKey, best);

      const style = { fontFamily: 'sans-serif', color: '#ffffff', align: 'center' };
      playSound('gameOver');
      const wrap = { width: width - 80 };
      bindText(this, this.add.text(width / 2, height * 0.35, '', { ...style, fontSize: '80px', wordWrap: wrap }).setOrigin(0.5), () =>
        t('gameOver.title'),
      );
      bindText(this, this.add.text(width / 2, height * 0.47, '', { ...style, fontSize: '52px' }).setOrigin(0.5), () =>
        t('gameOver.score', { score, best }),
      );
      bindText(
        this,
        this.add.text(width / 2, height * 0.65, '', { ...style, fontSize: '38px', color: '#ffd166', wordWrap: wrap }).setOrigin(0.5),
        () => t('gameOver.again'),
      );

      // Short delay so a tap still in flight from the last move doesn't restart instantly.
      let ready = false;
      const restart = () => ready && this.scene.start(restartScene);
      this.time.delayedCall(400, () => (ready = true));
      this.input.on('pointerdown', restart);
      bindKeys(this, { action: restart });

      if (leaderboard && leaderboardEnabled && score > previous) {
        this.time.delayedCall(700, () => promptSubmit({ game: leaderboard.game, score, theme: leaderboard.theme }));
      }
    }
  };
}

export function readBest(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (private mode); best score just won't persist.
  }
}
