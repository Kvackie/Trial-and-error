import Phaser from 'phaser';

const BEST_KEY = 'block-drop:best';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ score }) {
    const { width, height } = this.scale.gameSize;
    const best = Math.max(score, readBest());
    writeBest(best);

    const style = { fontFamily: 'sans-serif', color: '#ffffff', align: 'center' };
    this.add.text(width / 2, height * 0.35, 'Game Over', { ...style, fontSize: '88px' }).setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.47, `Score: ${score}\nBest: ${best}`, { ...style, fontSize: '52px' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.65, 'Tap to play again', { ...style, fontSize: '44px', color: '#ffd166' })
      .setOrigin(0.5);

    // Short delay so a tap still in flight from the last star doesn't restart instantly.
    this.time.delayedCall(400, () => {
      this.input.once('pointerdown', () => this.scene.start('Game'));
    });
  }
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage unavailable (private mode); best score just won't persist.
  }
}
