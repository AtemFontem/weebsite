#!/usr/bin/env bash
#
# prepare-photos.sh
#
# Takes raw source photos organized by year and produces:
#   public/photolog/sq/<year>/<n>.jpeg   — small, for the year grid
#   public/photolog/hq/<year>/<n>.jpeg   — large, for the detail view
#
# Re-encodes through ffmpeg, which strips EXIF metadata
# (GPS, camera model, timestamps) for privacy.
#
# Files are renumbered 1..N in alphabetical order based on filename.
#
# Usage:
#   bash scripts/prepare-photos.sh <source-root>
#
# Example:
#   bash scripts/prepare-photos.sh ~/Pictures/FullWashEdit
#
# Years are auto-detected from subfolders named like "2024".
#
# Safe to re-run. Every run wipes and regenerates sq/ and hq/.

set -euo pipefail

# ---------- config ----------

SQ_WIDTH=800          # width in pixels for sq images
HQ_WIDTH=1600         # width in pixels for hq images
SQ_QUALITY=4          # ffmpeg qscale for sq (lower = better, ~2-5 is good)
HQ_QUALITY=2          # ffmpeg qscale for hq

# ---------- args ----------

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <source-root>" >&2
  echo "example: $0 ~/Pictures/FullWashEdit" >&2
  exit 1
fi

SOURCE_ROOT="$1"

if [[ ! -d "$SOURCE_ROOT" ]]; then
  echo "error: source root '$SOURCE_ROOT' does not exist" >&2
  exit 1
fi

# ---------- paths ----------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SQ_ROOT="$REPO_ROOT/public/photolog/sq"
HQ_ROOT="$REPO_ROOT/public/photolog/hq"

# ---------- helpers ----------

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: '$1' is required but not installed" >&2
    exit 1
  fi
}

need_cmd ffmpeg

# ---------- auto-detect years ----------

YEARS=($(ls -1 "$SOURCE_ROOT" | grep -E '^[0-9]{4}$' | sort))

if [[ ${#YEARS[@]} -eq 0 ]]; then
  echo "error: no year folders (e.g. 2024) found in $SOURCE_ROOT" >&2
  exit 1
fi

# ---------- main ----------

echo "source root:    $SOURCE_ROOT"
echo "repo root:      $REPO_ROOT"
echo "detected years: ${YEARS[*]}"
echo

rm -rf "$SQ_ROOT"
rm -rf "$HQ_ROOT"
mkdir -p "$SQ_ROOT"
mkdir -p "$HQ_ROOT"

declare -A YEAR_COUNT

for year in "${YEARS[@]}"; do
  src_dir="$SOURCE_ROOT/$year"
  sq_dir="$SQ_ROOT/$year"
  hq_dir="$HQ_ROOT/$year"

  mkdir -p "$sq_dir"
  mkdir -p "$hq_dir"

  mapfile -d '' files < <(
    find "$src_dir" -maxdepth 1 -type f \
      \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) \
      -print0 | sort -z
  )

  count=${#files[@]}
  YEAR_COUNT[$year]=$count

  if [[ $count -eq 0 ]]; then
    echo "[$year] no images found — skipping"
    continue
  fi

  echo "[$year] processing $count images"

  n=0
  for src in "${files[@]}"; do
    n=$((n + 1))
    out_name="${n}.jpeg"

    ffmpeg -loglevel error -y -i "$src" \
      -vf "scale=${SQ_WIDTH}:-2" \
      -q:v $SQ_QUALITY \
      -map_metadata -1 \
      "$sq_dir/$out_name"

    ffmpeg -loglevel error -y -i "$src" \
      -vf "scale=${HQ_WIDTH}:-2" \
      -q:v $HQ_QUALITY \
      -map_metadata -1 \
      "$hq_dir/$out_name"

    echo "  $(basename "$src") → $out_name"
  done
done

echo
echo "----- summary -----"
total=0
for year in "${YEARS[@]}"; do
  c=${YEAR_COUNT[$year]:-0}
  total=$((total + c))
  printf "  %s: %d\n" "$year" "$c"
done
printf "  total: %d\n" "$total"
echo
echo "done. Run 'npm run photos' for the full pipeline."