# -*- coding: utf-8 -*-
"""Check 37 -- a table's row and the display word carried for it were read
together, and neither has moved since without the other being re-read.

WHY THIS EXISTS -- ledger row D-145. `tests/contract/
t-233-reason-words-tell-the-row.contract.test.ts` built exactly this latch for
table T-233 alone, after ledger row D-166: the 場面 of `RS-30` was rewritten,
the dictionary word for it was not, and a person who pressed a spent `IC-90`
was told the row was already folded when the row it named was NOT folded.
⛔ EVERY MACHINE CHECK STAYED GREEN, because every one of them asks whether a
word REACHED the screen and never whether it still says what its row says.

`docs/spec/_source/display-words.json` holds 21 top-level sections. Counted at
the keyboard while this check was written (2026-09-05, not copied from any
ledger row):

    13 sections carry a `rowId` field naming a row of some other table
        (icons, properties, settings, notices, reasons, questions,
        exportFormats, arms, pressOrder, selecting, grabAreas, shortcuts,
        assignments)
     1 section (`paletteGroups`) carries a `firstRow` field that ALSO names a
        row (of the icons table), but names where a palette GROUP begins, not
        what one row's word says -- a different relationship, left alone
     7 sections are keyed by their own constant (`answer`, `mark`, `state`,
        `use`, `weekday`, or a bare `name`) and name no table row at all
        (surfaces, confirmation, noticeDismiss, confirmationMarks, fileStatus,
        defaultNames, weekdays)

Of the 13 with a `rowId`, `reasons` is table T-233 -- already guarded by the
precedent test above -- so this check covers the other 12: 323 dictionary
entries in all (87 + 19 + 116 + 10 + 7 + 5 + 6 + 6 + 10 + 20 + 23 + 14, each
number the length of one section below). Every one of the 12 tables named in
GROUPS below was found in docs/spec/ while this check was written; none was
missing.

WHY PYTHON AND NOT ANOTHER `.test.ts` BESIDE THE PRECEDENT. The precedent runs
under `npm run test` (vitest). This worktree has no `node_modules` -- `npm`
and `npx` do not run here -- so a TypeScript file written now could be typed
and reviewed but never actually executed and shown green, which is the exact
"a rule in the specification but not in a check gets skipped eventually"
failure docs/development-rules/05-working-method.md section 2 measured
(7 of 75 followed). Every other numbered check in this skill is a Python
script wired into check.sh for the same reason -- it can be run standalone
with the interpreter this worktree actually has. This one follows suit rather
than inventing a second convention.

WHAT "READ TOGETHER" MEANS HERE, GENERALISED. The precedent pairs one column
(場面) with the dictionary's word fields, because every row of T-233 has a
場面 column. The twelve tables below do NOT share a column name -- 何の入口か,
規則, 動作, 掴み領域, 場面, 日本語, 事項, 構え, 条件, 操作 -- so this check
widens the shape instead of picking one column per table: the fingerprint is
taken over the WHOLE ROW (every cell but 行 ID) and the WHOLE DICTIONARY ENTRY
(every field but rowId), the same move `fingerprintOf` in the precedent makes
joining five named fields, done here over however many a row or an entry has.
⭐ This is a strict widening and never a narrowing -- any cell of the row
changing, or any field of the entry changing, moves the fingerprint, so it
catches everything a single hand-picked column would and generally more.

⚠️ NOT A CLAIM THAT THE WORDS ARE TRUE -- exactly as the precedent's own
header says of itself (see its lines under "WHAT docs/spec DOES AND DOES NOT
SAY"). While this check was being written (2026-09-05) every one of the 12
groups was printed row by row beside its table's cells and read; none showed
a D-166-shaped contradiction (a full sample is in the commit that added this
file). Recording that reading as a fingerprint does not certify the 323 pairs
correct forever -- it only means a LATER change to either side is forced back
through a person instead of sliding past silently, which is the whole of what
D-166 asks for.

⛔ ZERO KNOWN CONTRADICTIONS, NOT A DEBT BASELINE. Unlike
decided-spec-baseline.txt or stale-blocked-baseline.txt (a COUNT of known,
tolerated debt that may only fall), the file this check reads
(dictionary-table-pairing.txt) is a SNAPSHOT of every pairing's fingerprint --
closer to a lockfile than a debt ledger. A row is not "debt" for appearing in
it; the file is how this check knows what "unchanged" means. A genuine
contradiction found later is fixed at the source (the manuscript) and the
line here is regenerated in the same commit, per the precedent's own rule:
"read these together and correct the words if they no longer tell the scene,
THEN record the new fingerprint."

    python .claude/skills/spec-graph-check/check-dictionary-table-covariance.py
    python .claude/skills/spec-graph-check/check-dictionary-table-covariance.py --write-baseline

Run with PYTHONIOENCODING=utf-8.
"""
import hashlib
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SPEC = os.path.join(ROOT, 'docs', 'spec')
MANUSCRIPT = os.path.join(SPEC, '_source', 'display-words.json')
BASELINE = os.path.join(HERE, 'dictionary-table-pairing.txt')
REL_MANUSCRIPT = 'docs/spec/_source/display-words.json'
REL_BASELINE = '.claude/skills/spec-graph-check/dictionary-table-pairing.txt'

