import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

// A CSS gradient behind the transparent canvas fills the whole screen.
document.body.style.background = 'linear-gradient(180deg, #43207a, #140a2e) fixed';

// Match the canvas to the screen's shape (720 wide, as tall as the screen allows)
// so tall phones get no empty bands and the board can sit centred.
const aspect = Math.min(Math.max(window.innerHeight / window.innerWidth, 1.5), 2.4);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: Math.round(720 * aspect),
  },
  scene: [GameScene, GameOverScene],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
