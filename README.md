# Trial and Error

A collection of small mobile games built with [Phaser](https://phaser.io/). Each game lives in its own folder and is built and published on its own. Every game can be played in the browser (GitHub Pages) and installed as an Android app (wrapped with [Capacitor](https://capacitorjs.com/)).

- Hub page: `https://kvackie.github.io/Trial-and-error/`
- One game: `https://kvackie.github.io/Trial-and-error/<game>/`

All games are **mobile first, desktop second**: designed for a phone held upright and played by touch, then checked on desktop. The rules every game follows (and that coding agents working here must follow) are in [AGENTS.md](AGENTS.md).

## Games

| Game | Folder | What it is |
|---|---|---|
| Block Drop | `games/block-drop/` | Falling-blocks puzzle, played with four on-screen buttons. |
| Potion Match | `games/potion-match/` | Match-three with potion art from Eternal Alchemy. Matches are free, misses cost a move. |
| Lantern Maze | `games/lantern-maze/` | Ever-growing mazes lit only by your lantern. Dead ends hold arithmetic puzzles; checkpoints every 5 levels. |

## Layout

```
games/<game>/      one folder per game: index.html, src/, public/, game.json
template/          starting point copied by `npm run new-game`
shared/            code and assets every game reuses (see below)
scripts/           build, dev, hub and Android helpers
android/           shared Android project, reused for every game
```

`game.json` holds the game's display name, a one-line description for the hub page, and its Android app ID (which must be unique per game).

### Shared code

Games import these with `../../../shared/<file>` from their `src/` folder:

| File | What it gives a game |
|---|---|
| `shared/screen.js` | `scaleConfig()`: a portrait canvas 720 units wide whose height follows the screen's shape, so the playfield can use the whole phone screen. |
| `shared/help-dialog.js` | `openHelpDialog()`: the scrollable "How to play" window opened by each game's **?** button. |
| `shared/game-over-scene.js` | `createGameOverScene('<game>:best')`: score, best score and tap to play again. |
| `shared/keyboard.js` | `bindKeys()`: the keyboard controls every game shares: W A S D to move or steer, Space to confirm or trigger the special action. |
| `shared/home-button.js` | `addHomeButton()`: the round Home button at the top left of every game. Back to the hub on the website and in the all-games app; closes a single-game APK. |
| `shared/android-back.js` | `handleAndroidBack()`: in the APKs, Android's Back button goes back a page (a game back to the hub in the all-games app) or closes the app. Every game calls it in `main.js`. |

When a second game needs something that already exists in one game, move it into `shared/` instead of copying it.

## Develop

```sh
npm install
npm run dev -- block-drop        # http://localhost:5173, also reachable from your phone on the same network
npm run build -- block-drop      # builds into dist/block-drop/
npm run hub                      # writes dist/index.html listing the games built into dist/
```

### Add a game

```sh
npm run new-game -- my-game "My Game"
```

This copies `template/` to `games/my-game/`, fills in `game.json`, and adds `my-game` to the workflow's dropdown. The template already uses the shared screen sizing. Commit and push, and it can be selected in the workflow.

## Build and deploy

`.github/workflows/build.yml` only runs when you start it: **Actions → Build and deploy → Run workflow**. Pick the branch, a game from the dropdown (or **all** to build every game), and whether to build APKs (off by default).

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
