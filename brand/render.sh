#!/usr/bin/env bash
# Renders the X profile picture and banner to PNG with headless Chrome.
# Usage: bash brand/render.sh   (from the null/ folder or anywhere)
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
PROFILE="$(mktemp -d)"
DIR="$(cd . && pwd -W 2>/dev/null || pwd)"

shot() { # html out width height scale
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
    --user-data-dir="$PROFILE" --allow-file-access-from-files --virtual-time-budget=3000 \
    --force-device-scale-factor="$5" --window-size="$3,$4" \
    --screenshot="$DIR/$2" "file:///$DIR/$1" >/dev/null 2>&1
  echo "rendered $2"
}

shot avatar.html x-avatar.png 400 400 2.5      # 1000×1000
shot avatar.html x-avatar-400.png 400 400 1    # 400×400
shot banner.html x-banner.png 1500 500 2       # 3000×1000
shot banner.html x-banner-1500.png 1500 500 1  # 1500×500
rm -rf "$PROFILE"
