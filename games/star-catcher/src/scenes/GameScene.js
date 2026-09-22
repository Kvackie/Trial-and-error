import Phaser from 'phaser';

const MAX_MISSES = 3;
const STAR_COLORS = [0xffd166, 0x06d6a0, 0x4cc9f0, 0xf72585];

// Tap the falling stars before they reach the ground.
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const { width, height } = this.scale.gameSize;

    this.score = 0;
    this.misses = 0;
    this.fallSpeed = 220;
    this.spawnDelay = 1000;

    this.add.rectangle(width / 2, height - 20, width, 40, 0x2b2d5c);

    this.scoreText = this.add.text(24, 24, 'Score: 0', {
      fontFamily: 'sans-serif',
      fontSize: '44px',
      color: '#ffffff',
    });
    this.livesText = this.add
      .text(width - 24, 24, this.livesLabel(), {
        fontFamily: 'sans-serif',
        fontSize: '44px',
        color: '#f72585',
      })
      .setOrigin(1, 0);

    this.stars = this.physics.add.group();
    this.scheduleSpawn();
  }

  livesLabel() {
    return '♥'.repeat(MAX_MISSES - this.misses);
  }

  scheduleSpawn() {
    this.time.delayedCall(this.spawnDelay, () => {
      this.spawnStar();
      this.spawnDelay = Math.max(350, this.spawnDelay - 15);
      this.scheduleSpawn();
    });
  }

  spawnStar() {
    const { width } = this.scale.gameSize;
    const radius = Phaser.Math.Between(36, 56);
    const x = Phaser.Math.Between(radius, width - radius);
    const color = Phaser.Utils.Array.GetRandom(STAR_COLORS);

    const star = this.add.star(x, -radius, 5, radius * 0.5, radius, color);
    this.stars.add(star);
    star.body.setVelocityY(this.fallSpeed + Phaser.Math.Between(0, 120));
    star.body.setAngularVelocity(Phaser.Math.Between(-120, 120));

    // Generous circular hit area for fingers.
    star.setInteractive(
      new Phaser.Geom.Circle(radius, radius, radius * 1.4),
      Phaser.Geom.Circle.Contains,
    );
    star.once('pointerdown', () => this.catchStar(star));
  }

  catchStar(star) {
    this.score += 1;
    this.fallSpeed += 6;
    this.scoreText.setText(`Score: ${this.score}`);

    this.stars.remove(star);
    star.disableInteractive();
    star.body.stop();
    this.tweens.add({
      targets: star,
      scale: 1.8,
      alpha: 0,
      duration: 180,
      onComplete: () => star.destroy(),
    });
  }

  update() {
    const floor = this.scale.gameSize.height - 40;
    for (const star of this.stars.getChildren().slice()) {
      if (star.y - star.outerRadius > floor) {
        star.destroy();
        this.missStar();
      }
    }
  }

  missStar() {
    this.misses += 1;
    this.livesText.setText(this.livesLabel());
    this.cameras.main.shake(120, 0.01);

    if (this.misses >= MAX_MISSES) {
      this.scene.start('GameOver', { score: this.score });
    }
  }
}
