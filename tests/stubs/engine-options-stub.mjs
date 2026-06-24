// Test double for the engine options modules — `/core/ui/options/model-options.js` and
// `/core/ui/options/options-helpers.js` — wired in by tests/loader.mjs (both paths resolve here, so
// it's one shared instance). Records `addOption`/`addInitCallback` and carries the mutable
// `supportedOptions` / `graphicsOptions` / `needReloadRefCount` fields the mod reads and writes.

// `let` (not `const`) so a test can swap the whole binding to null/undefined and exercise
// mod-options.js's "Options model unavailable" branch via the live ESM binding.
/** Mutable category registry (mod-options.js sets `CategoryType.Mods = "mods"` on load). @type {any} */
export let CategoryType = {};
/** @type {any} */
export let CategoryData = {};

/**
 * Replace the exported category model bindings (test-only). Importers see the new values through
 * the live ESM bindings, so re-importing mod-options.js will observe them.
 * @param {any} type New `CategoryType` value.
 * @param {any} data New `CategoryData` value.
 * @returns {void}
 */
export function __setCategoryModel(type, data) {
  CategoryType = type;
  CategoryData = data;
}
export const OptionType = {
  Checkbox: "checkbox",
  Dropdown: "dropdown",
  Slider: "slider",
  Stepper: "stepper",
  Switch: "switch"
};

/** @type {any[]} */
const registered = [];
/** @type {Array<() => void>} */
const initCallbacks = [];

export const Options = {
  /** Engine field: the supported graphics resolutions. Tests overwrite this. @type {any} */
  supportedOptions: { resolutions: [] },
  /** Engine field: the pending graphics options committed on Confirm. @type {any} */
  graphicsOptions: { resolution: { i: 0, j: 0 } },
  /** Engine field: bumped to flag a UI reload is needed. */
  needReloadRefCount: 0,
  /** @param {any} spec */
  addOption(spec) {
    registered.push(spec);
  },
  /** @param {() => void} cb */
  addInitCallback(cb) {
    initCallbacks.push(cb);
  }
};

/**
 * Drain the queued init callbacks (what the engine does when the options screen initializes) and
 * return the option specs registered as a result. Idempotent: clears prior captures first, so it
 * can be called repeatedly under different stub state to exercise registration branches.
 * @returns {any[]} The registered option specs.
 */
export function __collectRegisteredOptions() {
  registered.length = 0;
  for (const cb of initCallbacks) cb();
  return registered.slice();
}
