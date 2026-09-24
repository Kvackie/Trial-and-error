// Hex Hold: a hex island town builder. Three.js draws it; src/sim.js runs it.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { handleAndroidBack } from '../../../shared/android-back.js';
import { goHome } from '../../../shared/home-button.js';
import { openSettings } from '../../../shared/settings.js';
import { isDialogOpen, openConfirmDialog } from '../../../shared/help-dialog.js';
import { onLangChange } from '../../../shared/i18n.js';
import { playSound } from '../../../shared/sound.js';
import { BUILDINGS, UNITS } from './data.js';
import { SIZE, fromWorld, key, toWorld } from './hex.js';
import { LEVEL_HEIGHT, MAX_LEVEL, tileTop } from './world.js';
import * as sim from './sim.js';
import { THEME, openHelp } from './help.js';
import { tr } from './strings.js';
import { UI, clock } from './ui.js';
import { endTutorial } from './tutorial.js';
import { hero, loadAssets, model, thumbnails } from './view/assets.js';
import { FOG_COLOUR, Terrain } from './view/terrain.js';
import { Town } from './view/town.js';
import { Actors } from './view/actors.js';
import { Sky } from './view/sky.js';
import { Villagers } from './view/villagers.js';

const SAVE_KEY = 'hex-hold:save';
const canvas = document.querySelector('#game');
const loading = document.querySelector('#loading');

// --- Renderer, camera, light ------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG_COLOUR);
scene.fog = new THREE.Fog(FOG_COLOUR, 30, 60);
const hemi = new THREE.HemisphereLight(0xd8e6ff, 0x4a5a48, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e6, 1.5);
sun.position.set(12, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 17, 13);

// Touch: one finger pans, two pinch and turn. Mouse: left pans, right turns, wheel zooms.
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.screenSpacePanning = false;
controls.minDistance = 6;
controls.maxDistance = 34;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.15;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.addEventListener('change', () => {
  // Keep the view over the island.
  const t = controls.target;
  const limit = 30;
  const len = Math.hypot(t.x, t.z);
  if (len > limit) {
    const back = new THREE.Vector3(t.x, 0, t.z).multiplyScalar(limit / len - 1);
    t.add(back);
    camera.position.add(back);
  }
  t.y = 0;
});

function resize() {
  const { innerWidth: w, innerHeight: h } = window;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 55 : 45;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Marks the selected hex.
const corners = Array.from({ length: 7 }, (_, i) => {
  const a = (Math.PI / 3) * i + Math.PI / 6;
  return new THREE.Vector3(Math.cos(a) * SIZE * 0.96, 0.04, Math.sin(a) * SIZE * 0.96);
});
const marker = new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), new THREE.LineBasicMaterial({ color: 0xffe066 }));
const markerFill = new THREE.Mesh(new THREE.CircleGeometry(SIZE * 0.95, 6).rotateX(-Math.PI / 2).rotateY(Math.PI / 6), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.18, depthWrite: false }));
markerFill.position.y = 0.03;
const markerGroup = new THREE.Group();
markerGroup.add(marker, markerFill);
markerGroup.visible = false;
scene.add(markerGroup);
const flag = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
flag.visible = false;
scene.add(flag);

// --- Game state -----------------------------------------------------------------------------

let state;
let selection = null;
let terrainKey = '';
const terrain = new Terrain(scene);
const town = new Town(scene);
const actors = new Actors(scene);
const villagers = new Villagers(scene);
let sky = null; // made once the models have loaded

function save() {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, sim.serialise(state));
  } catch {
    // No storage: the island lasts until the page closes.
  }
}

function load() {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    if (text) return sim.deserialise(text);
  } catch {
    // A save we can't read: start fresh.
  }
  return null;
}

// --- UI --------------------------------------------------------------------------------------

const selectedBuilding = () => selection?.kind === 'building' && state.buildings.find((b) => b.id === selection.id);

