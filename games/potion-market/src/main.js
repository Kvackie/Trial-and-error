import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { scaleConfig } from '../../../shared/screen.js';
import { handleAndroidBack } from '../../../shared/android-back.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The shop's warm background is a CSS gradient on the page.
  transparent: true,
  scale: scaleConfig(),
  scene: [GameScene],
});

if (import.meta.env.DEV) window.game = game;

handleAndroidBack();
