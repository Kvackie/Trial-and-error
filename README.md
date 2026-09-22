# Trial and Error

A small mobile game built with [Phaser](https://phaser.io/). Tap the falling stars before they hit the ground. Miss three and it's game over.

The same code runs in the browser (GitHub Pages) and as an Android app (wrapped with [Capacitor](https://capacitorjs.com/)).

## Develop

```sh
npm install
npm run dev        # http://localhost:5173, also reachable from your phone on the same network
```

Game code lives in `src/`. Files in `public/` are copied as-is into the build.

## Build pipeline

`.github/workflows/build.yml` only runs when you start it: **Actions → Build and deploy → Run workflow**, then pick a branch. There is no separate CI and production setup:

| Job | Every run | Default branch only |
|---|---|---|
| `web` | builds `dist/` | |
| `deploy-pages` | | deploys to GitHub Pages |
| `android` | builds `trial-and-error.apk` (workflow artifact) | publishes it to the `latest` release |

The APK's `versionCode` is the workflow run number, so each new build installs over the previous one.

### One-time repository setup

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. *(Recommended)* Add a signing key so every APK is signed with the same key.
   Otherwise each build is signed with a different throwaway debug key, and Android
   makes you uninstall the old version before installing the new one.

   ```sh
   keytool -genkeypair -v -keystore release.keystore -alias game \
     -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.keystore   # macOS: base64 -i release.keystore
   ```

   Add these under **Settings → Secrets and variables → Actions**:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
   Keep `release.keystore` somewhere safe and never commit it.

### Build the APK locally (optional)

Requires JDK 21 and the Android SDK.

```sh
npm run android:sync
cd android && ./gradlew assembleRelease
```
