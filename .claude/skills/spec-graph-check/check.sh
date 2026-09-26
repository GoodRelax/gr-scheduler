#!/usr/bin/env bash
# All 65 mechanical checks for the gr-scheduler specification.
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
# The ranges today are 1 + 4 + 8 + 4 + 48. (Recounted 2026-09-26 when
# checks 64-66 went in: the single-number headings were 43, not 42, before
# them -- check 63 had gone in without a recount. 76 and 77 made it 48.)
# ⚠️ `26b` is written with ONE space after the number, so a recount that
# splits the heading on two spaces reads it as no number at all and lands one
# short. Counted by hand it is one check like any other.
#
# The index below is for the checks a session reads first. Checks 46 to 55 are
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
#   30     the generated `const` of src/, exported or not, against the list
#          that names them in docs/development-rules/03-implementation.md;
#          and JDG-139 copy by copy: an exported copy no other file of src/
#          or tests/ imports, a read copy that is not exported, and the
#          generator's PUBLISHED_READ_BY_* list out of step with either
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
#          the property items, the row-ID prefix table, the state-machine
#          tables and the region types printed from state-machines.json, and
#          the component overview and table build.py writes (not its figures).
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
#          quoted somewhere under tests/contract, tests/system or
#          tests/usecase (CR-573, JDG-637 -- not tests/unit, integration or
#          nfr), WITH THAT FILE'S COMMENT LINES STRUCK
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
#          src/ or of tests/contract, tests/system, tests/usecase (CR-573,
#          JDG-637) that NO manuscript under docs/spec contains -- a
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
#   56     check-grab-table-parents.py : both directions between the
#          grab-area requirements and their tables. FORWARD: a table written
#          inside one of those requirements that NO requirement of the family
#          names. REVERSE (CR-441): a requirement of the family that names
#          none of the nine grab tables. Both rules are `FR-104`'s own
#          RATIONALE -- 「親を持たない表を置かないこと（MUST NOT）」 and the line
#          after it, 「…のうち少なくとも 1 つを名指すこと（MUST）」 -- and the
#          requirements and tables of both are read out of the document on
#          every run, so no list can rot here. ⭐ A table's own `**表 T-nnn —`
#          heading and the two clause lines do not count as namings; counting
#          them would make the check green by construction
#   57     check-decision-tables.py : a decision table with a gap or an
#          overlap once 「—」 and 「（問わない）」 are expanded. The rule is the
#          MUST at the end of section 1.9. ⛔ The condition columns and each
#          column's DOMAIN live in the script, with the source of each domain
#          in a comment beside it, and a cell holding a value outside its
#          declared domain is itself a failure -- that is what stops the
#          domains there from going stale in silence
#   58     the CR-430 sweep, 256 turns of the seven axes, run from inside this
#          suite. ⛔ It is run with PLAYWRIGHT, not Vitest: tests/system/ is
#          Playwright's place (table T-218, see playwright.config.ts) and the
#          case imports `@playwright/test`, so `vitest run` on that file
#          answers "No test files found" and exits 1. ⚠️ It is the only check
#          here that starts a dev server; MEASURED 2026-09-21 at 6-7s wall
#          including the warm-up, and it leaves no server behind
#
#   59     check-component-edges.py : a cross-component import of src/ that
#          `_source/components.json` does not declare as an edge (`EG-5` of
#          table T-247). One direction only: an edge the figure declares and
#          no import makes is printed as NOT GATED, because CR-378 decision 7
#          keeps 「図 ⊆ コード」 out of the gate. ⚠️ It reads the code side
#          through check 19's own reader, so the two move together
#
#   60     check-function-size.py : the function-size ratchet of JDG-54 --
#          no function of src/ may GROW, and none may newly cross the band
#          (more than 50 lines or more than 15 branches) without its debt
#          being written down. ⚠️ There is no line of specification behind
#          it: JDG-54 deliberately sets no upper limit before stage 8, so
#          impact.py has nothing to point it at. ⛔ It is the first check
#          here that calls `node` -- function-size.mjs does the AST walk with
#          rolldown/parseAst, the parser the plan's record 1 used. Held two
#          ways against function-size-baseline.txt, the shape of checks 26b
#          and 43: line 1 carries the two totals (excess-lines,
#          excess-branches) and a rise in either FAILS, each HELD line is one
#          banded function and a rise in ITS numbers FAILS, and a HELD line
#          whose function has shrunk, moved or gone is stale and FAILS too.
#          ⭐ So SPLITTING a banded function is red until the same commit
#          rewrites the baseline, which is the point of the second direction:
#          the totals always fall on a real split, and only the file says
#          which names paid the debt
#   61     check-module-state.py : module-scope mutable state in the inner
#          three layers. The clause is table T-249's SF-7 --
#          「内側の 3 層のモジュールスコープに可変状態を置かない」 -- and 5.3's prose
#          behind it. Read lexically at column 0: a `let` / `var` always, a
#          `const X = new Map/Set/WeakMap/WeakSet(...)` or `const X = [` / `{`
#          only when the SAME file also mutates X, which is how a ReadonlyMap
#          nothing writes passes without this check parsing the annotation.
#          ⚠️ Aliasing and cross-file mutation are invisible to a lexical
#          read, and it prints that on every run rather than leaving it
#          implied. Held both ways against module-state-baseline.txt, which
#          exempts exactly the two findings DFC-583 already records
#   62     check-identifier-reservation.py : an identifier an IN-FLIGHT
#          change request says it will create, and the number it cites as
#          the evidence, re-measured against the tree it will be applied to.
#          The rule is section 2.5 of
#          docs/development-rules/02-changing-the-spec.md -- a name picked
#          from "the current maximum" is a claim with a shelf life of one
#          commit, and two sessions drafting at once cannot see each other at
#          all, which is why a number band handed out in a brief cannot close
#          it. Three claims about the PRESENT are read: 空いて / 空き for the
#          names to its LEFT (what stands to the right is usually the
#          opposite list), 表 … 最大 for the `T-nnn` after it, and
#          接頭辞 / 登録簿 … N 件 for the registry size.
#          ⛔ IT NEVER READS section 5's 数の予測 -- `rows=` / `tables=` /
#          `uids=` are frozen history, correct as of their own round, and a
#          check that held them against today would fault every change
#          request in the folder. ⛔ Scoped to what git reports as untracked
#          or modified, precheck.py's reader: a LANDED change request owns
#          its identifiers and may not be faulted for them. `--all` drops
#          the scoping and shows what that costs. No baseline: it is exact
#          and green at zero
#   63     check-sm-ev-tn-prefix-gone.py : `SM-` / `EV-` / `TN-` followed by
#          a number, over every tracked file. JDG-286 replaced the numbered
#          states, events and transitions of the state-machine manuscript
#          with names, and the three prefixes left the registry; this is the
#          check 51 form for them. The change requests that built the rows
#          keep the old numbers as history and are excluded BY NAME, with
#          their reasons printed on every run
#   64     check-purity-honesty.py (+ purity-calls.mjs) : a function tagged
#          `@purity pure` / `semi-pure-a` that calls a `semi-pure-b` /
#          `non-pure` function, touches `document` / `window` / `Date.now` /
#          `Math.random`, or awaits (CR-573 section 5). The tag is what
#          excuses it from a unit test (rule 04 table UO, UO-1), so a lying
#          tag is an untested function. Callees are resolved by the
#          TypeScript 7 checker through its `typescript/unstable/sync` API.
#          Held against purity-honesty-baseline.txt
#   65     check-unit-test-or-omission.py : an exported function of src/ that
#          no omission row of table UO covers and no tests/unit file imports,
#          and an `@external-contract` function no unit or contract test
#          imports (CR-573 section 5). ⚠️ Without coverage/coverage-final.json
#          UO-4 is not measured, and the line says UNMEASURED instead of OK.
#          Held against unit-test-or-omission-baseline.txt
#   66     check-perf-gate.py : playwright.config.ts keeps the clock-reading
#          files of tests/nfr out of every run without GRS_PERF=1, and a
#          change request landed since perf-pending.md began that touched a
#          per-frame path of rule 04 section 5 is in perf-pending.md or
#          measurements/performance-runs.md (PW-2). No baseline: 0
#   76     check-handoff-holds-state.py : docs/development-records/handoff.md
#          keeps a lesson only in its newest dated section, and no heading
#          of lessons waiting to be lowered. Rule 05 section 1: a lesson left
#          in the handoff is gone a round later, so the round's end lowers it
#          into docs/development-rules/. No baseline: 0
#   77     check-rules-name-real-things.py : every backticked path, every
#          `npm run` script and every 検査 number that a rule of
#          docs/development-rules/ names still exists. Check 0 keeps the
#          links; this keeps the names. No baseline: 0
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
# -- so the eighteen below plus those five are the twenty-three `gen:check` runs.
section "27  the eighteen other generated artifacts still match their manuscripts"
PYTHONIOENCODING=utf-8 python tools/generate_json_schema_validator.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_startup_template.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_icon_roster.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_icon_glyphs.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_display_words.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_mspdi_custom_fields.py --check || failed
# ⭐ The MSPDI child order checks its own bodySha256 even where the XSD is
# absent (JDG-251), so a hand edit goes red in every worktree too.
PYTHONIOENCODING=utf-8 python tools/generate_mspdi_child_order.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_exchange_formats.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_help_roster.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_property_items.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_licence.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/property_items_json_to_md.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/state_machines_json_to_md.py --check || failed
# Tables T-334 and T-218 of Chapter 7, one manuscript (CR-573, JDG-607).
PYTHONIOENCODING=utf-8 python docs/spec/_source/verification_json_to_md.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_state_machine_types.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/row_id_prefixes_json_to_md.py --check || failed
PYTHONIOENCODING=utf-8 python docs/spec/_source/build.py --check || failed
PYTHONIOENCODING=utf-8 python tools/generate_comment_rules_card.py --check || failed

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
section "30  the generated constants against the list that names them, and exported only where read (JDG-139)"
# The self-test runs first: it breaks a tree held in memory six ways and is red
# unless every break goes red and the unbroken tree stays green.
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/check-generated-constants.py --self-test || failed
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

