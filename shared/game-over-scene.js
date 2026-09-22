import Phaser from 'phaser';

// Game Over screen shared by the games: score, best score (kept per game in
// localStorage) and tap to play again. Start it with scene.start('GameOver', { score }).
export function createGameOverScene(bestKey, restartScene = 'Game') {
  return class GameOverScene extends Phaser.Scene {
    constructor() {
      super('GameOver');
    }

    create({ score }) {
      const { width, height } = this.scale.gameSize;
      const best = Math.max(score, readBest(bestKey));
      writeBest(bestKey, best);

      const style = { fontFamily: 'sans-serif', color: '#ffffff', align: 'center' };
      this.add.text(width / 2, height * 0.35, 'Game Over', { ...style, fontSize: '88px' }).setOrigin(0.5);
      this.add
        .text(width / 2, height * 0.47, `Score: ${score}\nBest: ${best}`, { ...style, fontSize: '52px' })
        .setOrigin(0.5);
      this.add
        .text(width / 2, height * 0.65, 'Tap to play again', { ...style, fontSize: '44px', color: '#ffd166' })
        .setOrigin(0.5);

      // Short delay so a tap still in flight from the last move doesn't restart instantly.
      this.time.delayedCall(400, () => {
        this.input.once('pointerdown', () => this.scene.start(restartScene));
      });
    }
  };
}

function readBest(key) {
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
