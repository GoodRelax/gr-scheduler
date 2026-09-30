#!/usr/bin/env bash
# PW-3 (1): stage 0 at its default against the worktree's dist at display scale 175, 3 rounds alternating (as run-slot6.sh).
cd "$(dirname "$0")"
OUT=run-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
s0() { (cd s0 && node tools/probe/examples/lm-19-frame-time-baseline.mjs > ../$OUT/$1-s0.json 2>/dev/null); echo "$(date +%H:%M:%S) run $1 stage0 $(python sum.py $OUT/$1-s0.json 2>&1 | tail -1)" | tee -a $OUT/run-log.txt; }
now() { (cd ../.. && node tools/probe/examples/lm-19-frame-time-baseline.mjs --display-scale 175 > <this folder>/$OUT/$1-now.json 2>/dev/null); echo "$(date +%H:%M:%S) run $1 build@175 $(python sum.py $OUT/$1-now.json 2>&1 | tail -1)" | tee -a $OUT/run-log.txt; }
s0 1; now 1; now 2; s0 2; s0 3; now 3
echo DONE $OUT
