import Phaser from 'phaser';
import { BlockDropGame, COLS, ROWS } from '../logic.js';

const CELL = 46;
const BOARD_X = (720 - COLS * CELL) / 2;
const BOARD_Y = 180;
const BOARD_BOTTOM = BOARD_Y + ROWS * CELL;
const BUTTON_Y = 1190;
const BUTTON_H = 120;

// Touch gestures: drag distance per column/row, and what counts as a tap or a flick.
const DRAG_STEP = CELL * 0.8;
const TAP_MAX_MS = 250;
const TAP_MAX_DIST = 16;
const FLICK_MIN_SPEED = 1.2; // px per ms, downward
const FLICK_MIN_DIST = 80;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.logic = new BlockDropGame();
    this.elapsed = 0;
    this.drag = null;

    this.gfx = this.add.graphics();

    const label = { fontFamily: 'sans-serif', color: '#ffffff' };
    this.scoreText = this.add.text(24, 28, '', { ...label, fontSize: '52px' });
    this.statsText = this.add.text(24, 98, '', { ...label, fontSize: '30px', color: '#a3a6c8' });
    this.add.text(606, 22, 'NEXT', { ...label, fontSize: '24px', color: '#a3a6c8' }).setOrigin(0.5, 0);

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
        lastY: pointer.y,
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
      while (pointer.y - drag.lastY >= DRAG_STEP) {
        drag.lastY += DRAG_STEP;
        drag.moved = true;
        this.act(() => this.logic.softDrop());
      }
    });

    this.input.on('pointerup', (pointer) => {
      const drag = this.drag;
      if (!drag || drag.id !== pointer.id) return;
      this.drag = null;

      const duration = Math.max(1, pointer.upTime - drag.startTime);
      const dy = pointer.y - drag.startY;
      const distance = Phaser.Math.Distance.Between(drag.startX, drag.startY, pointer.x, pointer.y);

      if (dy > FLICK_MIN_DIST && dy / duration > FLICK_MIN_SPEED) {
        this.act(() => this.logic.hardDrop());
      } else if (!drag.moved && duration < TAP_MAX_MS && distance < TAP_MAX_DIST) {
        this.act(() => this.logic.rotate());
      }
    });
  }

  setUpButtons() {
    const buttons = [
      { label: '◀', action: () => this.logic.moveLeft(), repeat: true },
      { label: '▶', action: () => this.logic.moveRight(), repeat: true },
      { label: '▼', action: () => this.logic.softDrop(), repeat: true },
      { label: 'DROP', action: () => this.logic.hardDrop(), repeat: false },
      { label: '↻', action: () => this.logic.rotate(), repeat: false },
    ];

    const gap = 12;
    const width = (720 - 2 * 20 - gap * (buttons.length - 1)) / buttons.length;

    buttons.forEach((spec, index) => {
      const x = 20 + width / 2 + index * (width + gap);
      const bg = this.add
        .rectangle(x, BUTTON_Y, width, BUTTON_H, 0x2b2d5c)
        .setStrokeStyle(2, 0x5a5e8f)
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
        bg.setFillStyle(0x2b2d5c);
        timer?.remove();
        timer = null;
      };

      bg.on('pointerdown', () => {
        bg.setFillStyle(0x444889);
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
    action();
    if (this.logic.lines - linesBefore >= 4) this.cameras.main.shake(150, 0.008);
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

    // Board background and faint grid.
    g.fillStyle(0x181b3a).fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    g.lineStyle(1, 0x24284f);
    for (let c = 1; c < COLS; c++) g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_BOTTOM);
    for (let r = 1; r < ROWS; r++) g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
    g.lineStyle(2, 0x5a5e8f).strokeRect(BOARD_X - 1, BOARD_Y - 1, COLS * CELL + 2, ROWS * CELL + 2);

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
    g.lineStyle(1, 0x5a5e8f).strokeRoundedRect(box.x, box.y, box.w, box.h, 10);
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

  drawCell(x, y, size, color) {
    this.gfx.fillStyle(color).fillRect(x + 1, y + 1, size - 2, size - 2);
    this.gfx.fillStyle(0xffffff, 0.2).fillRect(x + 1, y + 1, size - 2, Math.round(size * 0.15));
  }

  eachCell(cells, fn) {
    cells.forEach((row, r) => row.forEach((filled, c) => filled && fn(r, c)));
  }
}