const ui = new UI({
  onBuild(type) {
    const b = sim.build(state, type, selection.q, selection.r);
    if (b) {
      playSound('hammer');
      if (sim.waitingForBuilder(state, b)) ui.toast(tr('queued'));
      selection = { kind: 'building', id: b.id };
      refresh();
    }
  },
  onUpgrade() {
    const b = selectedBuilding();
    if (sim.upgrade(state, b)) {
      playSound('hammer');
      if (sim.waitingForBuilder(state, b)) ui.toast(tr('queued'));
    }
    refresh();
  },
  onRepair() {
    const b = selectedBuilding();
    if (sim.repair(state, b)) {
      playSound('hammer');
      if (sim.waitingForBuilder(state, b)) ui.toast(tr('queued'));
    } else ui.toast(tr('noResources'), 'warn');
    refresh();
  },
  onTrain(unit) {
    if (sim.train(state, selectedBuilding(), unit)) playSound('coin');
    refresh();
  },
  onEndTutorial() {
    endTutorial(state);
    playSound('click');
    refresh();
  },
  onGoals() {
    selection = { kind: 'goals' };
    playSound('click');
    refresh();
  },
  onTrade(give, get) {
    const n = sim.trade(state, selectedBuilding(), give, get);
    if (n) {
      playSound('coin');
      ui.toast(tr('traded', { n, res: tr(get).toLowerCase() }));
    }
    refresh();
  },
  onResearch(track) {
    if (sim.startResearch(state, selectedBuilding(), track)) playSound('hammer');
    refresh();
  },
  onSend(ids) {
    const d = state.dungeons.find((x) => x.key === selection.key);
    if (sim.sendParty(state, d, ids)) playSound('horn');
    refresh();
  },
  onSelectAll() {
    const ids = state.units.filter((u) => u.state !== 'away').map((u) => u.id);
    selection = ids.length ? { kind: 'units', ids } : null;
    playSound('select');
    refresh();
  },
  onClose(keep) {
    if (!keep) selection = null;
    refresh();
  },
  onNewGame() {
    openConfirmDialog({
      ...THEME,
      title: tr('newGameTitle'),
      message: tr('newGameMessage'),
      confirmLabel: tr('newGameYes'),
      onConfirm: () => {
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {
          // Nothing saved anyway.
        }
        location.reload();
      },
    });
  },
});

function refresh() {
  if (selection?.kind === 'units') selection.ids = selection.ids.filter((id) => state.units.some((u) => u.id === id && u.state !== 'away'));
  if (selection?.kind === 'units' && !selection.ids.length) selection = null;
  ui.updateTop(state);
  ui.updateTutorial(state);
  ui.updatePanel(state, selection);
  const hex = selection?.kind === 'tile' ? [selection.q, selection.r] : selection?.kind === 'building' ? (() => {
    const b = state.buildings.find((x) => x.id === selection.id);
    return b ? [b.q, b.r] : null;
  })() : selection?.kind === 'dungeon' ? selection.key.split(',').map(Number) : null;
  markerGroup.visible = !!hex;
  if (hex) {
    const { x, z } = toWorld(...hex);
    markerGroup.position.set(x, Math.max(0, tileTop(sim.tileAt(state, ...hex))), z);
  }
}

// Glide the camera to a spot on the map.
let glide = null;
function lookAt(x, z) {
  glide = { x, z, t: 0 };
}

// The wave note: tap it to see the monsters (or the castle when all is quiet).
document.querySelector('#wave').addEventListener('click', () => {
  const m = state.monsters[0];
  const b = sim.castle(state);
  const at = m ?? toWorld(b.q, b.r);
  lookAt(at.x, at.z);
});

document.querySelector('#home').addEventListener('click', () => {
  playSound('click');
  save();
  goHome();
});
document.querySelector('#settings').addEventListener('click', () => {
  playSound('click');
  openSettings({ theme: THEME });
});
document.querySelector('#help').addEventListener('click', () => {
  playSound('click');
  openHelp();
});
onLangChange(() => {
  showSpeed();
  ui.lastPanel = '';
  refresh();
});

