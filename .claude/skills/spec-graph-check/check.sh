#!/usr/bin/env bash
# All 27 mechanical checks for the gr-scheduler specification.
#
#   0      The rules themselves. check-rules-index.py keeps the index of
#          docs/development-rules/ honest -- every rule linked, every number
#          cited, every link resolving -- and this script prints that index
#          before any check runs, because a session opens this before it
#          opens anything else
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
#   20     generate_entity_types.py --check : the TypeScript types of the
#          schedule group still match erd.json. Only the marked region is
#          compared, so a unit that has been filled in stays guarded
#   21     check-provenance.py : every generated artifact names the manuscript
#          it came from and how to rebuild it, and every file of _source/ says
#          which of the three it is. A stale signpost is worse than none
#   22     check-cr-discipline.py : every change request from CR-175 on
#          answers standing rules 1, 2 and 8, which is where those rules moved
#          when the principle alone kept being skipped (68 of 75 skipped 1)
#   23     check-language-dictionary.py : a manuscript holds its PRINTED prose
#          as a language dictionary (Chapter 6.2), so adding an edition is a
#          fill-in. Japanese that is a classification rather than prose is
#          exempt BY PATH AND COUNT, so an exemption cannot grow in silence
#   24     check-development-record.py : the development record still matches
#          the tree. A record that has drifted is worse than none -- the next
#          session reads it after a stop and starts from a state that is not
#          true. "Not started" is decided exactly: the file is byte for byte
#          the stub tools/generate_unit_tree.py writes
##   25     check-pending-decisions.py : a value implemented before the user
#          decided it carries a mark, and the mark and the list agree in both
#          directions. A class the rule says to wait for may not carry a mark
#          at all, and a class that cannot be reversed may not be left open
#          behind a finished wave
#   27     the generated artifacts this file used to leave to `npm run
#          gen:check` alone -- the GRS JSON validator, the startup template, the
#          icon roster, the icon glyphs, the display words, the MSPDI custom
#          fields, the exchange formats. ⛔ Added 2026-08-23: `gen:check` holds eleven generators
#          and this file called five, so for every round "ALL GREEN" proved
#          nothing whatever about six artifacts inside src/. A suite that is
#          quoted as the word on the tree has to run everything that holds the
#          tree to its manuscript
#   26b    check-published-members.py : every member table T-064 publishes is
#          exported by its component's public entry, the one way out of the
#          folder Chapter 5.3 allows. The "b" is deliberate -- audit-ch5.py
#          already holds table T-064's ROWS against table T-075, and nobody
#          held a row's MEMBERS against an export, so
#          ApplyDocumentChange.replaceDocument sat declared and unwritten with
#          every check green. It reads a name only where the cell IS one and
#          prints how many pieces it skipped, so it cannot be read as covering
#          the whole table. Its two known gaps are held in
#          published-members-baseline.txt (the shape of 11): green when the
#          gaps found are exactly those, red on a new one and red on a held
#          line that is no longer a gap. A held gap is a debt, not a permission.
#          ⭐ It also walks the OTHER way, added 2026-08-23: every name that
#          actually leaves a component folder in src/ is held against the
#          table, because a walk that starts at the table can only confirm
#          names the table already has. 226 names cross and 142 are in no row,
#          which is the failure the table's own claim says cannot happen; those
#          142 are held in crossing-names-baseline.txt so the run starts at
#          new 0 and a NEW unlisted crossing is red the day it appears
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

# ⭐ The rules, before the checks. docs/development-rules/README.md is what a
# session is told to open first, and the measurement in that file's section 2
# says why this is printed rather than merely asked for: a rule written as a
# principle was followed 7 times in 75, and one written into a procedure ran.
# This IS the procedure -- every session runs this script before it starts.
#
# ⛔ The one-liners are READ from the index, never copied here. Two copies of
# the same sentence part company, which is the failure R4 is about.
echo "===== 0  the rules ====="
echo "   docs/development-rules/ is the authority on HOW this product is built."
echo "   Read ALL of them through before touching anything -- a rule you did"
echo "   not read is one you cannot notice yourself breaking."
echo "   The front session ORCHESTRATES: subagents implement and test (05.6)."
echo ""
# The index is Japanese; a cp932 console would mangle it.
PYTHONIOENCODING=utf-8 python "$HERE/check-rules-index.py" || fail=1
echo ""
echo "===== 1-4  StrictDoc export ====="
# The export writes INTO $SD and never clears it, so a run leaves its own
# 9MB beside every earlier run's. Measured 2026-08-30: scratch/ had reached
# 509MB, 435MB of it this one directory. Clearing it first costs nothing --
# every check below reads only what this run writes.
rm -rf "$SD"
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
python docs/spec/_source/erd_json_to_md.py --check || fail=1
PYTHONIOENCODING=utf-8 python docs/spec/_source/settings_json_to_md.py --check || fail=1

