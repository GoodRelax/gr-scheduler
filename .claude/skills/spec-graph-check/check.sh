#!/usr/bin/env bash
# All 51 mechanical checks for the gr-scheduler specification.
#
# The count is the numbered checks below, NOT counting check 0 (the rules
# index, which prints before any check runs). ⛔ Recount it in the same change
# that adds a check, and BEFORE the heading goes in: a check added without a
# recount leaves this line wrong for every later reader. To recount:
#
#   grep -o '^section "[^"]*' check.sh
#
# then add up the ranges in the headings (1-4 is four, 5-10 is six, and so
# on). A heading may carry several numbers because one script answers them.
# The ranges today are 1 + 4 + 8 + 4 + 34.
#
# The index below is for the checks a session reads first. Checks 46 to 54 are
# read from their own docstrings and from docs/development-rules/09-tools.md.
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
#   32     the forbidden word 部品 (style-checks.py) : A-17 of table T-006b is
#          the one row that forbids a word outright, compounds included, and
#          states its own exemption -- a line may hold the word where it names
#          the ban. The exemption is READ from that rule rather than held in a
#          baseline, so it cannot go stale
#   33     audit-ch5.py, the Chapter 5 self-audit : the counts Chapter 5
#          asserts, read against the tables the same file holds. ⛔ It runs
#          inside this script because a check that a rule asks people to run
#          separately is a check that does not run
#   11     dup-check.py against the known-duplication baseline
#   30     the generated `export const` of src/ against the list that
#          names them in docs/development-rules/03-implementation.md
#   31     check-stale-blocked.py : a defects.md row whose 対応方針・決定仕様
#          cell still contains 未定 / 利用者の裁定が要る / 裁定を待つ /
#          仕様に行が無い while the SAME row also shows a ruling, a testing
#          status, or a ✅ 実物確認 -- the cell is written append-only, so the
#          opening clause outlives the ruling that overturns it. Held against
#          a baseline the same way check 29 is
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
#          answers standing rules 1, 2 and 8 -- a rule carried only as a
#          principle is skipped, so the answers are checked
#   23     check-language-dictionary.py : a manuscript holds its PRINTED prose
#          as a language dictionary (Chapter 6.2), so adding an edition is a
#          fill-in. Japanese that is a classification rather than prose is
#          exempt BY PATH AND COUNT, so an exemption cannot grow in silence
#   24     check-development-record.py : the development record still matches
#          the tree. A record that has drifted is worse than none -- the next
#          session reads it after a stop and starts from a state that is not
#          true. "Not started" is decided exactly: the file is byte for byte
#          the stub tools/generate_unit_tree.py writes
#   25     check-pending-decisions.py : a value implemented before the user
#          decided it carries a mark, and the mark and the list agree in both
#          directions. A class the rule says to wait for may not carry a mark
#          at all, and a class that cannot be reversed may not be left open
#          behind a finished wave
#   27     the generated artifacts `npm run gen:check` holds -- the GRS JSON
#          validator, the startup template, the icon roster, the icon glyphs,
#          the display words, the MSPDI custom fields, the exchange formats,
#          the property items, the row-ID prefix table, and the component
#          overview and table build.py writes (not its figures).
#          ⛔ A suite quoted as the word on the tree has to run everything that
#          holds the tree to its manuscript, so none of these is left to
#          `gen:check` alone
#   26b    check-published-members.py : every member table T-064 publishes is
#          exported by its component's public entry, the one way out of the
#          folder Chapter 5.3 allows. The "b" is deliberate -- audit-ch5.py
#          already holds table T-064's ROWS against table T-075, and nothing
#          else holds a row's MEMBERS against an export. It reads a name only
#          where the cell IS one and prints how many pieces it skipped, so it
#          cannot be read as covering the whole table. Known gaps are held in
#          published-members-baseline.txt: green when the gaps found are
#          exactly those, red on a new one and red on a held line that is no
#          longer a gap. A held gap is a debt, not a permission.
#          ⭐ It also walks the OTHER way: every name that leaves a component
#          folder in src/ is held against the table, because a walk that
#          starts at the table can only confirm names the table already has.
#          Unlisted crossings are held in crossing-names-baseline.txt, so a NEW
#          unlisted crossing is red the day it appears
#   38     check-changelog-versions.py : the changelog table in
#          docs/development-records/changelog.md names each version number
#          once. Ordering is a separate claim and not checked here
#   37     check-dictionary-table-covariance.py : the 12 groups of
#          display-words.json keyed by a table row id (every one but
#          `reasons`, table T-233, which tests/contract/
#          t-233-reason-words-tell-the-row.contract.test.ts already guards)
#          are fingerprinted against that row's cells, so a table cell cannot
#          be rewritten out from under its display word. Held against
#          dictionary-table-pairing.txt, a fingerprint snapshot and not a debt
#          count: FAIL means either side moved and nobody re-read the pair,
#          not that a number rose
#   39     check-must-clause-coverage.py : counts every `（MUST）` /
#          `（MUST NOT）` marker in the nine manuscript files (the same set
#          check 37 reads), and holds a clause verbatim-tied only if a trailing
#          slice of its own text (>=28 characters, ending at the marker) is
#          quoted somewhere under tests/, WITH THAT FILE'S COMMENT LINES STRUCK
#          OUT -- a comment cannot go red when the clause it quotes is
#          rewritten. Held against must-clause-coverage-baseline.txt, the
#          unheld count. ⛔ IT IS A BOLT, NOT A DEBT: it fails the round that
#          writes a NEW bare MUST, and no round may write a test whose purpose
#          is to lower the standing count
#   44     check-spec-id-references.py : the first check that reads src/ and
#          tests/ at all. It faults a reference from them to an id the
#          specification RETIRED (a burnt seat) or never defined -- every
#          check above it reads only docs/, so a withdrawn id could go on being
#          cited by the code with every gate green. ⚠️ It matches ids OUTSIDE
#          backticks too, because most references in code carry no code span
#   45     check-repeated-expressions.py : one expression, normalised, written
#          in two or more places in src/. ⛔ Gated at a token floor of 20, not
#          10: read by hand, far more of the groups are real at 20, and a gate
#          that is often wrong teaches people to ignore red. ⚠️ So it does not
#          see a short expression repeated in a few places; `--floor 10` prints
#          that band and does not gate. tests/ is measured on every run and
#          never counted, because a case that states its own arrangement is
#          right to repeat itself
#   40     check-ruled-elsewhere.py : a defects.md row still reading as
#          un-ruled -- ステータス at 未検討 / 裁定待ち / 仕様待ち, or its
#          対応方針・決定仕様 cell holding 未検討 / 裁定待ち / 利用者の裁定が
#          要る / 裁定を待つ / 未定 / 仕様に行が無い -- while a `PND-nnn` the
#          same row NAMES stands at 裁定済 in pending-decisions.md. Check 31
#          is intra-row and check 25 reads the marks in src/; this one reads
#          the two books together. Held against ruled-elsewhere-baseline.txt.
#          ⚠️ It prints, without gating, the rows whose only link to a ruling
#          is a change request: a CR routinely cites the row that RAISED it,
#          so gating there would be mostly noise
#   42     check-quoted-source.py : a 「…」 quotation inside a comment of
#          src/ or tests/ that NO manuscript under docs/spec contains -- a
#          paraphrase hardened into a citation, which reads as a rule the
#          specification does not have. Held against
#          quoted-source-baseline.txt; `--list` prints them
#   43     check-ruling-landed.py : a row of
#          docs/development-records/rulings.md that says 適用済 while its
#          着地先 names no ID defined in docs/spec and no file that exists (a
#          cell naming neither is searched for its 逐語), a row closing with an
#          empty 着地先, and the count of rulings still 未着地. rulings.md is
#          the one place a ruling lives, so a question already decided is not
#          asked again; this stops it decaying into a book nobody updates.
#          Held against ruling-landed-baseline.txt: line 1 is the 未着地
#          count, and each `HELD JDG-nn` line exempts one 適用済 row.
#          ⭐ Held in BOTH directions like check 26b: a HELD row that stops
#          being a miss is red too
#   41     tools/precheck.py : the six traps that otherwise cost a round trip
#          -- a bare change-request number, personal information or an
#          absolute path, a hand edit to a generated file, and the rest. It
#          goes first because a guard people must remember to run does not
#          run. It reads what git reports as changed, so on a clean tree it
#          passes having looked at nothing; that is correct, it is the
#          cheapest guard
#
# Green does NOT prove the specification is sound: defects of meaning have
# appeared while all of these were green. They stop broken references, not
# broken meaning.
#
# Usage:  bash .claude/skills/spec-graph-check/check.sh
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
OUT="$REPO/scratch/spec-check"          # gitignored (see .gitignore "scratch/")
SD="$OUT/sd-out"
J="$SD/json/index.json"
fail=0
FAILED=""
SECTION=""
# ⭐ Every check announces itself through `section` and every failure goes
# through `failed`, so the end names the checks that went red instead of
# leaving only a line to scroll back from, and last-run.txt keeps it.
section() { SECTION="${1%% *}"; echo "===== $1 ====="; }
failed() {
    fail=1
    case " $FAILED " in
        *" $SECTION "*) ;;
        *) FAILED="${FAILED:+$FAILED }$SECTION" ;;
    esac
}

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
section "0  the rules"
echo "   docs/development-rules/ is the authority on HOW this product is built."
echo "   Read ALL of them through before touching anything -- a rule you did"
echo "   not read is one you cannot notice yourself breaking."
echo "   The front session ORCHESTRATES: subagents implement and test (05.6)."
echo ""
# The index is Japanese; a cp932 console would mangle it.
PYTHONIOENCODING=utf-8 python "$HERE/check-rules-index.py" || failed

