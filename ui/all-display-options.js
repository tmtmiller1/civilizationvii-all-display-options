// all-display-options.js
//
// Adds a "Display Tweaks" block to the global Options screen (under the shared
// "Mods" category) that restores display choices the base game's dropdowns hide
// or clamp:
//
//   * Resolution (all modes)  - every standard mode up to your panel's native
//                               resolution, not just the short list the patch left.
//   * Global UI scale         - the engine's real UIGlobalScale lever (50-200%),
//                               instead of the in-game slider's 50-125% clamp.
//   * UI auto-scale           - toggle the post-patch auto-scaling that made
//                               everything look "zoomed in".
//   * Display preset          - one-click, device-aware presets (reads your panel
//                               and recommends a zoom-out setting).
//
// Why this works: on Confirm the options screen calls Options.commitOptions()
// with no category, whose default branch applies graphics options AND fires
// UIGlobalScaleChanged - so both the resolution and the scale changes below take
// effect through the normal Confirm button. See core/ui/options/screen-options.js.

import { CategoryType, OptionType, Options } from "/core/ui/options/model-options.js";
import "/all-display-options/ui/all-display-options-mod-options.js";

// Group id becomes the header LOC key as LOC_OPTIONS_GROUP_<UPPERCASE>, so keep
// it a single hyphen-free token (-> LOC_OPTIONS_GROUP_ALLDISPLAYOPTIONS).
const GROUP = "alldisplayoptions";

// Standard 16:9 and 16:10 modes we want available regardless of what the engine
// currently advertises. Merged with the engine's own supported list, deduped,
// and capped at the native panel resolution so we never offer a mode larger than
// the display (which the engine would refuse without arbitrary window sizing).
const CURATED_RESOLUTIONS = [
  // 16:9
  { i: 1280, j: 720 }, { i: 1366, j: 768 }, { i: 1600, j: 900 },
  { i: 1920, j: 1080 }, { i: 2048, j: 1152 }, { i: 2560, j: 1440 },
  { i: 3200, j: 1800 }, { i: 3840, j: 2160 },
  // 16:10
  { i: 1440, j: 900 }, { i: 1680, j: 1050 }, { i: 1920, j: 1200 },
  { i: 2560, j: 1600 }, { i: 2880, j: 1800 }
];

const SCALE_MIN = 50;
const SCALE_MAX = 200;

/**
 * Run `fn`, returning its result, or `fallback` if it throws. Swallows engine-API
 * differences so one bad call can't break the Options screen.
 * @template T
 * @param {() => T} fn Thunk to invoke.
 * @param {T} [fallback] Value returned if `fn` throws.
 * @returns {T | undefined} The result of `fn`, or `fallback` on error.
 */
function safe(fn, fallback) {
  try {
    return fn();
  } catch (_) {
    return fallback;
  }
}

/**
 * Coerce a value to an integer UI-scale percentage clamped to [SCALE_MIN, SCALE_MAX].
 * @param {number|string} v The raw scale value.
 * @returns {number} The clamped integer percentage (100 when not finite).
 */
function clampScale(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return 100;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, n));
}

/**
 * The engine's supported resolution modes, filtered to valid positive sizes.
 * @returns {{i: number, j: number}[]} The supported modes (empty when unavailable).
 */
function getSupportedResolutions() {
  const list = safe(() => Options.supportedOptions?.resolutions, null);
  return Array.isArray(list) ? list.filter((/** @type {*} */ r) => r && r.i > 0 && r.j > 0) : [];
}

/**
 * The display's native resolution = the largest-area supported mode (or null).
 * @returns {{i: number, j: number}|null} The native mode, or null when unknown.
 */
function getNativeResolution() {
  const supported = getSupportedResolutions();
  let best = null;
  for (const r of supported) {
    if (!best || r.i * r.j > best.i * best.j) best = { i: r.i, j: r.j };
  }
  return best;
}

/**
 * Recommended UI scale for "more zoomed out", derived from native panel height.
 * @param {{i: number, j: number}|null} native The native resolution, or null.
 * @returns {number} The recommended UI-scale percentage.
 */
function recommendedScaleFor(native) {
  const h = native ? native.j : 0;
  if (h >= 1900) return 75; // high-DPI / retina laptop panels
  if (h >= 1400) return 85; // 1440p-class
  return 100; // 1080p and below: default already looks fine
}

/**
 * Build the resolution dropdown items: Auto, then standard modes up to native.
 * @returns {{label: string, resolution: {i: number, j: number}}[]} Dropdown items.
 */
