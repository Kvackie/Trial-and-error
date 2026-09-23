import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { createGameOverScene } from '../../../shared/game-over-scene.js';
import { scaleConfig } from '../../../shared/screen.js';
import { handleAndroidBack } from '../../../shared/android-back.js';

// A CSS gradient behind the transparent canvas fills the whole screen.
document.body.style.background = 'linear-gradient(180deg, #43207a, #140a2e) fixed';


const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,
  scale: scaleConfig(),
  scene: [GameScene, createGameOverScene('potion-match:best', 'Game', { leaderboard: { game: 'potion-match' } })],
});

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.game = game;

handleAndroidBack();
