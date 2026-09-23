import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { THEME } from './help.js';
import { createGameOverScene } from '../../../shared/game-over-scene.js';
import { scaleConfig } from '../../../shared/screen.js';
import { handleAndroidBack } from '../../../shared/android-back.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The background is a CSS gradient on the page, so it also fills the space
  // around the game on screens with a different shape.
  transparent: true,
  scale: scaleConfig(),
  scene: [GameScene, createGameOverScene('__GAME__:best', 'Game', { leaderboard: { game: '__GAME__', theme: THEME } })],
});

handleAndroidBack();
