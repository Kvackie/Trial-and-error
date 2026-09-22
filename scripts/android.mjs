// Prepare the shared Android project for one game: build it (unless dist/<game>
// already exists), point Capacitor at it and set the app id and name.
// Usage: npm run android -- <game>        then: cd android && ./gradlew assembleRelease
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, getGame } from './games.mjs';

const game = getGame(process.argv[2]);
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

if (!fs.existsSync(path.join(game.distDir, 'index.html'))) {
  run(`node scripts/build.mjs ${game.id}`);
}

const capConfig = {
  appId: game.appId,
  appName: game.name,
  webDir: path.relative(ROOT, game.distDir),
  android: { backgroundColor: '#10132a' },
};
fs.writeFileSync(path.join(ROOT, 'capacitor.config.json'), JSON.stringify(capConfig, null, 2) + '\n');

// Read by android/app/build.gradle. Properties files are Latin-1, so escape
// anything else; apostrophes need escaping for Android string resources.
const escape = (value) =>
  value.replace(/'/g, "\\\\'").replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
fs.writeFileSync(
  path.join(ROOT, 'android', 'game.properties'),
  `appId=${game.appId}\nappName=${escape(game.name)}\n`,
);

run('npx cap sync android');
