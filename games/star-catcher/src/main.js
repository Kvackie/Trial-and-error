import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

export const WIDTH = 720;
export const HEIGHT = 1280;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10132a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  input: { activePointers: 3 },
  scene: [GameScene, GameOverScene],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
