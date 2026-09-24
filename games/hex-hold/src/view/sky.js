// Day and night, drifting clouds and the odd shower. Nights line up with the waves:
// monsters arrive at midnight, and the first nights come with the first wave.
import * as THREE from 'three';
import { FIRST_WAVE, WAVE_EVERY } from '../data.js';
import { model } from './assets.js';

const DAY_SKY = new THREE.Color(0x0b1522);
const NIGHT_SKY = new THREE.Color(0x03060d);

// 1 at noon, 0 at midnight. Before the first wave it's a long day.
export function daylight(time) {
  if (time < FIRST_WAVE - WAVE_EVERY / 2) return 1;
  const phase = (((time - FIRST_WAVE) % WAVE_EVERY) + WAVE_EVERY) % WAVE_EVERY / WAVE_EVERY;
  return Math.min(1, Math.max(0, 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)) * 1.6);
}

export class Sky {
  constructor(scene, { sun, hemi, sea }) {
    this.scene = scene;
    this.sea = sea;
    this.sun = sun;
    this.hemi = hemi;
    this.base = { sun: sun.intensity, hemi: hemi.intensity };
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const cloud = model(i % 2 ? 'cloud_big' : 'cloud_small');
      cloud.position.set((Math.random() - 0.5) * 50, 11 + Math.random() * 3, (Math.random() - 0.5) * 50);
      cloud.scale.setScalar(1 + Math.random() * 0.8);
      cloud.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.castShadow = true;
          o.receiveShadow = false;
        }
      });
      scene.add(cloud);
      this.clouds.push({ cloud, speed: 0.4 + Math.random() * 0.5 });
    }
    // Rain: short falling streaks around the camera's target.
    const count = 500;
    const positions = new Float32Array(count * 6);
    this.drops = Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 30, y: Math.random() * 12, z: (Math.random() - 0.5) * 30, v: 12 + Math.random() * 6 }));
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(this.rainGeometry, new THREE.LineBasicMaterial({ color: 0xaecbe8, transparent: true, opacity: 0.5 }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
    this.wetness = 0;
  }

  // Rain comes and goes on its own slow rhythm (a few showers an hour).
  raining(time) {
    return Math.sin(time / 97) + Math.sin(time / 41) > 1.3;
  }

  update(state, dt, target, camera) {
    const light = daylight(state.time);
    this.wetness += ((this.raining(state.time) ? 1 : 0) - this.wetness) * Math.min(1, dt * 0.5);
    const dim = 1 - this.wetness * 0.3;
    this.sun.intensity = this.base.sun * (0.12 + 0.88 * light) * dim;
    this.hemi.intensity = this.base.hemi * (0.35 + 0.65 * light) * dim;
    this.sun.color.setHSL(0.1, 0.5 * light, 0.75 + 0.2 * light);
    this.hemi.color.setHSL(0.6, 0.5, 0.55 + 0.3 * light);
    const sky = NIGHT_SKY.clone().lerp(DAY_SKY, light);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.night = 1 - light;
    // The sea catches a little light, shimmering slowly.
    if (this.sea) this.sea.material.color.copy(sky).lerp(new THREE.Color(0x1d5a80), (0.35 + Math.sin(state.time * 0.8) * 0.04) * (0.4 + 0.6 * light));

    for (const c of this.clouds) {
      c.cloud.position.x += c.speed * dt;
      if (c.cloud.position.x > 30) c.cloud.position.x = -30;
      // Clouds near the camera fade away so they never block the view.
      const near = camera ? camera.position.distanceTo(c.cloud.position) : 99;
      const opacity = Math.max(0, Math.min(0.9, (near - 6) / 8));
      c.cloud.traverse((o) => o.isMesh && (o.material.opacity = opacity));
      c.cloud.visible = opacity > 0.02;
    }

    this.rain.visible = this.wetness > 0.05;
    if (this.rain.visible) {
      this.rain.material.opacity = 0.5 * this.wetness;
      const p = this.rainGeometry.attributes.position.array;
      this.drops.forEach((d, i) => {
        d.y -= d.v * dt;
        if (d.y < 0) {
          d.y = 10 + Math.random() * 2;
          d.x = (Math.random() - 0.5) * 30;
          d.z = (Math.random() - 0.5) * 30;
        }
        const x = target.x + d.x;
        const z = target.z + d.z;
        p.set([x, d.y, z, x + 0.05, d.y + 0.35, z], i * 6);
      });
      this.rainGeometry.attributes.position.needsUpdate = true;
    }
  }
}
