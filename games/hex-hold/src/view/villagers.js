// Villagers walking goods from workplaces to the castle: wood, stone or sacks of
// food and gold. Purely for looks; the economy doesn't wait for them.
import * as THREE from 'three';
import { BUILDINGS } from '../data.js';
import { findPath, fromWorld, key, toWorld } from '../hex.js';
import { isPassable, tileTop } from '../world.js';
import { model } from './assets.js';

const CARGO = { wood: 'resource_lumber', stone: 'resource_stone', food: 'sack', gold: 'sack' };
const TUNICS = [0x6f8fbf, 0xb5654a, 0x7da35a, 0xc9a04a, 0x8a6fb0];
const skin = new THREE.MeshStandardMaterial({ color: 0xf0c9a0, flatShading: true });
const body = new THREE.CylinderGeometry(0.07, 0.1, 0.26, 8).translate(0, 0.13, 0);
const head = new THREE.SphereGeometry(0.075, 10, 8).translate(0, 0.33, 0);

function villager(i) {
  const g = new THREE.Group();
  const tunic = new THREE.MeshStandardMaterial({ color: TUNICS[i % TUNICS.length], flatShading: true });
  g.add(new THREE.Mesh(body, tunic), new THREE.Mesh(head, skin));
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

export class Villagers {
  constructor(scene) {
    this.scene = scene;
    this.walkers = [];
  }

  update(state, dt, night) {
    const castle = state.buildings.find((b) => b.type === 'castle');
    const workplaces = state.buildings.filter((b) => b.state === 'ready' && BUILDINGS[b.type].produce && b.type !== 'home');
    // About one villager per workplace, fewer at night.
    const wanted = Math.round(Math.min(12, workplaces.length) * (night > 0.6 ? 0.3 : 1));
    // (A workplace with no way to the castle gets no villager.)
    for (let tries = 0; this.walkers.length < wanted && tries < workplaces.length * 2; tries++) {
      this.add(state, workplaces[(this.walkers.length + tries) % workplaces.length], castle);
    }
    while (this.walkers.length > wanted) this.scene.remove(this.walkers.pop().group);

    for (const w of this.walkers) {
      if (!state.buildings.includes(w.home) || w.home.state !== 'ready') {
        w.done = true;
        continue;
      }
      const goal = w.points[w.step];
      if (!goal) {
        // Arrived: turn round, drop or pick up the load.
        w.points.reverse();
        w.step = 0;
        w.loaded = !w.loaded;
        w.cargo.visible = w.loaded;
        continue;
      }
      const pos = w.group.position;
      const dx = goal.x - pos.x;
      const dz = goal.z - pos.z;
      const len = Math.hypot(dx, dz);
      const step = 1.1 * dt;
      if (len <= step) w.step++;
      else {
        pos.x += (dx / len) * step;
        pos.z += (dz / len) * step;
        w.group.rotation.y = Math.atan2(dx, dz);
      }
      // Stand on the hex underneath (stepping quickly up or down a terrace).
      const ground = Math.max(0, tileTop(state.tiles.get(key(...fromWorld(pos.x, pos.z)))));
      pos.y += (ground - pos.y) * Math.min(1, dt * 14);
      w.bob += dt * 12;
      w.group.children[0].position.y = Math.abs(Math.sin(w.bob)) * 0.03;
    }
    const done = this.walkers.filter((w) => w.done);
    for (const w of done) this.scene.remove(w.group);
    this.walkers = this.walkers.filter((w) => !w.done);
  }

  add(state, home, castle) {
    const cost = (q, r) => (isPassable(state.tiles.get(key(q, r))) ? 1 : Infinity);
    const path = findPath([home.q, home.r], [castle.q, castle.r], cost, 600);
    if (!path?.length) return;
    // Walk between hex middles, but stop just outside the workplace and the castle
    // (not inside a wheat field or a mine).
    const hexes = [[home.q, home.r], ...path];
    const points = hexes.slice(1, -1).map(([q, r]) => toWorld(q, r));
    const outside = ([q, r], [nq, nr]) => {
      const a = toWorld(q, r);
      const b = toWorld(nq, nr);
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      return { x: a.x + ((b.x - a.x) / d) * 1.1, z: a.z + ((b.z - a.z) / d) * 1.1 };
    };
    points.unshift(outside(hexes[0], hexes[1]));
    points.push(outside(hexes.at(-1), hexes.at(-2)));
    const group = villager(this.walkers.length);
    group.position.set(points[0].x, Math.max(0, tileTop(state.tiles.get(key(...fromWorld(points[0].x, points[0].z))))), points[0].z);
    const produce = Object.keys(BUILDINGS[home.type].produce)[0];
    const cargo = model(CARGO[produce]);
    cargo.scale.setScalar(produce === 'food' || produce === 'gold' ? 3 : 0.5);
    cargo.position.set(0, 0.42, 0);
    group.add(cargo);
    this.scene.add(group);
    this.walkers.push({ group, cargo, home, points, step: 1, loaded: true, bob: Math.random() * 6 });
  }
}
