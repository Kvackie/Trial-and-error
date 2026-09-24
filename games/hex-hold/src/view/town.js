// Buildings on the map: the right model for each building's type, level and state.
import * as THREE from 'three';
import { BUILDINGS } from '../data.js';
import { DIRS, key, toWorld } from '../hex.js';
import { tileTop } from '../world.js';
import { waitingForBuilder } from '../sim.js';
import { model } from './assets.js';
import { HealthBar } from './bars.js';

// A soft orange glow, drawn once on a canvas and shared by all buildings.
const GLOW = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 190, 110, 0.9)');
  g.addColorStop(0.4, 'rgba(255, 150, 60, 0.35)');
  g.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
})();

// A small floating label (a build timer) drawn on its own canvas.
class Label {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 56;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, depthTest: false, transparent: true }));
    this.sprite.scale.set(0.95, 0.33, 1);
    this.sprite.renderOrder = 12;
    this.text = null;
  }

  set(text) {
    if (text === this.text) return;
    this.text = text;
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, 160, 56);
    ctx.fillStyle = 'rgba(20, 28, 40, 0.85)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 152, 48, 22);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 80, 30);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}

const timeText = (s) => {
  s = Math.max(0, Math.ceil(s));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
};

// The highest point of a model (in its parent's space), for planting a flag on top.
function peak(object) {
  object.updateMatrixWorld(true);
  const top = new THREE.Vector3(0, -Infinity, 0);
  const v = new THREE.Vector3();
  const inverse = new THREE.Matrix4().copy(object.parent?.matrixWorld ?? new THREE.Matrix4()).invert();
  object.traverse((o) => {
    if (!o.isMesh) return;
    const position = o.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);
      if (v.y > top.y) top.copy(v);
    }
  });
  return top;
}

const POST = new THREE.CylinderGeometry(0.2, 0.24, 1.25, 8);
const STONE = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.9, flatShading: true });

// Which neighbours of a wall hex are walls or gates too (bit per direction).
function wallMask(state, b) {
  let mask = 0;
  DIRS.forEach(([dq, dr], i) => {
    const n = state.buildings.find((o) => o.q === b.q + dq && o.r === b.r + dr);
    if (n && BUILDINGS[n.type].wall && n.state !== 'building') mask |= 1 << i;
  });
  return mask;
}

// A wall hex: half-walls reaching out to each wall neighbour, a post in the middle;
// a gate spans the hex along the wall line.
function buildWall(b, mask) {
  const group = new THREE.Group();
  const dirs = DIRS.map(([dq, dr], i) => ({ i, ...toWorld(dq, dr) })).filter((d) => mask & (1 << d.i));
  const angleOf = (d) => Math.atan2(-d.z, d.x);
  const gate = BUILDINGS[b.type].gate;
  let gateAxis = null;
  if (gate) {
    const opposite = dirs.find((d) => mask & (1 << ((d.i + 3) % 6)));
    gateAxis = opposite ?? dirs[0] ?? { x: 1, z: 0 };
    const piece = model('wall_straight_gate');
    piece.rotation.y = angleOf(gateAxis);
    group.add(piece);
  }
  for (const d of dirs) {
    if (gateAxis && (d === gateAxis || (d.x === -gateAxis.x && d.z === -gateAxis.z))) continue;
    const piece = model('wall_straight');
    piece.scale.x = 0.5;
    piece.position.set(d.x / 4, 0, d.z / 4);
    piece.rotation.y = angleOf(d);
    group.add(piece);
  }
  if (!gate && !dirs.length) group.add(model('wall_straight'));
  if (!gate) {
    const post = new THREE.Mesh(POST, STONE);
    post.position.y = 0.62;
    post.castShadow = true;
    group.add(post);
  }
  return group;
}