function buildResolutionItems() {
  const native = getNativeResolution();
  const nativeArea = native ? native.i * native.j : Infinity;
  const byKey = new Map();
  // Inputs are pre-validated: the supported list is filtered, CURATED entries are
  // literals, and `native` is null-guarded below, so we only need the area cap.
  const add = (/** @type {{i: number, j: number}} */ r) => {
    if (r.i * r.j > nativeArea) return; // never exceed the panel
    byKey.set(`${r.i}x${r.j}`, { i: r.i, j: r.j });
  };
  getSupportedResolutions().forEach(add);
  CURATED_RESOLUTIONS.forEach(add);
  if (native) add(native);

  const modes = Array.from(byKey.values()).sort((a, b) => b.i * b.j - a.i * a.j);
  const items = [{ label: "LOC_OPTIONS_GFX_AUTO", resolution: { i: 0, j: 0 } }];
  for (const m of modes) {
    const tag = native && m.i === native.i && m.j === native.j ? "  (native)" : "";
    items.push({ label: `${m.i} x ${m.j}${tag}`, resolution: m });
  }
  return items;
}

/**
 * Apply a resolution to the engine's pending graphics options (committed on Confirm).
 * Bumps the reload ref-count when the mode actually changes.
 * @param {{i: number, j: number}} res The target resolution ({i:0,j:0} = Auto).
 * @returns {void}
 */
function applyResolution(res) {
  const target = safe(() => Options.graphicsOptions?.resolution, null);
  if (!target) return;
  if (target.i !== res.i || target.j !== res.j) Options.needReloadRefCount += 1;
  target.i = res.i;
  target.j = res.j;
}

/**
 * Set the engine's UIGlobalScale (clamped) and disable auto-scale so it's honoured.
 * @param {number|string} value The desired UI-scale percentage.
 * @returns {number} The clamped percentage actually applied.
 */
function setGlobalScale(value) {
  const v = clampScale(value);
  // UIGlobalScale is only honoured while auto-scale is OFF, so disable it here.
  safe(() => UI.setOption("user", "Interface", "UIGlobalScale", v));
  safe(() => Configuration.getUser().setUiAutoScale(false));
  Options.needReloadRefCount += 1;
  return v;
}

/**
 * Read the engine's current UIGlobalScale, clamped, defaulting to 100.
 * @returns {number} The current UI-scale percentage.
 */
function readGlobalScale() {
  const raw = safe(() => UI.getOption("user", "Interface", "UIGlobalScale"), 100);
  const v = Number(raw);
  return clampScale(Number.isFinite(v) && v > 0 ? v : 100);
}

// --- Option registrations -------------------------------------------------

/**
 * Build the preset dropdown items (Current / Recommended / Maximum zoom-out /
 * Game default), each carrying an `apply` thunk (null = no-op for "Current").
 * @param {{i: number, j: number}|null} native The detected native resolution.
 * @param {number} rec The recommended UI-scale percentage for this display.
 * @returns {{label: string, apply: (() => void)|null}[]} The preset items.
 */
function buildPresetItems(native, rec) {
  return [
    { label: "LOC_ALL_DISPLAY_OPTIONS_PRESET_CURRENT", apply: null },
    {
      label: "LOC_ALL_DISPLAY_OPTIONS_PRESET_RECOMMENDED",
      apply: () => {
        if (native) applyResolution(native);
        setGlobalScale(rec);
      }
    },
    {
      label: "LOC_ALL_DISPLAY_OPTIONS_PRESET_MAX_ZOOM",
      apply: () => {
        if (native) applyResolution(native);
        setGlobalScale(60);
      }
    },
    {
      label: "LOC_ALL_DISPLAY_OPTIONS_PRESET_DEFAULT",
      apply: () => {
        applyResolution({ i: 0, j: 0 });
        safe(() => UI.setOption("user", "Interface", "UIGlobalScale", 100));
        safe(() => Configuration.getUser().setUiAutoScale(true));
        Options.needReloadRefCount += 1;
      }
    }
  ];
}

/**
 * Register the device-aware "Display preset" dropdown (Current / Recommended /
 * Maximum zoom-out / Game default) under the Mods category.
 * @returns {void}
 */
