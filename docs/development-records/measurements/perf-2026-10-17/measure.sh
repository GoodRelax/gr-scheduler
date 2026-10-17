#!/usr/bin/env bash
# perf-2026-10-17: a group with 6b32d9af first and a group with db02f9ff first,
# N rounds each, each round under the gate lock, with a machine-load snapshot before and after each group.
# Usage: measure.sh <worktree> <N> [<old-first prefix> <new-first prefix>]   (both shas built by setup.sh)
#   2026-10-17 used: measure.sh <wt> 3 A B  (OLD and NEW may be overridden: OLD=<sha> NEW=<sha> measure.sh ...)
WT="$1"; N="${2:-3}"; PA="${3:-A}"; PB="${4:-B}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OLD=${OLD:-6b32d9af}; NEW=${NEW:-db02f9ff}
LOAD="$WT/scratch/perf/logs/load.txt"; mkdir -p "$(dirname "$LOAD")"
bash "$HERE/load.sh" "$PA-before" | tee -a "$LOAD"
bash "$HERE/rounds.sh" "$WT" "$PA" "$N" "$OLD" "$NEW"
bash "$HERE/load.sh" "$PA-after" | tee -a "$LOAD"
bash "$HERE/load.sh" "$PB-before" | tee -a "$LOAD"
bash "$HERE/rounds.sh" "$WT" "$PB" "$N" "$NEW" "$OLD"
bash "$HERE/load.sh" "$PB-after" | tee -a "$LOAD"
echo MEASURE-DONE