echo ""
echo "===== 21  every generated artifact names its manuscript ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-provenance.py || fail=1

echo ""
echo "===== 22  each change request answers standing rules 1, 2 and 8 ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-cr-discipline.py || fail=1

echo ""
echo "===== 23  a manuscript holds its printed prose per language ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-language-dictionary.py || fail=1

echo ""
echo "===== 24  the development record still matches the tree ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-development-record.py || fail=1
# The ledger prints its own counts at its head; a count written by hand goes
# stale, so it is generated and held here.
PYTHONIOENCODING=utf-8 python tools/ledger_metrics.py --check || fail=1

echo ""
echo "===== 25  provisional marks match the pending-decision list ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-pending-decisions.py || fail=1

echo ""
echo "===== 17  the GRS JSON schema still matches its two sources ====="
PYTHONIOENCODING=utf-8 python docs/spec/_source/erd_json_to_schema.py --check || fail=1

echo ""
echo "===== 18  src/ still holds exactly the units of table T-075 ====="
PYTHONIOENCODING=utf-8 python tools/generate_unit_tree.py --check || fail=1

echo ""
echo "===== 19  src/ obeys the dependency rules of table T-061 ====="
PYTHONIOENCODING=utf-8 python tools/check_layer_rules.py || fail=1

echo ""
echo "===== 20  the generated entity types still match erd.json ====="
PYTHONIOENCODING=utf-8 python tools/generate_entity_types.py --check || fail=1

echo ""
echo "===== 27  the seven other generated artifacts still match their manuscripts ====="
PYTHONIOENCODING=utf-8 python tools/generate_json_schema_validator.py --check || fail=1
PYTHONIOENCODING=utf-8 python tools/generate_startup_template.py --check || fail=1
PYTHONIOENCODING=utf-8 python tools/generate_icon_roster.py --check || fail=1
PYTHONIOENCODING=utf-8 python tools/generate_icon_glyphs.py --check || fail=1
PYTHONIOENCODING=utf-8 python tools/generate_display_words.py --check || fail=1
PYTHONIOENCODING=utf-8 python tools/generate_mspdi_custom_fields.py --check || fail=1
PYTHONIOENCODING=utf-8 python tools/generate_exchange_formats.py --check || fail=1

echo ""
echo "===== 28  the ledger against what has been SEEN in the app ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-live-verification.py || fail=1

echo ""
echo "===== 26b table T-064 and src/ hold each other, both directions ====="
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-published-members.py || fail=1

echo ""
echo "===== NOT COVERED  what this run did not look at ====="
# ⛔ Printed on every run, green or red. A suite that names only what it
# checked gets read as having checked everything, which is how a gate that saw
# 71.3% of the import edges said "OK" for six rounds (2026-08-23 audit).
echo "   docs/spec/_source/build.py writes 11 artifacts -- fig-components and"
echo "   the four views, each a .drawio and an .svg, plus"
echo "   docs/review/components/components.md -- and has no --check. It drives"
echo "   draw.io through an installed executable, so nothing here can rebuild"
echo "   them to compare. ⛔ A stale component figure passes this whole suite."
echo "   Provenance only (check 21) says where they came from, never that they"
echo "   are current."

echo ""
if [ "$fail" -eq 0 ]; then
    echo "ALL GREEN -- which proves references resolve, not that the"
    echo "specification agrees with itself, and not that anything under"
    echo "NOT COVERED above is current."
else
    echo "FAILURES ABOVE"
fi
exit "$fail"
