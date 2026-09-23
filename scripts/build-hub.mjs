// Hub page listing every game that has been built into <site>/<game>/.
//
// Website:  npm run hub -- [site dir, default dist]   writes <site>/index.html
// App:      renderHub(siteDir, { app: true })         used by `npm run android:hub`
//
// The app version links straight to each game's index.html (the Android app's
// local server would send a bare folder path back to the hub), and leaves out
// download links and dates, which make no sense inside the app.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DIST_DIR, listGames } from './games.mjs';

// The all-games Android app, published by the workflow's hub-android job.
export const HUB_APP = { tag: 'hub-latest', file: 'trial-and-error.apk' };

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

export function renderHub(siteDir, { app = false, repo = process.env.GITHUB_REPOSITORY, scripts = '' } = {}) {
  const games = listGames().filter((game) => fs.existsSync(path.join(siteDir, game.id, 'index.html')));
  const download = (tag, file) => `https://github.com/${repo}/releases/download/${tag}/${file}`;

  const cards = games
    .map((game) => {
      const info = app ? {} : readJson(path.join(siteDir, game.id, 'build.json'));
      const apk =
        info.apk && repo ? `<a class="apk" href="${download(`${game.id}-latest`, `${game.id}.apk`)}">Android APK</a>` : '';
      const updated = info.builtAt ? `<p class="meta">Updated ${escapeHtml(info.builtAt.slice(0, 10))}</p>` : '';
      return `      <li class="card">
        <a class="play" href="./${game.id}/${app ? 'index.html' : ''}">
          <h2>${escapeHtml(game.name)}</h2>
          <p>${escapeHtml(game.description)}</p>
        </a>
        ${updated}${apk}
      </li>`;
    })
    .join('\n');

  const hubApp = !app && repo && readJson(path.join(siteDir, 'app.json')).apk;
  const intro = app ? 'Pick a game. Tap the home button or press Back to return here.' : 'Small games you can play right in your browser.';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#10132a" />
    <title>Trial and Error</title>
    <link rel="icon" href="data:," />
    <style>
      :root { color-scheme: dark; --bg: #10132a; --card: #1c2046; --frame: #5a5e8f; --text: #f4f4fb; --muted: #a3a6c8; --accent: #ffd166; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
      main { max-width: 720px; margin: 0 auto; padding: 32px 16px 48px; }
      h1 { margin: 0 0 4px; font-size: 2rem; }
      .intro { margin: 0 0 24px; color: var(--muted); }
      .all-apk { display: inline-block; margin: -12px 0 24px; color: var(--text); }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
      .card { background: var(--card); border-radius: 14px; padding: 16px; }
      /* The framed title and description are the link that opens the game. */
      .play {
        color: inherit;
        text-decoration: none;
        display: block;
        padding: 12px 14px;
        border: 1px solid var(--frame);
        border-radius: 10px;
        transition: border-color 0.15s;
      }
      .play:hover, .play:focus-visible { border-color: var(--accent); outline: none; }
      .play h2 { margin: 0 0 6px; font-size: 1.25rem; color: var(--accent); }
      .play p { margin: 0; line-height: 1.4; }
      .meta { margin: 10px 0 0; font-size: 0.85rem; color: var(--muted); }
      .apk { display: inline-block; margin-top: 10px; font-size: 0.9rem; color: var(--text); }
      .empty { color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <h1>Trial and Error</h1>
      <p class="intro">${intro}</p>
${hubApp ? `      <a class="all-apk" href="${download(HUB_APP.tag, HUB_APP.file)}">All games in one Android app (APK)</a>\n` : ''}${
    games.length ? `      <ul>\n${cards}\n      </ul>` : '      <p class="empty">No games published yet.</p>'
  }
    </main>${scripts}
  </body>
</html>
`;
}

// Run directly: write the website hub.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = path.resolve(process.argv[2] ?? DIST_DIR);
  fs.mkdirSync(siteDir, { recursive: true });
  const html = renderHub(siteDir);
  fs.writeFileSync(path.join(siteDir, 'index.html'), html);
  const count = (html.match(/class="card"/g) ?? []).length;
  console.log(`Hub written to ${path.relative(process.cwd(), siteDir) || '.'}/index.html with ${count} game(s).`);
}
