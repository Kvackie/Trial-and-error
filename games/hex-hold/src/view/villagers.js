// Villagers walking goods from workplaces to the castle: wood, stone or sacks of
// food and gold. Purely for looks; the economy doesn't wait for them.
import * as THREE from 'three';
import { BUILDINGS } from '../data.js';
import { findPath, key, toWorld } from '../hex.js';
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
    while (this.walkers.length < wanted && workplaces.length) this.add(state, workplaces[this.walkers.length % workplaces.length], castle);
    while (this.walkers.length > wanted) this.scene.remove(this.walkers.pop().group);

    for (const w of this.walkers) {
      if (!state.buildings.includes(w.home) || w.home.state !== 'ready') {
        w.done = true;
        continue;
      }
      const [q, r] = w.path[w.step] ?? [];
      if (q === undefined) {
        // Arrived: turn round, drop or pick up the load.
        w.path.reverse();
        w.step = 0;
        w.loaded = !w.loaded;
        w.cargo.visible = w.loaded;
        continue;
      }
      const goal = toWorld(q, r);
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
      const ground = Math.max(0, tileTop(state.tiles.get(key(q, r))));
      pos.y += (ground - pos.y) * Math.min(1, dt * 8);
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
    const group = villager(this.walkers.length);
    const start = toWorld(home.q, home.r);
    group.position.set(start.x + 0.4, 0, start.z);
    const produce = Object.keys(BUILDINGS[home.type].produce)[0];
    const cargo = model(CARGO[produce]);
    cargo.scale.setScalar(produce === 'food' || produce === 'gold' ? 3 : 0.5);
    cargo.position.set(0, 0.42, 0);
    group.add(cargo);
    this.scene.add(group);
    this.walkers.push({ group, cargo, home, path: path ? [[home.q, home.r], ...path] : [[home.q, home.r]], step: 0, loaded: true, bob: Math.random() * 6 });
  }
}
