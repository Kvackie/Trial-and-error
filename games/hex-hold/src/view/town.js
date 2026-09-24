// Buildings on the map: the right model for each building's type, level and state.
import * as THREE from 'three';
import { BUILDINGS } from '../data.js';
import { key, toWorld } from '../hex.js';
import { tileTop } from '../world.js';
import { model } from './assets.js';
import { HealthBar } from './bars.js';

function modelName(b) {
  if (b.state === 'destroyed') return 'building_destroyed';
  if (b.state === 'building') return 'building_scaffolding';
  const def = BUILDINGS[b.type];
  return b.level >= 2 && def.model2 ? def.model2 : def.model;
}

export class Town {
  constructor(scene) {
    this.scene = scene;
    this.views = new Map(); // building id -> { group, name, bar }
  }

  update(state, camera) {
    const alive = new Set();
    for (const b of state.buildings) {
      alive.add(b.id);
      let view = this.views.get(b.id);
      const name = modelName(b);
      if (!view || view.name !== name || view.level !== b.level) {
        if (view) this.scene.remove(view.group);
        const group = new THREE.Group();
        const { x, z } = toWorld(b.q, b.r);
        group.position.set(x, tileTop(state.tiles.get(key(b.q, b.r))), z);
        const body = model(name);
        body.rotation.y = ((b.id * 7) % 6) * (Math.PI / 3);
        group.add(body);
        // A flag per level above the first.
        for (let i = 1; i < b.level; i++) {
          const flag = model('flag_blue');
          flag.position.set(0.55 - i * 0.2, 0, 0.62);
          group.add(flag);
        }
        const bar = view?.bar ?? new HealthBar(0.9);
        bar.group.position.y = b.type === 'castle' ? 4.3 : 2;
        group.add(bar.group);
        this.scene.add(group);
        view = { group, name, level: b.level, bar, bounce: view ? 0.35 : 0 };
        this.views.set(b.id, view);
      }
      const max = BUILDINGS[b.type].hp * b.level;
      view.bar.set(b.state === 'destroyed' || b.state === 'building' ? 1 : b.hp / max, camera);
      // A little bounce when a building changes.
      if (view.bounce > 0) {
        view.bounce = Math.max(0, view.bounce - 0.016);
        view.group.scale.setScalar(1 + Math.sin(view.bounce * 18) * view.bounce * 0.3);
      }
    }
    for (const [id, view] of this.views) {
      if (!alive.has(id)) {
        this.scene.remove(view.group);
        this.views.delete(id);
      }
    }
  }
}
