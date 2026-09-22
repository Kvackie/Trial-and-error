# Trial and Error

A collection of small mobile games built with [Phaser](https://phaser.io/). Each game lives in its own folder and is built and published on its own. Every game can be played in the browser (GitHub Pages) and installed as an Android app (wrapped with [Capacitor](https://capacitorjs.com/)).

- Hub page: `https://kvackie.github.io/Trial-and-error/`
- One game: `https://kvackie.github.io/Trial-and-error/<game>/`

## Layout

```
games/<game>/      one folder per game: index.html, src/, public/, game.json
template/          starting point copied by `npm run new-game`
scripts/           build, dev, hub and Android helpers
android/           shared Android project, reused for every game
```

`game.json` holds the game's display name, a one-line description for the hub page, and its Android app ID (which must be unique per game).

## Develop

```sh
npm install
npm run dev -- star-catcher      # http://localhost:5173, also reachable from your phone on the same network
npm run build -- star-catcher    # builds into dist/star-catcher/
npm run hub                      # writes dist/index.html listing the games built into dist/
```

### Add a game

```sh
npm run new-game -- my-game "My Game"
```

This copies `template/` to `games/my-game/`, fills in `game.json`, and adds `my-game` to the workflow's dropdown. Commit and push, and it can be selected in the workflow.

## Build and deploy

`.github/workflows/build.yml` only runs when you start it: **Actions → Build and deploy → Run workflow**. Pick the branch, the game from the dropdown, and whether to build the APK.

Only the selected game is built. There is no separate CI and production setup:

| Job | Every run | Default branch only |
|---|---|---|
| `web` | builds the game (workflow artifact) | |
| `android` | builds `<game>.apk` (workflow artifact) | publishes it to the `<game>-latest` release |
| `deploy` | | replaces only `<game>/` on the `gh-pages` branch and regenerates the hub page |

Other games already on `gh-pages` are never touched. The APK's `versionCode` is the workflow run number, so each new build installs over the previous one.

### One-time repository setup

1. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.
   The `gh-pages` branch is created by the first deploy, so run the workflow once before selecting it.
2. **Settings → Actions → General → Workflow permissions: Read and write permissions.**
3. *(Recommended)* Add a signing key so every APK is signed with the same key.
   Otherwise each build is signed with a different throwaway debug key, and Android
   makes you uninstall the old version before installing the new one.

   ```sh
   keytool -genkeypair -v -keystore release.keystore -alias game \
     -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.keystore   # macOS: base64 -i release.keystore
   ```

   Add these under **Settings → Secrets and variables → Actions**:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
   Keep `release.keystore` somewhere safe and never commit it. The same key signs every game.

### Build an APK locally (optional)

Requires JDK 21 and the Android SDK.

```sh
npm run android -- star-catcher
cd android && ./gradlew assembleRelease
```
