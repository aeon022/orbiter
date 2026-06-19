#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS="$SCRIPT_DIR/../assets"
SVG="$SCRIPT_DIR/../../../packages/admin/public/favicon.svg"
ICONSET="$ASSETS/icon.iconset"

mkdir -p "$ICONSET"

# PNG at all required sizes
for SIZE in 16 32 64 128 256 512 1024; do
  rsvg-convert -w $SIZE -h $SIZE "$SVG" -o "$ICONSET/icon_${SIZE}x${SIZE}.png"
done

# macOS iconset @2x variants
cp "$ICONSET/icon_32x32.png"    "$ICONSET/icon_16x16@2x.png"
cp "$ICONSET/icon_64x64.png"    "$ICONSET/icon_32x32@2x.png"
cp "$ICONSET/icon_256x256.png"  "$ICONSET/icon_128x128@2x.png"
cp "$ICONSET/icon_512x512.png"  "$ICONSET/icon_256x256@2x.png"
cp "$ICONSET/icon_1024x1024.png" "$ICONSET/icon_512x512@2x.png"

# .icns (macOS)
iconutil -c icns "$ICONSET" -o "$ASSETS/icon.icns"

# .ico (Windows) — 16 32 48 256
rsvg-convert -w 48 -h 48 "$SVG" -o "$ICONSET/icon_48x48.png"
magick "$ICONSET/icon_16x16.png" \
       "$ICONSET/icon_32x32.png" \
       "$ICONSET/icon_48x48.png" \
       "$ICONSET/icon_256x256.png" \
       "$ASSETS/icon.ico"

# Tray icon (16px PNG) + dialog/window icon (256px)
cp "$ICONSET/icon_16x16.png"  "$ASSETS/icon.png"
cp "$ICONSET/icon_256x256.png" "$ASSETS/icon-256.png"

echo "✓ Icons generiert:"
ls -lh "$ASSETS"/*.icns "$ASSETS"/*.ico "$ASSETS"/*.png
