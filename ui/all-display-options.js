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
import {
  applyResolution,
  buildPresetItems,
  buildResolutionItems,
  getNativeResolution,
  readGlobalScale,
  recommendedScaleFor,
  safe,
  SCALE_MAX,
  SCALE_MIN,
  setGlobalScale,
} from "/all-display-options/ui/all-display-options-core.js";

// Group id becomes the header LOC key as LOC_OPTIONS_GROUP_<UPPERCASE>, so keep
// it a single hyphen-free token (-> LOC_OPTIONS_GROUP_ALLDISPLAYOPTIONS).
const GROUP = "alldisplayoptions";

// --- Option registrations -------------------------------------------------

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
      // Only flag a required reload when the toggle actually changes, so re-affirming the
      // current value (or toggling on then off) doesn't leave a spurious "reload required".
      const changed = !!value !== !!info.currentValue;
      safe(() => Configuration.getUser().setUiAutoScale(!!value));
      info.currentValue = !!value;
      if (changed) Options.needReloadRefCount += 1;
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
