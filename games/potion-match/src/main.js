import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

// A CSS gradient behind the transparent canvas fills the whole screen,
// including the space around the game on screens of a different shape.
document.body.style.background = 'linear-gradient(180deg, #43207a, #140a2e) fixed';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [GameScene, GameOverScene],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