// --- Tapping the map ---------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// The hex under a ray: try each height from the top down and take the first hex whose
// top is at that height, so taps land on raised terraces, not the hexes behind them.
function pickHex(ray) {
  const point = new THREE.Vector3();
  for (let level = MAX_LEVEL; level >= 0; level--) {
    ground.constant = -level * LEVEL_HEIGHT;
    if (!ray.intersectPlane(ground, point)) continue;
    const hex = fromWorld(point.x, point.z);
    const tile = sim.tileAt(state, ...hex);
    if (tile && tile.terrain !== 'water' && tile.level === level) return hex;
  }
  ground.constant = 0.2;
  return ray.intersectPlane(ground, point) ? fromWorld(point.x, point.z) : null;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = e.isPrimary ? { x: e.clientX, y: e.clientY, time: performance.now(), pointers: 1 } : null;
});
canvas.addEventListener('pointermove', (e) => {
  if (down && !e.isPrimary) down = null;
});
canvas.addEventListener('pointerup', (e) => {
  if (!down || e.button > 0) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (moved < 10 && performance.now() - down.time < 600) tap(e.clientX, e.clientY);
  down = null;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function tap(x, y) {
  const unit = actors.unitAt(state, camera, x, y, window.innerWidth, window.innerHeight);
  if (unit) {
    if (selection?.kind === 'units') {
      selection.ids = selection.ids.includes(unit.id) ? selection.ids.filter((id) => id !== unit.id) : [...selection.ids, unit.id];
    } else selection = { kind: 'units', ids: [unit.id] };
    playSound('select');
    return refresh();
  }
  raycaster.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
  const picked = pickHex(raycaster.ray);
  if (!picked) return;
  const [q, r] = picked;
  const tile = sim.tileAt(state, q, r);
  const known = tile && state.revealed.has(key(q, r));
  const dungeon = known && sim.dungeonAt(state, q, r);
  const building = known && sim.buildingAt(state, q, r);

  if (selection?.kind === 'units' && known && dungeon && dungeon.state === 'ready') {
    ui.party = new Set(selection.ids);
    selection = { kind: 'dungeon', key: dungeon.key };
    playSound('click');
    return refresh();
  }
  if (selection?.kind === 'units' && known && sim.canWalk(state, q, r)) {
    if (sim.moveUnits(state, selection.ids, q, r)) {
      const { x: fx, z: fz } = toWorld(q, r);
      flag.position.set(fx, 0.6, fz);
      flagBase = Math.max(0, tileTop(tile)) + 0.6;
      flag.visible = true;
      flagTime = 1.2;
      playSound('move');
    }
    return refresh();
  }
  if (building) selection = { kind: 'building', id: building.id };
  else if (dungeon) selection = { kind: 'dungeon', key: dungeon.key };
  else if (known) selection = { kind: 'tile', q, r };
  else selection = null;
  playSound('click');
  refresh();
}
let flagTime = 0;
let flagBase = 0.6;

// --- Events: sounds and messages -------------------------------------------------------------

let lastClash = 0;
function react(events, now) {
  actors.handle(events, now);
  for (const e of events) {
    switch (e.type) {
      case 'built':
        playSound('levelUp');
        ui.toast(tr('built', { name: tr(`b_${e.building.type}`) }));
        break;
      case 'upgraded':
        playSound('levelUp');
        ui.toast(tr('upgraded', { name: tr(`b_${e.building.type}`), n: e.building.level }));
        break;
      case 'trained':
        playSound('correct');
        ui.toast(tr('trained', { name: tr(`u_${e.unit.type}`).toLowerCase() }));
        break;
      case 'hungry':
        playSound('wrong');
        ui.toast(tr('hungry'), 'warn');
        break;
      case 'tutorial':
        playSound('correct');
        break;
      case 'goal':
        playSound('discover');
        ui.toast(tr('goalDone', { name: tr(`g_${e.goal.id}`), reward: ui.lootText(e.goal.reward) }));
        break;
      case 'levelUp':
        playSound('levelUp');
        ui.toast(tr('levelUp', { name: e.unit.name ?? tr(`u_${e.unit.type}`), n: e.level }));
        break;
      case 'researched':
        playSound('levelUp');
        ui.toast(tr('researched', { name: tr(`r_${e.track}`), tier: 'I'.repeat(e.tier) }));
        break;
      case 'waveSoon':
        playSound('alarm');
        ui.toast(tr('waveSoon'), 'warn');
        break;
      case 'wave':
        playSound('horn');
        ui.toast(e.boss ? tr('bossWave', { n: e.number }) : tr('waveNow', { n: e.number }), 'alarm');
        break;
      case 'destroyed':
        playSound('crumble');
        ui.toast(tr('lostBuilding', { name: tr(`b_${e.building.type}`).toLowerCase() }), 'alarm');
        break;
      case 'unitDied':
        playSound('wrong');
        ui.toast(tr('unitDied', { name: tr(`u_${e.unit.type}`).toLowerCase() }), 'warn');
        break;
      case 'dungeon':
        playSound(e.won ? 'discover' : 'gameOver');
        ui.toast(e.won ? tr('dungeonWon', { name: tr('dungeonName', { n: e.dungeon.tier - 1 }), loot: ui.lootText(e.loot) }) : tr('dungeonLost', { name: tr('dungeonName', { n: e.dungeon.tier }), back: e.back }), e.won ? '' : 'warn');
        break;
      case 'attack':
        if (e.building) attacked.set(e.building.id, now);
        if (now - lastClash > 0.12) {
          lastClash = now;
          const shoots = !e.monster && UNITS[e.actor.type]?.shoots;
          playSound(shoots === 'spell' ? 'spell' : shoots ? 'twang' : e.monster ? 'bump' : 'clash');
        }
        break;
      case 'monsterDied':
        playSound('blast');
        break;
      default:
        break;
    }
  }
}

// --- Speed: normal, double, paused -------------------------------------------------------

let speed = 1;
const speedButton = document.querySelector('#speed');
function showSpeed() {
  speedButton.querySelector('span').textContent = speed === 0 ? '❚❚' : `${speed}×`;
  speedButton.classList.toggle('paused', speed === 0);
  speedButton.setAttribute('aria-label', tr(speed === 0 ? 'paused' : speed === 2 ? 'speed2' : 'speed1'));
  ui.paused = speed === 0;
}
speedButton.addEventListener('click', () => {
  speed = speed === 1 ? 2 : speed === 2 ? 0 : 1;
  playSound('click');
  showSpeed();
});

// --- Alerts: arrows at the screen edge pointing to buildings under attack off-screen -------

const attacked = new Map(); // building id -> when it was last hit
const alertLayer = document.querySelector('#alerts');
function updateAlerts(now) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const html = [];
  for (const [id, when] of attacked) {
    const b = state.buildings.find((x) => x.id === id);
    if (!b || b.state === 'destroyed' || now - when > 3) {
      attacked.delete(id);
      continue;
    }
    const { x, z } = toWorld(b.q, b.r);
    const v = new THREE.Vector3(x, 1, z).project(camera);
    const behind = v.z > 1;
    let sx = ((v.x + 1) / 2) * w;
    let sy = ((1 - v.y) / 2) * h;
    if (behind) {
      sx = w - sx;
      sy = h - sy;
    }
    const onScreen = !behind && sx > 30 && sx < w - 30 && sy > 130 && sy < h - 160;
    if (onScreen) continue;
    // Clamp to the screen edge, pointing towards the building.
    const cx = w / 2;
    const cy = h / 2;
    const angle = Math.atan2(sy - cy, sx - cx);
    const scale = Math.min((w / 2 - 36) / Math.abs(Math.cos(angle) || 1e-6), (h / 2 - 150) / Math.abs(Math.sin(angle) || 1e-6));
    const ax = cx + Math.cos(angle) * scale;
    const ay = cy + Math.sin(angle) * scale;
    html.push(`<button class="alert" data-id="${id}" style="left:${ax}px;top:${ay}px" aria-label="${tr('underAttack', { name: tr(`b_${b.type}`).toLowerCase() })}"><b style="transform:rotate(${angle}rad)">➜</b></button>`);
  }
  const joined = html.join('');
  if (joined !== alertLayer.dataset.html) {
    alertLayer.innerHTML = joined;
    alertLayer.dataset.html = joined;
  }
}
alertLayer.addEventListener('click', (e) => {
  const el = e.target.closest('.alert');
  const b = el && state.buildings.find((x) => x.id === Number(el.dataset.id));
  if (!b) return;
  const { x, z } = toWorld(b.q, b.r);
  lookAt(x, z);
  playSound('click');
});

// --- The loop ------------------------------------------------------------------------------

const clockTimer = new THREE.Clock();
let uiTimer = 0;
let saveTimer = 0;

function frame() {
  const dt = Math.min(clockTimer.getDelta(), 0.1);
  const now = clockTimer.elapsedTime;
  // The world holds still while a dialog (help, settings) is open, or when paused.
  if (!isDialogOpen() && speed > 0) {
    for (let i = 0; i < speed; i++) {
      const events = sim.tick(state, dt);
      if (events.length) react(events, now);
    }
  }
  const signature = `${state.revealed.size}|${state.buildings.length}|${state.buildings.filter((b) => b.state === 'ready').length}`;
  if (signature !== terrainKey) {
    terrainKey = signature;
    terrain.update(state);
  }
  sky?.update(state, dt, controls.target, camera);
  town.update(state, camera, sky?.night ?? 0, now);
  villagers.update(state, dt, sky?.night ?? 0);
  actors.update(state, dt, now, camera, selection?.kind === 'units' ? selection.ids : []);
  if (flagTime > 0) {
    flagTime -= dt;
    flag.position.y = flagBase + Math.sin(now * 8) * 0.08;
    flag.visible = flagTime > 0;
  }
  uiTimer -= dt;
  if (uiTimer <= 0) {
    uiTimer = 0.25;
    refresh();
    updateAlerts(now);
  }
  saveTimer -= dt;
  if (saveTimer <= 0) {
    saveTimer = 5;
    save();
  }
  if (glide) {
    glide.t = Math.min(1, glide.t + dt * 2);
    const move = new THREE.Vector3(glide.x - controls.target.x, 0, glide.z - controls.target.z).multiplyScalar(glide.t * 0.25);
    controls.target.add(move);
    camera.position.add(move);
    if (glide.t >= 1) glide = null;
  }
  controls.update();
  renderer.render(scene, camera);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
    renderer.setAnimationLoop(null);
  } else if (state) {
    // Back after a while: let the town catch up as if it had been closed.
    const away = (Date.now() - state.savedAt) / 1000;
    if (away > 30) welcome(sim.catchUp(state, away));
    clockTimer.getDelta();
    renderer.setAnimationLoop(frame);
  }
});
window.addEventListener('pagehide', save);

