import Phaser from 'phaser';
import { Board, COLS, MOVES, ROWS } from '../logic.js';

// Potion art from Eternal Alchemy. Index = colour in the board logic.
const POTIONS = [
  { key: 'emberSovereign', tint: 0xff4d4d },
  { key: 'loamCommon', tint: 0xffd23f },
  { key: 'clayrillCordial', tint: 0x4ee84e },
  { key: 'tideCommon', tint: 0x3ab8ff },
  { key: 'skysalt', tint: 0xa66bff },
  { key: 'emberGaleGreater', tint: 0xff5fc8 },
];
const SPECIAL_ART = {
  bomb: { key: 'cinderveilBomb', glow: 0xff9f1c, name: 'Bomb', how: 'Match 4', does: 'clears everything around it' },
  cross: { key: 'healthTonic', glow: 0xffffff, name: 'Cross', how: 'Match an L or T', does: 'clears its row and column' },
  rainbow: { key: 'pilgrimsRestorative', glow: 0xff5fc8, name: 'Rainbow', how: 'Match 5', does: 'swap it to clear one colour' },
};

const CELL = 84;
const BOARD_X = (720 - COLS * CELL) / 2;
const BOARD_Y = 230;
const POTION_HEIGHT = 76;
const SWIPE_DIST = 30;
const HINT_DELAY = 6000;

