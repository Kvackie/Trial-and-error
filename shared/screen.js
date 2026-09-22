import Phaser from 'phaser';

// Every game is a portrait canvas 720 units wide. Its height follows the
// screen's shape (within limits), so tall phones get no empty bands and the
// playfield can use the whole screen. Desktop windows get the shortest shape
// and are letterboxed at the sides.
export const GAME_WIDTH = 720;

export function portraitHeight() {
  const aspect = Math.min(Math.max(window.innerHeight / window.innerWidth, 1.5), 2.4);
  return Math.round(GAME_WIDTH * aspect);
}

export function scaleConfig() {
  return {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: portraitHeight(),
  };
}
