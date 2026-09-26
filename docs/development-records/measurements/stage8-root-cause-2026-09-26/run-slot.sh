#!/usr/bin/env bash
# One timing slot: A (lm-19 A/B, each tree's own probe), B (P3 swaps on the fix build, stage 0 as reference), C (all-thread traces).
cd "$(dirname "$0")"
OUT=slot-$(date +%Y%m%d-%H%M%S); mkdir -p $OUT
log() { echo "$(date +%H:%M:%S) $*" | tee -a $OUT/run-log.txt; }
sum() { python -c "
import json,sys
d=json.load(open(sys.argv[1]));st={s['name']:s for s in d.get('stretches',[])}
g=lambda n,k:st.get(n,{}).get(k,{}).get('medianMs')
w=d.get('writeCost',{}).get('synchronousDispatch',{}).get('medianMs')
print('ok',d.get('ok'),'sha',d.get('conditions',{}).get('buildSha256','')[:8],'MK-1',g('MK-1 scroll','frameTime'),'/in',g('MK-1 scroll','insideRedrawCallback'),'MK-2',g('MK-2 zoom','frameTime'),'/in',g('MK-2 zoom','insideRedrawCallback'),'MK-7',g('MK-7 pan','frameTime'),'MK-6',g('MK-6 range select','frameTime'),'dispatch',w,'nm',len(d.get('notMeasured',[])))
" $1 2>&1 | tr '\n' ' '; }
log "slot start"
ORDERS=("s0 pre fix" "fix s0 pre" "pre fix s0")
for rnd in 1 2 3; do
  for t in ${ORDERS[$((rnd - 1))]}; do
    s=$(date +%s); (cd $t && node tools/probe/examples/lm-19-frame-time-baseline.mjs > ../$OUT/A$rnd-$t.json 2> ../$OUT/A$rnd-$t.err)
    log "A run $rnd $t exit $? $(( $(date +%s) - s ))s $(sum $OUT/A$rnd-$t.json)"
  done
done
VARS=("s0:scan" "fix:scan" "fix:nomask" "fix:nofont" "fix:nohalo" "fix:nomask+nofont+nohalo")
for rnd in 1 2 3; do
  n=${#VARS[@]}
  for i in $(seq 0 $((n-1))); do
    v=${VARS[$(( (i + (rnd - 1)*2) % n ))]}; t=${v%%:*}; sw=${v#*:}
    s=$(date +%s); TREE=$t QUICK=1 SWAP=$sw node lm19-swap.mjs > $OUT/B$rnd-$t-$sw.json 2> $OUT/B$rnd-$t-$sw.err
    log "B run $rnd $t $sw exit $? $(( $(date +%s) - s ))s $(sum $OUT/B$rnd-$t-$sw.json)"
  done
done
for c in cdca63ac 1403ee62 fde16e62 006aefbc 888185ef 59eac991 989c7572 d99cb255 2878e502; do
  s=$(date +%s); TREE=b-$c QUICK=1 SWAP=none node lm19-swap.mjs > $OUT/D-$c.json 2> $OUT/D-$c.err
  log "D bisect $c exit $? $(( $(date +%s) - s ))s $(sum $OUT/D-$c.json) $(python -c "import json;c=json.load(open('$OUT/D-$c.json')).get('census',{});print('census',c.get('total'),c.get('chars'),c.get('masked'),c.get('textWithFont'))" 2>&1)"
done
for v in "s0:scan" "fix:scan" "fix:nomask"; do
  t=${v%%:*}; sw=${v#*:}
  s=$(date +%s); TREE=$t QUICK=1 SWAP=$sw TRACE=$OUT/C-$t-$sw.trace.json node lm19-swap.mjs --samples 60 > $OUT/C-$t-$sw.json 2> $OUT/C-$t-$sw.err
  log "C trace $t $sw exit $? $(( $(date +%s) - s ))s $(sum $OUT/C-$t-$sw.json)"
done
log "slot end"
echo $OUT
