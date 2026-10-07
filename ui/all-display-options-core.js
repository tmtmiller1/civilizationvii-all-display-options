import { Options } from "/core/ui/options/model-options.js";

// Standard 16:9 and 16:10 modes offered regardless of what the engine currently
// advertises. Merged with the engine's own list, deduped, and capped at the native
// panel size, since the engine refuses a mode larger than the display.
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
 * Run `fn` and return its result, or `fallback` if it throws. Engine-API
 * differences then can't take the Options screen down.
 * @template T
 * @param {() => T} fn
 * @param {T} [fallback]
 * @returns {T | undefined}
 */
export function safe(fn, fallback) {
  try {
    return fn();
  } catch (_) {
    return fallback;
  }
}

/**
 * Integer UI-scale percentage clamped to [SCALE_MIN, SCALE_MAX]; 100 when not finite.
 * @param {number|string} v
 * @returns {number}
 */
function clampScale(v) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return 100;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, n));
}

/**
 * The engine's supported modes, filtered to positive sizes. Empty when unavailable.
 * @returns {{i: number, j: number}[]}
 */
function getSupportedResolutions() {
  const list = safe(() => Options.supportedOptions?.resolutions, null);
  return Array.isArray(list) ? list.filter((/** @type {*} */ r) => r && r.i > 0 && r.j > 0) : [];
}

/**
 * Native resolution, taken as the largest-area supported mode. Null when unknown.
 * @returns {{i: number, j: number}|null}
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
 * Recommended UI scale for "more zoomed out", from the native panel height.
 * @param {{i: number, j: number}|null} native
 * @returns {number}
 */
export function recommendedScaleFor(native) {
  const h = native ? native.j : 0;
  if (h >= 1900) return 75; // high-DPI / retina laptop panels
  if (h >= 1400) return 85; // 1440p-class
  return 100; // 1080p and below: default already looks fine
}

/**
 * Resolution dropdown items: Auto, then standard modes up to native, largest first.
 * @returns {{label: string, resolution: {i: number, j: number}}[]}
 */
export function buildResolutionItems() {
  const native = getNativeResolution();
  const nativeArea = native ? native.i * native.j : Infinity;
  const byKey = new Map();
  const add = (/** @type {{i: number, j: number}} */ r) => {
    if (r.i * r.j > nativeArea) return; // never exceed the panel by area
    // nor in either dimension: an ultrawide (2560x1080) passes the area cap for a
    // taller mode (1920x1200) that the engine would refuse or letterbox on Confirm
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
 * Write a resolution into the engine's pending graphics options (committed on
 * Confirm). Bumps the reload ref-count only when the mode changes.
 * @param {{i: number, j: number}} res Auto is i:0, j:0.
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
 * Set the engine's UIGlobalScale (clamped) and turn auto-scale off, since the
 * engine only honors UIGlobalScale while auto-scale is off.
 * @param {number|string} value
 * @returns {number} the clamped percentage applied
 */
export function setGlobalScale(value) {
  const v = clampScale(value);
  // bump the reload count only on a real change (as applyResolution does); an
  // unconditional bump made the game demand a reload after re-selecting the same scale
  const prev = readGlobalScale();
  const wasAuto = !!safe(() => Configuration.getUser().uiAutoScale, false);
  safe(() => UI.setOption("user", "Interface", "UIGlobalScale", v));
  safe(() => Configuration.getUser().setUiAutoScale(false));
  if (v !== prev || wasAuto) Options.needReloadRefCount += 1;
  return v;
}

/**
 * Current UIGlobalScale, clamped; 100 when unset or not positive.
 * @returns {number}
 */
export function readGlobalScale() {
  const raw = safe(() => UI.getOption("user", "Interface", "UIGlobalScale"), 100);
  const v = Number(raw);
  return clampScale(Number.isFinite(v) && v > 0 ? v : 100);
}

/**
 * Preset dropdown items, each carrying an `apply` thunk (null for "Current").
 * @param {{i: number, j: number}|null} native
 * @param {number} rec recommended UI-scale percentage for this display
 * @returns {{label: string, apply: (() => void)|null}[]}
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
