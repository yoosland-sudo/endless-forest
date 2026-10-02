#!/usr/bin/env bash
# Headless phone-shaped screenshot of the local game server (port 8810).
# Usage: tests/snap.sh <name> "<query>"   e.g. tests/snap.sh run20 "test&autoplay=normal&ff=20"
# Edge headless keeps windows at least 500px wide, so 500x1082 keeps a 390x844 phone's proportions.
set -e
OUT_DIR="${SNAP_DIR:-$(cd "$(dirname "$0")" && pwd)/snaps}"
mkdir -p "$OUT_DIR"
WIN_OUT=$(cygpath -w "$OUT_DIR")
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
rm -rf "${OUT_DIR:?}/profile-$1" "$OUT_DIR/$1.png"
timeout 90 "$EDGE" --headless=new --disable-gpu --hide-scrollbars --mute-audio \
  --window-size=500,1082 --virtual-time-budget=8000 \
  --user-data-dir="$WIN_OUT\\profile-$1" --screenshot="$WIN_OUT\\$1.png" \
  "http://localhost:8810/?$2" >/dev/null 2>&1 || true
# Edge returns before its renderer finishes writing the file.
for _ in $(seq 1 60); do [ -s "$OUT_DIR/$1.png" ] && break; sleep 0.5; done
sleep 1
rm -rf "${OUT_DIR:?}/profile-$1" 2>/dev/null || true
ls "$OUT_DIR/$1.png"