echo ""
section "41  the traps that are cheaper to catch before the edit"
# ⛔ `npm run precheck` is called here because there is no git hook: a guard
# that no gate calls runs only when somebody remembers. It was green (exit 0)
# before it was wired, because a gate that is born red teaches people to
# ignore gates. ⚠️ With no arguments it reads what git reports as changed, so
# on a clean tree it passes having examined nothing. That is correct: it is
# the early guard, not the authority. check.sh below stays the authority.
PYTHONIOENCODING=utf-8 python tools/precheck.py || failed

echo ""
section "1-4  StrictDoc export"
# The export writes INTO $SD and never clears it, so a run leaves its own
# 9MB beside every earlier run's. Clearing it first costs nothing --
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
[ -n "$out" ] && { echo "$out"; failed; } || echo "   none"

echo "-- 3. ORIGIN vs Relations mismatch (expect none)"
out=$(jq -r '.DOCUMENTS[] | recurse(.NODES[]?)
  | select(._NODE_TYPE=="FUNC_REQ" or ._NODE_TYPE=="NON_FUNC_REQ") | . as $n
  | [($n.ORIGIN // "") | scan("(?:UC|GL)-[0-9]+")] | unique as $o
  | [($n.RELATIONS // [])[] | select(.TYPE=="Parent") | .VALUE] | unique as $r
  | (($o - $r) + ($r - $o)) as $m
  | select(($m|length)>0) | "ORIGIN-MISMATCH " + $n.UID' "$J")
[ -n "$out" ] && { echo "$out"; failed; } || echo "   none"

echo "-- 4. UID gaps (FR-50 is retired on purpose; every other gap is a defect)"
jq -r '([.DOCUMENTS[] | recurse(.NODES[]?)
        | select(.UID? and ._NODE_TYPE!="DOCUMENT") | .UID]) as $u
  | ["FR-","NFR-","UC-","GL-"][] as $pre
  | ([$u[] | select(startswith($pre)) | ltrimstr($pre) | tonumber] | sort) as $n
  | ([range($n[0]; $n[-1]+1)] - $n) as $gap
  | "   " + $pre + " count=" + ($n|length|tostring) + " gaps="
    + (if ($gap|length)==0 then "none" else ($gap|map(tostring)|join(",")) end)' "$J"

echo ""
section "5-10, 15, 48  Markdown source"
python "$HERE/md-checks.py" "$REPO" || failed

echo ""
section "12-14, 32  recurring defect types"
# ⚠️ utf-8, like every other check that prints Japanese: check 32 names the
# forbidden word in its own finding, and a cp932 console mangles it.
PYTHONIOENCODING=utf-8 python "$HERE/style-checks.py" "$REPO" || failed

echo ""
section "11  duplication detector"
python docs/review/dup-check.py 0.45 "$OUT/dup-report.txt" \
    docs/review/duplication-baseline.txt || failed
echo "   report: $OUT/dup-report.txt"

echo ""
section "16  generated documents still match their source"
python docs/spec/_source/erd_json_to_md.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/settings_json_to_md.py --check || failed

echo ""
section "21  every generated artifact names its manuscript"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-provenance.py || failed

echo ""
section "22  each change request answers standing rules 1, 2 and 8"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-cr-discipline.py || failed

echo ""
section "23  a manuscript holds its printed prose per language"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-language-dictionary.py || failed

echo ""
section "24  the development record still matches the tree"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-development-record.py || failed
# The ledger prints its own counts at its head; a count written by hand goes
# stale, so it is generated and held here.
PYTHONIOENCODING=utf-8 python tools/ledger_metrics.py --check || failed

echo ""
section "25  provisional marks match the pending-decision list"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-pending-decisions.py || failed

echo ""
section "17  the GRS JSON schema still matches its two sources"
PYTHONIOENCODING=utf-8 python docs/spec/_source/erd_json_to_schema.py --check || failed

echo ""
section "18  src/ still holds exactly the units of table T-075"
PYTHONIOENCODING=utf-8 python tools/generate_unit_tree.py --check || failed

echo ""
section "19  src/ obeys the dependency rules of table T-061"
PYTHONIOENCODING=utf-8 python tools/check_layer_rules.py || failed

echo ""
section "20  the generated entity types still match erd.json"
PYTHONIOENCODING=utf-8 python tools/generate_entity_types.py --check || failed

echo ""
# ⭐ Every target of `npm run gen:check` is a gate here: a generator whose
# --check runs only under `gen:check` can drift while this suite stays green.
# ⚠️ Five are checked in their own sections above -- 16 (settings and the
# two ERD figures), 17 (the schema), 18 (the unit tree) and 20 (the types)
# -- so the thirteen below plus those five are the eighteen `gen:check` runs.
section "27  the thirteen other generated artifacts still match their manuscripts"
PYTHONIOENCODING=utf-8 python tools/generate_json_schema_validator.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_startup_template.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_icon_roster.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_icon_glyphs.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_display_words.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_mspdi_custom_fields.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_exchange_formats.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_help_roster.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_property_items.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_licence.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/property_items_json_to_md.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/row_id_prefixes_json_to_md.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/build.py --check || failed

echo ""
section "28  the ledger against what has been SEEN in the app"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-live-verification.py || failed

echo ""
section "29  the ledger against WHERE THE SPECIFICATION SAYS IT"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-decided-spec.py || failed

echo ""
section "26b table T-064 and src/ hold each other, both directions"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-published-members.py || failed

echo ""
section "30  the generated constants against the list that names them"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-generated-constants.py || failed

echo ""
section "33  Chapter 5 answers to itself"
# ⛔ utf-8: the audit prints Japanese table names, and a cp932 console
# mangles them into the mojibake that hid its own failures before.
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/audit-ch5.py || failed

echo ""
section "31  a row that still reads blocked while the row says it is settled"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-stale-blocked.py || failed

echo ""
section "40  a row still un-ruled while its pending decision is 裁定済"
# ⛔ utf-8: it prints the two books' Japanese state words, and telling 未検討
# from 裁定済 is the whole point of the line.
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-ruled-elsewhere.py || failed

echo ""
section "42  a comment quoting a sentence docs/spec does not contain"
# ⛔ utf-8: the quotations it prints are Japanese, and a mangled one cannot
# be looked up in the manuscript it is supposed to have come from.
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-quoted-source.py || failed

echo ""
section "43  a ruling the book calls applied whose words nothing holds"
# ⛔ utf-8: it prints the user's own Japanese sentences, and a ruling that
# arrives mangled cannot be looked up in the manuscript that should hold it.
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-ruling-landed.py || failed

echo ""
section "37  a table's row and its display word were read together"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-dictionary-table-covariance.py || failed

echo ""
section "38  revision history version numbers are unique"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-changelog-versions.py || failed

echo ""
section "39  MUST / MUST NOT clauses held verbatim by a test"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-must-clause-coverage.py || failed

echo ""
section "44  src/ and tests/ against a burnt or unknown specification ID"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-spec-id-references.py || failed

echo ""
section "45  one expression written in two or more places in src/"
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-repeated-expressions.py || failed

echo ""
section "46  every sentence ends a line"
PYTHONIOENCODING=utf-8 python "$HERE/check-line-breaks.py" || failed

echo ""
section "47  the marks are used once, and bold marks a phrase"
PYTHONIOENCODING=utf-8 python "$HERE/check-marks.py" || failed

echo ""
section "49  the published HTML: bold and captions actually arrived"
# ⛔ check-render.py is the ONLY check that opens the page a reader sees;
# every other one reads the manuscript or the JSON export. It was green BEFORE
# being wired -- 0 literal `**` across all four documents, 0 missing captions
# -- because a gate that is born red teaches people to ignore gates.
#
# ⚠️ This needs an HTML export, which is NOT the JSON export of checks 1-4.
# ⛔ Do not fold html into that one: it is SLOWER. Check 1-4 does
# `rm -rf "$SD"` every run, which throws away StrictDoc's cache, so a combined
# json,html export there is always cold. Measured, two runs each:
# one combined export 9s / 6s, against 6s / 5s for the JSON export plus a
# separate HTML export into a directory that is NOT wiped and stays warm.
# $HTMLOUT is therefore kept between runs. It does not grow -- the export
# overwrites in place, 43MB across four exports -- and scratch/ is gitignored.
HTMLOUT="$REPO/scratch/spec-html-probe"   # the path rule 04 section 4 names
strictdoc export docs/spec --formats=html --output-dir "$HTMLOUT" \
    --no-parallelization >/dev/null 2>&1 || {
    echo "HTML EXPORT FAILED -- rerun for the reason:"
    strictdoc export docs/spec --formats=html --output-dir "$HTMLOUT" \
        --no-parallelization 2>&1 | grep -iE 'error' | head -3
    failed
}
PYTHONIOENCODING=utf-8 python "$HERE/check-render.py" scratch/spec-html-probe || failed

section "50  表 T-023a and the PressRow type name the same rows"
# ⛔ Green before the rename it guards, not after. The press table's rows ARE
# the values of a TypeScript type, and before this check `grep -rn PressRow
# tools/ .claude/` returned NOTHING -- the manuscript could be renamed and the
# code would stay green. These strings never leave the product, so pressing
# the build cannot show a drift either. ⭐ A check added AFTER a rename would
# be born guarding something already broken, which is why this one goes in
# first.
PYTHONIOENCODING=utf-8 python "$HERE/check-press-row-ids.py" || failed

section "51  the PD- prefix, followed by a number, is gone"
# ⛔ It prints its exclusions ON EVERY RUN, each with the reason
# it is excluded, because the thing that would quietly rot here is not the
# count -- it is an exclusion nobody reads. ⚠️ Check 50's own docstring is on
# the list, by name.
PYTHONIOENCODING=utf-8 python "$HERE/check-pd-prefix-gone.py" || failed

section "52  表 T-007 / T-008 and the row ids the tests hold as values"
# ⛔ Green before the rename it guards, for the same reason as check 50.
# Two tests transcribe 表 T-008 into a fixture and a third reads the manuscript
# at run time and matches on the id, so a one-sided rename either reddens them
# or, worse, leaves `find` returning undefined. ⭐ Measured: putting one
# fixture's id to `CHN-9` turns it red and names both halves.
PYTHONIOENCODING=utf-8 python "$HERE/check-device-route-row-ids.py" || failed

section "53  the D- and R- prefixes, followed by a number, are gone"
# ⛔ In place since the CR that abolished both. ⭐ It prints its
# exclusions ON EVERY RUN, each with the reason: two trees, six files, the
# twenty-four LOCAL series a document numbers for itself, and eleven lines.
# ⛔ The local series are written out one by one rather than computed --
# "any document with three or more is exempt" would quietly cover the NEXT
# document that starts numbering `D-1`, which is what the ruling asked to stop.
# ⚠️ Its first run found 25 test FILE NAMES the inventory never saw, because
# the inventory scanned upper case only and the names are `d-102-...`.
PYTHONIOENCODING=utf-8 python "$HERE/check-dr-prefix-gone.py" || failed

section "54  docs/spec holds its reasons, not its history"
# ⛔ Green on arrival. It gates the two shapes that measured as unambiguous --
# 利用者の裁定 with a date, and a date followed by まで -- with no baseline and
# no exclusions.
PYTHONIOENCODING=utf-8 python "$HERE/check-spec-holds-no-history.py" || failed


echo ""
section "NOT COVERED  what this run did not look at"
# ⛔ Printed on every run, green or red. A suite that names only what it
# checked gets read as having checked everything, so a gate that sees only
# part of the import edges still reads as "OK".
echo "   docs/spec/_source/build.py --check (check 27) compares overview.json and"
echo "   docs/review/components/components.md only. The five figures --"
echo "   fig-components and the four views, each a .drawio (Graphviz) and an"
echo "   .svg (draw.io) -- are never rebuilt here to compare."
echo "   ⛔ A stale component figure passes this whole suite."
echo "   Provenance only (check 21) says where they came from, never that they"
echo "   are current."
echo ""
echo "   ⛔ A COMMENT THAT LIES IN THE PRESENT TENSE IS NOT GATED, and cannot"
echo "   be. check 44 faults the id; nothing here faults the SENTENCE around"
echo "   it. list-asserted-claims.py finds those -- 69 candidates on"
echo "   2026-09-11 -- but it is deliberately NOT in this suite: measured over"
echo "   a 30-line sample, 19 were really stale, so a gate would stop better"
echo "   than one round in three for nothing. Run it by hand in a cleanup:"
echo "     python .claude/skills/spec-graph-check/list-asserted-claims.py"

# ⛔ A WARNING, NEVER A FAILURE -- `fail` is untouched on purpose. The tree
# below appears because somebody OPENED the specification, and a gate that goes
# red for that teaches people that red means nothing.
if [ -d docs/spec/output ]; then
    echo ""
    echo "   ⚠️ docs/spec/output/ EXISTS, so docs/spec is no longer only the"
    echo "   manuscript. The StrictDoc server regenerates its whole tree there,"
    echo "   INSIDE the manuscript folder, and anything that greps docs/spec"
    echo "   then reads a stale generated copy as if it were the source."
    echo "   Measured 2026-09-11: CM-70 appeared 0 times in the source"
    echo "   _assets/tbl-glossary.md and once in the copy under output/, whose"
    echo "   files were 25 days old. A subagent grepped, concluded the row was"
    echo "   live, and wrote a false claim into a test. That tree was 790 MB;"
    echo "   deleting it is safe and it comes back whenever StrictDoc is opened."
    echo "   Sweep it before grepping, and before trusting anything you grepped:"
    echo "     python tools/sweep_strictdoc_output.py"
fi

echo ""
if [ "$fail" -eq 0 ]; then
    echo "ALL GREEN -- which proves references resolve, not that the"
    echo "specification agrees with itself, and not that anything under"
    echo "NOT COVERED above is current."
else
    echo "FAILURES ABOVE -- red: $FAILED"
fi
{
    echo "exit $fail"
    echo "red: ${FAILED:-none}"
} > "$OUT/last-run.txt"
exit "$fail"
