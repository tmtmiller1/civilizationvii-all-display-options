# Changelog

All notable changes to the **All Display and Resolution Options** mod for
Civilization VII. Loosely follows [Keep a Changelog](https://keepachangelog.com/)
and Semantic Versioning. The Steam Workshop change note for each release is
generated from the matching section below by `release.sh`.

## [Unreleased]

## [1.0.1] - 2026-07-06

Maintenance release. No gameplay or options behavior changes — this is an
internal code-quality pass following a full quality review of the mod.

### Changed
- Split the monolithic options module: extracted the pure resolution/scale helpers and engine-adapter layer into a new `all-display-options-core.js`, dropping the UI-wiring file from 336 to 169 lines with no runtime behavior change.
- Registered `all-display-options-core.js` in both the shell- and game-scope import lists so the extracted module loads in every scope.

### Quality
- Test coverage held at 100% statements, branches, functions, and lines across all three shipped modules after the split.
- `npm run verify` (tsc type-check + eslint + 100% coverage gate) passes clean on the refactored code.
- Documented the Steam publishedfileid persistence flow in the README so repeat uploads stay in update mode.

## [1.0.0] - 2026-06-25

### Added
- **Resolution (all modes).** Every standard 16:9 and 16:10 resolution up to your
  display's native size, including modes the base game's dropdown leaves out.
- **Global UI scale slider (50–200%).** The engine's full UIGlobalScale range,
  versus the built-in slider's 50–125% clamp. Lower = smaller HUD, more visible map.
- **UI auto-scale toggle.** Turn off the post-patch auto-sizing that can look
  "zoomed in" and control the size yourself.
- **One-click, device-aware presets.** Detects your panel and offers Current /
  Recommended / Maximum zoom-out / Game default.

### Notes
- Options live under the native Options screen's "Mods" category (and render in
  Mod Settings Manager when present). Good-citizen by construction: no shared
  `localStorage` writes, and all UIScripts are uniquely named so they can never
  shadow another mod's option modules.
