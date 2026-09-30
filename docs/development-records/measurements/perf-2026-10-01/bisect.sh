#!/usr/bin/env bash
# Diagnostic (not the gate): the same lm-19 at display scale 175 on the dist before CR-598/602 (569135d7),
# before CR-601 (8e60e6c8) and HEAD (e724925d), 3 rounds, order rotated.
cd "$(dirname "$0")"
OUT=bisect-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
one() { local dir=$1 tag=$2 n=$3; (cd $dir && node tools/probe/examples/lm-19-frame-time-baseline.mjs --display-scale 175 > "$OLDPWD/$OUT/$n-$tag.json" 2>/dev/null); echo "$(date +%H:%M:%S) run $n $tag $(python sum.py $OUT/$n-$tag.json 2>&1 | tail -1)" | tee -a $OUT/run-log.txt; }
one b-569135d7 569 1; one b-8e60e6c8 8e6 1; one ../.. head 1
one ../.. head 2; one b-569135d7 569 2; one b-8e60e6c8 8e6 2
one b-8e60e6c8 8e6 3; one ../.. head 3; one b-569135d7 569 3
echo DONE $OUT