section "55  src/ and tests/ comments hold to ruling 17 and JDG-62: ASCII, the allowed forms, the amount"
# src/ is held against comment-rules-baseline.txt, a ratchet: line 1 is the sum
# of the non-ASCII comment lines, the lines in no form the ruling allows, and
# the lines past the 10% allowance per file and for the tree. tests/ is held
# against comment-rules-tests-baseline.txt, per file (non-ASCII + form, with
# `// STEP:` allowed, 3 per test) and for the tree density; no 10% cap yet.
# Red when a number rises; lower the line in the commit that lowers it.
# `--list [tests]` names the files, `--file <path>` the lines.
# The self-test runs first: it breaks a test file held in memory on purpose
# and is red unless every break goes red and the clean file stays green.
PYTHONIOENCODING=utf-8 python "$HERE/check-comment-rules.py" --self-test || failed
PYTHONIOENCODING=utf-8 python "$HERE/check-comment-rules.py" || failed

echo ""
section "56  the grab-area requirements and their tables name each other, both ways"
# ⛔ Green on arrival, with no baseline: MEASURED 2026-09-21 on 0163153c, 13
# tables defined inside the ten requirements the clause names, 0 of them
# parentless. ⭐ Both lists are READ -- the permitted parents from the clause
# line, the tables from the headings inside those requirements' blocks -- so
# the day FR-109 gains a table it is checked with no edit to the script.
# ⭐ MEASURED by breaking it: removing 「前後は表 T-020 に従うこと。」, T-020's
# only naming, reports 1; removing FR-106's 「表 T-269」 (the break CR-430 §8
# lists) reports 0, because FR-104's table header still names it -- the naming
# count falls 2 → 1 and the table still has a parent.
# ⭐ REVERSE (CR-441), MEASURED 2026-09-22: 10 requirements x 9 tables read
# from the second clause line, 0 naming none; FR-044 names exactly one
# (表 T-270, its 「PE-13」 pointer). Breaking it: deleting that sentence reports
# FR-044; deleting every naming but the clauses from FR-104 reports FR-104.
PYTHONIOENCODING=utf-8 python "$HERE/check-grab-table-parents.py" || failed

