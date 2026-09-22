import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10132a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  input: { activePointers: 3 },
  scene: [GameScene, GameOverScene],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
