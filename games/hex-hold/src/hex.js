// Pointy-top hex grid in axial coordinates (q, r), matching the KayKit hex tiles:
// 2 units across the flat sides, tile tops at y = 0.
export const SIZE = 2 / Math.sqrt(3); // centre to corner
export const DIRS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export const key = (q, r) => `${q},${r}`;
export const parse = (k) => k.split(',').map(Number);
export const neighbours = (q, r) => DIRS.map(([dq, dr]) => [q + dq, r + dr]);
export const distance = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[0] + a[1] - b[0] - b[1]) + Math.abs(a[1] - b[1])) / 2;

export const toWorld = (q, r) => ({ x: 2 * (q + r / 2), z: 1.5 * SIZE * r });

// World position to the hex it falls in.
export function fromWorld(x, z) {
  const r = z / (1.5 * SIZE);
  const q = x / 2 - r / 2;
  return round(q, r);
}

function round(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq + 0, rr + 0];
}

// Every hex within `radius` of (q, r).
export function spiral(q, r, radius) {
  const out = [];
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) out.push([q + dq, r + dr]);
  }
  return out;
}

// A* over hexes. cost(q, r) returns the cost of entering a hex, or Infinity.
// Returns the path as [q, r] pairs from the hex after `from` up to `to`, or null.
export function findPath(from, to, cost, limit = 4000) {
  const startKey = key(...from);
  const goalKey = key(...to);
  if (startKey === goalKey) return [];
  const open = new Map([[startKey, { at: from, g: 0, f: distance(from, to) }]]);
  const came = new Map();
  const best = new Map([[startKey, 0]]);
  let steps = 0;
  while (open.size && steps++ < limit) {
    let currentKey;
    let current;
    for (const [k, node] of open) if (!current || node.f < current.f) [currentKey, current] = [k, node];
    open.delete(currentKey);
    if (currentKey === goalKey) {
      const path = [];
      for (let k = goalKey; k !== startKey; k = came.get(k)) path.unshift(parse(k));
      return path;
    }
    for (const n of neighbours(...current.at)) {
      const k = key(...n);
      const step = k === goalKey ? Math.min(cost(...n), 1) : cost(...n);
      if (!Number.isFinite(step)) continue;
      const g = current.g + step;
      if (g < (best.get(k) ?? Infinity)) {
        best.set(k, g);
        came.set(k, currentKey);
        open.set(k, { at: n, g, f: g + distance(n, to) });
      }
    }
  }
  return null;
}
