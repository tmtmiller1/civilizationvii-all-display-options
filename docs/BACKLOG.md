# Backlog

Findings from the 2026-07-10 corpus bug-hunt audit unless noted. Each carries [severity · confidence]. The audit found
the mod healthy overall: the options API matches shipped working mods, engine calls are `safe()`-wrapped and every
listener is cleaned up. These are minor. The first two items have since been implemented and stay here for the
record; the third is still open.

Line numbers are as of 2026-10-15. "Core" is `ui/all-display-options-core.js`. The base game's options code is on disk
under `civilization_vii_1.5.0_game_files/Resources/Base/modules/core/ui/` (`options/model-options.js`,
`options/screen-options.js`, `options/options.js`, `options/options-helpers.js` and
`themes/default/global-scaling.js`), and the cites below point there.

## [Low · Confirmed] `needReloadRefCount` bumped on no-op changes and never decremented

Status: implemented and unit-tested, not yet watched in a game. `e69147e` (shipped in 1.0.2) made `setGlobalScale` and
the auto-scale updateListener bump only on a real change. Since 2026-10-15 (unreleased) the count also comes back down:
each setting the mod writes (resolution, UI scale, auto-scale) holds one count while it differs from its value when the
Options screen opened, and gives it back when it returns there. That's `reloadTracker` (core `:150-179`); `sync()` runs
after every write (`applyResolution` `:113`, `setGlobalScale` `:126-127`, the Game default preset `:214-215`, the
auto-scale checkbox in `ui/all-display-options.js:142`) and `start()` runs in each option's initListener
(`ui/all-display-options.js:79`, `:114`, `:136`). `tests/reload-count.mjs` covers the Confirm path.

**Sites (before the fix):** `setGlobalScale` and the auto-scale updateListener did `Options.needReloadRefCount += 1`
unconditionally and never decremented; `applyResolution` bumped on each change and the Game default preset always.
**Failure scenario:** nudge the UI-scale slider and drag it back to the original value, or toggle auto-scale on then
off, then Confirm. The counter stays above 0, so the game reloads the interface (in a game, it asks first) though
nothing net-changed.
**Fix:** bump only when the value actually differs, and pair it with a decrement on revert.

**Design:** capture each setting's value when the option is shown (initListener), increment when the new value differs
from it, and decrement back to net-zero when the user returns to it. This keeps the engine's "reload required" state
accurate, so a change that was undone doesn't bring up a reload prompt. **Verify:** open Options, drag the UI-scale
slider and return it to its start value (and toggle auto-scale on→off), Confirm, and check that the "UI reload
required" prompt stays away. Cancel zeroes the count in the base game (`model-options.js:245-247`), so Confirm is the
path to watch.

The base game's own auto-scale adjustment slider (Accessibility, `option-system-uiautoscaleadjustment`) has the same
problem: `onUiAutoScaleAdjustmentUpdate` adds 1 on every move and never takes it back (`options.js:1061`). That's the
base game's code, and the mod leaves that slider alone.

## [Low · Plausible] Resolution modes capped by area only

Status: implemented in `e69147e` (shipped in 1.0.2). `add()` now also rejects a mode that exceeds native in either
dimension.

**Site:** `add()` in `buildResolutionItems` (core `:80-86`; the per-dimension check is `:84`)
**Symptom:** offered modes were filtered by `r.i * r.j > nativeArea` (area only).
**Failure scenario:** on an ultrawide/atypical native panel a curated mode can pass the area cap while exceeding native
in one dimension (native 2560×1080 admits 1920×1200, 120px taller than the panel); the user picks it and the engine
refuses or letterboxes on Confirm.
**Fix:** also require `r.i <= native.i && r.j <= native.j`.

**Design:** in `add()` within `buildResolutionItems` (core `:80-86`), tighten the cap from area-only to per-dimension:
skip a mode if it exceeds native in *either* dimension (`r.i > native.i || r.j > native.j`). The existing
native-resolution lookup already yields `native.i`/`native.j`. This keeps 1920×1200 off the list on a 2560×1080
ultrawide (taller than the panel). The curated list still passes through for standard panels. **Verify:** on an
ultrawide/atypical native resolution, check that every offered mode fits the panel's width and height.

## [Low · Plausible] Immediate-apply settings not reverted on Cancel; unverified API shapes

