# Working in this repo

Rules for anyone changing this repository, people and coding agents alike.
`README.md` covers the layout, the scripts and the build workflow; this file covers
how games here must be built. Read both before starting.

## Mobile first, desktop second

- Design every game for a **phone held upright, played by touch**. Desktop must work,
  but it is the second target: never trade phone playability for desktop polish.
- Controls are touch controls first: taps, swipes or on-screen buttons. Keep touch
  targets large (about 100 game units or more). Nothing may depend on hover or a keyboard.
- Every game also gets keyboard controls on top, using the same keys everywhere via
  `bindKeys()` from `shared/keyboard.js`: **W A S D** to move or steer a focus/cursor,
  **Space** to confirm or trigger the special action. No arrow keys. Mention the keys in
  the game's help dialog.
- Check every change at a phone size (390 × 844 CSS pixels) first, then at a desktop
  size (1280 × 720).

## Make the best use of the screen

- The playfield is the point. Make it **as large as the screen allows** and keep
  everything else small and out of its way.
- Use `scaleConfig()` from `shared/screen.js` for the Phaser `scale` setting: a portrait
  canvas 720 units wide whose height follows the screen's shape. Lay out from
  `this.scale.height` instead of assuming a fixed height, size the playfield from the
  space left over, and centre the score/board/buttons block vertically.
- Keep on-screen information to a minimum: score and the one or two numbers the player
  needs while playing. No rules, legends, instructions or long labels on the playfield.
- Every game has a round **Home** button at the **top left** of the header, made with
  `addHomeButton()` from `shared/home-button.js` (back to the hub, or closes a
  single-game APK).
- Every game has a round **gear** button in the header, made with `addSettingsButton()`
  from `shared/settings.js` (language flags, sound on/off, volume). Pause the game while
  it is open.
- Rules, controls, special pieces and scoring go in a **"How to play" dialog** behind a
  round **?** button in the header, built with `openHelpDialog()` from
  `shared/help-dialog.js`. Pause the game while it is open.
- For a colourful background, make the canvas `transparent: true` and put a CSS gradient
  on the page, so it also fills the space around the canvas.

## Share code and assets

- **Reuse before you write.** Check `shared/` first: screen sizing, the help dialog and
  the Game Over screen already live there.
- **Don't copy between games.** When a second game needs something that exists in one
  game, move it into `shared/`, make it configurable, and switch both games to it.
- Shared modules must stay game-agnostic: take options (colours, keys, text) rather than
  hard-coding one game's details.
- Assets used by more than one game belong in `shared/` too. Assets used by one game
  stay in that game's `public/` folder.
- Art from the owner's other repos (e.g. `Kvackie/eternal-alchemy`) may be copied in.
  Name the source in the commit message. This repo and the published site are public:
  never copy anything the owner hasn't agreed to make public, and don't use art from
  someone else's repo without their permission.

## Each game

- Lives in `games/<game>/` with a `game.json` (name, one-line description, unique
  Android `appId`). Create new games with `npm run new-game -- <game> "Name"`, which also
  adds the game to the workflow dropdown.
- Namespace anything stored in the browser by game, e.g. the best score key `<game>:best`.
  All games share one origin inside the all-games hub app, so un-namespaced keys would clash.
- Call `handleAndroidBack()` from `shared/android-back.js` in `main.js`, so Back works
  in the APKs (the template already does).
- Link and load files by relative path (`./…`, as Vite's `base: './'` does). Games run
  from a sub-folder on the website and inside the hub app.
- Games with a score (or a "deepest level") use the global leaderboard from
  `shared/leaderboard.js`: a trophy button in the header and a submit prompt on a new
  best. Register the game in `leaderboard/src/rules.js`. Store nothing about players
  beyond a nickname and a random device id.
- **Every piece of text exists in English and Swedish.** Put a game's strings in its
  `src/strings.js` via `makeT()` from `shared/i18n.js`, write its help dialog in both
  languages, and fill in the `sv` block in `game.json`. Text must follow a language
  change live (`bindText()` / `onSceneLangChange()`); wrap long lines, since Swedish runs
  longer.
- Give every game sound effects through `playSound()` from `shared/sound.js` (add new
  sounds there, synthesised, not as audio files), so volume and mute apply everywhere.
- Every game has an icon in `public/` (named in `game.json`), shown on the hub and as the
  browser tab icon.
- Keep game rules separate from Phaser drawing code where the rules are non-trivial, so
  they can be tested on their own in Node (see `games/*/src/logic.js`).
- Keep the hub description in `game.json` and the help dialog up to date when the rules
  change.

## Building and publishing

- The workflow only runs when started by hand, and builds the game picked in its
  dropdown, or every game with `all`. Per-game APKs and the all-games hub app are
  opt-in per run. Don't add automatic triggers.
- There is one pipeline for everything: no separate CI and production setups.

## Commits

- Never include session links or session IDs in commits, pull requests or files.
