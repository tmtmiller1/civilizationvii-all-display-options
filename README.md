# All Display and Resolution Options

A Civilization VII mod that restores the display choices the game hides or
clamps, as native options under the **Mods** category.

- **Resolution (all modes)**: every standard mode up to your panel's native size.
- **Global UI scale (50–200%)**: the engine's full range instead of the 50–125% clamp.
- **UI auto-scale toggle**: turn off the "zoomed in" auto-sizing.
- **Device-aware presets**: one-click Recommended / Maximum zoom-out / Game default.

All changes apply through the normal **Confirm** button on the Options screen.

## Compatibility

- The mod makes no `localStorage` writes; settings persist through the engine's
  per-user config, so the shared `modSettings` store is left alone.
- Every shipped UIScript is named `all-display-options*.js`, so it cannot shadow
  another mod's option modules.

## Development

```sh
npm install      # one-time: eslint + typescript + c8
npm run verify   # tsc --noEmit + eslint + 100% coverage gate
./release.sh     # build dist/ + Steam Workshop manifest
```

The first Steam Workshop publish stores its `publishedfileid` in
`steam_workshop_id.txt`, so later uploads stay in update mode.

MIT licensed. Author: Tower.
