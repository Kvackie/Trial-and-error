import Phaser from 'phaser';
import { THEME, openHelp } from '../help.js';
import { tr } from '../strings.js';
import { addHomeButton } from '../../../../shared/home-button.js';
import { addSettingsButton } from '../../../../shared/settings.js';
import { addTrophyButton, openLeaderboard } from '../../../../shared/leaderboard.js';
import { readBest } from '../../../../shared/game-over-scene.js';
import { bindKeys } from '../../../../shared/keyboard.js';
import { bindText, onSceneLangChange } from '../../../../shared/i18n.js';
import { playSound } from '../../../../shared/sound.js';

// A placeholder game to replace: tap the circle as often as you can in 30 seconds.
// It shows the parts every game needs: the header buttons, text in both languages,
// keyboard controls, sounds and the Game Over screen with the leaderboard.

const GAME = '__GAME__';
const SECONDS = 30;
const HEADER_H = 120;
const MARGIN = 24;
const RADIUS = 70;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.score = 0;
    this.timeLeft = SECONDS;
    this.started = false;

    this.setUpHeader();

    // The playfield is everything below the header.
    const { height } = this.scale;
    this.field = new Phaser.Geom.Rectangle(MARGIN, MARGIN + HEADER_H, 720 - 2 * MARGIN, height - 2 * MARGIN - HEADER_H);
    this.target = this.add
      .circle(this.field.centerX, this.field.centerY, RADIUS, 0xffd166)
      .setStrokeStyle(6, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.hint = this.add
      .text(this.field.centerX, this.field.centerY + RADIUS + 50, '', { fontFamily: 'sans-serif', fontSize: '36px', color: '#e0e2ff' })
      .setOrigin(0.5);
    bindText(this, this.hint, () => tr('start'));

    this.target.on('pointerdown', () => this.hit());
    bindKeys(this, { action: () => this.hit() });

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.refresh();
  }

  // Home and trophy on the left, score in the middle, settings and help on the right.
  setUpHeader() {
    const y = MARGIN + 40;
    // Freeze the game while a dialog is open.
    const pause = () => this.scene.pause();
    const resume = () => this.scene.resume();

    addHomeButton(this, MARGIN + 32, y);
    addTrophyButton(this, MARGIN + 112, y, {
      onClick: () => {
        pause();
        openLeaderboard({ game: GAME, myBest: readBest(`${GAME}:best`), theme: THEME, onClose: resume });
      },
    });
    addSettingsButton(this, 720 - MARGIN - 112, y, { theme: THEME, onOpen: pause, onClose: resume });

    const help = this.add.circle(720 - MARGIN - 32, y, 32, 0x2b2d5c).setStrokeStyle(3, 0xe0e2ff).setInteractive({ useHandCursor: true });
    this.add.text(help.x, y, '?', { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    help.on('pointerup', () => {
      playSound('click');
      pause();
      openHelp(resume);
    });

    const style = { fontFamily: 'sans-serif', fontStyle: 'bold' };
    this.scoreText = this.add.text(360, y - 22, '', { ...style, fontSize: '44px', color: '#ffd166' }).setOrigin(0.5);
    this.timeText = this.add.text(360, y + 28, '', { ...style, fontSize: '28px', color: '#e0e2ff' }).setOrigin(0.5);
    onSceneLangChange(this, () => this.refresh());
  }

  hit() {
    this.started = true;
    this.hint.setVisible(false);
    this.score += 1;
    playSound('select');
    const { field } = this;
    this.target.setPosition(
      Phaser.Math.Between(field.left + RADIUS, field.right - RADIUS),
      Phaser.Math.Between(field.top + RADIUS, field.bottom - RADIUS),
    );
    this.refresh();
  }

  tick() {
    if (!this.started) return;
    this.timeLeft -= 1;
    this.refresh();
    if (this.timeLeft <= 0) this.scene.start('GameOver', { score: this.score });
  }

  refresh() {
    this.scoreText.setText(tr('score', { score: this.score }));
    this.timeText.setText(tr('time', { seconds: this.timeLeft }));
  }
}
