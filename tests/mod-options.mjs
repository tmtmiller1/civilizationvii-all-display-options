// Full-coverage test for ui/all-display-options-mod-options.js — the shared "Mods" category bootstrap. Re-imports the
// module (cache-busted) against the shared options stub in three states to exercise every branch:
//   1. category already present  → both guards skip
//   2. category absent           → both guards assign
//   3. category frozen           → the assignment throws and is swallowed by the try/catch
import assert from "node:assert/strict";

const stub = await import("./stubs/engine-options-stub.mjs");
const { CategoryType, CategoryData } = stub;

// ── 1. Already present: nothing is overwritten. ──────────────────────────────
CategoryType.Mods = "mods";
CategoryData.mods = { title: "EXISTING", description: "EXISTING" };
await import("/all-display-options/ui/all-display-options-mod-options.js?case=1");
assert.equal(CategoryData.mods.title, "EXISTING", "must not clobber an existing category");

// ── 2. Absent: both the category id and its data are established. ─────────────
delete CategoryType.Mods;
delete CategoryData.mods;
await import("/all-display-options/ui/all-display-options-mod-options.js?case=2");
assert.equal(CategoryType.Mods, "mods");
assert.equal(CategoryData.mods.title, "LOC_UI_CONTENT_MGR_SUBTITLE");

/** Capture console.warn for one import, returning the recorded warning arg lists. @param {() => Promise<any>} run */
async function withWarnCapture(run) {
  const captured = [];
  const realWarn = console.warn;
  console.warn = (/** @type {...*} */ ...args) => captured.push(args);
  try {
    await run();
  } finally {
    console.warn = realWarn;
  }
  return captured;
}

// ── 3. Frozen engine object: the write throws and is swallowed (no broken menu). ──
delete CategoryType.Mods;
Object.freeze(CategoryType);
let warnings = await withWarnCapture(() => import("/all-display-options/ui/all-display-options-mod-options.js?case=3"));
assert.equal(CategoryType.Mods, undefined, "frozen category must remain unwritten");
assert.equal(warnings.length, 1, "the swallowed failure should be logged once");
assert.ok(
  String(warnings[0][0]).includes("Mods-category bootstrap skipped"),
  "the warning should name the skipped bootstrap"
);

// ── 4. Options model absent (null binding): the explicit else-branch reports + registers nothing. ──
stub.__setCategoryModel(null, {});
warnings = await withWarnCapture(() => import("/all-display-options/ui/all-display-options-mod-options.js?case=4"));
assert.equal(warnings.length, 1, "an unavailable model should be reported once");
assert.ok(
  String(warnings[0][0]).includes("Options model unavailable"),
  "the warning should name the unavailable model"
);
stub.__setCategoryModel({}, {}); // restore

console.log("mod-options harness passed (present / absent / frozen / unavailable branches covered)");
