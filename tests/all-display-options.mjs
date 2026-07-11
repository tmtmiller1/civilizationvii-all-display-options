// Behavioural + full-coverage test for ui/all-display-options.js. The engine option API is the
// recording stub (loader.mjs → stubs/engine-options-stub.mjs); the global engine singletons UI,
// Configuration and Locale are installed on globalThis here. We drain the registration callback
// under several display configurations and invoke every option's listeners (and every preset
// thunk) so all branches of the resolution / scale / preset logic execute.
import assert from "node:assert/strict";

// ── Controllable global engine singletons ────────────────────────────────────
const uiStore = { UIGlobalScale: 100 };
let uiThrows = false;
let configThrows = false;
let localeThrows = false;
const userConfig = {
  uiAutoScale: true,
  /** @param {boolean} v */
  setUiAutoScale(v) {
    this.uiAutoScale = v;
  }
};

globalThis.UI = {
  /** @param {string} _s @param {string} _c @param {string} key */
  getOption(_s, _c, key) {
    if (uiThrows) throw new Error("UI.getOption boom");
    return uiStore[key];
  },
  /** @param {string} _s @param {string} _c @param {string} key @param {*} val */
  setOption(_s, _c, key, val) {
    uiStore[key] = val;
  }
};
globalThis.Configuration = {
  getUser() {
    if (configThrows) throw new Error("Configuration.getUser boom");
    return userConfig;
  }
};
globalThis.Locale = {
  /** @param {string} key @param {...*} args */
  compose(key, ...args) {
    if (localeThrows) throw new Error("Locale.compose boom");
    return args.length ? `${key}|${args.join(",")}` : key;
  }
};

// Same stub instance the mod registers against; importing the mod queues its init callback.
const { Options, CategoryType, __collectRegisteredOptions } = await import(
  "./stubs/engine-options-stub.mjs"
);
await import("/all-display-options/ui/all-display-options.js");

// mod-options.js (imported transitively) must have established the shared category.
assert.equal(CategoryType.Mods, "mods");

/**
 * Set the stub's display state, drain the init callback, and return the options by id.
 * @param {{resolutions?: any}|undefined} supported The supportedOptions value.
 * @param {any} graphicsResolution The graphicsOptions.resolution value (or undefined → no options).
 * @returns {Map<string, any>} Registered option specs keyed by id.
 */
function registerWith(supported, graphicsResolution) {
  Options.supportedOptions = supported;
  Options.graphicsOptions =
    graphicsResolution === undefined ? undefined : { resolution: graphicsResolution };
  const opts = __collectRegisteredOptions();
  return new Map(opts.map((o) => [o.id, o]));
}

// ── 1. Rich display: multi-mode supported list (covers getNativeResolution best/>/!> branches,
//      the filter dropping an invalid entry, native-tagging, the 1440p recommendation). ──────────
let byId = registerWith(
  // 1920x1600 is within native's AREA but exceeds its HEIGHT (1440): it must be dropped by
  // the per-dimension cap (an ultrawide/atypical-panel guard), not just the area cap.
  { resolutions: [{ i: 1280, j: 720 }, { i: 2560, j: 1440 }, { i: 1920, j: 1080 }, { i: 1920, j: 1600 }, { i: 0, j: 0 }] },
  { i: 2560, j: 1440 }
);
const EXPECTED = [
  "all-display-options-preset",
  "all-display-options-resolution",
  "all-display-options-ui-scale",
  "all-display-options-auto-scale"
];
for (const id of EXPECTED) assert.ok(byId.has(id), `option not registered: ${id}`);
for (const o of byId.values()) {
  assert.equal(o.category, CategoryType.Mods, `wrong category on ${o.id}`);
  assert.equal(typeof o.initListener, "function", `${o.id} missing initListener`);
}

// Resolution dropdown: items are Auto + modes (largest first), native tagged, capped at native.
const resOpt = byId.get("all-display-options-resolution");
assert.equal(resOpt.dropdownItems[0].label, "LOC_OPTIONS_GFX_AUTO");
assert.ok(
  resOpt.dropdownItems.some((/** @type {*} */ it) => it.label.includes("(native)")),
  "native mode should be tagged"
);
assert.ok(
  !resOpt.dropdownItems.some((/** @type {*} */ it) => it.label.startsWith("3840")),
  "modes larger than native must be dropped"
);
assert.ok(
  // label is "WIDTH x HEIGHT"; endsWith avoids matching width-1600 modes like "1600 x 900".
  !resOpt.dropdownItems.some((/** @type {*} */ it) => String(it.label).endsWith("1600")),
  "a mode within native's area but exceeding its height (1600 > 1440) must be dropped (per-dimension cap)"
);

// Resolution init: stored resolution that IS in the list selects its index.
let info = {};
resOpt.initListener(info);
assert.ok(info.selectedItemIndex > 0, "stored native resolution should select a non-Auto index");
// Resolution update: valid index applies; out-of-range index is a no-op (both branches).
const before = Options.needReloadRefCount;
resOpt.updateListener({}, 1);
resOpt.updateListener({}, 999);
assert.ok(Options.needReloadRefCount >= before);

