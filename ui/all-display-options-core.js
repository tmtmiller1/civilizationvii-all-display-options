import { Options } from "/core/ui/options/model-options.js";

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

export const SCALE_MIN = 50;
export const SCALE_MAX = 200;

/**
 * Run `fn`, returning its result, or `fallback` if it throws. Swallows engine-API
 * differences so one bad call can't break the Options screen.
 * @template T
 * @param {() => T} fn Thunk to invoke.
 * @param {T} [fallback] Value returned if `fn` throws.
 * @returns {T | undefined} The result of `fn`, or `fallback` on error.
 */
export function safe(fn, fallback) {
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
export function getNativeResolution() {
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
export function recommendedScaleFor(native) {
  const h = native ? native.j : 0;
  if (h >= 1900) return 75; // high-DPI / retina laptop panels
  if (h >= 1400) return 85; // 1440p-class
  return 100; // 1080p and below: default already looks fine
}

/**
 * Build the resolution dropdown items: Auto, then standard modes up to native.
 * @returns {{label: string, resolution: {i: number, j: number}}[]} Dropdown items.
 */
export function buildResolutionItems() {
  const native = getNativeResolution();
  const nativeArea = native ? native.i * native.j : Infinity;
  const byKey = new Map();
  // Inputs are pre-validated: the supported list is filtered, CURATED entries are
  // literals, and `native` is null-guarded below, so we only need the area cap.
  const add = (/** @type {{i: number, j: number}} */ r) => {
    if (r.i * r.j > nativeArea) return; // never exceed the panel (area)
    // ...or in either dimension: an ultrawide panel (e.g. 2560x1080) passes the area cap
    // for a taller mode (1920x1200) that the engine would then refuse/letterbox on Confirm.
    if (native && (r.i > native.i || r.j > native.j)) return;
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
export function applyResolution(res) {
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
export function setGlobalScale(value) {
  const v = clampScale(value);
  // Only flag a required reload when something actually changes (mirrors applyResolution).
  // An unconditional bump left the counter >0 after a no-op set (e.g. re-selecting the same
  // scale), so the game insisted on a UI reload though nothing net-changed.
  const prev = readGlobalScale();
  const wasAuto = !!safe(() => Configuration.getUser().uiAutoScale, false);
  // UIGlobalScale is only honoured while auto-scale is OFF, so disable it here.
  safe(() => UI.setOption("user", "Interface", "UIGlobalScale", v));
  safe(() => Configuration.getUser().setUiAutoScale(false));
  if (v !== prev || wasAuto) Options.needReloadRefCount += 1;
  return v;
}

/**
 * Read the engine's current UIGlobalScale, clamped, defaulting to 100.
 * @returns {number} The current UI-scale percentage.
 */
export function readGlobalScale() {
  const raw = safe(() => UI.getOption("user", "Interface", "UIGlobalScale"), 100);
  const v = Number(raw);
  return clampScale(Number.isFinite(v) && v > 0 ? v : 100);
}

/**
 * Build the preset dropdown items (Current / Recommended / Maximum zoom-out /
 * Game default), each carrying an `apply` thunk (null = no-op for "Current").
 * @param {{i: number, j: number}|null} native The detected native resolution.
 * @param {number} rec The recommended UI-scale percentage for this display.
 * @returns {{label: string, apply: (() => void)|null}[]} The preset items.
 */
export function buildPresetItems(native, rec) {
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