echo ""
section "57  a decision table covers its conditions and never overlaps"
# ⛔ Green on arrival, with no baseline: MEASURED 2026-09-21, 表 T-272 4/4
# combinations, 表 T-273 12/12, 表 T-270 42/42 cells over 14 rows, 0 gaps and
# 0 overlaps. ⭐ MEASURED by breaking it: deleting `LP-3` reports 1 gap,
# widening `LP-5`'s マーカー to 「（問わない）」 reports 2 overlaps, putting
# `RF-3`'s 実績を表示 to 「する」 reports 2 gaps and 2 overlaps, and naming a
# shape the declared domain does not hold reports the stale domain first.
PYTHONIOENCODING=utf-8 python "$HERE/check-decision-tables.py" || failed

echo ""
section "58  the CR-430 sweep: 256 turns, and nothing hidden answers"
# ⛔ RUN WITH PLAYWRIGHT, NOT VITEST. CR-430 §8 asked for `vitest run`, but
# tests/system/ is Playwright's place (table T-218) and the case imports
# `@playwright/test`; MEASURED 2026-09-21, `npx --no-install vitest run` on it
# prints "No test files found" and exits 1, because vitest.config.ts includes
# only tests/contract, tests/integration and tests/unit.
# ⚠️ THE ONLY CHECK HERE THAT STARTS A DEV SERVER. 6-7s wall on a warm tree,
# and the server is gone when it returns.
# ⭐ MEASURED by breaking it: deleting row `GA-18` from 表 T-266 turns 2 of the
# 6 cases red (「marker answered nowhere」) -- the sweep reads the table at run
# time. ⚠️ CR-430 §8's own break ④ (表 GA のマーカーの値を 0 にする) cannot go
# red: `S-284` IS ALREADY 0px, and putting it to 40px left all 6 green too.
npx --no-install playwright test \
    tests/system/cr-430-labels-and-hidden-things-sweep.test.ts \
    --reporter=line || failed

