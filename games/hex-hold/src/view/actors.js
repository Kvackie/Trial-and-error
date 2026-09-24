// Units (animated KayKit heroes), monsters (built in code) and what they shoot.
import * as THREE from 'three';
import { UNITS, MONSTERS } from '../data.js';
import { hero, heroClips } from './assets.js';
import { heroLevel, maxHp } from '../sim.js';
import { fromWorld, key } from '../hex.js';
import { tileTop } from '../world.js';
import { HealthBar } from './bars.js';

const HERO_SCALE = 0.5;
const STAR_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.03 : 0.07;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(shape);
})();
const STAR_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true });

// --- Monsters, built from simple shapes ----------------------------------------------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true, ...extra });
const MATERIALS = {
  slime: mat(0x6fdc5a, { transparent: true, opacity: 0.85, roughness: 0.2 }),
  slimeCore: mat(0x2f8f2a),
  eye: new THREE.MeshBasicMaterial({ color: 0x111111 }),
  eyeWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  bone: mat(0xeee6d2),
  glowPurple: new THREE.MeshBasicMaterial({ color: 0xb37bff, transparent: true, opacity: 0.35, depthWrite: false }),
  eyeFire: new THREE.MeshBasicMaterial({ color: 0xff9a2e }),
  eyeRed: new THREE.MeshBasicMaterial({ color: 0xff3b2e }),
  rock: mat(0x8c7f70),
  rockDark: mat(0x6a5f55),
  moss: mat(0x5d8a3a),
};

function buildMonster(type) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  if (type === 'slime') {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), MATERIALS.slime);
    blob.scale.set(1, 0.75, 1);
    blob.position.y = 0.24;
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), MATERIALS.slimeCore);
    core.position.y = 0.2;
    body.add(blob, core);
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), MATERIALS.eyeWhite);
      white.position.set(side * 0.11, 0.33, 0.25);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), MATERIALS.eye);
      pupil.position.set(side * 0.11, 0.33, 0.31);
      body.add(white, pupil);
    }
  } else if (type === 'spirit') {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), MATERIALS.glowPurple);
    glow.position.y = 0.75;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), MATERIALS.bone);
    skull.position.y = 0.8;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.2), MATERIALS.bone);
    jaw.position.set(0, 0.6, 0.06);
    body.add(glow, skull, jaw);
    for (const side of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), MATERIALS.eye);
      socket.position.set(side * 0.09, 0.82, 0.2);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), MATERIALS.eyeFire);
      flame.position.set(side * 0.09, 0.82, 0.25);
      body.add(socket, flame);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), MATERIALS.glowPurple);
    tail.position.y = 0.42;
    tail.rotation.x = Math.PI;
    body.add(tail);
  } else {
    // Golem; the titan boss is a huge dark one with a crown of spikes.
    const titan = type === 'titan';
    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), titan ? MATERIALS.rockDark : MATERIALS.rock);
    torso.position.y = 0.62;
    torso.scale.set(1.1, 1, 0.9);
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17, 0), MATERIALS.rockDark);
    head.position.set(0, 1.02, 0.05);
    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), MATERIALS.moss);
    moss.position.set(0.12, 0.9, -0.1);
    body.add(torso, head, moss);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), MATERIALS.rockDark);
      arm.scale.set(0.9, 1.6, 0.9);
      arm.position.set(side * 0.44, 0.5, 0.05);
      const leg = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), MATERIALS.rock);
      leg.position.set(side * 0.18, 0.18, 0);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), titan ? MATERIALS.eyeRed : MATERIALS.eyeFire);
      eye.position.set(side * 0.06, 1.04, 0.19);
      body.add(arm, leg, eye);
    }
    if (titan) {
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), MATERIALS.eyeRed);
        const a = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.12, 1.2, Math.sin(a) * 0.12);
        body.add(spike);
      }
      g.scale.setScalar(2.2);
    }
  }
  g.traverse((o) => {
    if (o.isMesh && o.material !== MATERIALS.glowPurple) o.castShadow = true;
  });
  return { group: g, body };
}

