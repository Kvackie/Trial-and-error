// Write <site>/index.html listing every game that has been built into <site>/<game>/.
// Usage: npm run hub -- [site dir, default dist]
import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, listGames } from './games.mjs';

const siteDir = path.resolve(process.argv[2] ?? DIST_DIR);
const repo = process.env.GITHUB_REPOSITORY;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function readBuildInfo(id) {
  try {
    return JSON.parse(fs.readFileSync(path.join(siteDir, id, 'build.json'), 'utf8'));
  } catch {
    return {};
  }
}

const games = listGames().filter((game) => fs.existsSync(path.join(siteDir, game.id, 'index.html')));

const cards = games
  .map((game) => {
    const info = readBuildInfo(game.id);
    const apk =
      info.apk && repo
        ? `<a class="apk" href="https://github.com/${repo}/releases/download/${game.id}-latest/${game.id}.apk">Android APK</a>`
        : '';
    const updated = info.builtAt ? `<p class="meta">Updated ${escapeHtml(info.builtAt.slice(0, 10))}</p>` : '';
    return `      <li class="card">
        <a class="play" href="./${game.id}/">
          <h2>${escapeHtml(game.name)}</h2>
          <p>${escapeHtml(game.description)}</p>
          <span class="cta">Play &#9654;</span>
        </a>
        ${updated}${apk}
      </li>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#10132a" />
    <title>Trial and Error</title>
    <style>
      :root { color-scheme: dark; --bg: #10132a; --card: #1c2046; --card-hover: #252a5a; --text: #f4f4fb; --muted: #a3a6c8; --accent: #ffd166; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
      main { max-width: 720px; margin: 0 auto; padding: 32px 16px 48px; }
      h1 { margin: 0 0 4px; font-size: 2rem; }
      .intro { margin: 0 0 24px; color: var(--muted); }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
      .card {
        position: relative;
        background: var(--card);
        border: 2px solid transparent;
        border-radius: 14px;
        padding: 16px;
        transition: border-color 0.15s, background 0.15s, transform 0.1s;
      }
      .card:hover { border-color: var(--accent); background: var(--card-hover); }
      .card:active { transform: scale(0.98); }
      .card:has(.play:focus-visible) { border-color: var(--accent); }
      .play { color: inherit; text-decoration: none; display: block; outline: none; }
      /* Stretch the play link over the whole card so any tap on it opens the game. */
      .play::after { content: ""; position: absolute; inset: 0; border-radius: 12px; }
      .play h2 { margin: 0 0 6px; font-size: 1.25rem; color: var(--accent); }
      .play p { margin: 0; line-height: 1.4; }
      .cta {
        display: inline-block;
        margin-top: 14px;
        padding: 10px 22px;
        border-radius: 999px;
        background: var(--accent);
        color: var(--bg);
        font-weight: 700;
      }
      .meta { margin: 10px 0 0; font-size: 0.85rem; color: var(--muted); }
      /* Sits above the stretched play link so it stays separately tappable. */
      .apk { position: relative; z-index: 1; display: inline-block; margin-top: 10px; font-size: 0.9rem; color: var(--text); }
      .empty { color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <h1>Trial and Error</h1>
      <p class="intro">Small games you can play right in your browser.</p>
${games.length ? `      <ul>\n${cards}\n      </ul>` : '      <p class="empty">No games published yet.</p>'}
    </main>
  </body>
</html>
`;

fs.mkdirSync(siteDir, { recursive: true });
fs.writeFileSync(path.join(siteDir, 'index.html'), html);
console.log(`Hub written to ${path.relative(process.cwd(), siteDir) || '.'}/index.html with ${games.length} game(s).`);
