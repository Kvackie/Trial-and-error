import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const GAMES_DIR = path.join(ROOT, 'games');
export const DIST_DIR = path.join(ROOT, 'dist');

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function listGames() {
  return fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(GAMES_DIR, entry.name, 'game.json')))
    .map((entry) => getGame(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGame(id) {
  if (!id) fail(`Pass a game name. Available: ${gameIds().join(', ')}`);
  if (!ID_PATTERN.test(id)) fail(`"${id}" is not a valid game name (use lowercase letters, digits and dashes).`);

  const dir = path.join(GAMES_DIR, id);
  const manifest = path.join(dir, 'game.json');
  if (!fs.existsSync(manifest)) fail(`No game "${id}". Available: ${gameIds().join(', ')}`);

  const meta = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  for (const key of ['name', 'description', 'appId']) {
    if (!meta[key]) fail(`games/${id}/game.json is missing "${key}".`);
  }
  return { id, dir, distDir: path.join(DIST_DIR, id), ...meta };
}

function gameIds() {
  return fs.readdirSync(GAMES_DIR).filter((name) => fs.existsSync(path.join(GAMES_DIR, name, 'game.json')));
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}
