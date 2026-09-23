import Phaser from 'phaser';
import { Board, COLS, MOVES, ROWS } from '../logic.js';
import { POTIONS, SPECIAL_ART, artPath } from '../art.js';
import { openHelp } from '../help.js';
import { bindKeys } from '../../../../shared/keyboard.js';
import { addHomeButton } from '../../../../shared/home-button.js';
import { addTrophyButton, openLeaderboard } from '../../../../shared/leaderboard.js';
import { readBest } from '../../../../shared/game-over-scene.js';
import { addSettingsButton } from '../../../../shared/settings.js';
import { bindText } from '../../../../shared/i18n.js';
import { playSound } from '../../../../shared/sound.js';
import { tr } from '../strings.js';

const CELL = 87;
const BOARD_SIZE = COLS * CELL;
const BOARD_X = (720 - BOARD_SIZE) / 2;
const HUD_HEIGHT = 130;
const HUD_GAP = 26;
const POTION_HEIGHT = 80;
const SWIPE_DIST = 30;
const HINT_DELAY = 6000;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    for (const { key } of [...POTIONS, ...Object.values(SPECIAL_ART)]) this.load.image(key, artPath(key));
  }

  create() {
    // Score, moves and board sit together as one block, centred on screens of any height.
    const blockTop = Math.max(16, (this.scale.height - (HUD_HEIGHT + HUD_GAP + BOARD_SIZE)) / 2);
    this.hudY = blockTop;
    this.boardY = blockTop + HUD_HEIGHT + HUD_GAP;

    this.board = new Board();
    this.score = 0;
    this.movesLeft = MOVES;
    this.busy = false;
    this.selected = null;
    this.pending = null;
    this.views = new Map(); // piece id -> container

    this.drawHud();
    this.drawBoardBackground();

    this.selection = this.add.rectangle(0, 0, CELL - 6, CELL - 6).setStrokeStyle(4, 0xffffff).setVisible(false);
    this.selection.setDepth(1);
    // Keyboard cursor: a gold frame, shown once a key is pressed.
    this.cursor = null;
    this.cursorFrame = this.add.rectangle(0, 0, CELL - 14, CELL - 14).setStrokeStyle(4, 0xffd23f).setVisible(false).setDepth(1);

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.createView(this.board.cells[r][c], r, c);

    this.setUpInput();
    this.setUpKeys();
    this.restartHintTimer();
  }

  // --- Layout ----------------------------------------------------------------

  drawHud() {
    const y = this.hudY;
    const text = { fontFamily: 'sans-serif', color: '#ffffff' };
    bindText(this, this.add.text(BOARD_X + 84, y, '', { ...text, fontSize: '26px', color: '#e8dcff' }), () => tr('score'));
    this.scoreText = this.add.text(BOARD_X + 84, y + 32, '0', { ...text, fontSize: '68px', fontStyle: 'bold', color: '#ffd23f' });
    bindText(this, this.add.text(720 - BOARD_X - 4, y, '', { ...text, fontSize: '26px', color: '#e8dcff' }).setOrigin(1, 0), () => tr('moves'));
    this.movesText = this.add
      .text(720 - BOARD_X - 4, y + 32, String(this.movesLeft), { ...text, fontSize: '68px', fontStyle: 'bold' })
      .setOrigin(1, 0);

    addHomeButton(this, BOARD_X + 34, y + 62, { radius: 34, fill: 0x43207a, stroke: 0xc77dff });

    // Help button: opens the rules in a dialog so they stay off the playfield.
    const help = this.add.circle(360, y + 62, 34, 0x43207a).setStrokeStyle(3, 0xc77dff).setInteractive({ useHandCursor: true });
    this.add.text(360, y + 62, '?', { ...text, fontSize: '44px', fontStyle: 'bold' }).setOrigin(0.5);
    help.on('pointerup', () => {
      playSound('click');
      this.showHelp();
    });

    addTrophyButton(this, 446, y + 62, {
      radius: 34,
      fill: 0x43207a,
      stroke: 0xc77dff,
      onClick: () =>
        this.pauseFor((onClose) => openLeaderboard({ game: 'potion-match', myBest: readBest('potion-match:best'), onClose })),
    });

    addSettingsButton(this, 532, y + 62, {
      radius: 34,
      fill: 0x43207a,
      stroke: 0xc77dff,
      onOpen: () => this.pauseBoard(),
      onClose: () => this.resumeBoard(),
    });
  }

  showHelp() {
    this.pauseFor(openHelp);
  }

  // Freeze the board while a dialog is open. open(onClose) shows the dialog.
  pauseFor(open) {
    this.pauseBoard();
    open(() => this.resumeBoard());
  }

  pauseBoard() {
    this.select(null);
    this.pending = null;
    this.stopHint();
    this.input.enabled = false;
  }

  resumeBoard() {
    this.input.enabled = true;
    if (!this.busy) this.restartHintTimer();
  }

  drawBoardBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x0d0820, 0.6).fillRoundedRect(BOARD_X - 6, this.boardY - 6, BOARD_SIZE + 12, BOARD_SIZE + 12, 16);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        g.fillStyle(0xffffff, (r + c) % 2 ? 0.04 : 0.09);
        g.fillRoundedRect(BOARD_X + c * CELL + 2, this.boardY + r * CELL + 2, CELL - 4, CELL - 4, 10);
      }
    }
    g.lineStyle(3, 0xc77dff, 0.9).strokeRoundedRect(BOARD_X - 6, this.boardY - 6, BOARD_SIZE + 12, BOARD_SIZE + 12, 16);
  }

  createView(piece, r, c, fromRow = r) {
    const { x, y } = this.cellCenter(fromRow, c);
    const container = this.add.container(x, y);
    if (piece.special) {
      const spec = SPECIAL_ART[piece.special];
      const glow = this.add.circle(0, 0, CELL * 0.44, spec.glow, 0.35);
      container.add(glow);
      this.tweens.add({ targets: glow, scale: 1.15, alpha: 0.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (piece.special === 'rainbow') container.setData('rainbowGlow', glow);
      const img = this.add.image(0, 0, spec.key);
      img.setScale(POTION_HEIGHT / img.height);
      container.add(img);
    } else {
      const img = this.add.image(0, 0, POTIONS[piece.color].key);
      img.setScale(POTION_HEIGHT / img.height);
      container.add(img);
    }
    this.views.set(piece.id, container);
    return container;
  }

  update(time) {
    // Rainbow specials cycle through the potion colours.
    const hue = (time / 1500) % 1;
    const color = Phaser.Display.Color.HSVToRGB(hue, 0.6, 1).color;
    for (const view of this.views.values()) view.getData('rainbowGlow')?.setFillStyle(color, view.getData('rainbowGlow').fillAlpha);
  }

  cellCenter(r, c) {
    return { x: BOARD_X + c * CELL + CELL / 2, y: this.boardY + r * CELL + CELL / 2 };
  }

  // --- Input -----------------------------------------------------------------

  cellAt(x, y) {
    const c = Math.floor((x - BOARD_X) / CELL);
    const r = Math.floor((y - this.boardY) / CELL);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? [r, c] : null;
  }

  setUpInput() {
    this.input.on('pointerdown', (pointer) => {
      const cell = this.cellAt(pointer.x, pointer.y);
      this.pending = cell ? { cell, x: pointer.x, y: pointer.y, id: pointer.id } : null;
    });

    this.input.on('pointermove', (pointer) => {
      const pending = this.pending;
      if (!pending || pending.id !== pointer.id || !pointer.isDown) return;
      const dx = pointer.x - pending.x;
      const dy = pointer.y - pending.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DIST) return;
      this.pending = null;
      const [r, c] = pending.cell;
      const target = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      this.select(null);
      this.trySwap(pending.cell, target);
    });

    this.input.on('pointerup', (pointer) => {
      const pending = this.pending;
      if (!pending || pending.id !== pointer.id) return;
      this.pending = null;
      const cell = pending.cell;
      if (this.selected && Board.adjacent(this.selected, cell)) {
        const from = this.selected;
        this.select(null);
        this.trySwap(from, cell);
      } else if (this.selected && this.selected[0] === cell[0] && this.selected[1] === cell[1]) {
        this.select(null);
      } else {
        this.select(cell);
      }
    });
  }

  // WASD moves the cursor; Space picks up the potion under it. With a potion picked
  // up, WASD swaps it that way instead.
  setUpKeys() {
    const step = (dr, dc) => () => {
      const inside = ([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
      if (this.selected) {
        const from = this.selected;
        const to = [from[0] + dr, from[1] + dc];
        this.select(null);
        if (!inside(to)) return;
        this.moveCursor(to);
        this.trySwap(from, to);
        return;
      }
      if (!this.cursor) return this.moveCursor([3, 3]);
      const to = [this.cursor[0] + dr, this.cursor[1] + dc];
      if (inside(to)) this.moveCursor(to);
    };
    bindKeys(
      this,
      {
        up: step(-1, 0),
        down: step(1, 0),
        left: step(0, -1),
        right: step(0, 1),
        action: () => {
          if (!this.cursor) return this.moveCursor([3, 3]);
          const same = this.selected && this.selected[0] === this.cursor[0] && this.selected[1] === this.cursor[1];
          this.select(same ? null : this.cursor);
        },
      },
      () => !this.input.enabled, // help dialog open
    );
  }

  moveCursor(cell) {
    this.cursor = cell;
    const { x, y } = this.cellCenter(...cell);
    this.cursorFrame.setPosition(x, y).setVisible(true);
  }

  select(cell) {
    if (cell) playSound('select');
    this.selected = cell;
    if (!cell) {
      this.selection.setVisible(false);
      return;
    }
    const { x, y } = this.cellCenter(...cell);
    this.selection.setPosition(x, y).setVisible(true);
  }

  async trySwap(a, b) {
    if (this.busy || this.movesLeft <= 0) return;
    if (b[0] < 0 || b[0] >= ROWS || b[1] < 0 || b[1] >= COLS) return;
    this.busy = true;
    this.stopHint();

    const va = this.views.get(this.board.at(...a).id);
    const vb = this.views.get(this.board.at(...b).id);
    const result = this.board.resolveSwap(a, b);

    if (!result.valid) {
      // Only a swap that makes no match costs a move, so good play can go on forever.
      playSound('invalid');
      this.movesLeft--;
      this.movesText.setText(String(this.movesLeft));
      this.tweens.add({ targets: this.movesText, scale: 1.25, duration: 120, yoyo: true });
      await this.swapViews(va, vb, a, b);
      await this.swapViews(va, vb, b, a);
      if (this.movesLeft <= 0) {
        this.time.delayedCall(400, () => this.scene.start('GameOver', { score: this.score }));
        return;
      }
      this.busy = false;
      this.restartHintTimer();
      return;
    }

    playSound('swap');
    for (const step of result.steps) await this.animate(step, va, vb);
    this.busy = false;
    this.restartHintTimer();
  }

  // --- Animation ---------------------------------------------------------------

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }));
  }

  swapViews(va, vb, a, b) {
    const pa = this.cellCenter(...b);
    const pb = this.cellCenter(...a);
    return Promise.all([
      this.tween({ targets: va, x: pa.x, y: pa.y, duration: 160, ease: 'Quad.easeInOut' }),
      this.tween({ targets: vb, x: pb.x, y: pb.y, duration: 160, ease: 'Quad.easeInOut' }),
    ]);
  }

  async animate(step, va, vb) {
    if (step.type === 'swap') return this.swapViews(va, vb, step.a, step.b);
    if (step.type === 'clear') return this.animateClear(step);
    if (step.type === 'fall') return this.animateFall(step);
    if (step.type === 'shuffle') return this.animateShuffle(step);
  }

  async animateClear({ removed, created, triggered, cascade, points }) {
    for (const blast of triggered) this.blastEffect(blast);
    playSound(triggered.length ? 'blast' : 'match', { step: cascade });
    if (created.length) this.time.delayedCall(120, () => playSound('special'));

    const pops = removed.map(({ r, c, piece }) => {
      const view = this.views.get(piece.id);
      this.views.delete(piece.id);
      if (!view) return null;
      this.sparkle(this.cellCenter(r, c), piece.color == null ? 0xffffff : POTIONS[piece.color].tint);
      return this.tween({ targets: view, scale: 0, alpha: 0, duration: 200, ease: 'Back.easeIn' }).then(() => view.destroy());
    });

    for (const { r, c, piece } of created) {
      const view = this.createView(piece, r, c);
      view.setScale(0);
      pops.push(this.tween({ targets: view, scale: 1, duration: 260, delay: 120, ease: 'Back.easeOut' }));
    }

    this.score += points;
    this.scoreText.setText(String(this.score));
    const centre = removed.reduce((acc, { r, c }) => ({ r: acc.r + r / removed.length, c: acc.c + c / removed.length }), { r: 0, c: 0 });
    this.floatText(this.cellCenter(centre.r, centre.c), cascade > 1 ? `+${points}  x${cascade}` : `+${points}`, cascade);

    await Promise.all(pops);
  }

  async animateFall({ moves, spawns }) {
    const falls = [];
    for (const { piece, from, to } of moves) {
      const view = this.views.get(piece.id);
      const { y } = this.cellCenter(...to);
      falls.push(this.tween({ targets: view, y, duration: 90 + (to[0] - from[0]) * 60, ease: 'Quad.easeIn' }));
    }
    for (const { piece, to, fromRow } of spawns) {
      const view = this.createView(piece, to[0], to[1], fromRow);
      view.setAlpha(0);
      const { y } = this.cellCenter(...to);
      falls.push(this.tween({ targets: view, y, alpha: 1, duration: 90 + (to[0] - fromRow) * 60, ease: 'Quad.easeIn' }));
    }
    await Promise.all(falls);
  }

  async animateShuffle({ positions }) {
    playSound('shuffle');
    this.floatText({ x: 360, y: this.boardY + (ROWS * CELL) / 2 }, tr('shuffling'), 1);
    const keep = new Set(positions.map(({ piece }) => piece.id));
    for (const [id, view] of this.views) {
      if (!keep.has(id)) {
        view.destroy();
        this.views.delete(id);
      }
    }
    await Promise.all(
      positions.map(({ piece, to }) => {
        const view = this.views.get(piece.id) ?? this.createView(piece, ...to);
        const { x, y } = this.cellCenter(...to);
        return this.tween({ targets: view, x, y, duration: 450, delay: 300, ease: 'Cubic.easeInOut' });
      }),
    );
  }

  blastEffect({ r, c, special }) {
    const { x, y } = this.cellCenter(r, c);
    if (special === 'bomb') {
      const ring = this.add.circle(x, y, CELL * 0.5, 0xff9f1c, 0.7).setDepth(2);
      this.tween({ targets: ring, scale: 3.4, alpha: 0, duration: 380, ease: 'Cubic.easeOut' }).then(() => ring.destroy());
    } else if (special === 'cross') {
      const w = COLS * CELL;
      const h = ROWS * CELL;
      const row = this.add.rectangle(BOARD_X + w / 2, y, w, CELL * 0.8, 0xffffff, 0.8).setDepth(2);
      const col = this.add.rectangle(x, this.boardY + h / 2, CELL * 0.8, h, 0xffffff, 0.8).setDepth(2);
      this.tween({ targets: [row, col], alpha: 0, duration: 380 }).then(() => {
        row.destroy();
        col.destroy();
      });
    } else {
      this.cameras.main.flash(250, 255, 200, 255);
    }
  }

  sparkle({ x, y }, color) {
    for (let i = 0; i < 6; i++) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(4, 8), color).setDepth(2);
      this.tween({
        targets: spark,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-60, 60),
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(300, 550),
        ease: 'Cubic.easeOut',
      }).then(() => spark.destroy());
    }
  }

  floatText({ x, y }, message, cascade) {
    const colors = ['#ffffff', '#ffd23f', '#4ee84e', '#3ab8ff', '#ff5fc8', '#a66bff'];
    const text = this.add
      .text(x, y, message, {
        fontFamily: 'sans-serif',
        fontSize: cascade > 1 ? '52px' : '44px',
        fontStyle: 'bold',
        color: colors[Math.min(cascade - 1, colors.length - 1)],
        stroke: '#1a0b33',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.tween({ targets: text, y: y - 100, alpha: 0, duration: 1000, ease: 'Cubic.easeOut' }).then(() => text.destroy());
  }

  // --- Hints -------------------------------------------------------------------

  restartHintTimer() {
    this.stopHint();
    this.hintTimer = this.time.delayedCall(HINT_DELAY, () => {
      const move = this.board.findMove();
      if (!move || this.busy) return;
      const targets = move.map((cell) => this.views.get(this.board.at(...cell).id));
      this.hintTween = this.tweens.add({ targets, scale: 1.15, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  stopHint() {
    this.hintTimer?.remove();
    if (this.hintTween) {
      const targets = this.hintTween.targets;
      this.hintTween.remove();
      this.hintTween = null;
      for (const target of targets) target.setScale?.(1);
    }
  }
}
