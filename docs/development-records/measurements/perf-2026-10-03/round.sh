#!/usr/bin/env bash
# One round: run the NFR-002/003 perf file once per candidate, in the given order.
# Usage: round.sh <worktree> <round-tag> <sha>...   (run under the gate lock)
WT="$1"; TAG="$2"; shift 2
ROOTNM="$(cd "$WT/../../../node_modules" && pwd)"
LOG="$WT/scratch/perf/logs"; mkdir -p "$LOG"
HERE="$(cd "$(dirname "$0")" && pwd)"
for sha in "$@"; do
  d="$WT/scratch/perf/$sha"
  cp "$HERE/perf.config.mjs" "$d/perf.config.mjs"
  out="$LOG/$TAG-$sha.txt"
  start=$(date +%H:%M:%S)
  (cd "$d" && GRS_PERF=1 node "$ROOTNM/@playwright/test/cli.js" test --config perf.config.mjs > "$out" 2>&1)
  echo "$start $TAG $sha $(grep -o 'MK-[0-9] [a-z ]*: [0-9.]* fps | frame time p95 [0-9.]*ms' "$out" | sed 's/ | frame time//' | tr '\n' ';')" | tee -a "$LOG/summary.txt"
done
