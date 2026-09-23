import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { THEME } from './help.js';
import { createGameOverScene } from '../../../shared/game-over-scene.js';
import { scaleConfig } from '../../../shared/screen.js';
import { handleAndroidBack } from '../../../shared/android-back.js';


const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // The colourful background is a CSS gradient on the page, so it also fills
  // the space around the game on screens with a different shape.
  transparent: true,
  scale: scaleConfig(),
  input: { activePointers: 3 },
  scene: [GameScene, createGameOverScene('block-drop:best', 'Game', { leaderboard: { game: 'block-drop', theme: THEME } })],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;

handleAndroidBack();
