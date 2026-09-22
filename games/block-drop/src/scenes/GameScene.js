import Phaser from 'phaser';
import { BlockDropGame, COLS, PIECES, ROWS } from '../logic.js';

const { Color } = Phaser.Display;
const PALETTE = Object.values(PIECES).map((piece) => piece.color);

const CELL = 46;
const BOARD_X = (720 - COLS * CELL) / 2;
const BOARD_Y = 180;
const BOARD_BOTTOM = BOARD_Y + ROWS * CELL;
const BUTTON_Y = 1190;
const BUTTON_H = 120;

// Touch gestures: drag distance per column, and what counts as a tap.
// Dropping is left to the DROP button so a sideways drag can't push a piece down.
const DRAG_STEP = CELL * 0.8;
const TAP_MAX_MS = 250;
const TAP_MAX_DIST = 16;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.logic = new BlockDropGame();
    this.elapsed = 0;
    this.drag = null;

    this.shades = new Map();
    this.bgLevel = 0;
    this.gfx = this.add.graphics();

    const label = { fontFamily: 'sans-serif', color: '#ffffff' };
    this.scoreText = this.add.text(24, 28, '', { ...label, fontSize: '52px', fontStyle: 'bold', color: '#ffd23f' });
    this.statsText = this.add.text(24, 98, '', { ...label, fontSize: '30px', color: '#e0e2ff' });
    this.add.text(606, 22, 'NEXT', { ...label, fontSize: '24px', fontStyle: 'bold', color: '#e0e2ff' }).setOrigin(0.5, 0);

    this.setUpGestures();
    this.setUpButtons();
    this.setUpKeyboard();
    this.redraw();
  }

  // --- Input ---------------------------------------------------------------

  setUpGestures() {
    // Everything above the buttons is a gesture area.
    const zone = this.add.zone(0, 0, 720, BUTTON_Y - BUTTON_H / 2 - 10).setOrigin(0).setInteractive();

    zone.on('pointerdown', (pointer) => {
      this.drag = {
        id: pointer.id,
        startX: pointer.x,
        startY: pointer.y,
        lastX: pointer.x,
        startTime: pointer.downTime,
        moved: false,
      };
    });

    this.input.on('pointermove', (pointer) => {
      const drag = this.drag;
      if (!drag || drag.id !== pointer.id || !pointer.isDown) return;

      while (pointer.x - drag.lastX >= DRAG_STEP) {
        drag.lastX += DRAG_STEP;
        drag.moved = true;
        this.act(() => this.logic.moveRight());
      }
      while (drag.lastX - pointer.x >= DRAG_STEP) {
        drag.lastX -= DRAG_STEP;
        drag.moved = true;
        this.act(() => this.logic.moveLeft());
      }
    });

    this.input.on('pointerup', (pointer) => {
      const drag = this.drag;
      if (!drag || drag.id !== pointer.id) return;
      this.drag = null;

      const duration = pointer.upTime - drag.startTime;
      const distance = Phaser.Math.Distance.Between(drag.startX, drag.startY, pointer.x, pointer.y);

      if (!drag.moved && duration < TAP_MAX_MS && distance < TAP_MAX_DIST) {
        this.act(() => this.logic.rotate());
      }
    });
  }

  setUpButtons() {
    const buttons = [
      { label: '◀', color: PIECES.J.color, action: () => this.logic.moveLeft(), repeat: true },
      { label: '▶', color: PIECES.I.color, action: () => this.logic.moveRight(), repeat: true },
      { label: 'DROP', color: PIECES.Z.color, action: () => this.logic.hardDrop(), repeat: false },
      { label: '↻', color: PIECES.L.color, action: () => this.logic.rotate(), repeat: false },
    ];

    const gap = 12;
    const width = (720 - 2 * 20 - gap * (buttons.length - 1)) / buttons.length;

    buttons.forEach((spec, index) => {
      const x = 20 + width / 2 + index * (width + gap);
      const { dark, light } = this.shade(spec.color);
      const bg = this.add
        .rectangle(x, BUTTON_Y, width, BUTTON_H, dark)
        .setStrokeStyle(3, spec.color)
        .setInteractive();
      this.add
        .text(x, BUTTON_Y, spec.label, {
          fontFamily: 'sans-serif',
          fontSize: spec.label.length > 1 ? '32px' : '48px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      let timer = null;
      const release = () => {
        bg.setFillStyle(dark);
        timer?.remove();
        timer = null;
      };

      bg.on('pointerdown', () => {
        bg.setFillStyle(light);
        this.act(spec.action);
        if (!spec.repeat) return;
        // Hold to repeat, after a short delay so single presses stay precise.
        timer = this.time.delayedCall(170, () => {
          timer = this.time.addEvent({ delay: 55, loop: true, callback: () => this.act(spec.action) });
        });
      });
      bg.on('pointerup', release);
      bg.on('pointerout', release);
    });
  }

  setUpKeyboard() {
    const keys = {
      LEFT: () => this.logic.moveLeft(),
      RIGHT: () => this.logic.moveRight(),
      DOWN: () => this.logic.softDrop(),
      UP: () => this.logic.rotate(),
      X: () => this.logic.rotate(),
      SPACE: () => this.logic.hardDrop(),
    };
    for (const [key, action] of Object.entries(keys)) {
      this.input.keyboard?.on(`keydown-${key}`, () => this.act(action));
    }
  }

  // Run a player action, then react to what it did to the board.
  act(action) {
    if (this.logic.over) return;
    const linesBefore = this.logic.lines;
    const pieceBefore = this.logic.piece;
    const scoreBefore = this.logic.score;
    action();
    const cleared = this.logic.lines - linesBefore;
    if (cleared > 0) this.celebrate(this.logic.lastCleared, this.logic.score - scoreBefore);
    if (cleared >= 4) this.cameras.main.shake(150, 0.008);
    if (this.logic.piece !== pieceBefore && this.logic.piece.y <= 0) this.elapsed = 0;
    this.afterChange();
  }

  afterChange() {
    if (this.logic.over) {
      this.scene.start('GameOver', { score: this.logic.score });
      return;
    }
    this.redraw();
  }

  // --- Loop ----------------------------------------------------------------

  update(_time, delta) {
    if (this.logic.over) return;
    this.elapsed += delta;
    if (this.elapsed >= this.logic.dropInterval) {
      this.elapsed = 0;
      this.act(() => this.logic.tick());
    }
  }

  // --- Drawing -------------------------------------------------------------

  redraw() {
    const g = this.gfx;
    const logic = this.logic;
    g.clear();
    if (this.bgLevel !== logic.level) this.drawBackground(logic.level);

    // Board background and faint grid, framed in the current piece's colour.
    g.fillStyle(0x0b0d20, 0.72).fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    g.lineStyle(1, 0xffffff, 0.06);
    for (let c = 1; c < COLS; c++) g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_BOTTOM);
    for (let r = 1; r < ROWS; r++) g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
    g.lineStyle(10, logic.piece.color, 0.18).strokeRect(BOARD_X - 5, BOARD_Y - 5, COLS * CELL + 10, ROWS * CELL + 10);
    g.lineStyle(3, logic.piece.color).strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * CELL + 4, ROWS * CELL + 4);

    logic.board.forEach((row, r) =>
      row.forEach((color, c) => color && this.drawCell(BOARD_X + c * CELL, BOARD_Y + r * CELL, CELL, color)),
    );

    const { piece } = logic;
    const ghostY = logic.ghostY();
    this.eachCell(piece.cells, (r, c) => {
      const y = ghostY + r;
      if (y < 0) return;
      g.lineStyle(2, piece.color, 0.45).strokeRect(BOARD_X + (piece.x + c) * CELL + 3, BOARD_Y + y * CELL + 3, CELL - 6, CELL - 6);
    });
    this.eachCell(piece.cells, (r, c) => {
      const y = piece.y + r;
      if (y < 0) return;
      this.drawCell(BOARD_X + (piece.x + c) * CELL, BOARD_Y + y * CELL, CELL, piece.color);
    });

    // Next piece preview.
    const next = logic.pieceInfo(logic.next);
    const size = 30;
    const box = { x: 520, y: 60, w: 172, h: 104 };
    g.fillStyle(0x0b0d20, 0.6).fillRoundedRect(box.x, box.y, box.w, box.h, 10);
    g.lineStyle(2, next.color).strokeRoundedRect(box.x, box.y, box.w, box.h, 10);
    const filled = [];
    this.eachCell(next.cells, (r, c) => filled.push([r, c]));
    const rows = filled.map(([r]) => r);
    const cols = filled.map(([, c]) => c);
    const w = (Math.max(...cols) - Math.min(...cols) + 1) * size;
    const h = (Math.max(...rows) - Math.min(...rows) + 1) * size;
    for (const [r, c] of filled) {
      this.drawCell(
        box.x + (box.w - w) / 2 + (c - Math.min(...cols)) * size,
        box.y + (box.h - h) / 2 + (r - Math.min(...rows)) * size,
        size,
        next.color,
      );
    }

    this.scoreText.setText(String(logic.score));
    this.statsText.setText(`Level ${logic.level}  ·  Lines ${logic.lines}`);
  }

  // A bevelled block: light top-left edge, dark bottom-right edge, glossy highlight.
  drawCell(x, y, size, color) {
    const g = this.gfx;
    const { light, dark } = this.shade(color);
    const edge = Math.max(3, Math.round(size * 0.12));
    g.fillStyle(dark).fillRect(x + 1, y + 1, size - 2, size - 2);
    g.fillStyle(light).fillRect(x + 1, y + 1, size - 2 - edge, size - 2 - edge);
    g.fillStyle(color).fillRect(x + 1 + edge, y + 1 + edge, size - 2 - 2 * edge, size - 2 - 2 * edge);
    g.fillStyle(0xffffff, 0.28).fillRect(x + 1 + edge, y + 1 + edge, (size - 2 - 2 * edge) * 0.45, (size - 2 - 2 * edge) * 0.3);
  }

  shade(color) {
    if (!this.shades.has(color)) {
      this.shades.set(color, {
        light: Color.IntegerToColor(color).lighten(22).color,
        dark: Color.IntegerToColor(color).darken(28).color,
      });
    }
    return this.shades.get(color);
  }

  // Page-wide gradient behind the transparent canvas; its hue moves on with every level.
  drawBackground(level) {
    this.bgLevel = level;
    const hue = ((level - 1) * 0.13 + 0.68) % 1;
    const css = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
    const top = Color.HSVToRGB(hue, 0.65, 0.42);
    const bottom = Color.HSVToRGB((hue + 0.18) % 1, 0.75, 0.16);
    document.body.style.background = `linear-gradient(180deg, ${css(top)}, ${css(bottom)}) fixed`;
  }

  // Colourful burst along each cleared row, plus the points scored floating up.
  celebrate(rows, points) {
    for (const row of rows) {
      const y = BOARD_Y + row * CELL + CELL / 2;
      const flash = this.add.rectangle(360, y, COLS * CELL, CELL, 0xffffff, 0.85);
      this.tweens.add({ targets: flash, alpha: 0, scaleY: 0.2, duration: 260, onComplete: () => flash.destroy() });

      for (let i = 0; i < 14; i++) {
        const spark = this.add.rectangle(
          BOARD_X + Phaser.Math.Between(0, COLS * CELL),
          y,
          14,
          14,
          Phaser.Utils.Array.GetRandom(PALETTE),
        );
        this.tweens.add({
          targets: spark,
          x: spark.x + Phaser.Math.Between(-90, 90),
          y: y + Phaser.Math.Between(-140, 40),
          angle: Phaser.Math.Between(-180, 180),
          alpha: 0,
          scale: 0.3,
          duration: Phaser.Math.Between(450, 750),
          ease: 'Cubic.easeOut',
          onComplete: () => spark.destroy(),
        });
      }
    }

    const popup = this.add
      .text(360, BOARD_Y + rows[0] * CELL, `+${points}`, {
        fontFamily: 'sans-serif',
        fontSize: rows.length >= 4 ? '72px' : '54px',
        fontStyle: 'bold',
        color: Color.IntegerToColor(Phaser.Utils.Array.GetRandom(PALETTE)).rgba,
        stroke: '#0b0d20',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: popup,
      y: popup.y - 120,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  eachCell(cells, fn) {
    cells.forEach((row, r) => row.forEach((filled, c) => filled && fn(r, c)));
  }
}
