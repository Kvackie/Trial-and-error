// Create games/<game>/ from template/ and add it to the workflow's game dropdown.
// Usage: npm run new-game -- <game> ["Display Name"]
import fs from 'node:fs';
import path from 'node:path';
import { GAMES_DIR, ROOT, fail } from './games.mjs';

const [id, displayName] = process.argv.slice(2);
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  fail('Usage: npm run new-game -- <game> ["Display Name"]  (game: lowercase letters, digits and dashes)');
}

const target = path.join(GAMES_DIR, id);
if (fs.existsSync(target)) fail(`games/${id} already exists.`);

const name = displayName ?? id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const appIdSuffix = id.replace(/-/g, '');

fs.cpSync(path.join(ROOT, 'template'), target, { recursive: true });
for (const file of ['game.json', 'index.html']) {
  const p = path.join(target, file);
  fs.writeFileSync(
    p,
    fs.readFileSync(p, 'utf8').replaceAll('__NAME__', name).replaceAll('__APPID__', appIdSuffix),
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
