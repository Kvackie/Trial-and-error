import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { scaleConfig } from '../../../shared/screen.js';

document.body.style.background = '#000000';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,
  scale: scaleConfig(),
  input: { activePointers: 2 },
  scene: [GameScene],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;
