# All Display and Resolution Options

A small, focused Civilization VII mod that restores the display choices the game
hides or clamps, exposed as native options under the **Mods** category.

- **Resolution (all modes)**: every standard mode up to your panel's native size.
- **Global UI scale (50–200%)**: the engine's full range, not the 50–125% clamp.
- **UI auto-scale toggle**: turn off the "zoomed in" auto-sizing.
- **Device-aware presets**: one-click Recommended / Maximum zoom-out / Game default.

All changes apply through the normal **Confirm** button on the Options screen.

## Compatibility

Designed to be a good citizen alongside other mods:
- No `localStorage` writes (settings persist through the engine's per-user config),
  so it can never clobber the shared `modSettings` store.
- Every shipped UIScript is uniquely named (`all-display-options*.js`), so it can
  never shadow another mod's identically-named option modules.

## Development

```sh
npm install      # one-time: eslint + typescript + c8
npm run verify   # tsc --noEmit + eslint + 100% coverage gate
./release.sh     # build dist/ + Steam Workshop manifest
```

MIT licensed. Author: Tower.
