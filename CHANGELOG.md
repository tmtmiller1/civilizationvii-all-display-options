# Changelog

All notable changes to the **All Display and Resolution Options** mod for
Civilization VII. Loosely follows [Keep a Changelog](https://keepachangelog.com/)
and Semantic Versioning. The Steam Workshop change note for each release is
generated from the matching section below by `release.sh`.

## [Unreleased]

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
