import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { createGameOverScene } from '../../../shared/game-over-scene.js';
import { scaleConfig } from '../../../shared/screen.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10132a',
  scale: scaleConfig(),
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  input: { activePointers: 3 },
  scene: [GameScene, createGameOverScene('star-catcher:best')],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
