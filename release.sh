#!/usr/bin/env bash
# release.sh: produce a clean zip + Steam Workshop manifest for the
# "All Display and Resolution Options" mod.
#
# Usage:  ./release.sh
# Output: dist/all-display-options-vX.Y.Z.zip  (X.Y.Z read from the modinfo <Version>)
#
# What this does:
#   1. Runs the quality gate (tsc + eslint + 100% coverage), unless deps aren't
#      installed (run `npm install` once) or SKIP_VERIFY=1 is set.
#   2. Mirrors the mod source into dist/all-display-options/ (excluding dev cruft).
#   3. Ships readable JS (no minification, transparent source is intentional).
#   4. Syntax-checks the shipped JS and audits the zip against an allow-list.
#   5. Renders a 1024x1024 preview.png and writes a steamcmd workshop_item.vdf.
#
# Run from the mod source directory.

set -euo pipefail
cd "$(dirname "$0")"

MOD_ID="all-display-options"
APPID="1295660"        # Sid Meier's Civilization VII
TITLE="All Display and Resolution Options"

# ── Quality gate ──────────────────────────────────────────────────────────
if [ "${SKIP_VERIFY:-0}" = "1" ]; then
    echo "release: SKIP_VERIFY=1, skipping the quality gate."
elif [ ! -d node_modules ]; then
    echo "release: node_modules missing, skipping verify. Run 'npm install' to enable the gate."
else
    echo "release: running 'npm run verify' (set SKIP_VERIFY=1 to skip)..."
    npm run verify || { echo "release: 'npm run verify' FAILED, aborting."; exit 1; }
fi

DIST_DIR="dist"
SRC_DIR="."
[ -f "$MOD_ID.modinfo" ] || { echo "error: $MOD_ID.modinfo not found in $(pwd)"; exit 1; }

VERSION="$(grep -oE '<Version>[^<]+</Version>' "$MOD_ID.modinfo" | head -1 | sed -E 's|</?Version>||g')"
[ -n "$VERSION" ] || { echo "error: could not parse <Version> from modinfo"; exit 1; }
AUTHORS="$(grep -oE '<Authors>[^<]+</Authors>' "$MOD_ID.modinfo" | head -1 | sed -E 's|</?Authors>||g')"
case "$AUTHORS" in ""|"Your Name"|"TODO") echo "error: set a real <Authors> before packaging."; exit 1;; esac
case "$VERSION" in *-smoke|*-dev|0.0.*) echo "error: <Version> '$VERSION' looks like a dev tag; bump first."; exit 1;; esac

# ── Steam Workshop published file id (persisted outside dist/) ─────────────
WORKSHOP_ID_FILE="steam_workshop_id.txt"
PUBLISHED_FILE_ID="${WORKSHOP_PUBLISHED_FILE_ID:-}"
SAVED_ID=""
[ -f "$WORKSHOP_ID_FILE" ] && SAVED_ID="$(tr -dc '0-9' < "$WORKSHOP_ID_FILE")"
if [ -n "$PUBLISHED_FILE_ID" ] && [ -n "$SAVED_ID" ] && [ "$PUBLISHED_FILE_ID" != "$SAVED_ID" ]; then
    echo "error: WORKSHOP_PUBLISHED_FILE_ID ($PUBLISHED_FILE_ID) conflicts with steam_workshop_id.txt ($SAVED_ID)."; exit 1
fi
[ -z "$PUBLISHED_FILE_ID" ] && [ -n "$SAVED_ID" ] && PUBLISHED_FILE_ID="$SAVED_ID"

ZIP_NAME="$MOD_ID-v$VERSION.zip"
TARGET_DIR="$DIST_DIR/$MOD_ID"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

echo "==> Cleaning $DIST_DIR/"
rm -rf "$DIST_DIR"; mkdir -p "$TARGET_DIR"

echo "==> Mirroring → $TARGET_DIR/ (excluding dev cruft)"
rsync -a --exclude='.git' --exclude='.gitignore' --exclude='.DS_Store' --exclude='dist' \
    --exclude='release.sh' --exclude='*.bak' --exclude='node_modules' \
    --exclude='tsconfig.json' --exclude='jsconfig.json' --exclude='types' --exclude='docs' \
    --exclude='eslint.config.js' --exclude='package.json' --exclude='package-lock.json' \
    --exclude='*.d.ts' --exclude='tests' --exclude='steam_workshop_id.txt' \
    --exclude='coverage' --exclude='.c8rc.json' \
    "$SRC_DIR"/ "$TARGET_DIR"/

echo "==> Shipping dist JS readable (no minification)"
echo "==> Syntax-checking dist JS"
find "$TARGET_DIR" -name '*.js' -type f -print0 | xargs -0 -n1 node -c

[ -f "$TARGET_DIR/$MOD_ID.modinfo" ] || { echo "error: modinfo missing at zip root"; exit 1; }

