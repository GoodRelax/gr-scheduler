#!/usr/bin/env bash
# Run 9 of performance-runs.md: group S (base first) and group T (tip first), 5 rounds each, each round under the lock.
# Usage: measure.sh <worktree> <base-sha> <tip-sha>   (both already built by ../setup.sh)
WT="$1"; BASE="$2"; TIP="$3"
R="$(cd "$(dirname "$0")/.." && pwd)/rounds.sh"
bash "$R" "$WT" S 5 "$BASE" "$TIP"
bash "$R" "$WT" T 5 "$TIP" "$BASE"
echo MEASURE-DONE
