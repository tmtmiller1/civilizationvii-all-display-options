# Backlog

Open items not yet addressed. Findings from the 2026-07-10 corpus bug-hunt audit unless
noted. Each carries [severity · confidence]. The mod audited healthy overall — options API
matches shipped working mods, heavy `safe()`-wrapping, no leaked listeners; these are
minor.

## [Low · Confirmed] `needReloadRefCount` bumped on no-op changes and never decremented

**Sites:** [core.js:132](../core.js) (`setGlobalScale`),
[all-display-options.js:156](../all-display-options.js) (auto-scale updateListener)
**Symptom:** both do `Options.needReloadRefCount += 1` unconditionally and never decrement.
**Failure scenario:** nudge the UI-scale slider and drag it back to the original value, or
toggle auto-scale on then off, then Cancel — the counter stays >0 so the game still insists
a UI reload is required though nothing net-changed.
**Fix:** bump only when the value actually differs (as `applyResolution` already does at
`core.js:117`), and/or pair with a decrement on revert.

**Design:** in both `setGlobalScale` (`core.js:132`) and the auto-scale updateListener
(`all-display-options.js:156`), guard the `Options.needReloadRefCount += 1` with an
equality check against the value at panel-open (mirror the pattern `applyResolution` already
uses at `core.js:117`): capture the original value when the option is first shown, and only
increment when the new value differs from it. If the user returns to the original value,
decrement back to net-zero. This keeps the engine's "reload required" state accurate so no
spurious reload prompt appears after a no-op adjustment. **Verify:** open Options, drag the
UI-scale slider and return it to its start value (and toggle auto-scale on→off), Cancel, and
confirm no "UI reload required" prompt.

## [Low · Plausible] Resolution modes capped by area only

**Site:** [core.js:92](../core.js) (`add()` in `buildResolutionItems`)
**Symptom:** offered modes are filtered by `r.i * r.j > nativeArea` (area only).
**Failure scenario:** on an ultrawide/atypical native panel a curated mode can pass the
area cap while exceeding native in one dimension (native 2560×1080 admits 1920×1200, 120px
taller than the panel); the user picks it and the engine refuses/letterboxes on Confirm —
exactly what the comment says it wants to prevent.
**Fix:** also require `r.i <= native.i && r.j <= native.j`.

**Design:** in `add()` within `buildResolutionItems` (`core.js:92`), tighten the cap from
area-only to per-dimension: replace `r.i * r.j > nativeArea` with
`r.i > native.i || r.j > native.j` (skip a mode if it exceeds native in *either* dimension).
Keep the existing native-resolution lookup that already yields `native.i`/`native.j`. This
prevents offering e.g. 1920×1200 on a 2560×1080 ultrawide (taller than the panel). Curated
list still passes through for standard panels. **Verify:** on an ultrawide/atypical native
resolution, confirm no offered mode exceeds native height or width.

## [Low · Plausible] Immediate-apply settings not reverted on Cancel; unverifiable API shapes

**Symptom:** `setGlobalScale`/`setUiAutoScale` apply immediately in their updateListeners,
so backing out with Cancel (no Confirm) may not revert scale/auto-scale. Separately, the
shapes `Options.supportedOptions.resolutions`, `Options.graphicsOptions.resolution`,
`UI.get/setOption("user","Interface","UIGlobalScale")`,
`Configuration.getUser().setUiAutoScale/uiAutoScale` could not be cross-verified against
on-disk mods (core UI JS is packed in `Assets.car`/`.dep`).
**Failure scenario:** low risk — every such call is `safe()`-wrapped, so a shape change
degrades gracefully (curated fallback list, 100% recommended) rather than crashing.
**Fix:** confirm the property names against the packed source if it can be extracted; add
Cancel-revert handling if the immediate-apply UX is undesired.

**Design (verification-first, low priority):** two separable sub-items —
1. *Cancel revert:* if the immediate-apply behavior is deemed a bug, capture the pre-edit
   scale/auto-scale values on panel attach and restore them in the Options screen's
   cancel/close handler (only when the user didn't Confirm). Scope this behind confirmation
   that the base Options screen doesn't already snapshot/restore user-scope settings — if it
   does, no change is needed.
2. *API shape audit:* extract and verify the exact shapes of
   `Options.supportedOptions.resolutions`, `Options.graphicsOptions.resolution`,
   `UI.get/setOption("user","Interface","UIGlobalScale")`, and
   `Configuration.getUser().setUiAutoScale/uiAutoScale` against the packed `Assets.car` UI
   source or a live DOM/console probe. All calls are already `safe()`-wrapped, so this is a
   correctness-confirmation task, not a crash fix — no code change unless a shape is wrong.
**Verify:** live probe of the Options screen confirms the property names resolve and (if
touched) Cancel restores the prior scale.
