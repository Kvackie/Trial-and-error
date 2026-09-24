// Small signs of life so the island never looks frozen: glints on the water, pollen
// drifting by day, fireflies at night and a few birds circling. All cheap: two point
// clouds and a handful of tiny meshes.
import * as THREE from 'three';
import { fromWorld, key, toWorld } from '../hex.js';
import { tileTop } from '../world.js';

const POINT_VERTEX = `
  attribute float phase;
  uniform float uTime;
  uniform float uSize;
  uniform float uBlink;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // uBlink 0: a steady soft glow; higher: mostly dark with short flashes.
    float s = 0.5 + 0.5 * sin(uTime * (1.3 + fract(phase * 7.3)) + phase * 6.28);
    vAlpha = pow(s, 1.0 + uBlink * 7.0);
    gl_PointSize = uSize * (0.6 + 0.4 * vAlpha) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const POINT_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, (1.0 - d * 2.0) * vAlpha * uOpacity);
  }`;

function points(count, { color, size, blink }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(Float32Array.from({ length: count }, () => Math.random()), 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uBlink: { value: blink }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
    vertexShader: POINT_VERTEX,
    fragmentShader: POINT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cloud = new THREE.Points(geometry, material);
  cloud.frustumCulled = false;
  return cloud;
}

const WING = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.08, 0, 0, 0.08, 0.32, 0, 0]), 3));
const BIRD = new THREE.MeshBasicMaterial({ color: 0x2a3440, side: THREE.DoubleSide, transparent: true });

function bird() {
  const group = new THREE.Group();
  const left = new THREE.Mesh(WING, BIRD);
  const right = new THREE.Mesh(WING, BIRD);
  right.scale.x = -1;
  group.add(left, right);
  return { group, left, right };
}

const MOTES = 36;

export class Ambience {
  constructor(scene) {
    this.scene = scene;
    this.glints = points(1, { color: 0xffffff, size: 0.34, blink: 1 });
    this.glints.material.uniforms.uOpacity.value = 0.9;
    scene.add(this.glints);
    this.motes = points(MOTES, { color: 0xfff2b0, size: 0.09, blink: 0 });
    scene.add(this.motes);
    this.drift = Array.from({ length: MOTES }, () => ({ x: (Math.random() - 0.5) * 16, y: 0.3 + Math.random() * 1.6, z: (Math.random() - 0.5) * 16, a: Math.random() * 6.28 }));
    this.birds = Array.from({ length: 3 }, (_, i) => ({ ...bird(), angle: i * 2.1, radius: 6 + i * 2.5, height: 5.5 + i * 0.8, speed: 0.18 + i * 0.05, flap: i }));
    for (const b of this.birds) scene.add(b.group);
    this.waterKey = '';
  }

  // Glints go on the revealed sea and rivers; rebuilt only when the map opens up.
  placeGlints(state) {
    const spots = [];
    for (const tile of state.tiles.values()) {
      if ((tile.terrain !== 'water' && tile.terrain !== 'river') || !state.revealed.has(key(tile.q, tile.r))) continue;
      const { x, z } = toWorld(tile.q, tile.r);
      const y = tile.terrain === 'water' ? 0.03 : tileTop(tile) + 0.04;
      for (let i = 0; i < (tile.terrain === 'water' ? 2 : 1); i++) spots.push(x + (Math.random() - 0.5) * 1.4, y, z + (Math.random() - 0.5) * 1.4);
    }
    const count = spots.length / 3;
    this.glints.geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(spots), 3));
    this.glints.geometry.setAttribute('phase', new THREE.BufferAttribute(Float32Array.from({ length: count }, () => Math.random()), 1));
  }

  update(state, dt, now, target, night) {
    if (this.waterKey !== String(state.revealed.size)) {
      this.waterKey = String(state.revealed.size);
      this.placeGlints(state);
    }
    const day = 1 - night;
    this.glints.material.uniforms.uTime.value = now;
    this.glints.material.uniforms.uOpacity.value = 0.25 + 0.65 * day;

    // Pollen by day, fireflies by night, drifting around wherever the player looks.
    const m = this.motes.material.uniforms;
    m.uTime.value = now;
    m.uColor.value.setRGB(1, 0.95 - night * 0.05, 0.7 - night * 0.45);
    m.uBlink.value = night;
    m.uSize.value = 0.1 + night * 0.16;
    m.uOpacity.value = 0.45 + night * 0.55;
    const p = this.motes.geometry.attributes.position.array;
    this.drift.forEach((d, i) => {
      d.a += dt * 0.4;
      d.x += Math.cos(d.a) * dt * 0.25 + dt * 0.12;
      d.z += Math.sin(d.a * 0.7) * dt * 0.25;
      d.y += Math.sin(d.a * 1.3) * dt * 0.08;
      if (d.x > 8) d.x = -8;
      if (Math.abs(d.z) > 8) d.z = -Math.sign(d.z) * 7.9;
      const x = target.x + d.x;
      const z = target.z + d.z;
      p[i * 3] = x;
      p[i * 3 + 1] = Math.max(0, tileTop(state.tiles.get(key(...fromWorld(x, z))))) + d.y;
      p[i * 3 + 2] = z;
    });
    this.motes.geometry.attributes.position.needsUpdate = true;

    // Birds circle high above by day and roost at night.
    BIRD.opacity = Math.max(0, 1 - night * 1.6);
    for (const b of this.birds) {
      b.group.visible = BIRD.opacity > 0.02;
      if (!b.group.visible) continue;
      b.angle += dt * b.speed;
      b.group.position.set(target.x + Math.cos(b.angle) * b.radius, b.height + Math.sin(now * 0.7 + b.flap) * 0.3, target.z + Math.sin(b.angle) * b.radius);
      b.group.rotation.y = -b.angle;
      const flap = Math.sin(now * 9 + b.flap * 2) * 0.5;
      b.left.rotation.z = flap;
      b.right.rotation.z = -flap;
    }
  }
}
