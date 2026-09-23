// Loads the packed models (see tools/pack-models.mjs) and hands out copies.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { HEROES } from '../models.js';

const loader = new GLTFLoader();
const models = new Map(); // name -> Object3D
const heroes = new Map(); // unit type -> Object3D
let clips = [];

export async function loadAssets(onProgress) {
  const files = ['world', ...Object.keys(HEROES), 'animations'];
  let done = 0;
  const load = async (name) => {
    const gltf = await loader.loadAsync(`./models/${name}.glb`);
    onProgress?.(++done / files.length);
    return gltf;
  };
  const [world, ...rest] = await Promise.all(files.map(load));
  for (const child of [...world.scene.children]) {
    child.position.set(0, 0, 0);
    models.set(child.name, child);
  }
  Object.keys(HEROES).forEach((type, i) => heroes.set(type, rest[i].scene));
  clips = rest.at(-1).animations;
  for (const m of [...models.values(), ...heroes.values()]) {
    m.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
}

// A copy that shares geometry and materials with the original.
export function model(name) {
  const source = models.get(name);
  if (!source) throw new Error(`No model ${name}`);
  return source.clone();
}

export const hasModel = (name) => models.has(name);
export const source = (name) => models.get(name);

// A hero with its own skeleton, showing only its body and the given weapons.
export function hero(type, weapons) {
  const copy = cloneSkinned(heroes.get(type));
  const body = /^(Knight|Barbarian|Mage|Rogue)_/;
  copy.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) o.visible = body.test(o.name) || weapons.includes(o.name);
    if (o.isSkinnedMesh) o.frustumCulled = false;
  });
  return copy;
}

export const heroClips = () => clips;

// Draws a small picture of a model, for the build and train buttons.
export function thumbnails(entries, size = 112) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const dir = new THREE.Vector3(1, 0.8, 1.2).normalize();
  const out = {};
  for (const [id, object] of Object.entries(entries)) {
    scene.add(object);
    object.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(object, true).getBoundingSphere(new THREE.Sphere());
    const d = sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.02;
    camera.position.copy(sphere.center).addScaledVector(dir, d);
    camera.near = d / 50;
    camera.far = d * 5;
    camera.updateProjectionMatrix();
    camera.lookAt(sphere.center);
    renderer.render(scene, camera);
    out[id] = renderer.domElement.toDataURL('image/png');
    scene.remove(object);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
