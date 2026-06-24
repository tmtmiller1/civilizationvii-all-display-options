// Node ESM loader for the test harness. Maps the two kinds of absolute specifiers the mod uses —
// `/all-display-options/*` (the mod's own files) and the engine `/core/ui/options/*` modules — onto
// real files so the mod can be imported and exercised without a live Civ runtime.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const loaderDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(loaderDir, "..");
const MODULE_PREFIX = "/all-display-options/";

// Engine `/core/*` options modules the mod imports by absolute path but which don't exist in Node.
// Both resolve to one recording stub (shared instance), so a test sees exactly what the mod sets.
const OPTIONS_STUB = path.join(loaderDir, "stubs", "engine-options-stub.mjs");
const STUBBED_CORE = new Set([
  "/core/ui/options/model-options.js",
  "/core/ui/options/options-helpers.js"
]);

/**
 * @param {string} specifier
 * @param {*} context
 * @param {*} defaultResolve
 */
export async function resolve(specifier, context, defaultResolve) {
  // Strip any cache-busting query (e.g. "?case=1") so a test can re-import a module fresh.
  const q = specifier.indexOf("?");
  const bare = q === -1 ? specifier : specifier.slice(0, q);
  const suffix = q === -1 ? "" : specifier.slice(q);

  if (STUBBED_CORE.has(bare)) {
    return { url: pathToFileURL(OPTIONS_STUB).href + suffix, shortCircuit: true };
  }
  if (bare.startsWith(MODULE_PREFIX)) {
    const mapped = path.join(projectRoot, bare.slice(MODULE_PREFIX.length));
    return { url: pathToFileURL(mapped).href + suffix, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
