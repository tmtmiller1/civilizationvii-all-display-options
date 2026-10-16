// Every LOC tag the scripts and the modinfo use is defined in the English, and every language file under
// text/<lang>/ carries exactly the English tag set, each tag once, under the Language the modinfo loads it with, with
// the same {1_Display}-style placeholders and every number. A missing tag shows the player the English (or the raw
// tag), a duplicate rolls back the whole file, and a lost placeholder shows the wrong value.
// Run from the repo root (npm run test:i18n).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MODINFO = "all-display-options.modinfo";
const read = (/** @type {string} */ file) => fs.readFileSync(file, "utf8");
const unescape = (/** @type {string} */ text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// The game's own tags the mod borrows.
const GAME_TAGS = new Set(["LOC_MODULE_BASE_STANDARD_NAME", "LOC_OPTIONS_GFX_AUTO", "LOC_UI_CONTENT_MGR_SUBTITLE",
  "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION"]);
// The options group header is named by the game from the group id, so no script spells it out.
const GROUP_HEADER = "LOC_OPTIONS_GROUP_ALLDISPLAYOPTIONS";

function englishRows() {
  const rows = [...read("text/en_us/ModText.xml").matchAll(/<Row\s+Tag="([A-Z0-9_]+)"\s*>\s*<Text>([\s\S]*?)<\/Text>/g)];
  return rows.map((match) => ({ tag: match[1], text: unescape(match[2]) }));
}

function languageRows(/** @type {string} */ xml) {
  const re = /<Replace\s+Tag="([A-Z0-9_]+)"\s+Language="([^"]+)"\s*>\s*<Text>([\s\S]*?)<\/Text>\s*<\/Replace>/g;
  return [...xml.matchAll(re)].map((match) => ({ tag: match[1], language: match[2], text: unescape(match[3]) }));
}

const placeholders = (/** @type {string} */ text) => (text.match(/\{\d+_[A-Za-z]+\}/g) ?? []).sort().join(" ");
const numbers = (/** @type {string} */ text) => (text.match(/\d+/g) ?? []).sort();

const english = englishRows();
const englishText = new Map(english.map((row) => [row.tag, row.text]));
const scripts = fs.readdirSync("ui").filter((file) => file.endsWith(".js")).map((file) => read(path.join("ui", file)));

// Language folder -> the locale the modinfo loads it under.
const loaded = new Map([...read(MODINFO)
  .matchAll(/<Item locale="([^"]+)">text\/([a-z_]+)\/ModText\.xml<\/Item>/g)].map((match) => [match[2], match[1]]));

test("the English has each tag once", () => {
  assert.equal(englishText.size, english.length);
});

test("every tag the scripts and modinfo use is defined", () => {
  // "LOC_OPTIONS_GROUP_" in a comment is a prefix, not a tag
  const used = new Set([...scripts, read(MODINFO)].flatMap((source) => source.match(/LOC_[A-Z0-9_]+/g) ?? [])
    .filter((tag) => !tag.endsWith("_")));
  const missing = [...used].filter((tag) => !englishText.has(tag) && !GAME_TAGS.has(tag));
  assert.deepEqual(missing, []);
});

test("every English tag is used", () => {
  const sources = scripts.join("\n") + read(MODINFO);
  const unused = [...englishText.keys()].filter((tag) => !sources.includes(tag) && tag !== GROUP_HEADER);
  assert.deepEqual(unused, []);
});

test("the modinfo loads every language folder, in both scopes", () => {
  const folders = fs.readdirSync("text", { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "en_us").map((entry) => entry.name).sort();
  assert.deepEqual([...loaded.keys()].sort(), folders);
  const lines = read(MODINFO).match(/<Item locale=/g) ?? [];
  assert.equal(lines.length, folders.length * 2);
});

for (const [folder, locale] of loaded) {
  test(`${folder} matches the English`, () => {
    const xml = read(path.join("text", folder, "ModText.xml"));
    assert.ok(!/<EnglishText>/.test(xml), "a language file uses LocalizedText, not EnglishText");
    const rows = languageRows(xml);
    assert.equal((xml.match(/<Replace\b/g) ?? []).length, rows.length, "a Replace element the check can't read");
    const seen = new Set();
    for (const row of rows) {
      assert.ok(!seen.has(row.tag), `duplicate ${row.tag}`);
      seen.add(row.tag);
      assert.equal(row.language, locale, `${row.tag} Language`);
      assert.ok(englishText.has(row.tag), `${row.tag} isn't an English tag`);
      assert.ok(row.text.trim(), `${row.tag} is empty`);
      const source = /** @type {string} */ (englishText.get(row.tag));
      assert.equal(placeholders(row.text), placeholders(source), `${row.tag} placeholders`);
      const have = numbers(row.text);
      for (const number of numbers(source)) {
        const index = have.indexOf(number);
        assert.ok(index >= 0, `${row.tag} loses the number ${number}`);
        have.splice(index, 1);
      }
    }
    assert.deepEqual([...englishText.keys()].filter((tag) => !seen.has(tag)), [], "missing tags");
  });
}
