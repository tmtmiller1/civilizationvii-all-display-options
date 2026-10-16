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

Watched on the released 1.1.0 build, 2026-10-15 22:52 (Workshop 3751137250, which `deploy --prove` showed is the copy
the game serves and matches commit 08db0d3; usual set, Antiquity lab game, seed 4242, turn 1): scale 90 -> 95 put the
count at 1, back to 90 put it at 0; auto-scale on put it at 1, off at 0; Confirm closed Options with no prompt and the
page wasn't reloaded. Run log: `tools/plans/overnight-watch-run-log.md`, L1. The ADO-only side is below.

Watched with ADO alone, 2026-10-16 (watch run 2 block 1 V1, run `~/.tower-bench/runs/2026-10-16T18-26-06`; game 1.5.0,
windowed 1600x1000, every other user mod off, ADO's `Mods/` copy with its working tree deployed; Antiquity lab game,
seed 4242). Options was driven through its own components: the slider arrows with `action-activate`,
`#options-confirm` and `#options-cancel`, and the option objects' updateListener for the auto-scale box and the
resolution dropdown.

- Away and back: one step right put the scale at 95 and the count at 1; one step left put them back at 90 and 0.
  Confirm closed the screen with no prompt.
- One step to 95 and Confirm: the game's "Reload?" prompt came up; Continue reloaded the UI at 95 (root font size
  16.2px to 17.1px).
- Cancel, run last: scale 100, auto-scale on and resolution 3024x1964 (count 3). Cancel asked "Are you sure you want
  to revert any changes that were made?"; OK put back 95, auto-scale off and 1600x1000, read at 1, 3 and 6 s from
  lines the probe wrote to `UI.log` (Cancel rewrites `AppOptions.txt`, and after that the bench refuses evals).

So the ADO-alone side is watched: the slider resizes the UI on Confirm, Cancel puts back the scale, auto-scale and
resolution, and away-and-back closes with no prompt. Captures `working_screenshots/watch2-block1/V1-ado-*.png`.

Translations, same night (1.1.0 as served, usual set, one lab game per language): the four rows and the "(native)"
tag on the resolution list read in Japanese ("表示プリセット", "解像度（すべてのモード）", "グローバルUIスケール",
"UI自動スケーリング", "（ネイティブ）"), German ("Anzeige-Voreinstellung", "Auflösung (alle Modi)", "(nativ)") and
Polish ("Ustawienie wstępne ekranu", "Rozdzielczość (wszystkie tryby)", "(natywna)"), with no raw `LOC_` text on the
Options screen; the Japanese group header "すべての表示・解像度オプション" in the capture
`working_screenshots/overnight-2026-10-15/L2-ja-ado-options-rows.png`. The other eight languages weren't run.

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

Cancel watched with ADO alone, 2026-10-16 (block 1 V1): it put back the scale, auto-scale and resolution. The record
is under the first item above.