**Symptom:** `setGlobalScale` and the auto-scale checkbox write the engine values at once in their updateListeners
(core `:124-125`, `ui/all-display-options.js:140`), so backing out with Cancel (no Confirm) may not revert scale or
auto-scale. Separately, `Options.supportedOptions.resolutions` (core `:43`),
`UI.get/setOption("user","Interface","UIGlobalScale")` (core `:124`, `:136`, `:212`) and
`Configuration.getUser().setUiAutoScale` still need confirming in a running game. `Options.graphicsOptions.resolution`
and the `uiAutoScale` getter are confirmed in the base source (`options.js:276`, `:1008`).
**Failure scenario:** low risk. Every such call is `safe()`-wrapped, so a shape change falls back (curated list, 100%
recommended) rather than crashing.
**Fix:** confirm the property names in a running game; add Cancel-revert handling if Cancel leaves the values changed.

**What the base source shows (read 2026-10-15, 1.5.0):**
- Opening the screen runs every initListener, then `Options.saveCheckpoints()`, which calls
  `Configuration.getUser().saveCheckpoint()` (`screen-options.js:43-51`, `model-options.js:137-140`).
- Cancel asks first only when `Options.hasChanges()` (`screen-options.js:137-160`). Every mod option change counts:
  dropdown and checkbox changes always call `incRefCount()` (`:244`, `:272`), and a slider move does when the value
  differs (`:298-300`).
- On yes, `Options.restore()` with no category runs `UI.revertApplicationOptions()`, `UI.revertNetworkOptions()` and
  `Configuration.getUser().restoreCheckpoint()`, re-reads the pending graphics options (dropping an unconfirmed
  resolution), zeroes all three counts, then runs every option's restoreListener and initListener
  (`model-options.js:220-252`). Abandoning the in-game reload prompt runs the same restore
  (`options-helpers.js:145-148`).
- Cancel doesn't fire a scale event. `UIGlobalScaleChanged` fires only from Confirm and from Reset to defaults
  (`screen-options.js:174`, `:122`). `global-scaling.js` reads `uiGlobalScale`, `uiAutoScale` and the adjustment from
  `Configuration.getUser()` when it starts and again on that event (`:54`, `:62`, `:179-199`); a window resize
  recomputes the size but keeps its cached scale and auto-scale.
- Confirm: at the main menu, or in a game with the reload count at 0, the screen commits (`commitOptions` reloads the
  interface itself when the count is above zero, except in multiplayer) and then fires `UIGlobalScaleChanged`
  (`screen-options.js:161-183`, `model-options.js:144-177`). In a single-player game with a reload due, the reload
  prompt commits and reloads without the event; in multiplayer the restart prompt commits without a reload
  (`options-helpers.js:134-170`).
- So auto-scale, which the mod writes through `Configuration.getUser().setUiAutoScale` like the base checkbox (which
  has no restoreListener), should come back with `restoreCheckpoint()`. Whether
  `UI.setOption("user","Interface","UIGlobalScale")` is covered by `revertApplicationOptions()` or by the config
  checkpoint, and whether it's the value behind `Configuration.getUser().uiGlobalScale` at all, happens inside the
  engine. One hint: the base game writes the adjustment with `UI.setOption("user","Accessibility",
  "UIAutoScaleAdjustment")` (`options.js:1062`) and `global-scaling.js` reads it back as
  `Configuration.getUser().uiAutoScaleAdjustment` (`:204`), so a `"user"` option and the user config look like one
  store. Only a watch in a running game settles it.

**Design (verification first, low priority):** two separable sub-items.
1. *Cancel revert:* watch it: change the scale, press Cancel, read the value. If Cancel restores it, close this item.
   If it doesn't, remember the value when the screen opens (next to `start()` in `reloadTracker`) and put it back in a
   restoreListener, which `Options.restore()` runs before the initListeners. Add a test.
2. *API shape audit:* confirm in a running game that `Options.supportedOptions.resolutions`,
   `UI.get/setOption("user","Interface","UIGlobalScale")` and `Configuration.getUser().setUiAutoScale` exist and what
   they return. All calls are already `safe()`-wrapped, so this only confirms correctness; the code changes only if a
   shape is wrong.
**Verify:** live probe of the Options screen confirms the property names resolve and Cancel restores the prior scale.
