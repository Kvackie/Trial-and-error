// Prepare the shared Android project, then: cd android && ./gradlew assembleRelease
//
//   npm run android -- <game>   one game as its own app (built first unless dist/<game> exists)
//   npm run android:hub         every game in one app, opening on the hub page
//
// Points Capacitor at the web build and sets the app id and name.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { build } from 'vite';
import { DIST_DIR, ROOT, getGame, listGames } from './games.mjs';
import { renderHub } from './build-hub.mjs';

const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

const HUB_APP_DIR = path.join(ROOT, 'dist-app');
const HUB_APP = { appId: 'io.github.kvackie.trialanderror', name: 'Trial and Error' };

async function prepareGame(id) {
  const game = getGame(id);
  if (!fs.existsSync(path.join(game.distDir, 'index.html'))) run(`node scripts/build.mjs ${game.id}`);
  return { appId: game.appId, name: game.name, webDir: game.distDir };
}

// dist-app/ = the hub page (bundled with the back-button handler) + every game's build.
async function prepareHub() {
  const games = listGames();
  for (const game of games) run(`node scripts/build.mjs ${game.id}`);

  const src = path.join(ROOT, '.hub-app');
  fs.rmSync(src, { recursive: true, force: true });
  fs.mkdirSync(src);
  fs.writeFileSync(
    path.join(src, 'index.html'),
    renderHub(DIST_DIR, { app: true, scripts: '\n    <script type="module" src="./main.js"></script>' }),
  );
  fs.writeFileSync(
    path.join(src, 'main.js'),
    "import { handleAndroidBack } from '../shared/android-back.js';\n\nhandleAndroidBack();\n",
  );
  try {
    await build({ root: src, configFile: false, base: './', logLevel: 'warn', build: { outDir: HUB_APP_DIR, emptyOutDir: true } });
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
  }

  for (const game of games) fs.cpSync(game.distDir, path.join(HUB_APP_DIR, game.id), { recursive: true });
  console.log(`Hub app in dist-app/ with ${games.length} game(s): ${games.map((g) => g.id).join(', ')}`);
  return { ...HUB_APP, webDir: HUB_APP_DIR };
}

const target = process.argv[2] === '--hub' ? await prepareHub() : await prepareGame(process.argv[2]);

const capConfig = {
  appId: target.appId,
  appName: target.name,
  webDir: path.relative(ROOT, target.webDir),
  android: { backgroundColor: '#10132a' },
};
fs.writeFileSync(path.join(ROOT, 'capacitor.config.json'), JSON.stringify(capConfig, null, 2) + '\n');

// Read by android/app/build.gradle. Properties files are Latin-1, so escape
// anything else; apostrophes need escaping for Android string resources.
const escape = (value) =>
  value.replace(/'/g, "\\\\'").replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
fs.writeFileSync(path.join(ROOT, 'android', 'game.properties'), `appId=${target.appId}\nappName=${escape(target.name)}\n`);

run('npx cap sync android');
