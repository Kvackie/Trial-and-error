// Board rules, kept free of Phaser so they are easy to reason about.

export const COLS = 10;
export const ROWS = 20;

export const PIECES = {
  I: { color: 0x3ae0ff, cells: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { color: 0xffd23f, cells: [[1, 1], [1, 1]] },
  T: { color: 0xc77dff, cells: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { color: 0x2ee88a, cells: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { color: 0xff4d6d, cells: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { color: 0x4d7cff, cells: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: 0xff9f1c, cells: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};

// Points for clearing 1-4 rows at once, multiplied by the level.
const LINE_POINTS = [0, 100, 300, 500, 800];

// Offsets tried in order when a rotation is blocked by a wall or other blocks.
const KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

const rotateClockwise = (matrix) => matrix[0].map((_, x) => matrix.map((row) => row[x]).reverse());

export class BlockDropGame {
  constructor(random = Math.random) {
    this.random = random;
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.over = false;
    this.lastCleared = []; // row indices cleared by the most recent lock, for effects
    this.next = this.takeFromBag();
    this.spawn();
  }

  // "7-bag": every piece appears once per seven before any repeats.
  takeFromBag() {
    if (this.bag.length === 0) {
      this.bag = Object.keys(PIECES);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  pieceInfo(type) {
    return PIECES[type];
  }

  spawn() {
    const type = this.next;
    this.next = this.takeFromBag();
    const cells = PIECES[type].cells;
    this.piece = {
      type,
      color: PIECES[type].color,
      cells,
      x: Math.floor((COLS - cells[0].length) / 2),
      y: type === 'I' ? -1 : 0,
    };
    if (this.collides(this.piece)) this.over = true;
  }

  collides({ cells, x, y }) {
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        if (!cells[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    }
    return false;
  }

  tryMove(dx, dy) {
    if (this.over) return false;
    const moved = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
    if (this.collides(moved)) return false;
    this.piece = moved;
    return true;
  }

  moveLeft() {
    return this.tryMove(-1, 0);
  }

  moveRight() {
    return this.tryMove(1, 0);
  }

  rotate() {
    if (this.over || this.piece.type === 'O') return false;
    const cells = rotateClockwise(this.piece.cells);
    for (const [kx, ky] of KICKS) {
      const rotated = { ...this.piece, cells, x: this.piece.x + kx, y: this.piece.y + ky };
      if (!this.collides(rotated)) {
        this.piece = rotated;
        return true;
      }
    }
    return false;
  }

  // One row down by the player. Never locks, so a held drag or button can't
  // accidentally push the next piece down too; gravity does the locking.
  softDrop() {
    if (!this.tryMove(0, 1)) return false;
    this.score += 1;
    return true;
  }

  hardDrop() {
    if (this.over) return 0;
    let rows = 0;
    while (this.tryMove(0, 1)) rows++;
    this.score += rows * 2;
    return this.lock();
  }

  // Gravity step. Returns rows cleared (0 when the piece just fell one row).
  tick() {
    if (this.over || this.tryMove(0, 1)) return 0;
    return this.lock();
  }

  ghostY() {
    let y = this.piece.y;
    while (!this.collides({ ...this.piece, y: y + 1 })) y++;
    return y;
  }

  lock() {
    if (this.over) return 0;
    const { cells, x, y, color } = this.piece;
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        if (!cells[r][c]) continue;
        if (y + r < 0) {
          // Locked partly above the board: the stack has reached the top.
          this.over = true;
          return 0;
        }
        this.board[y + r][x + c] = color;
      }
    }

    const full = [];
    this.lastCleared = full;
    this.board.forEach((row, index) => row.every(Boolean) && full.push(index));
    if (full.length) {
      this.board = this.board.filter((_, index) => !full.includes(index));
      while (this.board.length < ROWS) this.board.unshift(Array(COLS).fill(null));
      this.lines += full.length;
      this.score += LINE_POINTS[full.length] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
    }

    this.spawn();
    return full.length;
  }

  // Milliseconds between gravity steps; speeds up each level.
  get dropInterval() {
    return Math.max(90, 800 * Math.pow(0.85, this.level - 1));
  }
}
