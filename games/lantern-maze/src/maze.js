// Maze generation for Lantern Maze, free of Phaser so it can be tested in Node.
//
// A maze is a tree of corridors on a grid. Cells that aren't part of it are solid rock.
// The start and exit are the two ends of the longest route; every other cell with a
// single opening is a dead end holding a puzzle.

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export const DIRS = [
  { bit: N, dx: 0, dy: -1, opposite: S },
  { bit: E, dx: 1, dy: 0, opposite: W },
  { bit: S, dx: 0, dy: 1, opposite: N },
  { bit: W, dx: -1, dy: 0, opposite: E },
];
export const dirByBit = Object.fromEntries(DIRS.map((d) => [d.bit, d]));

// Level 1 is a single corridor, then one more dead end per level up to 5,
// then the count grows by 40% a level, capped so big mazes stay fun.
export function deadEndsFor(level) {
  if (level <= 5) return level - 1;
  return Math.min(40, Math.round(4 * Math.pow(1.4, level - 5)));
}

// Grid size grows a little every level (portrait: taller than wide).
export function sizeFor(level) {
  return {
    width: Math.min(15, 3 + level),
    height: Math.min(23, 4 + Math.round(level * 1.5)),
  };
}

const degree = (mask) => (mask & N ? 1 : 0) + (mask & E ? 1 : 0) + (mask & S ? 1 : 0) + (mask & W ? 1 : 0);

export class Maze {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.open = new Uint8Array(width * height); // bitmask of open sides per cell; 0 = rock
  }

  index(x, y) {
    return y * this.width + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  openAt(x, y) {
    return this.inBounds(x, y) ? this.open[this.index(x, y)] : 0;
  }

  canMove(x, y, bit) {
    return (this.openAt(x, y) & bit) !== 0;
  }

  isDeadEnd(x, y) {
    if ((x === this.start.x && y === this.start.y) || (x === this.exit.x && y === this.exit.y)) return false;
    return degree(this.openAt(x, y)) === 1;
  }

  deadEnds() {
    const list = [];
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) if (this.isDeadEnd(x, y)) list.push({ x, y });
    return list;
  }

  link(x, y, dir) {
    this.open[this.index(x, y)] |= dir.bit;
    this.open[this.index(x + dir.dx, y + dir.dy)] |= dir.opposite;
  }

  unlink(x, y, dir) {
    this.open[this.index(x, y)] &= ~dir.bit;
    this.open[this.index(x + dir.dx, y + dir.dy)] &= ~dir.opposite;
  }

  // Distances from (sx, sy) along open passages, plus the previous cell for each.
  walk(sx, sy) {
    const dist = new Int32Array(this.width * this.height).fill(-1);
    const prev = new Int32Array(this.width * this.height).fill(-1);
    const queue = [[sx, sy]];
    dist[this.index(sx, sy)] = 0;
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const dir of DIRS) {
        if (!this.canMove(x, y, dir.bit)) continue;
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        const ni = this.index(nx, ny);
        if (dist[ni] !== -1) continue;
        dist[ni] = dist[this.index(x, y)] + 1;
        prev[ni] = this.index(x, y);
        queue.push([nx, ny]);
      }
    }
    return { dist, prev };
  }

  farthestFrom(x, y) {
    const { dist } = this.walk(x, y);
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i] > dist[best]) best = i;
    return { x: best % this.width, y: Math.floor(best / this.width) };
  }
}

export function generateMaze(level, random = Math.random) {
  const { width, height } = sizeFor(level);
  const maze = new Maze(width, height);

  // Growing tree picking a random frontier cell: lots of short side passages,
  // which pruning then trims down to the exact number of dead ends wanted.
  const visited = new Uint8Array(width * height);
  const active = [[Math.floor(random() * width), Math.floor(random() * height)]];
  visited[maze.index(...active[0])] = 1;
  while (active.length) {
    const i = Math.floor(random() * active.length);
    const [x, y] = active[i];
    const options = DIRS.filter((d) => maze.inBounds(x + d.dx, y + d.dy) && !visited[maze.index(x + d.dx, y + d.dy)]);
    if (!options.length) {
      active.splice(i, 1);
      continue;
    }
    const dir = options[Math.floor(random() * options.length)];
    maze.link(x, y, dir);
    visited[maze.index(x + dir.dx, y + dir.dy)] = 1;
    active.push([x + dir.dx, y + dir.dy]);
  }

  // Start and exit: the two ends of the longest route.
  maze.start = maze.farthestFrom(0, 0);
  maze.exit = maze.farthestFrom(maze.start.x, maze.start.y);

  // Cut whole side branches back to their junction until the dead-end count is right.
  const target = deadEndsFor(level);
  let ends = maze.deadEnds();
  while (ends.length > target) {
    let { x, y } = ends[Math.floor(random() * ends.length)];
    for (;;) {
      const dir = DIRS.find((d) => maze.canMove(x, y, d.bit));
      maze.unlink(x, y, dir);
      x += dir.dx;
      y += dir.dy;
      // Keep cutting while the branch continues as a plain corridor.
      if (maze.isDeadEnd(x, y)) continue;
      break;
    }
    ends = maze.deadEnds();
  }
  return maze;
}