// --- Units ------------------------------------------------------------------------------

class UnitView {
  constructor(unit) {
    const def = UNITS[unit.type];
    this.group = new THREE.Group();
    this.model = hero(unit.type, def.weapons);
    this.model.scale.setScalar(HERO_SCALE);
    this.group.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    const clips = heroClips();
    const action = (name, once = false) => {
      const clip = clips.find((c) => c.name === name);
      const a = this.mixer.clipAction(clip);
      if (once) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      return a;
    };
    this.actions = {
      idle: action('Idle'),
      walk: action('Walking_A'),
      run: action('Running_A'),
      attack: action(def.attack, true),
      hit: action('Hit_A', true),
      cheer: action('Cheer', true),
      die: action('Death_A', true),
    };
    this.current = null;
    this.play('idle');
    this.bar = new HealthBar(0.55);
    this.bar.group.position.y = 1.4;
    this.group.add(this.bar.group);
    this.busyUntil = 0;
  }

  // Gold stars over the head, one per level above the first.
  setStars(n, camera) {
    if (n !== this.starCount) {
      this.starCount = n;
      this.stars?.removeFromParent();
      this.stars = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const star = new THREE.Mesh(STAR_GEOMETRY, STAR_MATERIAL);
        star.position.x = (i - (n - 1) / 2) * 0.16;
        this.stars.add(star);
      }
      this.stars.position.y = 1.58;
      this.group.add(this.stars);
    }
    if (this.stars) this.stars.quaternion.copy(camera.quaternion);
  }

  play(name, fade = 0.2) {
    const next = this.actions[name];
    if (this.current === next) return;
    next.reset().play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  // One-off animation (attack, hit, cheer), then back to the loop.
  once(name, now) {
    const a = this.actions[name];
    a.reset().play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, 0.1, false);
    this.current = a;
    this.busyUntil = now + a.getClip().duration * 0.9;
  }
}

class MonsterView {
  constructor(monster) {
    const { group, body } = buildMonster(monster.type);
    this.group = group;
    this.body = body;
    const s = 0.9 + Math.min(0.5, (monster.strength - 1) * 0.3);
    this.body.scale.setScalar(s);
    this.bar = new HealthBar(0.5);
    this.bar.group.position.y = monster.type === 'titan' ? 1.4 : monster.type === 'golem' ? 1.35 : monster.type === 'spirit' ? 1.25 : 0.75;
    this.group.add(this.bar.group);
    this.phase = Math.random() * 6;
    this.lunge = 0;
  }
}

// --- All actors --------------------------------------------------------------------------

