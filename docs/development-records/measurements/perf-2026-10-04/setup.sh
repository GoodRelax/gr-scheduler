#!/usr/bin/env bash
# Extract each candidate sha into scratch/perf/<sha> of the worktree and build it with the root vite.
# Usage: setup.sh <worktree> <sha>...
set -e
WT="$1"; shift
ROOTNM="$WT/../../../node_modules"
mkdir -p "$WT/scratch/perf"
for sha in "$@"; do
  d="$WT/scratch/perf/$sha"
  if [ ! -f "$d/dist/index.html" ]; then
    rm -rf "$d"; mkdir -p "$d"
    git -C "$WT" archive "$sha" | tar -x -C "$d"
    (cd "$d" && node "$ROOTNM/vite/bin/vite.js" build > build.log 2>&1) || { echo "BUILD FAILED $sha"; tail -20 "$d/build.log"; exit 1; }
  fi
  echo "$sha $(sha256sum "$d/dist/index.html" | cut -c1-16) $(wc -c < "$d/dist/index.html")"
done