const cellCenter = (r, c) => ({ x: BOARD_X + c * CELL + CELL / 2, y: BOARD_Y + r * CELL + CELL / 2 });

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    for (const { key } of [...POTIONS, ...Object.values(SPECIAL_ART)]) this.load.image(key, `potions/${key}.png`);
  }

  create() {
    this.board = new Board();
    this.score = 0;
    this.movesLeft = MOVES;
    this.busy = false;
    this.selected = null;
    this.pending = null;
    this.views = new Map(); // piece id -> container

    this.drawHud();
    this.drawBoardBackground();
    this.drawLegend();

    this.selection = this.add.rectangle(0, 0, CELL - 6, CELL - 6).setStrokeStyle(4, 0xffffff).setVisible(false);
    this.selection.setDepth(1);

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.createView(this.board.cells[r][c], r, c);

    this.setUpInput();
    this.restartHintTimer();
  }

  // --- Layout ----------------------------------------------------------------

  drawHud() {
    const text = { fontFamily: 'sans-serif', color: '#ffffff' };
    this.add.text(24, 30, 'SCORE', { ...text, fontSize: '26px', color: '#e8dcff' });
    this.scoreText = this.add.text(24, 62, '0', { ...text, fontSize: '64px', fontStyle: 'bold', color: '#ffd23f' });
    this.add.text(696, 30, 'MOVES', { ...text, fontSize: '26px', color: '#e8dcff' }).setOrigin(1, 0);
    this.movesText = this.add
      .text(696, 62, String(this.movesLeft), { ...text, fontSize: '64px', fontStyle: 'bold' })
      .setOrigin(1, 0);
    this.add.text(360, 170, 'Swipe or tap two potions to swap them', { ...text, fontSize: '26px', color: '#e8dcff' }).setOrigin(0.5);
  }

  drawBoardBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x0d0820, 0.6).fillRoundedRect(BOARD_X - 8, BOARD_Y - 8, COLS * CELL + 16, ROWS * CELL + 16, 18);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        g.fillStyle(0xffffff, (r + c) % 2 ? 0.04 : 0.09);
        g.fillRoundedRect(BOARD_X + c * CELL + 2, BOARD_Y + r * CELL + 2, CELL - 4, CELL - 4, 10);
      }
    }
    g.lineStyle(3, 0xc77dff, 0.9).strokeRoundedRect(BOARD_X - 8, BOARD_Y - 8, COLS * CELL + 16, ROWS * CELL + 16, 18);
  }

  drawLegend() {
    const top = BOARD_Y + ROWS * CELL + 40;
    this.add.text(360, top, 'SPECIAL POTIONS', { fontFamily: 'sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#e8dcff' }).setOrigin(0.5, 0);
    Object.values(SPECIAL_ART).forEach((spec, i) => {
      const y = top + 80 + i * 96;
      this.add.circle(70, y, 36, spec.glow, 0.25);
      const icon = this.add.image(70, y, spec.key);
      icon.setScale(64 / icon.height);
      this.add.text(124, y - 30, `${spec.name}  ·  ${spec.how}`, { fontFamily: 'sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff' });
      this.add.text(124, y + 6, spec.does, { fontFamily: 'sans-serif', fontSize: '24px', color: '#e8dcff' });
    });
  }

  createView(piece, r, c, fromRow = r) {
    const { x, y } = cellCenter(fromRow, c);
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

  // --- Input -----------------------------------------------------------------

  cellAt(x, y) {
    const c = Math.floor((x - BOARD_X) / CELL);
    const r = Math.floor((y - BOARD_Y) / CELL);
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

  select(cell) {
    this.selected = cell;
    if (!cell) {
      this.selection.setVisible(false);
      return;
    }
    const { x, y } = cellCenter(...cell);
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
      // Swap there and back.
      await this.swapViews(va, vb, a, b);
      await this.swapViews(va, vb, b, a);
      this.busy = false;
      this.restartHintTimer();
      return;
    }

    this.movesLeft--;
    this.movesText.setText(String(this.movesLeft));
    for (const step of result.steps) await this.animate(step, va, vb);

    if (this.movesLeft <= 0) {
      this.time.delayedCall(500, () => this.scene.start('GameOver', { score: this.score }));
      return;
    }
    this.busy = false;
    this.restartHintTimer();
  }

  // --- Animation ---------------------------------------------------------------

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }));
  }

  swapViews(va, vb, a, b) {
    const pa = cellCenter(...b);
    const pb = cellCenter(...a);
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

    const pops = removed.map(({ r, c, piece }) => {
      const view = this.views.get(piece.id);
      this.views.delete(piece.id);
      if (!view) return null;
      this.sparkle(cellCenter(r, c), piece.color == null ? 0xffffff : POTIONS[piece.color].tint);
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
    this.floatText(cellCenter(centre.r, centre.c), cascade > 1 ? `+${points}  x${cascade}` : `+${points}`, cascade);

    await Promise.all(pops);
  }

  async animateFall({ moves, spawns }) {
    const falls = [];
    for (const { piece, from, to } of moves) {
      const view = this.views.get(piece.id);
      const { y } = cellCenter(...to);
      falls.push(this.tween({ targets: view, y, duration: 90 + (to[0] - from[0]) * 60, ease: 'Quad.easeIn' }));
    }
    for (const { piece, to, fromRow } of spawns) {
      const view = this.createView(piece, to[0], to[1], fromRow);
      view.setAlpha(0);
      const { y } = cellCenter(...to);
      falls.push(this.tween({ targets: view, y, alpha: 1, duration: 90 + (to[0] - fromRow) * 60, ease: 'Quad.easeIn' }));
    }
    await Promise.all(falls);
  }

  async animateShuffle({ positions }) {
    this.floatText({ x: 360, y: BOARD_Y + (ROWS * CELL) / 2 }, 'No moves - shuffling!', 1);
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
        const { x, y } = cellCenter(...to);
        return this.tween({ targets: view, x, y, duration: 450, delay: 300, ease: 'Cubic.easeInOut' });
      }),
    );
  }

  blastEffect({ r, c, special }) {
    const { x, y } = cellCenter(r, c);
    if (special === 'bomb') {
      const ring = this.add.circle(x, y, CELL * 0.5, 0xff9f1c, 0.7).setDepth(2);
      this.tween({ targets: ring, scale: 3.4, alpha: 0, duration: 380, ease: 'Cubic.easeOut' }).then(() => ring.destroy());
    } else if (special === 'cross') {
      const w = COLS * CELL;
      const h = ROWS * CELL;
      const row = this.add.rectangle(BOARD_X + w / 2, y, w, CELL * 0.8, 0xffffff, 0.8).setDepth(2);
      const col = this.add.rectangle(x, BOARD_Y + h / 2, CELL * 0.8, h, 0xffffff, 0.8).setDepth(2);
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
