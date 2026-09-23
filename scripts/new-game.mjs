// Create games/<game>/ from template/ and add it to the workflow's game dropdown.
// Usage: npm run new-game -- <game> ["Display Name"] [--3d]
// --3d starts from template-3d/ (Three.js) instead of template/ (Phaser).
import fs from 'node:fs';
import path from 'node:path';
import { GAMES_DIR, ROOT, fail } from './games.mjs';

const args = process.argv.slice(2);
const threeD = args.includes('--3d');
const [id, displayName] = args.filter((arg) => arg !== '--3d');
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  fail('Usage: npm run new-game -- <game> ["Display Name"] [--3d]  (game: lowercase letters, digits and dashes)');
}

if (id === 'all') fail('"all" is reserved: it builds every game in the workflow.');

const target = path.join(GAMES_DIR, id);
if (fs.existsSync(target)) fail(`games/${id} already exists.`);

const name = displayName ?? id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const appIdSuffix = id.replace(/-/g, '');

fs.cpSync(path.join(ROOT, threeD ? 'template-3d' : 'template'), target, { recursive: true });
// Fill in the placeholders: __GAME__ (storage keys, leaderboard), __NAME__, __APPID__.
for (const file of fs.readdirSync(target, { recursive: true })) {
  const p = path.join(target, file);
  if (!/\.(js|json|html)$/.test(file) || !fs.statSync(p).isFile()) continue;
  fs.writeFileSync(
    p,
    fs.readFileSync(p, 'utf8').replaceAll('__GAME__', id).replaceAll('__NAME__', name).replaceAll('__APPID__', appIdSuffix),
  );
}

// Add the game to the dropdown between the "games:start" and "games:end" markers.
const workflowPath = path.join(ROOT, '.github', 'workflows', 'build.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const block = /(# games:start\n)([\s\S]*?)(\s*# games:end)/;
const match = workflow.match(block);
if (!match) fail('Could not find the games:start / games:end markers in build.yml.');
const indent = match[2].match(/^(\s*)- /)?.[1] ?? '          ';
const ids = [...match[2].matchAll(/- (\S+)/g)].map((m) => m[1]);
const options = [...new Set([...ids, id])].sort().map((g) => `${indent}- ${g}`).join('\n');
fs.writeFileSync(workflowPath, workflow.replace(block, `$1${options}$3`));

console.log(`Created games/${id} ("${name}") and added it to the workflow dropdown.`);
console.log(`Next: npm run dev -- ${id}`);
if (threeD) {
  console.log(`Then: replace the example scene in src/main.js, fill in game.json and draw public/icon.svg.`);
} else {
  console.log(`Then: replace the example game, fill in the "sv" block in game.json, draw public/icon.svg,`);
  console.log(`and add '${id}' to leaderboard/src/rules.js (then run Deploy leaderboard) so scores are accepted.`);
}
