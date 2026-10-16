// The "reload required" count on the Confirm path. Cancel zeroes the count in the base game
// (model-options.js restore), so what matters is Confirm: the game reloads the interface when the
// count is above zero (commitOptions), and changing a setting and changing it back mustn't leave it
// raised. The stub's commitOptions mirrors the base one and counts the reloads it would have done.
// Each option spec is passed as its own `info`, as the Options screen does.
import assert from "node:assert/strict";

const uiStore = { UIGlobalScale: 100 };
const userConfig = {
  uiAutoScale: false,
  /** @param {boolean} v */
  setUiAutoScale(v) {
    this.uiAutoScale = v;
  }
};
globalThis.UI = {
  /** @param {string} _s @param {string} _c @param {string} key */
  getOption(_s, _c, key) {
    return uiStore[key];
  },
  /** @param {string} _s @param {string} _c @param {string} key @param {*} val */
  setOption(_s, _c, key, val) {
    uiStore[key] = val;
  }
};
globalThis.Configuration = { getUser: () => userConfig };
globalThis.Locale = { compose: (/** @type {string} */ key) => key };

const { Options, __collectRegisteredOptions } = await import("./stubs/engine-options-stub.mjs");
await import("/all-display-options/ui/all-display-options.js");

Options.supportedOptions = { resolutions: [{ i: 2560, j: 1440 }, { i: 1920, j: 1080 }] };
Options.graphicsOptions = { resolution: { i: 2560, j: 1440 } };
const byId = new Map(__collectRegisteredOptions().map((o) => [o.id, o]));
const scale = byId.get("all-display-options-ui-scale");
const auto = byId.get("all-display-options-auto-scale");
const res = byId.get("all-display-options-resolution");
const preset = byId.get("all-display-options-preset");
const resIndex = (/** @type {string} */ dims) =>
  res.dropdownItems.findIndex((/** @type {*} */ it) => it.label.startsWith(dims));

/**
 * Set the engine state, then open the Options screen: every option's initListener runs.
 * @param {{scale?: number, autoScale?: boolean, resolution?: {i: number, j: number}}} state
 */
function open(state = {}) {
  if (state.scale !== undefined) uiStore.UIGlobalScale = state.scale;
  if (state.autoScale !== undefined) userConfig.uiAutoScale = state.autoScale;
  if (state.resolution) Options.graphicsOptions = { resolution: { ...state.resolution } };
  for (const o of byId.values()) o.initListener(o);
}

/** Press Confirm and return how many interface reloads it caused. */
function confirm() {
  const before = Options.__reloads;
  Options.commitOptions();
  return Options.__reloads - before;
}

// 1. Drag the scale slider away and back to where it started: no reload on Confirm.
open({ scale: 100, autoScale: false, resolution: { i: 2560, j: 1440 } });
for (const v of [105, 110, 105, 100]) scale.updateListener(scale, v);
assert.equal(Options.needReloadRefCount, 0, "scale back at its start value leaves no reload pending");
assert.equal(confirm(), 0);

// 2. A scale that stays changed still reloads on Confirm.
open({ scale: 100, autoScale: false });
scale.updateListener(scale, 80);
assert.ok(Options.needReloadRefCount > 0, "a changed scale asks for a reload");
assert.equal(confirm(), 1);

// 3. After that Confirm the screen opens on the new value, and returning to it clears the count.
open();
scale.updateListener(scale, 100);
scale.updateListener(scale, 80);
assert.equal(Options.needReloadRefCount, 0, "the start value is the one the screen opened with");
assert.equal(confirm(), 0);

// 4. Auto-scale off and on again: no reload.
open({ autoScale: true });
auto.updateListener(auto, false);
assert.ok(Options.needReloadRefCount > 0);
auto.updateListener(auto, true);
assert.equal(Options.needReloadRefCount, 0, "auto-scale back on leaves no reload pending");
assert.equal(confirm(), 0);

// 5. The slider turns auto-scale off. Sliding back to the start scale still leaves auto-scale off,
//    which changes the interface, so the count stays up until auto-scale is back on too.
open({ scale: 100, autoScale: true });
scale.updateListener(scale, 90);
scale.updateListener(scale, 100);
assert.ok(Options.needReloadRefCount > 0, "auto-scale is still off, so a reload is still due");
auto.updateListener(auto, true);
assert.equal(Options.needReloadRefCount, 0);
assert.equal(confirm(), 0);

// 6. Resolution to another mode and back.
open({ resolution: { i: 2560, j: 1440 } });
res.updateListener(res, resIndex("1920 x 1080"));
assert.ok(Options.needReloadRefCount > 0);
res.updateListener(res, resIndex("2560 x 1440"));
assert.equal(Options.needReloadRefCount, 0, "resolution back at its start mode leaves no reload pending");
assert.equal(confirm(), 0);

// 7. Presets: Maximum zoom-out, then Game default when the game was already at its defaults.
open({ scale: 100, autoScale: true, resolution: { i: 0, j: 0 } });
preset.updateListener(preset, 2); // native, 60%, auto-scale off
assert.ok(Options.needReloadRefCount > 0);
preset.updateListener(preset, 3); // Auto, 100%, auto-scale on: where it started
assert.equal(Options.needReloadRefCount, 0, "Game default from the defaults leaves no reload pending");
assert.equal(confirm(), 0);

// 8. A count the base game's own options raised stays; the mod only gives back what it took.
open({ scale: 100, autoScale: false });
Options.needReloadRefCount += 1; // e.g. the base auto-scale adjustment slider
scale.updateListener(scale, 120);
scale.updateListener(scale, 100);
assert.equal(Options.needReloadRefCount, 1, "the base game's count is left alone");
assert.equal(confirm(), 1);

// 9. The count never goes below zero, even if something else zeroed it while a change was held.
open({ scale: 100, autoScale: false });
scale.updateListener(scale, 120);
Options.needReloadRefCount = 0;
scale.updateListener(scale, 100);
assert.equal(Options.needReloadRefCount, 0);

console.log("reload-count harness passed (scale, auto-scale, resolution and presets on the Confirm path)");