export class Actors {
  constructor(scene) {
    this.scene = scene;
    this.units = new Map();
    this.monsters = new Map();
    this.shots = new Map();
    this.dying = [];
    this.rings = new THREE.Group();
    scene.add(this.rings);
    this.ringGeometry = new THREE.RingGeometry(0.3, 0.38, 24).rotateX(-Math.PI / 2);
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, depthWrite: false });
    this.shotGeometry = { bolt: new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5).rotateX(Math.PI / 2), arrow: new THREE.CylinderGeometry(0.025, 0.025, 0.45, 5).rotateX(Math.PI / 2), spell: new THREE.SphereGeometry(0.12, 10, 8), boulder: new THREE.DodecahedronGeometry(0.16, 0) };
    this.shotMaterial = { bolt: new THREE.MeshBasicMaterial({ color: 0x5b4027 }), arrow: new THREE.MeshBasicMaterial({ color: 0x5b4027 }), spell: new THREE.MeshBasicMaterial({ color: 0x9fd7ff }), boulder: new THREE.MeshStandardMaterial({ color: 0x8c8377, flatShading: true }) };
  }

  // Screen-space lookup for taps: the unit nearest to a point on screen.
  unitAt(state, camera, x, y, width, height, radius = 36) {
    let best = null;
    let bestD = radius;
    const v = new THREE.Vector3();
    for (const u of state.units) {
      const view = this.units.get(u.id);
      if (!view || !view.group.visible) continue;
      v.set(view.group.position.x, view.group.position.y + 0.45, view.group.position.z).project(camera);
      const d = Math.hypot(((v.x + 1) / 2) * width - x, ((1 - v.y) / 2) * height - y);
      if (d < bestD) [best, bestD] = [u, d];
    }
    return best;
  }

  handle(events, now) {
    for (const e of events) {
      if (e.type === 'attack' && !e.monster) this.units.get(e.actor.id)?.once('attack', now);
      if (e.type === 'attack' && e.monster) {
        const view = this.monsters.get(e.actor.id);
        if (view) view.lunge = 0.3;
      }
      if (e.type === 'hurt') {
        const view = this.units.get(e.unit.id);
        if (view && now > view.busyUntil) view.once('hit', now);
      }
      if (e.type === 'unitDied') {
        const view = this.units.get(e.unit.id);
        if (view) {
          view.once('die', now);
          view.bar.group.visible = false;
          this.units.delete(e.unit.id);
          this.dying.push({ view, until: now + 2.5, mixer: view.mixer });
        }
      }
      if (e.type === 'monsterDied') {
        const view = this.monsters.get(e.monster.id);
        if (view) {
          this.monsters.delete(e.monster.id);
          this.dying.push({ view, until: now + 0.6, shrink: true });
        }
      }
      if (e.type === 'trained') this.pendingCheer = e.unit.id;
    }
  }

  // Positions for actors standing still: alone in the middle of their hex, or in a
  // small ring when they share it.
  spots(state) {
    const out = new Map();
    const groups = new Map();
    for (const a of [...state.units.filter((u) => u.state !== 'away'), ...state.monsters]) {
      if (a.path?.length) continue;
      const k = `${Math.round(a.x * 100)},${Math.round(a.z * 100)}`;
      (groups.get(k) ?? groups.set(k, []).get(k)).push(a);
    }
    for (const group of groups.values()) {
      if (group.length === 1) continue;
      const ring = group.length <= 3 ? 0.38 : 0.52;
      group.forEach((a, i) => {
        const angle = (i / group.length) * Math.PI * 2 + 0.5;
        out.set(a, { x: a.x + Math.cos(angle) * ring, z: a.z + Math.sin(angle) * ring });
      });
    }
    return out;
  }

  update(state, dt, now, camera, selected) {
    // Where each actor stands. Actors walk between hex middles; when several stand in
    // the same hex they spread out inside it instead of overlapping.
    const spot = this.spots(state);
    // Ground height under a point: the top of the hex it is in.
    const ground = (x, z) => Math.max(0, tileTop(state.tiles.get(key(...fromWorld(x, z)))));
    const follow = 1 - Math.exp(-dt * 14);

    // Units.
    const seen = new Set();
    for (const u of state.units) {
      seen.add(u.id);
      let view = this.units.get(u.id);
      if (!view) {
        view = new UnitView(u);
        this.scene.add(view.group);
        this.units.set(u.id, view);
        if (this.pendingCheer === u.id) view.once('cheer', now);
      }
      view.group.visible = u.state !== 'away';
      const at = spot.get(u) ?? { x: u.x, z: u.z };
      if (view.placed) view.group.position.lerp(new THREE.Vector3(at.x, ground(u.x, u.z), at.z), follow);
      else view.group.position.set(at.x, ground(u.x, u.z), at.z);
      view.placed = true;
      if (u.heading !== undefined) view.model.rotation.y = u.heading;
      if (now > view.busyUntil) view.play(u.state === 'moving' ? (UNITS[u.type].speed > 1.5 ? 'run' : 'walk') : 'idle');
      view.mixer.update(dt);
      view.bar.set(u.hp / maxHp(state, u), camera);
      view.setStars(heroLevel(u) - 1, camera);
    }
    for (const [id, view] of this.units) {
      if (!seen.has(id)) {
        this.scene.remove(view.group);
        this.units.delete(id);
      }
    }

    // Monsters.
    const seenM = new Set();
    for (const m of state.monsters) {
      seenM.add(m.id);
      let view = this.monsters.get(m.id);
      if (!view) {
        view = new MonsterView(m);
        this.scene.add(view.group);
        this.monsters.set(m.id, view);
      }
      const at = spot.get(m) ?? { x: m.x, z: m.z };
      if (view.placed) view.group.position.lerp(new THREE.Vector3(at.x, ground(m.x, m.z), at.z), follow);
      else view.group.position.set(at.x, ground(m.x, m.z), at.z);
      view.placed = true;
      if (m.heading !== undefined) view.group.rotation.y = m.heading;
      const t = now * 1000;
      view.lunge = Math.max(0, view.lunge - dt);
      if (m.type === 'slime') {
        const hop = Math.abs(Math.sin(t / 220 + view.phase));
        view.body.position.y = hop * 0.18;
        view.body.scale.y = view.body.scale.x * (0.85 + hop * 0.25);
      } else if (m.type === 'spirit') {
        view.body.position.y = Math.sin(t / 400 + view.phase) * 0.08;
        view.body.rotation.z = Math.sin(t / 600 + view.phase) * 0.15;
      } else {
        view.body.rotation.z = Math.sin(t / 300 + view.phase) * 0.06;
      }
      view.body.position.z = view.lunge > 0 ? Math.sin((view.lunge / 0.3) * Math.PI) * 0.25 : 0;
      view.bar.set(m.hp / m.maxHp, camera);
    }
    for (const [id, view] of this.monsters) {
      if (!seenM.has(id)) {
        this.scene.remove(view.group);
        this.monsters.delete(id);
      }
    }

    // Deaths play out, then disappear.
    this.dying = this.dying.filter((d) => {
      d.mixer?.update(dt);
      if (d.shrink) d.view.group.scale.multiplyScalar(0.85);
      if (now < d.until) return true;
      this.scene.remove(d.view.group);
      return false;
    });

    // Projectiles.
    const live = new Set(state.shots);
    for (const s of state.shots) {
      let mesh = this.shots.get(s);
      if (!mesh) {
        mesh = new THREE.Mesh(this.shotGeometry[s.kind], this.shotMaterial[s.kind]);
        this.scene.add(mesh);
        this.shots.set(s, mesh);
      }
      const t = Math.min(1, s.t);
      const fromY = ground(s.from.x, s.from.z) + (s.from.y ?? 0.5);
      const toY = ground(s.to.x, s.to.z) + 0.5;
      const arc = s.kind === 'boulder' ? 2.5 : 0.6;
      mesh.position.set(s.from.x + (s.to.x - s.from.x) * t, fromY + (toY - fromY) * t + Math.sin(t * Math.PI) * arc, s.from.z + (s.to.z - s.from.z) * t);
      if (s.kind === 'boulder') mesh.rotation.x += dt * 6;
      else mesh.lookAt(s.to.x, toY, s.to.z);
    }
    for (const [s, mesh] of this.shots) {
      if (!live.has(s)) {
        this.scene.remove(mesh);
        this.shots.delete(s);
      }
    }

    // Rings under selected units.
    while (this.rings.children.length < selected.length) this.rings.add(new THREE.Mesh(this.ringGeometry, this.ringMaterial));
    this.rings.children.forEach((ring, i) => {
      const u = state.units.find((x) => x.id === selected[i]);
      ring.visible = !!u && u.state !== 'away';
      const view = u && this.units.get(u.id);
      if (view) ring.position.set(view.group.position.x, view.group.position.y + 0.03, view.group.position.z);
    });
  }
}

export { MONSTERS };
