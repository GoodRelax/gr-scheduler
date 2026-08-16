#!/usr/bin/env bash
# All 19 mechanical checks for the gr-scheduler specification.
#
#   1-4    StrictDoc JSON export : node counts, parentless nodes,
#          ORIGIN vs Relations, UID gaps
#   5-10   Markdown source (md-checks.py) : undefined table reference,
#          duplicate row ID, row ID reference existence, pointed-to row
#          exists, prose count vs table rows, column count
#   15     Figure seat numbers (md-checks.py) : a reference to a figure that
#          is never defined, or one figure number defined twice
#   12-14  Recurring defect types (style-checks.py) : a rule sitting in a
#          value or name table (gate), a transfer leftover (advisory), a
#          value written twice (advisory)
#   11     dup-check.py against the known-duplication baseline
#   16     erd_json_to_md.py --check : the two generated data-model documents
#          still match erd.json, which is what catches a hand edit to a file
#          whose banner says never to edit it
#   17     erd_json_to_schema.py --check : the GRS JSON schema still matches
#          the two sources Chapter 6.2 names (erd.json and tbl-settings.md),
#          the same guard as 16 for the other generated artifact
#   18     generate_unit_tree.py --check : src/ holds exactly the units of
#          table T-075, at the paths Chapter 5.3 fixes. It compares the set of
#          paths, never the contents, so it keeps guarding once the files are
#          written
#   19     check_layer_rules.py : src/ obeys table T-061 -- a dependency that
#          crosses a layer points inward only, a call into another component
#          goes through its public entry, and the same-layer graph is acyclic.
#          LR-6 is not here: tsconfig.entity.json compiles Entity and UseCase
#          without the DOM library, so the compiler enforces it
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
echo "===== 5-10, 15  Markdown source ====="
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
echo "===== 16  generated documents still match their source ====="
python docs/spec/_assets/source/erd_json_to_md.py --check || fail=1

echo ""
echo "===== 17  the GRS JSON schema still matches its two sources ====="
PYTHONIOENCODING=utf-8 python docs/spec/_assets/source/erd_json_to_schema.py --check || fail=1

echo ""
echo "===== 18  src/ still holds exactly the units of table T-075 ====="
PYTHONIOENCODING=utf-8 python tools/generate_unit_tree.py --check || fail=1

echo ""
echo "===== 19  src/ obeys the dependency rules of table T-061 ====="
PYTHONIOENCODING=utf-8 python tools/check_layer_rules.py || fail=1

echo ""
if [ "$fail" -eq 0 ]; then
    echo "ALL GREEN -- which proves references resolve, not that the"
    echo "specification agrees with itself."
else
    echo "FAILURES ABOVE"
fi
exit "$fail"
