import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import * as sim from './sim.js';
import { scaleConfig } from '../../../shared/screen.js';
import { handleAndroidBack } from '../../../shared/android-back.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The background is a CSS gradient on the page, so it also fills the space
  // around the game on screens with a different shape.
  transparent: true,
  pixelArt: true,
  scale: scaleConfig(),
  scene: [GameScene],
});

handleAndroidBack();

// For checking the game from the browser console while developing.
if (import.meta.env.DEV) Object.assign(window, { throneGame: game, throneSim: sim });