echo "==> Zipping $ZIP_PATH"
( cd "$DIST_DIR" && zip -qr "$ZIP_NAME" "$MOD_ID" )

echo "==> Verifying zip contents against allow-list"
ALLOW="^$MOD_ID/($MOD_ID\\.modinfo|README\\.md|LICENSE|CHANGELOG\\.md)\$"
ALLOW="$ALLOW"'|^'"$MOD_ID"'/ui/.+\.js$'
ALLOW="$ALLOW"'|^'"$MOD_ID"'/text/[a-z_]+/ModText\.xml$'
ALLOW="$ALLOW"'|^'"$MOD_ID"'/images/.+\.(svg|png)$'
UNEXPECTED="$(unzip -Z1 "$ZIP_PATH" | grep -vE '/$' | grep -vE "$ALLOW" || true)"
if [ -n "$UNEXPECTED" ]; then
    echo "error: zip contains unexpected entries:"; echo "$UNEXPECTED" | sed 's/^/    /'
    echo "  → tighten rsync --exclude or update ALLOW in release.sh."; exit 1
fi
echo "    OK: every shipped entry matches the allow-list."
unzip -l "$ZIP_PATH" | head -20 || true
SIZE="$(du -h "$ZIP_PATH" | cut -f1)"

# ── Workshop assets ───────────────────────────────────────────────────────
PREVIEW_SRC="docs/workshop-preview.svg"
PREVIEW_OUT="$DIST_DIR/preview.png"
if [ -f "$PREVIEW_SRC" ] && command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w 1024 -h 1024 "$PREVIEW_SRC" -o "$PREVIEW_OUT"
    echo "==> Workshop preview rendered: $PREVIEW_OUT"
else
    echo "==> WARNING: preview.png NOT generated (need rsvg-convert: brew install librsvg)."
    echo "    Steam requires a preview image, add one before uploading."
fi

VDF_PATH="$DIST_DIR/workshop_item.vdf"
ABS_CONTENT="$(cd "$TARGET_DIR" && pwd)"
ABS_PREVIEW=""; [ -f "$PREVIEW_OUT" ] && ABS_PREVIEW="$(cd "$DIST_DIR" && pwd)/preview.png"

# Change note from the current CHANGELOG section (rendered as a Steam BBCode list).
CHANGENOTE="v${VERSION} release."
if [ -f CHANGELOG.md ]; then
    BULLETS="$(awk -v ver="$VERSION" '$0 ~ ("^## \\[" ver "\\]"){g=1;next} g&&/^## /{exit} g{print}' CHANGELOG.md \
        | sed -nE 's/^[[:space:]]*[-*][[:space:]]+(.*)$/[*]\1/p' | sed -E 's/\*\*//g; s/`//g' | tr '\n' ' ')"
    [ -n "$BULLETS" ] && CHANGENOTE="$(printf '[list]%s[/list]' "$BULLETS" | sed -E 's/\\/\\\\/g; s/"/\\"/g')"
fi

{
    echo '"workshopitem"'
    echo '{'
    echo "    \"appid\"          \"$APPID\""
    [ -n "$PUBLISHED_FILE_ID" ] && echo "    \"publishedfileid\" \"$PUBLISHED_FILE_ID\""
    echo "    \"contentfolder\"  \"$ABS_CONTENT\""
    [ -n "$ABS_PREVIEW" ] && echo "    \"previewfile\"    \"$ABS_PREVIEW\""
    echo "    \"visibility\"     \"0\""
    echo "    \"title\"          \"$TITLE\""
    # "description" is intentionally omitted: set it once on the Steam page from
    # docs/steam-workshop-description.md, then steamcmd re-uploads preserve it.
    echo "    \"changenote\"     \"$CHANGENOTE\""
    echo '}'
} > "$VDF_PATH"

[ -n "$PUBLISHED_FILE_ID" ] && printf '%s\n' "$PUBLISHED_FILE_ID" > "$WORKSHOP_ID_FILE"

echo ""
echo "✓ Release built:  $ZIP_PATH  ($SIZE)"
echo "  Version:        $VERSION   Authors: $AUTHORS"
echo "  Manifest:       $VDF_PATH"
if [ -n "$PUBLISHED_FILE_ID" ]; then
    echo "  UPDATE mode: publishedfileid $PUBLISHED_FILE_ID"
else
    echo "  NEW-ITEM mode: first upload mints a publishedfileid."
fi
echo ""
echo "── Upload to Steam Workshop ──"
echo "  ~/steamcmd/steamcmd.sh +login <yourSteamLogin> \\"
echo "      +workshop_build_item $(cd "$DIST_DIR" && pwd)/workshop_item.vdf +quit"
if [ -z "$PUBLISHED_FILE_ID" ]; then
    echo ""
    echo "  First upload prints a publishedfileid, save it so re-runs UPDATE the item:"
    echo "      echo <publishedfileid> > steam_workshop_id.txt"
    echo "  Then paste docs/steam-workshop-description.md into the Steam page once."
fi
