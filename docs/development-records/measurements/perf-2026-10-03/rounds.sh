#!/usr/bin/env bash
# N rounds, each under the gate lock, with the candidate order rotated (and reversed on odd rounds).
# Usage: rounds.sh <worktree> <prefix> <N> <sha>...
WT="$1"; P="$2"; N="$3"; shift 3
HERE="$(cd "$(dirname "$0")" && pwd)"
C=("$@"); K=${#C[@]}
for ((r=1; r<=N; r++)); do
  order=()
  for ((i=0; i<K; i++)); do order+=("${C[$(( (i + r - 1) % K ))]}"); done
  if (( r % 2 == 0 )); then rev=(); for ((i=K-1; i>=0; i--)); do rev+=("${order[$i]}"); done; order=("${rev[@]}"); fi
  (cd "$WT" && node tools/gate/gate-queue.mjs run -- bash "$HERE/round.sh" "$WT" "$P$r" "${order[@]}")
done
echo ROUNDS-DONE