function registerPreset() {
  const native = getNativeResolution();
  const rec = recommendedScaleFor(native);
  const nativeLabel = native ? `${native.i} x ${native.j}` : "Auto";
  const items = buildPresetItems(native, rec);
  Options.addOption({
    category: CategoryType.Mods,
    group: GROUP,
    type: OptionType.Dropdown,
    id: "all-display-options-preset",
    initListener: (/** @type {*} */ info) => {
      info.selectedItemIndex = 0;
      // Surface the detected panel + recommendation in the tooltip. Localized via
      // a parameterized LOC tag ({1_Display}, {2_Scale}); falls back to the static
      // LOC_ALL_DISPLAY_OPTIONS_PRESET_INFO if compose is unavailable.
      info.description = safe(
        () => Locale.compose("LOC_ALL_DISPLAY_OPTIONS_PRESET_DETECTED", nativeLabel, rec),
        safe(() => Locale.compose("LOC_ALL_DISPLAY_OPTIONS_PRESET_INFO"), "LOC_ALL_DISPLAY_OPTIONS_PRESET_INFO")
      );
    },
    updateListener: (/** @type {*} */ _info, /** @type {*} */ value) => {
      const idx = Number(value);
      const chosen = items[idx];
      if (chosen && chosen.apply) chosen.apply();
    },
    label: "LOC_ALL_DISPLAY_OPTIONS_PRESET",
    description: "LOC_ALL_DISPLAY_OPTIONS_PRESET_INFO",
    dropdownItems: items.map((it) => ({ label: it.label }))
  });
}

/**
 * Register the "Resolution (all modes)" dropdown: every standard mode up to the
 * panel's native size, including modes the base game's dropdown omits.
 * @returns {void}
 */
function registerResolution() {
  const items = buildResolutionItems();
  Options.addOption({
    category: CategoryType.Mods,
    group: GROUP,
    type: OptionType.Dropdown,
    id: "all-display-options-resolution",
    initListener: (/** @type {*} */ info) => {
      info.selectedItemIndex = 0;
      const cur = safe(() => Options.graphicsOptions?.resolution, null);
      if (cur && cur.i > 0 && cur.j > 0) {
        const idx = items.findIndex(
          (it) => it.resolution.i === cur.i && it.resolution.j === cur.j
        );
        if (idx >= 0) info.selectedItemIndex = idx;
      }
    },
    updateListener: (/** @type {*} */ _info, /** @type {*} */ value) => {
      const item = items[Number(value)];
      if (item) applyResolution(item.resolution);
    },
    label: "LOC_ALL_DISPLAY_OPTIONS_RESOLUTION",
    description: "LOC_ALL_DISPLAY_OPTIONS_RESOLUTION_INFO",
    dropdownItems: items.map((it) => ({ label: it.label }))
  });
}

/**
 * Register the "Global UI scale" slider spanning the engine's full 50–200% range
 * (the built-in slider only reaches 50–125%).
 * @returns {void}
 */
function registerGlobalScale() {
  Options.addOption({
    category: CategoryType.Mods,
    group: GROUP,
    type: OptionType.Slider,
    id: "all-display-options-ui-scale",
    min: SCALE_MIN,
    max: SCALE_MAX,
    steps: (SCALE_MAX - SCALE_MIN) / 5, // 5% increments
    initListener: (/** @type {*} */ info) => {
      const v = readGlobalScale();
      info.currentValue = v;
      info.formattedValue = `${v}%`;
    },
    updateListener: (/** @type {*} */ info, /** @type {*} */ value) => {
      const v = setGlobalScale(value);
      info.currentValue = v;
      info.formattedValue = `${v}%`;
    },
    label: "LOC_ALL_DISPLAY_OPTIONS_UI_SCALE",
    description: "LOC_ALL_DISPLAY_OPTIONS_UI_SCALE_INFO"
  });
}

/**
 * Register the "UI auto-scale" checkbox toggling the engine's post-patch
 * auto-sizing (the behaviour that can look "zoomed in").
 * @returns {void}
 */
function registerAutoScale() {
  Options.addOption({
    category: CategoryType.Mods,
    group: GROUP,
    type: OptionType.Checkbox,
    id: "all-display-options-auto-scale",
    initListener: (/** @type {*} */ info) => {
      info.currentValue = !!safe(() => Configuration.getUser().uiAutoScale, true);
    },
    updateListener: (/** @type {*} */ info, /** @type {*} */ value) => {
      safe(() => Configuration.getUser().setUiAutoScale(!!value));
      info.currentValue = !!value;
      Options.needReloadRefCount += 1;
    },
    label: "LOC_ALL_DISPLAY_OPTIONS_AUTO_SCALE",
    description: "LOC_ALL_DISPLAY_OPTIONS_AUTO_SCALE_INFO"
  });
}

Options.addInitCallback(() => {
  // Order top-to-bottom in the Mods category.
  registerPreset();
  registerResolution();
  registerGlobalScale();
  registerAutoScale();
});
