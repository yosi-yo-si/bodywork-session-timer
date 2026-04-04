#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

for f in index.html style.css script.js; do
  if [[ ! -f "$f" ]]; then
    echo "missing file: $f"
    exit 1
  fi
done

if rg -n '^(<<<<<<<|=======|>>>>>>>)' -S index.html style.css script.js >/dev/null; then
  echo "conflict markers found"
  exit 1
fi

node --check script.js >/dev/null

echo "OK: pages root files and script syntax are valid"
