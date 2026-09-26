#!/usr/bin/env bash
# Slot 2: is the ground clip cause 1 at c5abb35c, and which later commit adds cause 2?
cd "$(dirname "$0")"
OUT=slot2-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
one() { t=$1; sw=$2; s=$(date +%s); TREE=$t QUICK=1 SWAP=$sw node lm19-swap.mjs > $OUT/$t-$sw.json 2>/dev/null
  echo "$(date +%H:%M:%S) $t $sw $(( $(date +%s) - s ))s $(python -c "
import json,sys;d=json.load(open(sys.argv[1]));st={s['name']:s for s in d['stretches']}
print('MK-1',st['MK-1 scroll']['frameTime']['medianMs'],'MK-2',st['MK-2 zoom']['frameTime']['medianMs'],'seen',d['swap']['seen']['before']-d['swap']['seen']['after'])" $OUT/$t-$sw.json 2>&1)" | tee -a $OUT/run-log.txt; }
one b-c5abb35c noground; one b-c5abb35c none; one b-a68f9fda none
for t in b-39f5a8bb b-989c7572 b-d99cb255 b-2878e502 fix; do one $t noground; done
one b-c5abb35c noground
echo $OUT
