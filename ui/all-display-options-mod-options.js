// mod-options.js
//
// Shared "Mods" category bootstrap for the Options screen. Idempotent, so it
// can load alongside other mods that define the same category (demographics
// ships an identical bootstrap).

import { CategoryType } from "/core/ui/options/model-options.js";
import { CategoryData } from "/core/ui/options/options-helpers.js";

// This runs at shell scope (the main menu), where an uncaught exception takes the
// whole main menu down. The writes below touch engine-owned objects from
// /core/ui/options, which a future patch could freeze or reshape (ES modules are
// strict mode, so writing a frozen object throws) or leave null. The try/catch
// swallows a failed write and the `else` reports a missing Options model; in the
// worst case the mod's options just don't appear under "Mods".
try {
  if (!CategoryType || !CategoryData) {
    console.warn(
      "[AllDisplayOptions.mod-options] Options model unavailable; Mods category not registered."
    );
  } else {
    if (!CategoryType.Mods) {
      CategoryType.Mods = "mods";
    }
    if (!CategoryData[CategoryType.Mods]) {
      CategoryData[CategoryType.Mods] = {
        title: "LOC_UI_CONTENT_MGR_SUBTITLE",
        description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION"
      };
    }
  }
} catch (e) {
  console.warn("[AllDisplayOptions.mod-options] Mods-category bootstrap skipped:", e);
}
