#!/usr/bin/env bash
# Run 10 of performance-runs.md: a group with de7514df first and a group with 5456f72d first,
# N rounds each, each round under the gate lock, with a machine-load snapshot before and after each group.
# Usage: measure.sh <worktree> <N> [<old-first prefix> <new-first prefix>]   (both shas built by setup.sh)
#   run 10 used: measure.sh <wt> 3 A B, then measure.sh <wt> 3 C D
WT="$1"; N="${2:-3}"; PA="${3:-A}"; PB="${4:-B}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OLD=de7514df; NEW=5456f72d
LOAD="$WT/scratch/perf/logs/load.txt"; mkdir -p "$(dirname "$LOAD")"
bash "$HERE/load.sh" "$PA-before" | tee -a "$LOAD"
bash "$HERE/rounds.sh" "$WT" "$PA" "$N" "$OLD" "$NEW"
bash "$HERE/load.sh" "$PA-after" | tee -a "$LOAD"
bash "$HERE/load.sh" "$PB-before" | tee -a "$LOAD"
bash "$HERE/rounds.sh" "$WT" "$PB" "$N" "$NEW" "$OLD"
bash "$HERE/load.sh" "$PB-after" | tee -a "$LOAD"
echo MEASURE-DONE