echo ""
section "59  every cross-component edge of src/ is in the component figure"
# ⛔ Green on arrival, with no baseline: MEASURED 2026-09-21, 127 cross-component
# edges over 193 import sites, read from 302 of 302 import specifiers, 0 of them
# undeclared -- the 52 the code had grown past the figure were written into
# components.json in the same change, and the figures rebuilt.
# ⭐ It reads the edges with check 19's own reader, so the two can never
# disagree about what an import is; and it holds ONE direction only, because
# CR-378 決定 7 keeps 「図 ⊆ コード」 out of the gate. The 11 declared edges no
# import makes are printed, never gated.
# ⭐ MEASURED by breaking it: adding `import type { Selection }` from
# entity/document-model/selection to src/use-case/undo-edit/undo-edit.ts -- an
# edge table T-061 permits and components.json does not declare -- reports
# exactly 1, while check 19 stays green on the same tree.
PYTHONIOENCODING=utf-8 python "$HERE/check-component-edges.py" || failed

echo ""
section "60  no function of src/ is bigger than the baseline already holds"
# ⛔ The clause is JDG-54, not a line of the specification: the upper limit is
# deliberately not decided before stage 8, so this is a RATCHET -- a function
# already over the band may stay over it, but it may not GROW, and a new one
# may not cross the band unheld. MEASURED 2026-09-21 on c71de89b: 1969
# function(s) in src/**/*.ts, excess-lines=8412 excess-branches=952, 78 held
# over the band.
# ⛔ The first check here that calls `node` (function-size.mjs, rolldown's
# parseAst). `npm run test` already needs node, so this adds no new premise.
# ⭐ MEASURED by breaking it: adding 6 lines and 1 branch to the held
# screenFrameFromRegions reports 2 (the totals rise, and that function's own
# HELD line rises); adding a brand-new 59-line function the baseline does not
# hold reports 2 (the totals rise, and the new function is banded and unheld);
# and SHRINKING that same held function out of the band -- its parameter list
# collapsed onto one line, 55 lines -> 50 -- reports 1, a stale HELD line,
# although the totals FELL (8412 -> 8407). ⚠️ That last one is the case that
# surprises people, and it is deliberate: a HELD line is a claim about one
# named function, so paying the debt means deleting its line in the same
# commit. Without the totals, a rename could fatten a function and pass;
# without the HELD lines, one function could grow by exactly as much as
# another shrank and the totals would not move.
PYTHONIOENCODING=utf-8 python "$HERE/check-function-size.py" || failed

