#!/usr/bin/env bash
# 2026-10-02, perf-pending rows 33+ on coord 1788d297. Trees are git-archive copies in this folder, built with the root vite.
# A  PW-3 (1) gate: stage 0 (s0, 5c1b915) at its default against now (1788d297) at display scale 175, 3 rounds alternating (as perf-2026-10-01/run.sh).
# B  diagnostic (not the gate): e724 (e724925d, the dist measured on 2026-10-01, before every row 33+) against now, both at 175, order rotated.
# C  supplementary scenes for CR-605 (record only): scenes-1002.mjs on e724 and now, order rotated.
cd "$(dirname "$0")"
OUT=run-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
lm() { local dir=$1 tag=$2 n=$3 scale=$4; (cd $dir && node tools/probe/examples/lm-19-frame-time-baseline.mjs $scale > "../$OUT/$5-$n-$tag.json" 2>/dev/null); echo "$(date +%H:%M:%S) $5 run $n $tag $(python sum.py $OUT/$5-$n-$tag.json 2>&1 | tail -1)" | tee -a $OUT/run-log.txt; }
sc() { echo "$(date +%H:%M:%S) C run $2 $1 $(node scenes-1002.mjs $1 2>/dev/null | tail -1)" | tee -a $OUT/run-log.txt; }
lm s0 stage0 1 "" A; lm now build@175 1 "--display-scale 175" A; lm now build@175 2 "--display-scale 175" A; lm s0 stage0 2 "" A; lm s0 stage0 3 "" A; lm now build@175 3 "--display-scale 175" A
lm e724 e724@175 1 "--display-scale 175" B; lm now build@175 1 "--display-scale 175" B; lm now build@175 2 "--display-scale 175" B; lm e724 e724@175 2 "--display-scale 175" B; lm e724 e724@175 3 "--display-scale 175" B; lm now build@175 3 "--display-scale 175" B
sc e724 1; sc now 1; sc now 2; sc e724 2; sc e724 3; sc now 3
echo DONE $OUT
