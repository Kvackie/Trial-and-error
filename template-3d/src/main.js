// A small example 3D game to replace: tap the crystal (or press Space) to make it
// jump and change colour. W A S D turn the camera around the island.
//
// It shows the parts a 3D game here needs: a full-screen renderer that follows the
// screen size, touch first with keys on top, models built in code, a pause while
// the page is hidden, and a way back to the hub.
import * as THREE from 'three';
import { handleAndroidBack } from '../../../shared/android-back.js';
import { goHome } from '../../../shared/home-button.js';

const GAME = '__GAME__';
const canvas = document.querySelector('#game');

// Phones have very dense screens; more than 2× costs battery without looking better.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c2046);
scene.fog = new THREE.Fog(0x1c2046, 14, 30);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a2a4a, 1.2));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
sun.position.set(4, 8, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// --- Models, built in code ------------------------------------------------------

const island = new THREE.Mesh(
  new THREE.CylinderGeometry(4, 3.2, 1.2, 7),
  new THREE.MeshStandardMaterial({ color: 0x5fcf5a, flatShading: true }),
);
island.position.y = -0.6;
island.receiveShadow = true;
scene.add(island);

const rock = new THREE.MeshStandardMaterial({ color: 0x8a7f6a, flatShading: true });
for (let i = 0; i < 6; i++) {
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.25), rock);
  const a = (i / 6) * Math.PI * 2 + 0.4;
  stone.position.set(Math.cos(a) * 2.9, 0.1, Math.sin(a) * 2.9);
  stone.castShadow = true;
  scene.add(stone);
}

const COLOURS = [0xffd166, 0xff7b6b, 0x3fb6ff, 0xa77bff, 0x6bd66b];
let colour = 0;
const crystal = new THREE.Mesh(
  new THREE.OctahedronGeometry(1, 0),
  new THREE.MeshStandardMaterial({ color: COLOURS[0], flatShading: true, roughness: 0.3, emissive: COLOURS[0], emissiveIntensity: 0.15 }),
);
crystal.scale.y = 1.4;
crystal.castShadow = true;
scene.add(crystal);

// --- Playing ----------------------------------------------------------------------

let taps = Number(localStorage.getItem(`${GAME}:taps`)) || 0;
const counter = document.querySelector('#counter');
counter.textContent = taps;
let jump = 0; // seconds left of the current jump

function hit() {
  taps += 1;
  counter.textContent = taps;
  try {
    localStorage.setItem(`${GAME}:taps`, String(taps)); // keys are namespaced by game
  } catch {
    // Storage unavailable: the count just isn't kept.
  }
  colour = (colour + 1) % COLOURS.length;
  crystal.material.color.setHex(COLOURS[colour]);
  crystal.material.emissive.setHex(COLOURS[colour]);
  jump = 0.6;
}

// Touch first: a tap on the crystal. Raycasting finds what's under the finger.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener('pointerdown', (event) => {
  pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(crystal).length) hit();
});

// Keys on top: W A S D turn and tilt the camera, Space taps.
let angle = 0.6;
let tilt = 0.45;
const held = new Set();
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === ' ') {
    event.preventDefault();
    if (!event.repeat) hit();
  } else if ('wasd'.includes(key)) held.add(key);
});
window.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));

// --- Screen size and the loop ------------------------------------------------------

function resize() {
  const { innerWidth: w, innerHeight: h } = window;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Back the camera off until the island (about 5 units across from the middle, with
  // a margin) fits the screen's width, so narrow portrait phones see all of it.
  const halfWidth = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  camera.userData.distance = Math.max(11, 5.2 / Math.tan(halfWidth));
  scene.fog.near = camera.userData.distance * 1.2;
  scene.fog.far = camera.userData.distance * 2.8;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (held.has('a')) angle -= dt * 1.5;
  if (held.has('d')) angle += dt * 1.5;
  if (held.has('w')) tilt = Math.min(1.2, tilt + dt);
  if (held.has('s')) tilt = Math.max(0.1, tilt - dt);
  const d = camera.userData.distance;
  camera.position.set(Math.sin(angle) * Math.cos(tilt) * d, Math.sin(tilt) * d, Math.cos(angle) * Math.cos(tilt) * d);
  camera.lookAt(0, 0.8, 0);

  jump = Math.max(0, jump - dt);
  crystal.position.y = 1.4 + Math.sin((jump / 0.6) * Math.PI) * 1.2 + Math.sin(clock.elapsedTime * 2) * 0.08;
  crystal.rotation.y += dt * (0.6 + jump * 6);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

// Stop drawing while the page is hidden, to save battery.
document.addEventListener('visibilitychange', () => {
  renderer.setAnimationLoop(document.hidden ? null : frame);
  clock.getDelta(); // don't count the hidden time
});

// Home: back to the hub (or closes a single-game APK).
document.querySelector('#home').addEventListener('click', goHome);

handleAndroidBack();