echo ""
section "61  the inner three layers hold no module-scope mutable state"
# ⛔ The clause is SF-7 of 表 T-249 (docs/spec/05-07-design.md:915):
# 「内側の 3 層のモジュールスコープに可変状態を置かない」, with 5.3's prose behind
# it. MEASURED 2026-09-21 on c71de89b: 121 column-0 candidate(s) in 60 file(s)
# of src/entity, src/use-case and src/adapter, 2 flagged after the same-file
# mutation filter -- exactly the two DFC-583 records, both held.
# ⚠️ Lexical, not AST: mutation through an alias, and mutation from another
# file, are invisible to it. Its COVERAGE line prints that on every run.
# ⭐ MEASURED by breaking it: `let syntheticUndoCounter = 0` at column 0 of
# src/use-case/undo-edit/undo-edit.ts reports 1, and
# `const SYNTHETIC_SEEN = new Set<string>()` with one `.add(` in
# src/entity/document-model/screen-state/screen-state.ts reports 1 -- the
# const is flagged only because the same file mutates it, which is what lets
# a ReadonlyMap nobody writes stay green. Without this gate a third module
# state could be added in silence while DFC-583's two wait on CR-379.
PYTHONIOENCODING=utf-8 python "$HERE/check-module-state.py" || failed

echo ""
section "62  an in-flight change request's identifier reservation still holds"
# ⛔ The rule is docs/development-rules/02-changing-the-spec.md section 2.5:
# an identifier a change request says it will CREATE must be free when the
# change request is APPLIED, not merely when it was drafted, and the count or
# maximum cited as the evidence must be re-measured immediately before.
# ⚠️ MEASURED 2026-09-21, the failure it exists for: two sessions drafted a
# change request at the same moment, both read the tree, both concluded the
# largest table number was T-274, and both proposed T-275. One landed.
# ⛔ SCOPED TO WHAT IS IN FLIGHT -- git status's untracked and modified, the
# same reader tools/precheck.py uses. A LANDED change request must not be
# faulted: its identifiers are in the tree because it landed. MEASURED with
# `--all` (the scoping off) on 332 change requests: 66 fault(s) in 22 of
# them, every one a claim that was true on the day it was written. That is
# the number the scoping is buying.
# ⛔ IT NEVER READS section 5's 数の予測 (`rows=` / `tables=` / `uids=`).
# Those are frozen history -- rule 02 section 2 holds them against the
# measurement of their OWN round -- and a check that compared them with today
# would fault the whole folder.
# ⚠️ So on a clean tree it passes having read nothing, the shape of check 41.
# ⭐ MEASURED by breaking it: a throwaway in-flight change request claiming
# 「木が使う表の最大は `T-274`」 and 「`T-275` は空いている」 reports 2; one
# claiming 「接頭辞 `GP` は空いている」 beside 「登録簿 158 件」 reports 2 (the
# name and the count are separate claims); and one naming only `T-276`,
# `FR-112` and the prefix `UD` with the registry at 159 reads 5 claims and is
# green.
PYTHONIOENCODING=utf-8 python "$HERE/check-identifier-reservation.py" || failed

echo ""
section "63  the SM- / EV- / TN- prefixes, followed by a number, are gone"
# ⛔ JDG-286 (2026-09-21): the state-machine manuscript names its machines,
# states, events and transitions instead of numbering them. The same form as
# check 51: the exclusions -- the change requests whose appendices ARE the
# history of the numbered rows -- are named one at a time and printed.
# ⭐ MEASURED by breaking it: a see line naming the old number of the first
# palette transition, put back into screen-values.ts, reports 1.
PYTHONIOENCODING=utf-8 python "$HERE/check-sm-ev-tn-prefix-gone.py" "$REPO" || failed

