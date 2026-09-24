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
import { FLAGS } from '../shared/flags.js';

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

// The owner's other games, published from their own repos. Icons are the games' own tab icons.
const OTHER_GAMES = [
  {
    url: 'https://kvackie.github.io/eternal-alchemy/',
    name: 'Eternal Alchemy',
    en: 'A cozy fantasy potion shop. Grow it, brew it, seal it, sell it.',
    sv: 'En mysig trolldrycksbutik. Odla, brygg, försegla och sälj.',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230f1412'/%3E%3Cpath d='M13 5h6v7.4l5.4 10.2A3 3 0 0 1 21.7 27H10.3a3 3 0 0 1-2.7-4.4L13 12.4V5z' fill='none' stroke='%23d9a441' stroke-width='2' stroke-linejoin='round'/%3E%3Cpath d='M10.4 19h11.2l2.8 5.2A2 2 0 0 1 22.6 27H9.4a2 2 0 0 1-1.8-2.8L10.4 19z' fill='%237fb8a0'/%3E%3C/svg%3E",
  },
  {
    url: 'https://kvackie.github.io/dark-fantasy-management/',
    name: 'Dark Fantasy Settlement',
    en: 'A grim settlement builder. Raise a frontier town, staff it with heroes, and push back the fog.',
    sv: 'Ett dystert bosättningsspel. Bygg en gränsstad, bemanna den med hjältar och tryck tillbaka dimman.',
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230d0b0c'/%3E%3Cpath d='M9 27V12l3-2 3 2v15M17 27V8l3-3 3 3v19M6 27h20' fill='none' stroke='%23d0a170' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
];

// Both languages are in the page; the flags (and the shared 'settings:lang' choice
// the games also use) pick which one shows.
const both = (en, sv) => `<span data-l="en">${en}</span><span data-l="sv">${sv}</span>`;

const TEXT = {
  intro: both('Small games you can play right in your browser.', 'Små spel som du kan spela direkt i webbläsaren.'),
  appIntro: both(
    'Pick a game. Tap the home button or press Back to return here.',
    'Välj ett spel. Tryck på hemknappen eller Tillbaka för att komma hit igen.',
  ),
  apk: both('Android app (APK)', 'Android-app (APK)'),
  allApk: both('All games in one Android app (APK)', 'Alla spel i en Android-app (APK)'),
  updated: (date) => both(`Updated ${date}`, `Uppdaterad ${date}`),
  site: (version) => both(`Site version ${version}`, `Webbplatsens version ${version}`),
  more: both('More games', 'Fler spel'),
};

export function renderHub(siteDir, { app = false, repo = process.env.GITHUB_REPOSITORY, run = process.env.GITHUB_RUN_NUMBER, scripts = '' } = {}) {
  // The whole site's version: the run that last published it (none for a local build).
  const siteVersion = run ? `v${escapeHtml(String(run))} · ${new Date().toISOString().slice(0, 10)}` : '';
  const games = listGames().filter((game) => fs.existsSync(path.join(siteDir, game.id, 'index.html')));
  const download = (tag, file) => `https://github.com/${repo}/releases/download/${tag}/${file}`;

  const cards = games
    .map((game) => {
      const info = app ? {} : readJson(path.join(siteDir, game.id, 'build.json'));
      const apk = info.apk && repo ? `<a class="apk" href="${download(`${game.id}-latest`, `${game.id}.apk`)}">${TEXT.apk}</a>` : '';
      // Version: the build workflow's run number that last built the game, and when.
      const version = info.run ? ` · v${escapeHtml(String(info.run))}` : '';
      const updated = info.builtAt ? `<p class="meta">${TEXT.updated(escapeHtml(info.builtAt.slice(0, 10)))}${version}</p>` : '';
      const sv = game.sv ?? {};
      const icon = game.icon ? `<img class="icon" src="./${game.id}/${escapeHtml(game.icon)}" alt="" width="72" height="72" />` : '';
      return `      <li class="card">
        <a class="play" href="./${game.id}/${app ? 'index.html' : ''}">
          ${icon}
          <div>
            <h2>${both(escapeHtml(game.name), escapeHtml(sv.name ?? game.name))}</h2>
            <p>${both(escapeHtml(game.description), escapeHtml(sv.description ?? game.description))}</p>
          </div>
        </a>
        ${updated}${apk}
      </li>`;
    })
    .join('\n');

  const hubApp = !app && repo && readJson(path.join(siteDir, 'app.json')).apk;

  // Links out to the owner's other games (they open their own sites).
  const others = OTHER_GAMES.map(
    (g) => `      <li class="card">
        <a class="play" href="${g.url}" target="_blank" rel="noopener">
          <img class="icon" src="${g.icon}" alt="" width="72" height="72" />
          <div>
            <h2>${escapeHtml(g.name)} <span class="ext" aria-hidden="true">↗</span></h2>
            <p>${both(escapeHtml(g.en), escapeHtml(g.sv))}</p>
          </div>
        </a>
      </li>`,
  ).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#10132a" />
    <title>Trial and Error</title>
    <link rel="icon" href="data:," />
    <script>
      // Same language choice as the games (shared/i18n.js).
      (function () {
        var lang;
        try { lang = localStorage.getItem('settings:lang'); } catch (e) {}
        if (lang !== 'en' && lang !== 'sv') lang = /^sv\\b/i.test(navigator.language || '') ? 'sv' : 'en';
        document.documentElement.lang = lang;
      })();
    </script>
    <style>
      :root { color-scheme: dark; --bg: #10132a; --card: #1c2046; --frame: #5a5e8f; --text: #f4f4fb; --muted: #a3a6c8; --accent: #ffd166; }
      * { box-sizing: border-box; }
      html[lang="sv"] [data-l="en"], html:not([lang="sv"]) [data-l="sv"] { display: none; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
      main { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      h1 { margin: 0; font-size: 2rem; }
      .langs { display: flex; gap: 8px; }
      .langs button { display: grid; place-items: center; width: 52px; height: 44px; border-radius: 10px; cursor: pointer;
        border: 2px solid transparent; background: rgba(255, 255, 255, 0.06); }
      .langs button[aria-pressed="true"] { border-color: var(--accent); background: rgba(255, 255, 255, 0.14); }
      .intro { margin: 6px 0 24px; color: var(--muted); }
      .all-apk { display: inline-block; margin: -12px 0 24px; color: var(--text); }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
      .card { background: var(--card); border-radius: 14px; padding: 16px; }
      /* The framed icon, title and description are the link that opens the game. */
      .play {
        color: inherit;
        text-decoration: none;
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid var(--frame);
        border-radius: 10px;
        transition: border-color 0.15s;
      }
      .play:hover, .play:focus-visible { border-color: var(--accent); outline: none; }
      .icon { flex: none; width: 72px; height: 72px; border-radius: 16px; }
      .play h2 { margin: 0 0 6px; font-size: 1.25rem; color: var(--accent); }
      .play p { margin: 0; line-height: 1.4; }
      .meta { margin: 10px 0 0; font-size: 0.85rem; color: var(--muted); }
      .version { margin: 32px 0 0; text-align: center; font-size: 0.8rem; color: var(--muted); }
      .apk { display: inline-block; margin-top: 10px; font-size: 0.9rem; color: var(--text); }
      .empty { color: var(--muted); }
      .more { margin: 32px 0 12px; font-size: 1.2rem; color: var(--muted); font-weight: 600; }
      .ext { font-size: 0.9rem; color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Trial and Error</h1>
        <div class="langs" role="group" aria-label="Language / Språk">
          <button data-set-lang="en" aria-label="English">${FLAGS.en}</button>
          <button data-set-lang="sv" aria-label="Svenska">${FLAGS.sv}</button>
        </div>
      </header>
      <p class="intro">${app ? TEXT.appIntro : TEXT.intro}</p>
${hubApp ? `      <a class="all-apk" href="${download(HUB_APP.tag, HUB_APP.file)}">${TEXT.allApk}</a>\n` : ''}${
    games.length ? `      <ul>\n${cards}\n      </ul>` : `      <p class="empty">${both('No games published yet.', 'Inga spel publicerade än.')}</p>`
  }
      <h2 class="more">${TEXT.more}</h2>
      <ul>
${others}
      </ul>
${siteVersion ? `      <p class="version">${TEXT.site(siteVersion)}</p>
` : ''}    </main>
    <script>
      document.querySelectorAll('[data-set-lang]').forEach(function (button) {
        var mark = function () { button.setAttribute('aria-pressed', String(button.dataset.setLang === document.documentElement.lang)); };
        mark();
        button.addEventListener('click', function () {
          document.documentElement.lang = button.dataset.setLang;
          try { localStorage.setItem('settings:lang', button.dataset.setLang); } catch (e) {}
          document.querySelectorAll('[data-set-lang]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.setLang === button.dataset.setLang));
          });
        });
      });
    </script>${scripts}
  </body>
</html>
`;
}

// Run directly: write the website hub.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteDir = path.resolve(process.argv[2] ?? DIST_DIR);
  fs.mkdirSync(siteDir, { recursive: true });
  const html = renderHub(siteDir);
  fs.writeFileSync(path.join(siteDir, 'index.html'), html);
  const count = (html.match(/class="card"/g) ?? []).length;
  console.log(`Hub written to ${path.relative(process.cwd(), siteDir) || '.'}/index.html with ${count} game(s).`);
}
