// Loading the pixel art: the 0x72 Dungeon Tileset II sheet (frames named in
// public/art/0x72.txt), a few DawnLike sprites, and small pieces drawn here in the same
// style. Also makes <img> sources of any frame for the HTML panels.

const DAWN = ['player0', 'player1', 'decor0', 'decor1', 'trap0', 'music', 'reptile0'];

// DawnLike sprites used, as [sheet, frame] (frames count left to right, 8 per row).
export const DAWN_SPRITES = {
  cleric: [['player0', 33], ['player1', 33]],
  crusader: [['player0', 25], ['player1', 25]],
  platino: [['reptile0', 99]],
  altar: [['decor0', 161]],
  well: [['decor0', 168]],
  brazier: [['decor0', 67], ['decor1', 67]],
  bones: [['trap0', 24]],
  drum: [['music', 16]],
};

// Pieces the packs don't have, drawn in their palette. One character per pixel.
const PALETTE = {
  k: '#1b1020', // outline
  w: '#8a5a3c', // wood
  W: '#c08457', // light wood
  s: '#9aa3b5', // steel
  S: '#dfe6f0', // light steel
  r: '#3d2f3f', // rope / dark
  t: '#0d0a12', // tar
  T: '#2b2338', // tar shine
  g: '#4ad0ff', // soul glow
  G: '#b8f2ff', // soul core
  b: '#6f6b78', // stone
  B: '#a19cae', // light stone
  d: '#433f4c', // dark stone
};
const PIXEL_ART = {
  ballista: [
    '................',
    'k..............k',
    'Sk............kS',
    '.Sk....kk....kS.',
    '..Skkkkssskkkk..',
    '..kWWWWWWWWWWSSk',
    '..kwwwwwwwwwwkk.',
    '...kk.kwwk.kk...',
    '......kwwk......',
    '.....kwwwwk.....',
    '....kwk..kwk....',
    '...kwk....kwk...',
    '..kwk......kwk..',
    '..kk........kk..',
  ],
  tar: [
    '....kkkkkkkk....',
    '..kkttttttttkk..',
    '.kttTTttttttttk.',
    'kttTTttttttTTttk',
    'kttttttttttTttk.',
    '.kkttttttttttk..',
    '...kkkkkkkkkk...',
  ],
  soul: [
    '...k....',
    '..kgk...',
    '..kgk.k.',
    '.kggkgk.',
    '.kgGggk.',
    'kgGGGgk.',
    'kgGGGgk.',
    '.kgGgk..',
    '..kkk...',
  ],
  // A rune stone; the glyph (x) is drawn in the rune's colour.
  rune: [
    '...kkkkkk...',
    '..kBBBBBbk..',
    '.kBbbxbbbdk.',
    '.kBbxxxbbdk.',
    '.kBbbxbxbdk.',
    '.kBbbxxbbdk.',
    '.kBbbxbbbdk.',
    '.kBbxbxbbdk.',
    '.kbbbbbbddk.',
    '..kddddddk..',
    '...kkkkkk...',
  ],
};
export const RUNE_COLORS = {
  fury: '#ff5a4a',
  vigor: '#62d64a',
  haste: '#ffd166',
  leech: '#d14aff',
  greed: '#4ad0ff',
  thorns: '#ff9f43',
};
export const RARITY_COLORS = ['#c8c8d0', '#4a9dff', '#b56cff', '#ffb02e', '#ff4a6a'];

export function preloadArt(scene) {
  scene.load.image('x72', 'art/0x72.png');
  scene.load.text('x72list', 'art/0x72.txt');
  for (const sheet of DAWN) scene.load.spritesheet(`dawn-${sheet}`, `art/dawn-${sheet}.png`, { frameWidth: 16, frameHeight: 16 });
}

function drawPixels(rows, colors = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const g = canvas.getContext('2d');
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color = colors[ch] ?? PALETTE[ch];
      if (!color || ch === '.') return;
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }),
  );
  return canvas;
}

// Call once in create(): names every 0x72 frame, sets up animations and the drawn pieces.
export function createArt(scene) {
  const texture = scene.textures.get('x72');
  const anims = {};
  for (const line of scene.cache.text.get('x72list').split('\n')) {
    const [name, x, y, w, h] = line.trim().split(/\s+/);
    if (!h) continue;
    texture.add(name, 0, Number(x), Number(y), Number(w), Number(h));
    const anim = name.match(/^(.*)_f(\d+)$/);
    if (anim) (anims[anim[1]] ??= []).push(name);
  }
  for (const [key, frames] of Object.entries(anims)) {
    frames.sort();
    scene.anims.create({ key, frames: frames.map((frame) => ({ key: 'x72', frame })), frameRate: 8, repeat: -1 });
  }
  for (const [key, frames] of Object.entries(DAWN_SPRITES)) {
    scene.anims.create({ key: `dawn-${key}`, frames: frames.map(([sheet, frame]) => ({ key: `dawn-${sheet}`, frame })), frameRate: 2, repeat: -1 });
  }
  for (const [key, rows] of Object.entries(PIXEL_ART)) {
    if (key === 'rune') continue;
    scene.textures.addCanvas(`px-${key}`, drawPixels(rows));
  }
  for (const [type, color] of Object.entries(RUNE_COLORS)) scene.textures.addCanvas(`rune-${type}`, drawPixels(PIXEL_ART.rune, { x: color }));
}

// What to show for a monster, hero or structure (named by its sprite or type):
// { anim } to play, or a still { texture, frame }; run is the walking animation.
export function look(kind) {
  if (DAWN_SPRITES[kind]) return { anim: `dawn-${kind}`, dawn: true };
  if (kind === 'ballista' || kind === 'tar') return { texture: `px-${kind}` };
  if (kind === 'spikes') return { anim: 'floor_spikes_anim', floor: true };
  if (kind === 'turret') return { anim: 'wall_fountain_basin_blue_anim' };
  if (kind === 'necromancer') return { anim: 'necromancer_anim' };
  return { anim: `${kind}_idle_anim`, run: `${kind}_run_anim` };
}

// --- Images for the HTML panels ---------------------------------------------------------------
const urls = new Map();
function frameCanvas(scene, textureKey, frameName) {
  const frame = scene.textures.getFrame(textureKey, frameName);
  const canvas = document.createElement('canvas');
  canvas.width = frame.cutWidth;
  canvas.height = frame.cutHeight;
  canvas.getContext('2d').drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
  return canvas;
}

// A data URL for a panel picture: 'x72:<frame>', a rune or drawn piece ('rune-fury',
// 'px-soul'), or anything look() knows.
export function iconUrl(scene, kind) {
  if (urls.has(kind)) return urls.get(kind);
  let canvas;
  if (kind.startsWith('x72:')) canvas = frameCanvas(scene, 'x72', kind.slice(4));
  else if (kind.startsWith('rune-') || kind.startsWith('px-')) canvas = scene.textures.get(kind).getSourceImage();
  else if (DAWN_SPRITES[kind]) {
    const [sheet, frame] = DAWN_SPRITES[kind][0];
    canvas = frameCanvas(scene, `dawn-${sheet}`, frame);
  } else {
    const l = look(kind);
    canvas = l.texture ? scene.textures.get(l.texture).getSourceImage() : frameCanvas(scene, 'x72', scene.anims.get(l.anim).frames[0].frame.name);
  }
  const url = canvas.toDataURL();
  urls.set(kind, url);
  return url;
}
