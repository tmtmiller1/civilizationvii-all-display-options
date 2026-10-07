# Changelog

All notable changes to the **All Display and Resolution Options** mod for
Civilization VII. Follows [Keep a Changelog](https://keepachangelog.com/) and
Semantic Versioning. The Steam Workshop change note for each release is
generated from the matching section below by `release.sh`.

## [Unreleased]

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
