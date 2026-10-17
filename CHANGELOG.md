# Changelog

All notable changes to the **All Display and Resolution Options** mod for
Civilization VII. Follows [Keep a Changelog](https://keepachangelog.com/) and
Semantic Versioning. The Steam Workshop change note for each release is
generated from the matching section below by `release.sh`.

## [Unreleased]

- Carries Civilopedia History Corrections. With Civilopedia Expanded: Independents on, six East Asian history pages
  in the Civilopedia (Goguryeo, the Oirat, two Ryukyu pages, Nanzhao and Balhae) give each side where historians in
  different countries disagree, and a few factual errors are fixed. With it off, the game's pages stay as they are.

## [1.1.0] - 2026-10-15

Eleven more languages, and a change you put back before confirming no longer asks for a reload.

### Added
- The options are in German, Spanish, French, Italian, Japanese, Korean, Polish, Brazilian Portuguese, Russian, and
  Simplified and Traditional Chinese, using the game's own words for its terms. The "(native)" tag in the resolution
  list is translated too.

### Fixed
- If you change the UI scale, auto-scale or resolution and then put it back before pressing Confirm, the game no longer
  reloads the interface for it (in a game, it used to ask first). Each setting asks for a reload only while it differs
  from where it was when you opened Options.

## [1.0.3] - 2026-10-14

License notice only. The mod itself plays exactly as in 1.0.2.

### Changed
- The license now says that Civilization VII and its art and data belong to Firaxis and 2K, and that the game
  screenshots are there for illustration.

## [1.0.2] - 2026-10-07

Settings that survive a restart: the mod now carries the Tower Settings Keeper.

### Fixed
- Settings kept after a restart. Civilization VII reads back only the first entry in its mod storage, whichever one
  a mod asks for, so options set in one session could come back as another mod's data or not at all, and a mod
  saving its options could copy that data under its own name. All Display and Resolution Options now carries the
  Tower Settings Keeper file, which keeps every mod's settings inside the one entry the game reads correctly and
  repairs a store another mod has already put out of order, without deleting anything. All Display and Resolution
  Options saves nothing there itself. It carries the file so that the settings of the other mods you play with stay
  readable, even if you never install the keeper.
- The file runs before any other script and changes nothing else in the mod. If several mods carry it, or the
  standalone Tower Settings Keeper is installed too, one copy runs and the newest build wins. Nothing to set up:
  existing settings carry over. Tower Settings Keeper:
  [GitHub](https://github.com/tmtmiller1/civilizationvii_tower-settings-keeper), [Steam](https://steamcommunity.com/sharedfiles/filedetails/?id=3815023570).
- Two fixes from July ship in this release too. Picking the UI scale or auto-scale value you already had used to
  leave the game asking for an interface reload; now only a real change does. And on an ultrawide or other unusual
  screen the resolution list could offer a mode taller or wider than the screen; every mode it offers now fits both
  ways.

## [1.0.1] - 2026-07-06

Maintenance release. No gameplay or options behavior changes; this is an
internal code-quality pass after a review of the mod.

### Changed
- Split the options module: the pure resolution/scale helpers and the
  engine-adapter layer moved into a new `all-display-options-core.js`, taking the
  UI-wiring file from 336 to 169 lines with no runtime behavior change.
- Registered `all-display-options-core.js` in both the shell- and game-scope
  import lists so the new module loads in every scope.

### Quality
- Test coverage stays at 100% statements, branches, functions and lines across
  all three shipped modules.
- `npm run verify` (tsc type-check + eslint + 100% coverage gate) passes on the
  refactored code.
- The README now documents how the Steam publishedfileid is persisted so repeat
  uploads stay in update mode.

## [1.0.0] - 2026-06-25

### Added
- Resolution (all modes): every standard 16:9 and 16:10 resolution up to your
  display's native size, including modes the base game's dropdown leaves out.
- Global UI scale slider (50–200%): the engine's full UIGlobalScale range instead
  of the built-in slider's 50–125% clamp. Lower = smaller HUD, more visible map.
- UI auto-scale toggle: turn off the post-patch auto-sizing that can look
  "zoomed in" and control the size yourself.
- One-click, device-aware presets: detects your panel and offers Current /
  Recommended / Maximum zoom-out / Game default.

### Notes
- Options live under the native Options screen's "Mods" category (and render in
  Mod Settings Manager when present). The mod makes no shared `localStorage`
  writes, and all its UIScripts are uniquely named so they cannot shadow another
  mod's option modules.