# ---------------------------------------------------------------------------
# Reading a numbered table -- the same rule tests/contract/spec-table.ts reads
# by (Chapter 1.9 :274/:275), re-implemented here in Python because this
# worktree cannot run the TypeScript. Kept faithful to that file on purpose:
#
#   * the same FILES list and order, so a table that moves between files (as
#     T-016 did under CR-278) is still found
#   * the caption is matched as an EXACT prefix "**表 <id> —" (space, then the
#     em dash U+2014, then a space) -- not merely "starts with the id" --
#     because a table id also appears inside ordinary prose that talks ABOUT
#     the table (e.g. "**表 T-036 の `SK-11`（保存する）は…") and that prose is
#     not the caption. A looser match was tried first while writing this
#     check and it matched that exact sentence as if it were table T-036's
#     heading.
#   * the heading row is the first `|` row whose first cell is literally
#     「行 ID」, never assumed to be the first `|` row under the caption
#   * a data row is one whose first cell matches `[A-Za-z]{1,4}-\d+[a-z]?`
# ---------------------------------------------------------------------------

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

ROW_ID_HEADING = u'行 ID'
CAPTION_MARK = u'**表 '
ROW_ID_RE = re.compile(r'^[A-Za-z]{1,4}-\d+[a-z]?$')


def _cells(line):
    line = line.strip()
    if line.startswith('|'):
        line = line[1:]
    if line.endswith('|'):
        line = line[:-1]
    return [c.strip() for c in line.split('|')]


def _is_separator(line):
    return re.match(r'^\|[\s:|-]+\|$', line.strip()) is not None


def spec_table(table_id):
    """Returns (file, {row_id: {heading: cell, ...}}) for a numbered table, or
    (None, None) if no file under docs/spec/ holds it."""
    caption_prefix = u'%s%s —' % (CAPTION_MARK, table_id)
    for rel in FILES:
        path = os.path.join(SPEC, rel)
        if not os.path.exists(path):
            continue
        with io.open(path, encoding='utf-8') as handle:
            lines = handle.read().split('\n')
        at = None
        for i, line in enumerate(lines):
            if line.startswith(caption_prefix):
                at = i
                break
        if at is None:
            continue
        headings = []
        rows = {}
        for line in lines[at + 1:]:
            if line.startswith(CAPTION_MARK) or line.startswith('#'):
                break
            if not line.strip().startswith('|'):
                continue
            if _is_separator(line):
                continue
            row = _cells(line)
            if not headings:
                if row[0] == ROW_ID_HEADING:
                    headings = row
                continue
            if len(row) != len(headings):
                continue
            first = row[0]
            if not ROW_ID_RE.match(first):
                continue
            rows[first] = dict(zip(headings, row))
        if headings:
            return rel, rows
    return None, None


# ---------------------------------------------------------------------------
# The twelve groups -- every section of display-words.json keyed by `rowId`
# other than `reasons` (table T-233, already guarded by the precedent test).
# The table id is what this check trusts; spec_table() finds it wherever in
# docs/spec/ it currently lives, the same way the precedent trusts only a
# table's ID and not its file.
# ---------------------------------------------------------------------------

GROUPS = (
    ('icons', 'T-109'),
    ('properties', 'T-016'),
    ('settings', 'T-104'),
    ('notices', 'T-037'),
    ('questions', 'T-234'),
    ('exportFormats', 'T-024'),
    ('arms', 'T-023b'),
    ('pressOrder', 'T-023a'),
    ('selecting', 'T-023c'),
    ('grabAreas', 'T-023d'),
    ('shortcuts', 'T-036'),
    ('assignments', 'T-023'),
)

# `reasons` / T-233 is deliberately absent -- see the module docstring.
ALREADY_GUARDED = ('reasons',)


def dictionary_groups():
    with io.open(MANUSCRIPT, encoding='utf-8') as handle:
        return json.load(handle)


