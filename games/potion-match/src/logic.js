// Board rules for Potion Match, kept free of Phaser so they can be tested on their own.
//
// The board changes immediately; resolveSwap() returns a list of steps describing
// what happened so the scene can animate them in order.

export const ROWS = 8;
export const COLS = 8;
export const COLORS = 6;
export const MOVES = 30;

// Specials are colourless: they never match, and go off when swapped or caught in a blast.
//   match 4 in a line  -> bomb    (clears the 3x3 around it)
//   L or T shape       -> cross   (clears its whole row and column)
//   match 5 in a line  -> rainbow (swap with a potion to clear every potion of that colour)
export const SPECIALS = ['bomb', 'cross', 'rainbow'];

const POINTS_PER_POTION = 10;
const POINTS_PER_SPECIAL = 50;

const key = (r, c) => r * COLS + c;
const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

export class Board {
  constructor(random = Math.random) {
    this.random = random;
    this.nextId = 1;
    this.fill();
  }

  newPiece(color, special = null) {
    return { id: this.nextId++, color, special };
  }

  randomColor() {
    return Math.floor(this.random() * COLORS);
  }

  at(r, c) {
    return inBounds(r, c) ? this.cells[r][c] : null;
  }

  // Fill with no ready-made matches and at least one possible move.
  fill() {
    do {
      this.cells = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let color;
          do {
            color = this.randomColor();
          } while (
            (c >= 2 && this.cells[r][c - 1].color === color && this.cells[r][c - 2].color === color) ||
            (r >= 2 && this.cells[r - 1][c].color === color && this.cells[r - 2][c].color === color)
          );
          this.cells[r][c] = this.newPiece(color);
        }
      }
    } while (!this.findMove());
  }

  // --- Matching --------------------------------------------------------------

  // Runs of 3+ same-coloured potions, merged into groups where runs share a cell.
  findMatches() {
    const runs = [];
    const scan = (horizontal) => {
      const outer = horizontal ? ROWS : COLS;
      const inner = horizontal ? COLS : ROWS;
      for (let o = 0; o < outer; o++) {
        let start = 0;
        for (let i = 1; i <= inner; i++) {
          const cellAt = (n) => (horizontal ? this.cells[o][n] : this.cells[n][o]);
          const color = cellAt(start)?.color;
          if (i < inner && color != null && cellAt(i)?.color === color) continue;
          if (color != null && i - start >= 3) {
            const cells = [];
            for (let n = start; n < i; n++) cells.push(horizontal ? [o, n] : [n, o]);
            runs.push({ horizontal, color, cells });
          }
          start = i;
        }
      }
    };
    scan(true);
    scan(false);

    // Union runs that share a cell (L and T shapes).
    const parent = runs.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map();
    runs.forEach((run, i) => {
      for (const [r, c] of run.cells) {
        const k = key(r, c);
        if (owner.has(k)) parent[find(i)] = find(owner.get(k));
        else owner.set(k, i);
      }
    });

    const groups = new Map();
    runs.forEach((run, i) => {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, { color: run.color, runs: [], cells: new Map() });
      const group = groups.get(root);
      group.runs.push(run);
      for (const [r, c] of run.cells) group.cells.set(key(r, c), [r, c]);
    });
    return [...groups.values()].map((group) => ({ ...group, cells: [...group.cells.values()] }));
  }

  specialFor(group) {
    const longest = Math.max(...group.runs.map((run) => run.cells.length));
    if (longest >= 5) return 'rainbow';
    const hasH = group.runs.some((run) => run.horizontal);
    const hasV = group.runs.some((run) => !run.horizontal);
    if (hasH && hasV) return 'cross';
    if (longest === 4) return 'bomb';
    return null;
  }

  // Where a new special appears: on the potion the player moved if it's in the
  // group, else where an L/T's runs cross, else the middle of the longest run.
  specialPosition(group, preferred) {
    const inGroup = new Set(group.cells.map(([r, c]) => key(r, c)));
    for (const [r, c] of preferred) if (inGroup.has(key(r, c))) return [r, c];
    const counts = new Map();
    for (const run of group.runs) for (const [r, c] of run.cells) counts.set(key(r, c), (counts.get(key(r, c)) ?? 0) + 1);
    for (const [r, c] of group.cells) if (counts.get(key(r, c)) > 1) return [r, c];
    const longest = group.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
    return longest.cells[Math.floor(longest.cells.length / 2)];
  }

  // --- Moves -----------------------------------------------------------------

  static adjacent([r1, c1], [r2, c2]) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  swapCells([r1, c1], [r2, c2]) {
    [this.cells[r1][c1], this.cells[r2][c2]] = [this.cells[r2][c2], this.cells[r1][c1]];
  }

  // A swap that would do something, or null. Any swap involving a special counts.
  findMove() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const a = [r, c];
          const b = [r + dr, c + dc];
          if (!inBounds(...b)) continue;
          if (this.at(...a).special || this.at(...b).special) return [a, b];
          this.swapCells(a, b);
          const works = this.findMatches().length > 0;
          this.swapCells(a, b);
          if (works) return [a, b];
        }
      }
    }
    return null;
  }

  // --- Resolving -------------------------------------------------------------

  // Cells a special clears when it goes off at (r, c).
  blast(special, r, c, color) {
    const cells = [];
    if (special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (inBounds(r + dr, c + dc)) cells.push([r + dr, c + dc]);
    } else if (special === 'cross') {
      for (let i = 0; i < COLS; i++) cells.push([r, i]);
      for (let i = 0; i < ROWS; i++) if (i !== r) cells.push([i, c]);
    } else if (special === 'rainbow') {
      cells.push([r, c]);
      for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) if (this.cells[rr][cc]?.color === color) cells.push([rr, cc]);
    }
    return cells;
  }

  // Clear `start` cells, setting off any specials caught in them (which may set off more).
  // `sources` are specials going off directly: [{ r, c, special, color }].
  expandClear(start, sources) {
    const clear = new Map();
    const triggered = [];
    const queue = [...sources];
    const seenSpecials = new Set();
    const add = ([r, c]) => {
      const piece = this.cells[r][c];
      if (!piece || clear.has(key(r, c))) return;
      clear.set(key(r, c), [r, c]);
      if (piece.special && !seenSpecials.has(piece.id)) {
        seenSpecials.add(piece.id);
        const color = piece.special === 'rainbow' ? this.mostCommonColor() : null;
        queue.push({ r, c, special: piece.special, color });
      }
    };
    for (const source of sources) {
      seenSpecials.add(this.cells[source.r][source.c]?.id);
      clear.set(key(source.r, source.c), [source.r, source.c]);
    }
    start.forEach(add);
    while (queue.length) {
      const source = queue.shift();
      triggered.push(source);
      this.blast(source.special, source.r, source.c, source.color).forEach(add);
    }
    return { cells: [...clear.values()], triggered };
  }

  mostCommonColor() {
    const counts = Array(COLORS).fill(0);
    for (const row of this.cells) for (const piece of row) if (piece?.color != null) counts[piece.color]++;
    return counts.indexOf(Math.max(...counts));
  }

  // Swap two neighbours and resolve everything that follows.
  // Returns { valid: false } if nothing would happen, else { valid: true, steps, points }.
  resolveSwap(a, b) {
    if (!Board.adjacent(a, b)) return { valid: false };
    const pa = this.at(...a);
    const pb = this.at(...b);
    this.swapCells(a, b);

    const steps = [{ type: 'swap', a, b }];
    let points = 0;
    let sources = [];
    let groups = [];

    if (pa.special || pb.special) {
      // pa now sits at b, pb at a.
      const placed = [
        { piece: pa, at: b, other: pb },
        { piece: pb, at: a, other: pa },
      ];
      if (pa.special === 'rainbow' && pb.special === 'rainbow') {
        const all = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) all.push([r, c]);
        sources = [{ r: b[0], c: b[1], special: 'rainbow', color: null }];
        const result = this.expandClear(all, sources);
        points += this.applyClear(result, [], 1, steps);
      } else {
        for (const { piece, at, other } of placed) {
          if (!piece.special) continue;
          const color = piece.special === 'rainbow' ? (other.color ?? this.mostCommonColor()) : null;
          sources.push({ r: at[0], c: at[1], special: piece.special, color });
        }
        const result = this.expandClear([], sources);
        points += this.applyClear(result, [], 1, steps);
      }
    } else {
      groups = this.findMatches();
      if (groups.length === 0) {
        this.swapCells(a, b);
        return { valid: false };
      }
    }

    // Cascades: clear matches, drop, refill, repeat.
    let cascade = sources.length ? 2 : 1;
    if (sources.length) {
      this.applyGravity(steps);
      groups = this.findMatches();
    }
    while (groups.length) {
      const created = [];
      const start = [];
      for (const group of groups) {
        start.push(...group.cells);
        const special = this.specialFor(group);
        if (special) created.push({ special, at: this.specialPosition(group, cascade === 1 ? [b, a] : []) });
      }
      const result = this.expandClear(start, []);
      points += this.applyClear(result, created, cascade, steps);
      this.applyGravity(steps);
      groups = this.findMatches();
      cascade++;
    }

    if (!this.findMove()) this.shuffle(steps);
    return { valid: true, steps, points };
  }

  // Remove cleared pieces, drop in new specials, and record a 'clear' step.
  applyClear({ cells, triggered }, created, cascade, steps) {
    const removed = [];
    for (const [r, c] of cells) {
      removed.push({ r, c, piece: this.cells[r][c] });
      this.cells[r][c] = null;
    }
    const placed = [];
    for (const { special, at } of created) {
      const [r, c] = at;
      if (this.cells[r][c]) continue; // two groups wanted the same cell
      const piece = this.newPiece(null, special);
      this.cells[r][c] = piece;
      placed.push({ r, c, piece });
    }
    const points = (removed.length * POINTS_PER_POTION + placed.length * POINTS_PER_SPECIAL) * cascade;
    steps.push({ type: 'clear', removed, created: placed, triggered, cascade, points });
    return points;
  }

  // Let potions fall into gaps and fill the top with new ones.
  applyGravity(steps) {
    const moves = [];
    const spawns = [];
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const piece = this.cells[r][c];
        if (!piece) continue;
        if (r !== write) {
          this.cells[write][c] = piece;
          this.cells[r][c] = null;
          moves.push({ piece, from: [r, c], to: [write, c] });
        }
        write--;
      }
      for (let r = write, n = 1; r >= 0; r--, n++) {
        const piece = this.newPiece(this.randomColor());
        this.cells[r][c] = piece;
        spawns.push({ piece, to: [r, c], fromRow: -n });
      }
    }
    steps.push({ type: 'fall', moves, spawns });
  }

  // No moves left: rearrange the same potions until there are no matches and a move exists.
  shuffle(steps) {
    const pieces = this.cells.flat();
    for (let attempt = 0; attempt < 200; attempt++) {
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      this.cells = Array.from({ length: ROWS }, (_, r) => pieces.slice(r * COLS, (r + 1) * COLS));
      if (this.findMatches().length === 0 && this.findMove()) break;
    }
    if (this.findMatches().length || !this.findMove()) this.fill(); // practically never
    const positions = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) positions.push({ piece: this.cells[r][c], to: [r, c] });
    steps.push({ type: 'shuffle', positions });
  }
}
