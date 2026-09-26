#!/usr/bin/env bash
# Slot 3: which file group of c5abb35c makes the step.
cd "$(dirname "$0")"
OUT=slot3-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
one() { t=$1; s=$(date +%s); TREE=$t QUICK=1 SWAP=none node lm19-swap.mjs > $OUT/$t-$2.json 2>/dev/null
  echo "$(date +%H:%M:%S) $t r$2 $(( $(date +%s) - s ))s $(python -c "
import json,sys;d=json.load(open(sys.argv[1]));st={s['name']:s for s in d['stretches']}
print('MK-1',st['MK-1 scroll']['frameTime']['medianMs'],'/in',st['MK-1 scroll']['insideRedrawCallback']['medianMs'],'MK-2',st['MK-2 zoom']['frameTime']['medianMs'],'sha',d['conditions']['buildSha256'][:8])" $OUT/$t-$2.json 2>&1)" | tee -a $OUT/run-log.txt; }
one b-a68f9fda 1; one b-c5abb35c 1
for r in 1 2; do for t in v-c5-revG1 v-c5-revG2 v-c5-revG3 v-a68-plusG1; do one $t $r; done; done
for r in 1 2; do for sw in none cullmask; do t=fix; st=$(date +%s); TREE=$t QUICK=1 SWAP=$sw node lm19-swap.mjs > $OUT/$t-$sw-$r.json 2>/dev/null
  echo "$(date +%H:%M:%S) fix $sw r$r $(( $(date +%s) - st ))s $(python -c "
import json,sys;d=json.load(open(sys.argv[1]));st={s['name']:s for s in d['stretches']}
print('MK-1',st['MK-1 scroll']['frameTime']['medianMs'],'MK-2',st['MK-2 zoom']['frameTime']['medianMs'],'seen',d['swap']['seen'])" $OUT/$t-$sw-$r.json 2>&1)" | tee -a $OUT/run-log.txt; done; done
echo $OUT
