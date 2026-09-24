# Trial and Error

A collection of small mobile games built with [Phaser](https://phaser.io/) (2D) and [Three.js](https://threejs.org/) (3D). Each game lives in its own folder and is built and published on its own. Every game can be played in the browser (GitHub Pages) and installed as an Android app (wrapped with [Capacitor](https://capacitorjs.com/)).

- Hub page: `https://kvackie.github.io/Trial-and-error/`
- One game: `https://kvackie.github.io/Trial-and-error/<game>/`

All games are **mobile first, desktop second**: designed for a phone held upright and played by touch, then checked on desktop. The rules every game follows (and that coding agents working here must follow) are in [AGENTS.md](AGENTS.md).

## Games

| Game (Swedish name) | Folder | What it is |
|---|---|---|
| Block Drop (Blockfall) | `games/block-drop/` | Falling-blocks puzzle, played with four on-screen buttons. |
| Potion Match (Trolldrycker) | `games/potion-match/` | Match-three with potion art from Eternal Alchemy. Matches are free, misses cost a move. |
| Lantern Maze (Lyktlabyrinten) | `games/lantern-maze/` | Ever-growing mazes lit only by your lantern. Dead ends hold arithmetic puzzles; checkpoints every 5 levels. |
| Wild Pond (Vilda dammen) | `games/wild-pond/` | Breed drawn-in-code pond creatures to discover rare features, and trade them with other players through a shared online pond. |
| Potion Market (Trolldrycksmarknaden) | `games/potion-market/` | Brew potions by balancing five essences (art and recipes from Eternal Alchemy) and sell them on a market shared by every player. |
| Hex Hold (Hexfästet) | `games/hex-hold/` | 3D (Three.js): build a town on a terraced hex island with rivers and islets, gather and trade resources, train heroes who level up, raid dungeons, wall in the town, raise wonders, and hold out against monster waves and titans that pour out of growing nests. Tutorial, builder queue, speed control and attack alerts. Real time; the town keeps producing for up to 8 hours while closed. |

Every 2D game has the same frame around it (3D games choose their own, see [Add a 3D game](#add-a-3d-game)):

- **Header buttons:** Home (top left: back to the hub, or closes a single-game APK), a trophy for the
  global leaderboard, a gear for Settings and **?** for How to play. Dialogs pause the game.
- **Settings:** English or Swedish (🇬🇧 / 🇸🇪 flags), sound on/off and volume. The choices are stored
  once per device and shared by every game and the hub; the language switches live, mid-game.
- **Controls:** touch first (taps, swipes, on-screen buttons), plus the same keys everywhere:
  **W A S D** to move or steer, **Space** to confirm or trigger the special action.
- **Sound effects,** generated in code (no audio files).
- **An icon,** shown on the hub and as the browser tab icon.

## Layout

```
games/<game>/      one folder per game: index.html, src/, public/, game.json (and test/, tools/ where needed)
template/          starting point copied by `npm run new-game` (Phaser, 2D)
template-3d/       starting point copied by `npm run new-game -- <game> "Name" --3d` (Three.js)
leaderboard/       online service: leaderboard, shared pond and market (Cloudflare Worker + D1 database)
shared/            code and assets every game reuses (see below)
scripts/           build, dev, hub and Android helpers
android/           shared Android project, reused for every game
.github/workflows/ build.yml (build and publish games) and leaderboard.yml (deploy the leaderboard)
dist/, dist-app/   build output (not committed)
```

`game.json` holds the game's display name and a one-line description for the hub page (English, plus a Swedish `sv` block), its hub icon (a file in the game's `public/` folder, also used as the browser tab icon), and its Android app ID (which must be unique per game).

### Shared code

Games import these with `../../../shared/<file>` from their `src/` folder:

| File | What it gives a game |
|---|---|
| `shared/screen.js` | `scaleConfig()`: a portrait canvas 720 units wide whose height follows the screen's shape, so the playfield can use the whole phone screen. |
| `shared/help-dialog.js` | `openHelpDialog()`: the scrollable "How to play" window opened by each game's **?** button. |
| `shared/game-over-scene.js` | `createGameOverScene('<game>:best')`: score, best score and tap to play again. |
| `shared/keyboard.js` | `bindKeys()`: the keyboard controls every game shares: W A S D to move or steer, Space to confirm or trigger the special action. |
| `shared/i18n.js` | English and Swedish: `t()` for shared text, `makeT()` for a game's own `strings.js`, `bindText()` to keep Phaser text in the current language. The choice is stored once per device and followed by every game and the hub. |
| `shared/settings.js` | `addSettingsButton()`: the gear button opening Settings with the language flags, sound on/off and volume. |
| `shared/sound.js` | `playSound(name)`: sound effects synthesised with Web Audio (no audio files), respecting the volume and mute settings. |
| `shared/flags.js` | The 🇬🇧 / 🇸🇪 flags as inline SVG, for the settings dialog and the hub. |
| `shared/leaderboard.js` | The global leaderboard: `addTrophyButton()`, `openLeaderboard()` and `promptSubmit()`. Hidden when a build has no leaderboard address. Also `apiGet()` / `apiPost()` for a game's own online data, and `askName()` for the player's nickname (asked once, shared by every game). |
| `shared/focus.js` | `addFocus()`: a keyboard frame for games played by tapping things on screen: W A S D move it between rows of targets, Space taps. |
| `shared/toast.js` | `showToast()`: a short message that floats up and fades out. |
| `shared/home-button.js` | `addHomeButton()`: the round Home button at the top left of every game. Back to the hub on the website and in the all-games app; closes a single-game APK. |
| `shared/android-back.js` | `handleAndroidBack()`: in the APKs, Android's Back button goes back a page (a game back to the hub in the all-games app) or closes the app. Every game calls it in `main.js`. |

When a second game needs something that already exists in one game, move it into `shared/` instead of copying it.

## Develop

```sh
npm install
npm run dev -- block-drop        # http://localhost:5173, also reachable from your phone on the same network
npm run build -- block-drop      # builds into dist/block-drop/
npm run hub                      # writes dist/index.html listing the games built into dist/
npm test                         # the game-rules tests in games/*/test/
```

The hub page (`scripts/build-hub.mjs`) lists every game built into the site, then a **More games** section
linking to the owner's other published games (Eternal Alchemy and Dark Fantasy Settlement). Those links,
their descriptions and icons are in `OTHER_GAMES` at the top of that script.

### Add a game

```sh
npm run new-game -- my-game "My Game"
```

This copies `template/` to `games/my-game/`, fills in the game's id and name (`game.json`, storage and leaderboard keys), and adds `my-game` to the workflow's dropdown. Commit and push, and it can be selected in the workflow.

The template is a small working example game (tap the circle for 30 seconds) that already has everything a game here needs, so you replace the example rather than wire things up:

- the header: Home, trophy (leaderboard), gear (settings) and **?** (help) buttons, with the game paused while a dialog is open;
- English and Swedish text in `src/strings.js` and `src/help.js`, following a language change live;
- the Space key through `bindKeys()`, sounds through `playSound()`, and the shared Game Over screen with its leaderboard prompt;
- a transparent canvas over a CSS gradient, and `<game>:best` as the best-score key.

Then, before calling the game done (see [AGENTS.md](AGENTS.md) for the rules):

- replace the example in `src/scenes/GameScene.js` with the real game, keeping rules that need testing in their own file;
- rewrite `src/strings.js`, the help text and the `sv` block in `game.json` in both languages, and add W/A/S/D keys if the game has anything to move;
- draw its own `public/icon.svg` (or `.png`, named in `game.json`);
- add the game to `leaderboard/src/rules.js` with a maximum score and run **Deploy leaderboard**, or remove the trophy button and the `leaderboard` option if the game has no score.

### Add a 3D game

```sh
npm run new-game -- my-game "My Game" --3d
```

3D games use [Three.js](https://threejs.org/) instead of Phaser. They are built, listed on the hub and packaged
as APKs exactly like the other games (the workflow needs nothing extra), but they don't have to use `shared/`:
each one is its own page. `template-3d/` is a small working example (tap the crystal, W A S D turn the camera)
with a full-screen renderer that follows the screen size, a Home button, models built in code and a pause while
the page is hidden. The rules for 3D games are in [AGENTS.md](AGENTS.md#3d-games).

A 3D game may still use the shared modules that don't need Phaser: Hex Hold uses the dialogs, settings,
languages and sounds, and draws its own HTML header and panels over the 3D view.

### Hex Hold's tools

- **Models:** `games/hex-hold/tools/pack-models.mjs` packs the KayKit models listed in `src/models.js` into
  a few files in `public/models/` (losslessly: shared textures and meshes, and only the animations the
  game plays). Clone the three KayKit packs named in `games/hex-hold/CREDITS.md` into one folder, then
  run `node games/hex-hold/tools/pack-models.mjs <that folder>`. Add a model name to `src/models.js`
  and re-run it to use another model.
- **Balance:** `node games/hex-hold/tools/balance.mjs [minutes] [islands] [balanced|economy|idle]`
  plays the game at high speed with a scripted player and reports how resources grow, how each wave
  goes, how dungeons turn out, and when nests fall and wonders go up. Re-run it after changing numbers in
  `src/data.js`.
- **Old saves:** islands are rebuilt from their seed when loaded, so a change to the island generator
  must keep old islands the same: bump `WORLD_VERSION` in `src/world.js` and keep the old path for
  saves made before it (rivers and islets came in version 2).

## Build and deploy

`.github/workflows/build.yml` only runs when you start it: **Actions → Build and deploy → Run workflow**. Pick the branch, a game from the dropdown (or **all** to build every game), and two checkboxes, both off by default: **Also build the Android APK** (one app per selected game) and **Also build the all-games hub app** (one app with every game). If the Cloudflare secrets are set, the build also bakes in the leaderboard's address (see [Leaderboard](#leaderboard)).

Only the selected games are built. There is no separate CI and production setup:

| Job | Every run | Default branch only |
|---|---|---|
| `web` | builds each selected game (one `web` workflow artifact) | |
| `android` | only if APKs were requested: builds `<game>.apk` for each game, side by side (workflow artifacts) | publishes each to the game's `<game>-latest` release |
| `hub-android` | only if the hub app was requested: builds `trial-and-error.apk`, every game in one app (workflow artifact) | publishes it to the `hub-latest` release |
| `deploy` | | replaces only the built games' folders on the `gh-pages` branch and regenerates the hub page, in one push |

The **hub app** is one Android app that opens on the game list and has every game inside it, playable offline; Back returns from a game to the list. It always contains every game in `games/`, whichever game is picked in the dropdown. Once it has been published, the website hub links to it.

Games that weren't built are never touched on `gh-pages`. The APK's `versionCode` is the workflow run number, so each new build installs over the previous one. `all` is a reserved name, so no game can be called that.

### Build an APK locally (optional)

Requires JDK 21 and the Android SDK.

```sh
npm run android -- block-drop    # one game as its own app
npm run android:hub              # or: every game in one app (built into dist-app/)
cd android && ./gradlew assembleRelease
```

## Languages

All text exists in English and Swedish.

- **Shared text** (Game Over, dialogs, settings, leaderboard) lives in `shared/i18n.js`.
- **A game's own text** lives in its `src/strings.js`, made with `makeT({ en: {...}, sv: {...} })`. Use
  `{name}` placeholders for values, e.g. `tr('stats', { level, lines })`.
- **Text on the canvas** is created with `bindText(scene, text, () => tr('key'))`, or refreshed in an
  `onSceneLangChange(scene, fn)` handler, so it follows a language change mid-game.
- **Help dialogs** keep an English and a Swedish version side by side in the game's `help.js`.
- **The hub** takes names and descriptions from `game.json` (`name`, `description` and the `sv` block).
- **Adding a language** means adding it to `LANGUAGES` and the shared strings in `shared/i18n.js`, a
  flag in `shared/flags.js`, and a block in every `strings.js`, help dialog and `game.json`.

## Sound

`shared/sound.js` synthesises every effect with Web Audio when it plays, so there are no audio files to
license or download. Games call `playSound('name')`; the available names are listed in `SOUNDS` in that
file (general: `click`, `gameOver`; pieces: `move`, `rotate`, `drop`, `clear`; matching: `select`,
`swap`, `invalid`, `match`, `special`, `blast`, `shuffle`; exploring: `step`, `bump`, `chest`, `correct`,
`wrong`, `levelUp`, `checkpoint`; creatures: `hatch`, `splash`, `catch`, `discover`; shop: `bubble`,
`brew`, `coin`; town and battle: `hammer`, `clash`, `twang`, `spell`, `horn`, `alarm`, `crumble`). Add new sounds there rather than in a game. Volume and mute come from
Settings and apply to every game.

## Leaderboard and online play

A global top-scores list per game, reached from the trophy button in each game. A new
best offers to go on it under a nickname (remembered on the device). Offline scores in
the APKs are sent when the device is back online.

The same service holds the data the online games share:

- **Wild Pond:** creatures released into the shared pond (genes, nickname, device id; the
  oldest go once there are 400), fished out by other players.
- **Potion Market:** one "selling pressure" number per potion, which lowers its price for
  everyone and halves every 6 hours. The daily hot potion and the merchant's stock are
  worked out from the date, so they need no storage.
- **First finds:** the first nickname to find each rare Wild Pond feature or brew each
  Potion Market recipe.

The rules those routes check (possible genes, prices) are the games' own files
(`games/wild-pond/src/genes.js`, `games/potion-market/src/economy.js`), imported by the
Worker. Every write is rate-limited per device and per network, and each costs only a
few database rows, so the service stays well inside Cloudflare's free plan. Without the
service (a local build, or offline), Wild Pond catches wild creatures and Potion Market
uses a market kept on the device.

- **Service:** `leaderboard/` is a Cloudflare Worker with a D1 database. It accepts scores
  only from the published site, the Android apps and local development, rejects
  impossible scores, allows one score per device every 15 seconds, and keeps the top 100
  per game. It stores the nickname, score, date and a random device id; network
  addresses are only kept as a salted hash for an hour, for rate limiting.
- **Deploy it:** **Actions → Deploy leaderboard → Run workflow**. The first run creates
  the database. Needs the repo secrets `CLOUDFLARE_API_TOKEN` (Workers and D1 edit
  rights) and `CLOUDFLARE_ACCOUNT_ID`.
- **Connecting the games:** the build workflow looks up the service's address with the
  same secrets and builds it into the games. Rebuild the games after the first deploy.
- **Adding a game:** add it to `GAMES` in `leaderboard/src/rules.js` (with a maximum
  believable score), redeploy, and add a trophy button plus a `leaderboard` option on its
  Game Over screen.
- **Removing a bad score:** Cloudflare dashboard → Storage & Databases → D1 →
  `trial-and-error-leaderboard` → Console, e.g.
  `DELETE FROM scores WHERE game = 'block-drop' AND name = 'Cheater';`
- **Local development:**
  ```sh
  cd leaderboard && npm install && npm test
  npx wrangler d1 execute trial-and-error-leaderboard --local --file schema.sql
  npx wrangler dev --port 8787
  # in another terminal, from the repo root:
  VITE_LEADERBOARD_URL=http://127.0.0.1:8787 npm run dev -- block-drop
  ```
- **Game rules tests:** `npm test` from the repo root runs the Node tests in `games/*/test/`.