function welcome({ seconds, gained, events }) {
  react(events.filter((e) => e.type !== 'attack'), 0);
  const list = Object.entries(gained)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `+${v} ${tr(r).toLowerCase()}`)
    .join(', ');
  if (list) ui.toast(`${tr('welcomeBack', { time: clock(seconds) })} ${list}`);
}

// --- Start ---------------------------------------------------------------------------------

async function start() {
  await loadAssets((p) => (loading.querySelector('i').style.width = `${Math.round(p * 100)}%`));
  const pictures = {};
  for (const type of Object.keys(BUILDINGS)) pictures[`b_${type}`] = model(BUILDINGS[type].model);
  for (const [type, def] of Object.entries(UNITS)) pictures[`u_${type}`] = hero(type, def.weapons);
  ui.thumbs = thumbnails(pictures);
  sky = new Sky(scene, { sun, hemi, sea: terrain.sea });

  state = load();
  if (state) {
    const away = (Date.now() - state.savedAt) / 1000;
    if (away > 30) welcome(sim.catchUp(state, away));
  } else {
    state = sim.newGame();
  }
  state.savedAt = Date.now();
  loading.remove();
  refresh();
  renderer.setAnimationLoop(frame);
}

start();
handleAndroidBack();

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) window.hex = { get state() { return state; }, sim, lookAt, actors, scene, camera, controls };