echo ""
section "64  a function tagged pure / semi-pure-a does what its tag says"
# ⛔ CR-573 section 5 (JDG-635 / JDG-636): table UO's row UO-1 excuses a pure
# function from a unit test, so the tag has to be true. MEASURED 2026-09-26 on
# the CR-573 working tree: 1392 tagged functions, 1 lies -- builtMerge
# (src/use-case/import-document/import-document.ts) calls its own nested
# non-pure nextUid. The first run's count seeded the baseline.
# ⭐ MEASURED by breaking it on a scratch copy (--root): `void Date.now();
# void window.innerWidth; void globalThis.document` in the pure
# clampedSettings, a call to the non-pure applyDocumentChange from the pure
# isUndoable, and `void (async () => { await 0 })()` in the pure
# columnsOutsideHistory each reported, 1 -> 4.
PYTHONIOENCODING=utf-8 python "$HERE/check-purity-honesty.py" || failed

echo ""
section "65  an exported function no omission row covers has a unit test"
# ⛔ CR-573 section 5: table UO of rule 04 falls towards writing, and this is
# the count of what falls through it. MEASURED 2026-09-26 on the CR-573
# working tree: 496 exported functions, 39 with no row and no tests/unit
# import, all under src/framework; UO-4 unmeasured (no coverage file).
# ⭐ MEASURED by breaking it on a scratch copy: deleting the writeClipboard
# import from tests/unit/uf-45-46.test.ts and putting `@external-contract` on
# the untested pure `serial` reported 39 -> 41; a coverage file taking every
# branch of writeClipboard took it back to 40.
PYTHONIOENCODING=utf-8 python "$HERE/check-unit-test-or-omission.py" || failed

echo ""
section "66  the performance gate still gates, and per-frame landings wait to be measured"
# ⛔ CR-573 sections 5 and 6, JDG-605 / JDG-643: the gate is one line of
# playwright.config.ts and could be deleted or bypassed in silence. Held at 0.
# ⭐ MEASURED by breaking it: dropping nfr-002 from PERFORMANCE_GATES reports
# 1; `testIgnore: []` reports 1; `--since 0cddb2ac^` (before the rule began)
# reports the 8 landings of CR-565 / CR-568 / CR-570 that touched per-frame
# paths, and one CR-568 row in perf-pending.md takes that to 5.
PYTHONIOENCODING=utf-8 python "$HERE/check-perf-gate.py" || failed

echo ""
section "76  the handoff holds state; last round's lessons went down into the rules"
# ⛔ Rule 05 section 1. MEASURED 2026-09-26 on 0ad572f6: 15 -- 8 lesson lines
# outside the newest section and 7 headings of lessons "not yet lowered",
# the oldest from 2026-09-14. The P1 chip of the process-first round lowered
# them into docs/development-rules/ and cut the handoff from 1,088 lines to
# about 150. ⭐ --self-test keeps an old lesson and a waiting heading in an
# in-memory handoff and is red unless it reports both.
PYTHONIOENCODING=utf-8 python "$HERE/check-handoff-holds-state.py" --self-test || failed
PYTHONIOENCODING=utf-8 python "$HERE/check-handoff-holds-state.py" || failed

echo ""
section "77  a rule names only files, npm scripts and checks that exist"
# ⛔ The rules' README section 2: a rule that points at nothing teaches the
# reader to stop reading the rules. MEASURED 2026-09-26 on 0ad572f6: 5 names
# in 3 files -- check 26 cited for the job of check 0 (README, 07), rule 03's
# `review-standards.md`, and 07's `development-mode.md` of the framework it
# was imported from. ⭐ --self-test feeds a rule with a dead path, a dead npm
# script and a dead check number and is red unless it reports all three.
PYTHONIOENCODING=utf-8 python "$HERE/check-rules-name-real-things.py" --self-test || failed
PYTHONIOENCODING=utf-8 python "$HERE/check-rules-name-real-things.py" || failed

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