def fingerprint(table_row, dict_entry):
    """sha256, first 16 hex characters, of the table row and the dictionary
    entry read together -- every cell but 行 ID, every field but rowId, each
    serialised through a canonical (sorted-key) JSON encoding so the shape of
    either side (however many fields it has) is caught without this check
    naming a single column or field by hand."""
    payload = json.dumps(
        {'table': table_row, 'word': dict_entry},
        ensure_ascii=False, sort_keys=True, separators=(',', ':'),
    )
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()[:16]


def entry_without_row_id(entry):
    return {k: v for k, v in entry.items() if k != 'rowId'}


def row_without_row_id_heading(row):
    return {k: v for k, v in row.items() if k != ROW_ID_HEADING}


def load_baseline():
    if not os.path.exists(BASELINE):
        return None
    pairs = {}
    with io.open(BASELINE, encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            key, _, fp = line.rpartition(' ')
            if key and fp:
                pairs[key] = fp
    return pairs


def write_baseline(pairs):
    lines = [
        u'# Every (table, row) this check pairs with a display-words.json entry,',
        u'# and the fingerprint of the two read together. NOT a debt count -- see',
        u'# the header of check-dictionary-table-covariance.py for what this file',
        u'# is and is not, and how to regenerate one line after a deliberate re-read.',
        u'#',
        u'# Regenerate the WHOLE file only after reading every row it touches; to',
        u'# update a single row by hand, replace only its line -- do not paste in a',
        u'# fingerprint you have not read the pair for.',
        u'',
    ]
    for key in sorted(pairs):
        lines.append(u'%s %s' % (key, pairs[key]))
    with io.open(BASELINE, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(u'\n'.join(lines) + u'\n')


def main():
    write_mode = '--write-baseline' in sys.argv[1:]

    if not os.path.exists(MANUSCRIPT):
        print('PROBLEM  %s is missing' % REL_MANUSCRIPT)
        return 1

    data = dictionary_groups()
    problems = []
    current = {}
    table_found = []
    table_missing = []

    for group, table_id in GROUPS:
        entries = data.get(group)
        if not isinstance(entries, list):
            problems.append(
                '%s: display-words.json holds no %r section any more -- '
                'remove it from GROUPS in this check' % (REL_MANUSCRIPT, group))
            continue
        table_file, rows = spec_table(table_id)
        if rows is None:
            table_missing.append((group, table_id))
            problems.append(
                'no table %s under docs/spec/ for the %r section -- every row '
                'ID it carries names a row of no table' % (table_id, group))
            continue
        table_found.append((group, table_id, table_file))

        for entry in entries:
            row_id = entry['rowId']
            key = '%s %s' % (table_id, row_id)
            table_row = rows.get(row_id)
            if table_row is None:
                problems.append(
                    '%s: %r holds %s, which table %s has no row for' %
                    (REL_MANUSCRIPT, group, row_id, table_id))
                continue
            current[key] = fingerprint(
                row_without_row_id_heading(table_row), entry_without_row_id(entry))

    if write_mode:
        write_baseline(current)
        print('WROTE    %s: %d pairing(s) across %d group(s)' %
              (REL_BASELINE, len(current), len(GROUPS)))
        return 0

    baseline = load_baseline()
    if baseline is None:
        print('NOTE     %s does not exist yet; run with --write-baseline once '
              'every pairing below has been read' % REL_BASELINE)
        return 0

    moved = []
    for key in sorted(current):
        if key not in baseline:
            moved.append('%s: new pairing, not yet recorded in %s -- read the '
                          'table row and the dictionary entry together, then '
                          'run --write-baseline' % (key, REL_BASELINE))
        elif current[key] != baseline[key]:
            moved.append('%s: fingerprint changed (%s -> %s) -- the table row '
                          'or the dictionary entry moved. Read them together, '
                          'correct the word if it no longer says what the row '
                          'says, THEN run --write-baseline' %
                          (key, baseline[key], current[key]))
    retired = sorted(set(baseline) - set(current))
    for key in retired:
        moved.append('%s: recorded in %s but no longer paired -- the row left '
                      'its table or its dictionary entry, and the stale line '
                      'was not removed' % (key, REL_BASELINE))

    if problems or moved:
        for p in problems:
            print('PROBLEM  %s' % p)
        for m in moved:
            print('FAIL     %s' % m)
        return 1

    print('OK       %d group(s), %d table(s) found, %d pairing(s) unchanged '
          'since they were last read together' %
          (len(GROUPS), len(table_found), len(current)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
