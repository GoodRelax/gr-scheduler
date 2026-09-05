# -*- coding: utf-8 -*-
"""Check 39 -- how many of the specification's MUST / MUST NOT clauses are
held, verbatim, by some test under tests/.

WHY THIS EXISTS -- ledger row D-254. The person who had just written CR-350
moved seven places in the specification that each carry the literal marker
`（MUST）` or `（MUST NOT）` (FR-038's translation exemption and FR-032's old
"notify what was deleted" MUST among them) and reran `npm test`: zero cases
went red. ⛔ The 33 checks this script joins (35 by the time D-254 was
written; the count has moved since) all ask whether the specification agrees
with ITSELF -- undefined references, duplicate row ids, drifted generated
artifacts. Not one of them asks whether a TEST agrees with the specification.

⭐⭐ THE SAME DAY, A COUNTEREXAMPLE. D-257 moved `S-220` / `S-221` / `S-222` /
`S-102` (FR-020's four generated-constant values) and `S-223` (its ink
colour): four cases in `tests/unit/fr-020-the-four-values-live-in-the-tables-
not-in-src.test.ts` went red, each naming the row it caught. D-260 moved the
`HF-4` wording (the order of the four TaskGroup grab-band icons) and nine
cases in `tests/unit/uf-72-screen-part.test.ts` shifted with it. ⇒ The cover
is not ABSENT -- it is MOTTLED: some clauses are held tight, most are not, and
until this check existed nothing said which was which.

WHAT THIS CHECKS, AND HOW "MUST-BEARING CLAUSE" IS COUNTED. Every occurrence
of the literal marker `（MUST）` or `（MUST NOT）` (half-width `(MUST)` /
`(MUST NOT)` also matched, though the manuscript is not observed to use it) in
the nine files `tests/contract/spec-table.ts` already trusts as "the
specification" for table lookups -- the same FILES tuple `check-dictionary-
table-covariance.py` (check 37) uses, copied rather than imported so this
check has no import-time dependency on that one:

    01-04-requirements.md, 05-07-design.md, 08-10-test.md, A-appendix.md,
    _assets/tbl-glossary.md, _assets/tbl-settings.md,
    _assets/tbl-property-items.md, _assets/fig-erd-detail.md,
    _assets/fig-erd-overview.md

`docs/spec/_source/*.json` and `*.py` are deliberately excluded: those are
generator inputs and code, and several of them (`settings.json`,
`property_items_json_to_md.py`) quote a requirement's MUST wording back at the
reader inside a REMARK field -- counting those would count the same
requirement a second time for merely being cited. This check counts where a
MUST clause is COUNTED FROM, not every place its words are echoed.

⚠️ A LINE IS NOT THE UNIT. This manuscript writes a requirement's whole
STATEMENT -- often several sentences, several MUST/MUST NOT markers -- as one
long physical line, and a markdown table row is one physical line by
construction. Counting lines would either undercount (one line, several
distinct MUST clauses, counted once) or misreport coverage (one line held
because SOME clause on it is tested, when the other nine on the same line are
not -- exactly the "mottled" fact D-254/D-257 are about). So the unit counted
here is the MARKER ITSELF: 1,634 occurrences, measured 2026-09-05. This is a
literal count of the marker text, including any case where the specification
cites its own earlier requirement's MUST wording a second time elsewhere (the
non-marker "上の MUST NOT のとおり" style of reference is NOT counted, since it
carries no `（MUST）` / `（MUST NOT）` text of its own) -- deduplicating two
markers that happen to restate the same rule is a judgement call this
mechanical count does not make.

HOW "HELD" IS DECIDED -- stated plainly, as the ledger asked for. For each
marker, the LAST 120 characters of manuscript text ending at (and including)
the marker's own closing parenthesis are taken as its trailing window. Five
suffix lengths of that window -- 120, 90, 60, 40, 28 characters -- are tried
longest first against a single corpus built by concatenating every file under
tests/ (unit, contract, integration, system alike, each file's text joined
with a NUL separator so a match can never straddle two files). The clause
counts as HELD the moment the longest of those five lengths that is actually
present in the manuscript is ALSO found verbatim, in full, inside that corpus
-- e.g. an 83-character clause is tried at 60 first, and held if that 60-
character tail is quoted somewhere under tests/, however that test frames the
rest of its assertion. Below 28 characters a clause counts as NOT held: eyeballing
every match this check makes at exactly 28 characters (2026-09-05, see the
commit that added this file) turned up specific wording every time --
`⛔ **その行自身を隠してはならない（MUST NOT）`, `` T-206 の `S-213` とすること
（MUST） `` and the like -- never a bare generic ending, so 28 was kept as the
floor rather than raised. ⚠️ This can UNDER-count: a clause whose own
manuscript context is shorter than 28 characters before the marker (rare;
none were found among the samples read) could be held by a test yet measured
as not-held here, because the 28-character floor demands more preceding
context than the clause itself carries. That is the safe direction for a
count that becomes a debt ceiling -- it can call a held clause unheld, never
the reverse, since the match is always checked for real, byte for byte,
against the actual test corpus. ⛔ NOT A CLAIM THAT THE TEST'S ASSERTION IS
CORRECT OR EVEN ABOUT THE RIGHT THING -- as `spec-table.ts`'s own convention
says of itself, only that some file under tests/ carries the clause's own
words, which is the one fact D-254 measured as absent for its seven clauses.

⛔⛔ A DEBT BASELINE, NOT A DEMAND FOR ZERO. 1,634 marked clauses is far more
than any round could write tests for at once (measured 2026-09-05: 470 held,
1,164 not). The number held against `must-clause-coverage-baseline.txt` is the
UNHELD count, in the same shape as `decided-spec-baseline.txt` and
`stale-blocked-baseline.txt`: it may fall freely (a round that adds a
verbatim-holding test for a previously bare clause lowers it and should), and
it may only RISE if someone deliberately raises the baseline and says why --
which happens automatically the moment a new MUST/MUST NOT clause is written
into the manuscript without a test quoting it, exactly as D-254 found for its
seven.

    python .claude/skills/spec-graph-check/check-must-clause-coverage.py

Run with PYTHONIOENCODING=utf-8 (the FAIL/PROBLEM lines below quote manuscript
text, which is Japanese).
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SPEC = os.path.join(ROOT, 'docs', 'spec')
TESTS = os.path.join(ROOT, 'tests')
BASELINE = os.path.join(HERE, 'must-clause-coverage-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/must-clause-coverage-baseline.txt'

# ⭐ The same nine files check-dictionary-table-covariance.py (check 37) reads
# as "the specification" -- copied rather than imported so this check has no
# import-time dependency on that module.
FILES = (
    '01-04-requirements.md',
    '05-07-design.md',
    '08-10-test.md',
    'A-appendix.md',
    os.path.join('_assets', 'tbl-glossary.md'),
    os.path.join('_assets', 'tbl-settings.md'),
    os.path.join('_assets', 'tbl-property-items.md'),
    os.path.join('_assets', 'fig-erd-detail.md'),
    os.path.join('_assets', 'fig-erd-overview.md'),
)

# `（MUST）` / `（MUST NOT）`, full-width parentheses (the manuscript's own
# convention; half-width tolerated too, at no extra cost, in case a future
# edit uses it).
MARKER_RE = re.compile(r'[（(]MUST(?:\s*NOT)?[）)]')

# Suffix lengths tried, longest first; see the module docstring for how these
# were chosen and what they measured against the real corpus on 2026-09-05.
TRY_LENS = (120, 90, 60, 40, 28)


def load_test_corpus():
    """Every file under tests/, concatenated with a NUL separator so a match
    can never straddle two files (source text never contains a raw NUL)."""
    parts = []
    if not os.path.isdir(TESTS):
        return ''
    for dirpath, _dirnames, filenames in os.walk(TESTS):
        for name in sorted(filenames):
            path = os.path.join(dirpath, name)
            try:
                with io.open(path, encoding='utf-8', errors='ignore') as handle:
                    parts.append(handle.read())
            except OSError:
                continue
    return chr(0).join(parts)


def find_markers():
    """Yields (rel_path, clause_window) for every MUST / MUST NOT marker in
    FILES, where clause_window is the up-to-120-character manuscript text
    ending at (and including) the marker's own closing parenthesis."""
    found_any_file = False
    for rel in FILES:
        path = os.path.join(SPEC, rel)
        if not os.path.exists(path):
            continue
        found_any_file = True
        with io.open(path, encoding='utf-8') as handle:
            text = handle.read()
        for m in MARKER_RE.finditer(text):
            window_start = max(0, m.end() - TRY_LENS[0])
            yield rel, text[window_start:m.end()]
    if not found_any_file:
        raise RuntimeError('none of the %d manuscript files were found under %s'
                            % (len(FILES), SPEC))


