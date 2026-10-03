#!/usr/bin/env bash
#
# blur.sh
#
# Generates 10px-wide JPEG placeholders from sq/ images.
# Years are auto-detected from subfolders in sq/.
#
# Run from repo root: bash scripts/blur.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SQ_ROOT="$REPO_ROOT/public/photolog/sq"
BLUR_ROOT="$REPO_ROOT/public/photolog/blur"

rm -rf "$BLUR_ROOT"
mkdir -p "$BLUR_ROOT"

if [[ ! -d "$SQ_ROOT" ]]; then
  echo "error: $SQ_ROOT does not exist. Run prepare-photos.sh first." >&2
  exit 1
fi

YEARS=($(ls -1 "$SQ_ROOT" | grep -E '^[0-9]{4}$' | sort))

if [[ ${#YEARS[@]} -eq 0 ]]; then
  echo "error: no year folders found in $SQ_ROOT" >&2
  exit 1
fi

echo "generating blur placeholders for: ${YEARS[*]}"

for year in "${YEARS[@]}"; do
  mkdir -p "$BLUR_ROOT/$year"
  shopt -s nullglob
  for img in "$SQ_ROOT/$year"/*.jpeg; do
    filename=$(basename "$img")
    ffmpeg -loglevel error -y -i "$img" \
      -vf scale=10:-2 \
      "$BLUR_ROOT/$year/$filename"
  done
  shopt -u nullglob
  count=$(ls -1 "$BLUR_ROOT/$year" 2>/dev/null | wc -l | tr -d ' ')
  echo "  [$year] $count placeholders"
done

echo "done."