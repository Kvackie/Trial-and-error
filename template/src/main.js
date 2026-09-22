import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
  constructor() {
    super('Main');
  }

  create() {
    const { width, height } = this.scale.gameSize;
    let taps = 0;

    const label = this.add
      .text(width / 2, height / 2, 'Tap anywhere', {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.input.on('pointerdown', () => {
      taps += 1;
      label.setText(`Taps: ${taps}`);
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10132a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [MainScene],
});
