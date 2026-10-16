# All Display and Resolution Options

A Civilization VII mod that restores the display choices the game hides or
clamps, as native options under the **Mods** category.

- **Resolution (all modes)**: every standard mode up to your panel's native size.
- **Global UI scale (50–200%)**: the engine's full range instead of the 50–125% clamp.
- **UI auto-scale toggle**: turn off the "zoomed in" auto-sizing.
- **Device-aware presets**: one-click Recommended / Maximum zoom-out / Game default.

All changes apply through the normal **Confirm** button on the Options screen.

## Compatibility

- Your choices are saved by the game itself, with its own display settings,
  outside the shared `modSettings` store.
- The mod carries the Tower Settings Keeper (`ui/settings-keeper.js`, since
  1.0.2). It runs before any other script and sends every mod's `localStorage`
  reads and writes through the one `modSettings` entry the game reads back
  correctly. At start-up it folds entries that would be read in its place into
  that entry and leaves any entry it can't identify where it is, so every mod's
  data is kept. That keeps the settings of the other mods you play with across
  a restart. If several mods carry it, or the standalone keeper is installed,
  the newest copy runs.
- The mod's own scripts are named `all-display-options*.js`, so they can't
  shadow another mod's options scripts.

## Development

```sh
npm install      # one-time: eslint + typescript + c8
npm run verify   # tsc --noEmit + eslint + tests at 100% coverage + language check
./release.sh     # build dist/ + Steam Workshop manifest
```

The first Steam Workshop publish stores its `publishedfileid` in
`steam_workshop_id.txt`, so later uploads stay in update mode.

MIT licensed. Author: Tower.