// A bridge points at the land or bridge it joins.
function bridgeAngle(state, b) {
  const { x, z } = toWorld(b.q, b.r);
  for (const [dq, dr] of DIRS) {
    const tile = state.tiles.get(key(b.q + dq, b.r + dr));
    const other = state.buildings.find((o) => o.q === b.q + dq && o.r === b.r + dr);
    if ((tile && !['water', 'river', 'mountain'].includes(tile.terrain)) || (other && BUILDINGS[other.type].bridge)) {
      const to = toWorld(b.q + dq, b.r + dr);
      return Math.atan2(to.x - x, to.z - z);
    }
  }
  return 0;
}

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

  update(state, camera, night = 0, now = 0) {
    const alive = new Set();
    for (const b of state.buildings) {
      alive.add(b.id);
      let view = this.views.get(b.id);
      const isWall = BUILDINGS[b.type].wall && b.state !== 'destroyed' && b.state !== 'building';
      const name = isWall ? `wall:${b.type}:${wallMask(state, b)}` : modelName(b);
      if (!view || view.name !== name || view.level !== b.level || view.rot !== b.rot) {
        if (view) {
          this.scene.remove(view.group);
          view.label?.dispose();
        }
        const group = new THREE.Group();
        const { x, z } = toWorld(b.q, b.r);
        group.position.set(x, tileTop(state.tiles.get(key(b.q, b.r))), z);
        const body = isWall ? buildWall(b, wallMask(state, b)) : model(name);
        if (BUILDINGS[b.type].bridge && b.state !== 'destroyed') body.rotation.y = bridgeAngle(state, b);
        else if (!isWall) body.rotation.y = (b.rot ?? (b.id * 7) % 6) * (Math.PI / 3);
        group.add(body);
        // Mines look much like the hills they stand on: a flag on top shows they're built.
        if (b.type === 'mine' && b.state !== 'destroyed' && b.state !== 'building') {
          const flag = model('flag_blue');
          flag.position.copy(peak(body)).y -= 0.08;
          flag.scale.setScalar(2.4);
          group.add(flag);
        }
        // A flag per level above the first.
        for (let i = 1; i < b.level; i++) {
          const flag = model('flag_blue');
          flag.position.set(0.55 - i * 0.2, 0, 0.62);
          group.add(flag);
        }
        const bar = view?.bar ?? new HealthBar(0.9);
        bar.group.position.y = b.type === 'castle' ? 4.3 : BUILDINGS[b.type].wonder ? 3.2 : 2;
        group.add(bar.group);
        this.scene.add(group);
        view = { group, name, level: b.level, rot: b.rot, bar, bounce: view && view.rot === b.rot ? 0.35 : 0 };
        this.views.set(b.id, view);
      }
      // Warm light from windows and torches after dark.
      if (!view.glow && !BUILDINGS[b.type].wall && !BUILDINGS[b.type].bridge) {
        view.glow = new THREE.Sprite(GLOW);
        view.glow.scale.setScalar(b.type === 'castle' ? 3.2 : 1.8);
        view.glow.position.y = b.type === 'castle' ? 1.6 : 0.7;
        view.group.add(view.glow);
      }
      if (view.glow) {
        view.glow.visible = night > 0.2 && b.state === 'ready';
        view.glow.material.opacity = Math.min(0.9, night) * (0.85 + Math.sin(now * 3 + b.id) * 0.08);
      }
      // Time left while building or upgrading (or a wait for a builder).
      const busy = b.state === 'building' || b.state === 'upgrading';
      if (busy && !view.label) {
        view.label = new Label();
        view.group.add(view.label.sprite);
      }
      if (view.label) {
        view.label.sprite.visible = busy;
        if (busy) {
          view.label.sprite.position.y = b.state === 'building' ? 1.45 : b.type === 'castle' ? 4.7 : BUILDINGS[b.type].wonder ? 3.6 : 2.3;
          view.label.set(waitingForBuilder(state, b) ? '⏳' : timeText(b.left));
        }
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
        view.label?.dispose();
        this.views.delete(id);
      }
    }
  }
}
