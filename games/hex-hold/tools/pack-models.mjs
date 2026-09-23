// Packs the KayKit models Hex Hold uses into a few files in public/models/.
// Lossless: it only merges files, shares identical textures and meshes, and drops
// data the game never uses (animations it doesn't play, other packs' models).
//
//   node games/hex-hold/tools/pack-models.mjs <folder with the KayKit clones>
//
// The clones (all CC0, see CREDITS.md):
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, unpartition } from '@gltf-transform/functions';
import { HEROES, HERO_ANIMATIONS, WORLD_MODELS } from '../src/models.js';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node games/hex-hold/tools/pack-models.mjs <folder with the KayKit clones>');
  process.exit(1);
}
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'models');
fs.mkdirSync(out, { recursive: true });
const io = new NodeIO();

const PACKS = {
  hex: 'KayKit-Medieval-Hexagon-Pack-1.0/addons/kaykit_medieval_hexagon_pack/Assets/gltf',
  dungeon: 'KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf',
  heroes: 'KayKit-Character-Pack-Adventures-1.0/addons/kaykit_character_pack_adventures/Characters/gltf',
};

function find(pack, name) {
  const dir = path.join(source, PACKS[pack]);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const file = walk(dir).find((f) => /\.(gltf|glb)$/i.test(f) && path.basename(f).replace(/(\.gltf)?\.(gltf|glb)$/i, '') === name);
  if (!file) throw new Error(`${name} not found in ${pack}`);
  return file;
}

// One file with every world model, each under a top-level node named after it.
async function packWorld() {
  const doc = new Document();
  const scene = doc.createScene('world');
  for (const [pack, names] of Object.entries(WORLD_MODELS)) {
    for (const name of names) {
      const part = await io.read(find(pack, name));
      const map = mergeDocuments(doc, part);
      const holder = doc.createNode(name);
      for (const s of part.getRoot().listScenes()) {
        const merged = map.get(s);
        for (const child of merged.listChildren()) holder.addChild(child);
        merged.dispose();
      }
      scene.addChild(holder);
    }
  }
  doc.getRoot().setDefaultScene(scene);
  await doc.transform(unpartition(), dedup(), prune());
  await io.write(path.join(out, 'world.glb'), doc);
}

function removeAnimation(anim) {
  for (const channel of anim.listChannels()) channel.dispose();
  for (const sampler of anim.listSamplers()) sampler.dispose();
  anim.dispose();
}

// Accessors nothing refers to any more (left behind by removed animations).
function dropOrphans(doc) {
  for (const accessor of doc.getRoot().listAccessors()) {
    if (accessor.listParents().every((p) => p.propertyType === 'Root')) accessor.dispose();
  }
}

// Each hero without animations, plus one file of the animations they all share
// (the heroes use the same skeleton).
async function packHeroes() {
  for (const [id, file] of Object.entries(HEROES)) {
    const doc = await io.read(find('heroes', file));
    for (const anim of doc.getRoot().listAnimations()) removeAnimation(anim);
    dropOrphans(doc);
    await doc.transform(dedup(), prune());
    await io.write(path.join(out, `${id}.glb`), doc);
  }
  const doc = await io.read(find('heroes', HEROES.knight));
  for (const anim of doc.getRoot().listAnimations()) if (!HERO_ANIMATIONS.includes(anim.getName())) removeAnimation(anim);
  // Keep only the skeleton: the animations need the bones, not the meshes.
  for (const node of doc.getRoot().listNodes()) if (node.getMesh()) node.setMesh(null).setSkin(null);
  dropOrphans(doc);
  await doc.transform(prune({ keepLeaves: true }), dedup());
  await io.write(path.join(out, 'animations.glb'), doc);
}

await packWorld();
await packHeroes();
for (const f of fs.readdirSync(out)) console.log(f, `${Math.round(fs.statSync(path.join(out, f)).size / 1024)} KB`);
