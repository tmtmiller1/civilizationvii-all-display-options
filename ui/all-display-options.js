// all-display-options.js
//
// Registers the mod's options (preset, resolution, UI scale, auto-scale) under
// the shared "Mods" category of the Options screen.
//
// On Confirm the options screen calls Options.commitOptions() with no category.
// Its default branch applies graphics options and fires UIGlobalScaleChanged,
// so both the resolution and the scale changes below take effect through the
// normal Confirm button. See core/ui/options/screen-options.js.

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

/**
 * "Display preset" dropdown: Current / Recommended / Maximum zoom-out / Game default.
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
      // tooltip names the detected panel and the recommendation ({1_Display},
      // {2_Scale}); falls back to the static PRESET_INFO text if compose fails
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
 * "Resolution (all modes)" dropdown.
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
 * "Global UI scale" slider over the engine's full 50-200% range (the built-in
 * slider stops at 125%).
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
 * "UI auto-scale" checkbox.
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
      // bump the reload count only on a real change, or re-affirming the current
      // value would leave a stale "reload required"
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
  // order is top-to-bottom in the Mods category
  registerPreset();
  registerResolution();
  registerGlobalScale();
  registerAutoScale();
});
