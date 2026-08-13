#!/usr/bin/env bash
# All 14 mechanical checks for the gr-scheduler specification.
#
#   1-4    StrictDoc JSON export : node counts, parentless nodes,
#          ORIGIN vs Relations, UID gaps
#   5-10   Markdown source (md-checks.py) : undefined table reference,
#          duplicate row ID, row ID reference existence, pointed-to row
#          exists, prose count vs table rows, column count
#   12-14  Recurring defect types (style-checks.py) : a rule sitting in a
#          value or name table (gate), a transfer leftover (advisory), a
#          value written twice (advisory)
#   11     dup-check.py against the known-duplication baseline
#
# Green does NOT prove the specification is sound: every Critical defect of
# the last eight rounds appeared while all of these were green. They stop
# broken references, not broken meaning.
#
# Usage:  bash .claude/skills/spec-graph-check/check.sh
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
OUT="$REPO/scratch/spec-check"          # gitignored (see .gitignore "scratch/")
SD="$OUT/sd-out"
J="$SD/json/index.json"
fail=0

mkdir -p "$OUT"
cd "$REPO" || exit 2

echo "===== 1-4  StrictDoc export ====="
strictdoc export docs/spec --formats=json --output-dir "$SD" \
    --no-parallelization >/dev/null 2>&1 || {
    echo "EXPORT FAILED -- rerun for the reason:"
    strictdoc export docs/spec --formats=json --output-dir "$SD" \
        --no-parallelization 2>&1 | grep -iE 'error' | head -3
    exit 2
}

echo "-- 1. node counts"
jq -c '[.DOCUMENTS[] | recurse(.NODES[]?) | ._NODE_TYPE]
       | group_by(.) | map({(.[0]): length}) | add' "$J"

echo "-- 2. parentless nodes (expect none)"
out=$(jq -r '.DOCUMENTS[] | recurse(.NODES[]?)
  | select(.UID? and ._NODE_TYPE!="DOCUMENT" and ._NODE_TYPE!="GOAL")
  | select(((.RELATIONS // []) | map(select(.TYPE=="Parent")) | length) == 0)
  | "PARENTLESS " + .UID' "$J")
[ -n "$out" ] && { echo "$out"; fail=1; } || echo "   none"

echo "-- 3. ORIGIN vs Relations mismatch (expect none)"
out=$(jq -r '.DOCUMENTS[] | recurse(.NODES[]?)
  | select(._NODE_TYPE=="FUNC_REQ" or ._NODE_TYPE=="NON_FUNC_REQ") | . as $n
  | [($n.ORIGIN // "") | scan("(?:UC|GL)-[0-9]+")] | unique as $o
  | [($n.RELATIONS // [])[] | select(.TYPE=="Parent") | .VALUE] | unique as $r
  | (($o - $r) + ($r - $o)) as $m
  | select(($m|length)>0) | "ORIGIN-MISMATCH " + $n.UID' "$J")
[ -n "$out" ] && { echo "$out"; fail=1; } || echo "   none"

echo "-- 4. UID gaps (FR-50 is retired on purpose; every other gap is a defect)"
jq -r '([.DOCUMENTS[] | recurse(.NODES[]?)
        | select(.UID? and ._NODE_TYPE!="DOCUMENT") | .UID]) as $u
  | ["FR-","NFR-","UC-","GL-"][] as $pre
  | ([$u[] | select(startswith($pre)) | ltrimstr($pre) | tonumber] | sort) as $n
  | ([range($n[0]; $n[-1]+1)] - $n) as $gap
  | "   " + $pre + " count=" + ($n|length|tostring) + " gaps="
    + (if ($gap|length)==0 then "none" else ($gap|map(tostring)|join(",")) end)' "$J"

echo ""
echo "===== 5-10  Markdown source ====="
python "$HERE/md-checks.py" "$REPO" || fail=1

echo ""
echo "===== 12-14  recurring defect types ====="
python "$HERE/style-checks.py" "$REPO" || fail=1

echo ""
echo "===== 11  duplication detector ====="
python docs/review/dup-check.py 0.45 "$OUT/dup-report.txt" \
    docs/review/duplication-baseline.txt || fail=1
echo "   report: $OUT/dup-report.txt"

echo ""
if [ "$fail" -eq 0 ]; then
    echo "ALL GREEN -- which proves references resolve, not that the"
    echo "specification agrees with itself."
else
    echo "FAILURES ABOVE"
fi
exit "$fail"