// Preset (native present): exercise every thunk — Current (no-op), Recommended, Max-zoom, Default,
// and an out-of-range index.
const presetA = byId.get("all-display-options-preset");
info = {};
presetA.initListener(info); // Locale.compose succeeds → composed description
assert.ok(String(info.description).startsWith("LOC_ALL_DISPLAY_OPTIONS_PRESET_DETECTED"));
presetA.updateListener({}, 0); // Current → apply is null
presetA.updateListener({}, 1); // Recommended → native present
presetA.updateListener({}, 2); // Max zoom → native present
presetA.updateListener({}, 3); // Game default
presetA.updateListener({}, 42); // out of range → no-op
assert.equal(uiStore.UIGlobalScale, 100, "Game default restores 100% UI scale");
assert.equal(userConfig.uiAutoScale, true, "Game default re-enables auto-scale");

// UI-scale slider: init reads current scale; update round-trips + clamps (min, max, non-finite).
const scaleOpt = byId.get("all-display-options-ui-scale");
uiStore.UIGlobalScale = 120;
info = {};
scaleOpt.initListener(info);
assert.equal(info.currentValue, 120);
// readGlobalScale fallbacks: a non-finite stored value (NaN) and a non-positive one (0) both → 100.
delete uiStore.UIGlobalScale; // Number(undefined) → NaN → !isFinite
info = {};
scaleOpt.initListener(info);
assert.equal(info.currentValue, 100);
uiStore.UIGlobalScale = 0; // finite but <= 0
info = {};
scaleOpt.initListener(info);
assert.equal(info.currentValue, 100);
info = {};
scaleOpt.updateListener(info, 10); // below min → 50
assert.equal(info.currentValue, 50);
scaleOpt.updateListener(info, 9999); // above max → 200
assert.equal(info.currentValue, 200);
scaleOpt.updateListener(info, "nope"); // non-finite → 100
assert.equal(info.currentValue, 100);
assert.equal(userConfig.uiAutoScale, false, "setting scale disables auto-scale");

// Auto-scale checkbox: init reflects config; update writes it back (both values).
const autoOpt = byId.get("all-display-options-auto-scale");
userConfig.uiAutoScale = true;
info = {};
autoOpt.initListener(info);
assert.equal(info.currentValue, true);
autoOpt.updateListener({}, false);
assert.equal(userConfig.uiAutoScale, false);
autoOpt.updateListener({}, true);
assert.equal(userConfig.uiAutoScale, true);

// ── 2. No display info: supportedOptions undefined, no graphics options (covers native === null,
//      the empty-list recommendation, getSupportedResolutions' non-array path, resolution init's
//      "no current resolution" path). ──────────────────────────────────────────────────────────
byId = registerWith(undefined, undefined);
const resOptB = byId.get("all-display-options-resolution");
info = {};
resOptB.initListener(info); // graphicsOptions undefined → stays on Auto
assert.equal(info.selectedItemIndex, 0);
// Preset with native === null: Recommended / Max-zoom take the `if (native)` false branch.
const presetB = byId.get("all-display-options-preset");
presetB.updateListener({}, 1);
presetB.updateListener({}, 2);
// With no native cap, the curated 16:9/16:10 list is still offered (Auto + curated modes), and
// nothing is tagged "(native)" since the panel size is unknown.
assert.ok(resOptB.dropdownItems.length > 1, "curated modes are offered even without a native cap");
assert.equal(resOptB.dropdownItems[0].label, "LOC_OPTIONS_GFX_AUTO");
assert.ok(
  !resOptB.dropdownItems.some((/** @type {*} */ it) => it.label.includes("(native)")),
  "no native tag when the panel size is unknown"
);

// ── 3. Recommendation tiers: high-DPI (>=1900 → 75%) and 1080p (<1400 → 100%). ─────────────────
registerWith({ resolutions: [{ i: 3840, j: 2160 }] }, { i: 0, j: 0 }); // native height 2160 → 75
registerWith({ resolutions: [{ i: 1920, j: 1080 }] }, { i: 0, j: 0 }); // native height 1080 → 100

// ── 4. Resolution init when the stored mode is valid but NOT in the list (idx === -1 branch). ───
byId = registerWith({ resolutions: [{ i: 2560, j: 1440 }] }, { i: 4321, j: 1234 });
info = {};
byId.get("all-display-options-resolution").initListener(info);
assert.equal(info.selectedItemIndex, 0, "an unlisted stored resolution falls back to Auto");

// ── 5. Defensive paths: engine singletons throwing are swallowed by safe(). ─────────────────────
byId = registerWith({ resolutions: [{ i: 1920, j: 1080 }] }, { i: 0, j: 0 });
uiThrows = true;
info = {};
byId.get("all-display-options-ui-scale").initListener(info); // UI.getOption throws → readGlobalScale → 100
assert.equal(info.currentValue, 100);
uiThrows = false;

configThrows = true;
info = {};
byId.get("all-display-options-auto-scale").initListener(info); // getUser throws → safe fallback true
assert.equal(info.currentValue, true);
configThrows = false;

localeThrows = true;
info = {};
byId.get("all-display-options-preset").initListener(info); // both compose calls throw → raw tag fallback
assert.equal(info.description, "LOC_ALL_DISPLAY_OPTIONS_PRESET_INFO");
localeThrows = false;

// ── 6. applyResolution with no pending graphics target (covers the `!target` early return). ─────
Options.graphicsOptions = undefined;
byId.get("all-display-options-resolution").updateListener({}, 1); // applyResolution → no target → returns

console.log("all-display-options-options harness passed (all options, listeners, presets exercised)");
