#!/usr/bin/env bash
# Slot 6 (JDG-726): stage 0 at its default against the worktree's dist at display scale 175, 3 rounds alternating.
cd "$(dirname "$0")"
OUT=slot6-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
sum() { python -c "
import json,sys;d=json.load(open(sys.argv[1]));st={s['name']:s for s in d['stretches']}
f=lambda n:st[n]['frameTime']
print('ok',d['ok'],'nm',d['notMeasured'],'sha',d['conditions']['buildSha256'][:8],'scale',d['conditions'].get('displayScale'),'all',d['frameTime']['medianMs'],'/',d['frameTime']['p95Ms'],'MK-1',f('MK-1 scroll')['medianMs'],'/',f('MK-1 scroll')['p95Ms'],'MK-2',f('MK-2 zoom')['medianMs'],'/',f('MK-2 zoom')['p95Ms'],'MK-7',f('MK-7 pan')['medianMs'],'/',f('MK-7 pan')['p95Ms'],'MK-6',f('MK-6 range select')['medianMs'],'/',f('MK-6 range select')['p95Ms'],'dispatch',d['writeCost']['synchronousDispatch']['medianMs'])" $1 2>&1 | tail -1; }
s0() { (cd s0 && node tools/probe/examples/lm-19-frame-time-baseline.mjs > ../$OUT/$1-s0.json 2>/dev/null); echo "$(date +%H:%M:%S) run $1 stage0 $(sum $OUT/$1-s0.json)" | tee -a $OUT/run-log.txt; }
now() { (cd ../.. && node tools/probe/examples/lm-19-frame-time-baseline.mjs --display-scale 175 > scratch/perf8/$OUT/$1-now.json 2>/dev/null); echo "$(date +%H:%M:%S) run $1 build@175 $(sum $OUT/$1-now.json)" | tee -a $OUT/run-log.txt; }
s0 1; now 1; now 2; s0 2; s0 3; now 3
echo $OUT
