// The island: tiles, nature on them, dungeon doorways and the dark over unexplored hexes.
// Everything that repeats is drawn with instancing, so hundreds of hexes stay cheap.
import * as THREE from 'three';
import { DIRS, SIZE, key, toWorld } from '../hex.js';
import { tileTop } from '../world.js';
import { buildingAt } from '../sim.js';
import { source } from './assets.js';

const DECO = {
  forest: ['trees_A_medium', 'trees_B_medium', 'trees_A_small'],
  hills: ['hills_A', 'hills_B_trees', 'hill_single_A'],
  mountain: ['mountain_A', 'mountain_B', 'mountain_C_grass'],
  grass: ['tree_single_A', 'tree_single_B', 'rock_single_A', 'rock_single_C'],
};
export const FOG_COLOUR = 0x0b1522;
const GRASS_DEPTH = 0.18; // how much of the grass tile shows above the earth

const hash = (k) => [...k].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

// Builds one InstancedMesh per mesh inside a model, placed at each of the matrices.
function instanced(name, matrices, material) {
  const group = new THREE.Group();
  if (!matrices.length) return group;
  const root = source(name);
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mesh = new THREE.InstancedMesh(o.geometry, material ?? o.material, matrices.length);
    const local = o.matrixWorld;
    const m = new THREE.Matrix4();
    matrices.forEach((placed, i) => mesh.setMatrixAt(i, m.multiplyMatrices(placed, local)));
    mesh.castShadow = material?.isMeshStandardMaterial ?? true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

const place = (x, y, z, rotation = 0, scale = 1, height = scale, run = false) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(scale, height, scale));
  m.run = run;
  return m;
};

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.fogMaterial = new THREE.MeshBasicMaterial({ color: FOG_COLOUR });
    // Open sea around the island.
    const sea = new THREE.Mesh(new THREE.CircleGeometry(120, 48), new THREE.MeshBasicMaterial({ color: FOG_COLOUR }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.35;
    scene.add(sea);
    // Earth under the grass: a hex column one unit tall with its top at y = 0,
    // stretched down to the floor for each hex.
    this.cliffGeometry = new THREE.CylinderGeometry(SIZE * 0.995, SIZE * 0.995, 1, 6).translate(0, -0.5, 0);
    this.cliffMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 1, flatShading: true });
    this.riverMaterial = new THREE.MeshStandardMaterial({ color: 0x3aa6d8, roughness: 0.25, metalness: 0.1 });
    this.poolGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16);
    this.runGeometry = new THREE.BoxGeometry(0.8, 0.03, 1.05).translate(0, 0, 0.52);
  }

  // Rebuilds everything. Called when the fog lifts or a building goes up.
  update(state) {
    for (const child of [...this.group.children]) {
      child.traverse((o) => o.isInstancedMesh && o.dispose());
      this.group.remove(child);
    }
    const byModel = new Map();
    const add = (name, matrix) => (byModel.get(name) ?? byModel.set(name, []).get(name)).push(matrix);
    const hidden = [];
    const cliffs = [];
    const channels = [];
    for (const tile of state.tiles.values()) {
      const k = key(tile.q, tile.r);
      const { x, z } = toWorld(tile.q, tile.r);
      if (!state.revealed.has(k)) {
        hidden.push(place(x, -0.02, z));
        continue;
      }
      const h = hash(k);
      const turn = ((h % 6) * Math.PI) / 3;
      const top = tileTop(tile);
      // The tile model is a column one unit deep; stretch it down to the same floor
      // for every height, so taller hexes show more of their earth sides.
      if (tile.terrain === 'water') add('hex_water', place(x, 0, z));
      else {
        // A thin grass top on an earth column, so raised hexes show brown cliffs.
        add('hex_grass', place(x, top, z, 0, 1, GRASS_DEPTH));
        cliffs.push(place(x, top - GRASS_DEPTH, z, 0, 1, top - GRASS_DEPTH + 1));
      }
      if (tile.terrain === 'river') {
        // A channel from the middle of the hex towards each river or sea neighbour.
        channels.push(place(x, top + 0.005, z));
        for (const [dq, dr] of DIRS) {
          const n = state.tiles.get(key(tile.q + dq, tile.r + dr));
          if (!n || (n.terrain !== 'river' && n.terrain !== 'water')) continue;
          const to = toWorld(tile.q + dq, tile.r + dr);
          channels.push(place(x, top + 0.005, z, Math.atan2(to.x - x, to.z - z), 1, 1, true));
        }
      }
      if (buildingAt(state, tile.q, tile.r)) continue;
      if (tile.dungeon) {
        this.dungeon(add, x, z, top);
        continue;
      }
      const options = DECO[tile.terrain];
      if (tile.terrain === 'water') {
        if (h % 5 === 0) add('waterlily_A', place(x + ((h >>> 4) % 10) / 20 - 0.25, -0.2, z, turn));
      } else if (tile.terrain === 'grass') {
        if (h % 4 === 0) add(options[(h >>> 3) % options.length], place(x + ((h >>> 5) % 10) / 14 - 0.35, top, z + ((h >>> 9) % 10) / 14 - 0.35, turn));
      } else if (options) {
        add(options[(h >>> 3) % options.length], place(x, top, z, turn));
      }
    }
    for (const [name, matrices] of byModel) this.group.add(instanced(name, matrices, name === 'hex_grass' ? this.grassMaterial() : undefined));
    this.group.add(instanced('hex_grass', hidden, this.fogMaterial));
    this.addChannels(channels);
    if (cliffs.length) {
      const mesh = new THREE.InstancedMesh(this.cliffGeometry, this.cliffMaterial, cliffs.length);
      cliffs.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  // River water: round pools in the middle of river hexes joined by straight runs.
  addChannels(list) {
    const pools = list.filter((m) => !m.run);
    const runs = list.filter((m) => m.run);
    for (const [geometry, matrices] of [[this.poolGeometry, pools], [this.runGeometry, runs]]) {
      if (!matrices.length) continue;
      const mesh = new THREE.InstancedMesh(geometry, this.riverMaterial, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  // The pack's grass is a bright lime; a touch greener reads better across a whole island.
  grassMaterial() {
    if (!this.grass) {
      source('hex_grass').traverse((o) => {
        if (o.isMesh && !this.grass) {
          this.grass = o.material.clone();
          this.grass.color.setRGB(0.6, 0.86, 0.52);
        }
      });
    }
    return this.grass;
  }

  // A dark doorway in a little ruin, lit by two torches.
  dungeon(add, x, z, y) {
    add('wall_doorway', place(x, y, z + 0.1, 0, 0.36));
    add('torch_mounted', place(x - 0.55, y + 0.45, z + 0.3, 0, 0.5));
    add('torch_mounted', place(x + 0.55, y + 0.45, z + 0.3, 0, 0.5));
    add('barrel_small_stack', place(x + 0.55, y, z - 0.45, 0.6, 0.3));
    add('banner_patternA_red', place(x, y, z + 0.05, 0, 0.3));
  }
}
