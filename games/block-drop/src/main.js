import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

// Match the canvas to the screen's shape (720 wide, as tall as the screen allows)
// so the board can use the full height of tall phones.
const aspect = Math.min(Math.max(window.innerHeight / window.innerWidth, 1.5), 2.4);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The colourful background is a CSS gradient on the page, so it also fills
  // the space around the game on screens with a different shape.
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: Math.round(720 * aspect),
  },
  input: { activePointers: 3 },
  scene: [GameScene, GameOverScene],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
