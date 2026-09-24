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

- **Reuse before you write.** Check `shared/` first (the README has a table of what's
  there): screen sizing, header buttons, dialogs, settings, languages, sound, keyboard,
  the Game Over screen and the leaderboard already live there.
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

- Lives in `games/<game>/` with a `game.json` (name, one-line description, `sv` block,
  icon, unique Android `appId`). Create new games with `npm run new-game -- <game> "Name"`,
  which also adds the game to the workflow dropdown. The template is a small example game
  that already follows these rules: replace the example, keep the header, dialogs,
  languages, sounds and Game Over screen, and work through the README's "Add a game"
  checklist before calling a game done.
- Namespace anything stored in the browser by game, e.g. the best score key `<game>:best`.
  All games share one origin inside the all-games hub app, so un-namespaced keys would clash.
  The `settings:` and `leaderboard:` prefixes are reserved for the shared modules.
- Call `handleAndroidBack()` from `shared/android-back.js` in `main.js`, so Back works
  in the APKs (the template already does).
- Link and load files by relative path (`./…`, as Vite's `base: './'` does). Games run
  from a sub-folder on the website and inside the hub app.
- Games with a score (or a "deepest level") use the global leaderboard from
  `shared/leaderboard.js`: a trophy button in the header and a submit prompt on a new
  best. Register the game in `leaderboard/src/rules.js`. Store nothing about players
  beyond a nickname and a random device id.
- Games that share data between players (like Wild Pond and Potion Market) add routes
  to the same service in `leaderboard/src/`, one file per game, and keep their checks in
  the game's own rules files so the game and the service agree. Keep writes to a few
  database rows per player action, rate-limit them with `leaderboard/src/limits.js`,
  and make the game still playable offline. No free text from players beyond the
  nickname.
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
  they can be tested on their own in Node (e.g. `block-drop/src/logic.js`,
  `lantern-maze/src/maze.js` and `puzzles.js`), with tests in the game's `test/` folder
  (`npm test` runs them all).
- Keep the hub description in `game.json` and the help dialog up to date when the rules
  change. Games with an economy or waves keep a scripted check of their numbers (like
  `hex-hold/tools/balance.mjs`); re-run it after changing them.
- Saved games must keep working after an update: when a change would alter what an old
  save loads into (a generated map, say), version it and keep the old behaviour for old
  saves.

## 3D games

3D games use Three.js (`npm run new-game -- <game> "Name" --3d`, from `template-3d/`).
Everything under "Each game" about `shared/`, Phaser, the header buttons, languages,
sounds and the leaderboard is optional for them: a 3D game only has to work as its own
page in this repo. These rules still apply:

- Mobile first: portrait phone, touch first, checked at 390 × 844 then 1280 × 720.
  The 3D view fills the screen and follows its size; keep what the player needs in view
  on narrow screens.
- Desktop controls are decided per game: W A S D + Space like the 2D games, or mouse
  only (Hex Hold: drag, right-drag, wheel, click). Ask the owner when it isn't clear.
- A Home button at the top left (the template's calls `goHome()`), `game.json` with a
  unique `appId`, an icon in `public/`, relative paths, storage keys namespaced by game,
  and `handleAndroidBack()` in `main.js`.
- 3D games may still use the shared modules that don't need Phaser (dialogs, settings,
  languages, sound, home button, Android Back); prefer them over new copies.
- Keep it light for phones: pixel ratio capped at 2, few lights and at most one
  shadow-casting light, shared geometries and materials, and stop drawing while the
  page is hidden. Aim for a steady frame rate on a mid-range Android phone.
- 3D art is made or found by the agent working on the game, not supplied by the owner:
  build models in code (Three.js geometry, or glTF files generated by a script kept in
  the game folder), or use models, textures and sounds whose licence allows public use
  without permission (CC0 / public domain). Record where every downloaded file came from
  and its licence in the game's `CREDITS.md`, and name them in the commit message.
- Checked CC0 model sources (glTF/GLB, clone them with git; their licence files say
  CC0). Look here first:
  - KayKit by Kay Lousberg, <https://github.com/KayKit-Game-Assets>:
    `KayKit-Character-Pack-Adventures-1.0` (Knight, Barbarian, Mage, Rogue and Hooded
    Rogue, rigged with 76 animations each, plus weapons), `KayKit-Dungeon-Remastered-1.0`,
    `KayKit-Medieval-Hexagon-Pack-1.0`, `KayKit-City-Builder-Bits-1.0`,
    `KayKit-Space-Base-Bits-1.0`, `KayKit-Restaurant-Bits-1.0`, `KayKit-Prototype-Bits-1.0`.
    Models are under `addons/<pack>/Assets/gltf/` (characters in `Characters/gltf/`).
  - Kenney starter kits, <https://github.com/KenneyNL>: `Starter-Kit-3D-Platformer`,
    `Starter-Kit-Racing`, `Starter-Kit-City-Builder`, `Starter-Kit-FPS`,
    `Starter-Kit-Basic-Scene` (code MIT, models and sounds CC0 as their READMEs say).
  Copy only the files a game uses into its `public/` folder.

## Building and publishing

- The workflow only runs when started by hand, and builds the game picked in its
  dropdown, or every game with `all`. Per-game APKs and the all-games hub app are
  opt-in per run. Don't add automatic triggers.
- There is one pipeline for everything: no separate CI and production setups.

## Asking the owner

- When a decision is the owner's to make, offer it as selectable options (with a
  recommended one first) rather than open questions, and keep open questions for what
  options can't cover.

## Commits

- Never include session links or session IDs in commits, pull requests or files.