def held_length(window, corpus):
    """The longest of TRY_LENS actually present in window that is also found
    verbatim in corpus, or 0 if none is."""
    for length in TRY_LENS:
        if len(window) < length:
            continue
        if window[-length:] in corpus:
            return length
    return 0


def main():
    missing = [rel for rel in FILES if not os.path.exists(os.path.join(SPEC, rel))]
    if len(missing) == len(FILES):
        print('PROBLEM  none of the %d manuscript files exist under %s' %
              (len(FILES), SPEC))
        return 1

    corpus = load_test_corpus()
    if not corpus:
        print('PROBLEM  tests/ is missing or empty -- nothing to hold a clause '
              'against')
        return 1

    total = 0
    unheld = 0
    unheld_sample = []
    for rel, window in find_markers():
        total += 1
        if held_length(window, corpus) == 0:
            unheld += 1
            unheld_sample.append('%s: …%s' % (rel, window[-40:]))

    held = total - unheld

    try:
        baseline_text = io.open(BASELINE, encoding='utf-8').read()
        held_baseline = int(baseline_text.split('\n')[0].strip())
    except (OSError, ValueError):
        held_baseline = None

    if held_baseline is None:
        print('NOTE     docs/spec/: %d MUST/MUST-NOT clause(s), %d held '
              'verbatim by some file under tests/, %d not; no baseline held '
              'yet -- see %s' % (total, held, unheld, REL_BASELINE))
        return 0

    if unheld > held_baseline:
        sample = unheld_sample[:12]
        print('FAIL     docs/spec/: clauses with no verbatim tie under '
              'tests/ went %d -> %d. ⛔ A MUST/MUST NOT clause may not be '
              'added or left bare without raising %s deliberately and saying '
              'why in the commit.' % (held_baseline, unheld, REL_BASELINE))
        for line in sample:
            print('         %s' % line)
        if len(unheld_sample) > len(sample):
            print('         … and %d more' % (len(unheld_sample) - len(sample)))
        return 1

    if unheld < held_baseline:
        print('OK       docs/spec/: %d MUST/MUST-NOT clause(s), %d held, %d '
              'not (was %d) -- ⭐ lower the baseline to hold the ground' %
              (total, held, unheld, held_baseline))
        return 0

    print('OK       docs/spec/: %d MUST/MUST-NOT clause(s), %d held verbatim '
          'by some file under tests/, %d not, which is the baseline' %
          (total, held, unheld))
    return 0


if __name__ == '__main__':
    sys.exit(main())
