#!/usr/bin/env bash
# N rounds, each under the gate lock of the root checkout, candidates in the given order every round.
# (With two candidates the rotate-and-reverse of perf-2026-10-03/rounds.sh gives the same order
# every round, so the order is flipped between groups instead -- see measure.sh.)
# Usage: rounds.sh <worktree> <prefix> <N> <sha>...
WT="$1"; P="$2"; N="$3"; shift 3
HERE="$(cd "$(dirname "$0")" && pwd)"
GATE="$(cd "$WT/../../.." && pwd)/tools/gate/gate-queue.mjs"
for ((r=1; r<=N; r++)); do
  (cd "$WT" && node "$GATE" run -- bash "$HERE/round.sh" "$WT" "$P$r" "$@")
done
echo ROUNDS-DONE
