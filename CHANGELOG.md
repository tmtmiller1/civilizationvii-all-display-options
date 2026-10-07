# Changelog

All notable changes to the **All Display and Resolution Options** mod for
Civilization VII. Follows [Keep a Changelog](https://keepachangelog.com/) and
Semantic Versioning. The Steam Workshop change note for each release is
generated from the matching section below by `release.sh`.

## [Unreleased]

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
