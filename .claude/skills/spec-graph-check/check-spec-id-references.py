# -*- coding: utf-8 -*-
"""Check 44 -- a specification ID cited from src/ or tests/ that the
specification retired, or that it never defined at all.

⛔⛔ WHY THIS EXISTS, AND WHY IT IS THE FIRST OF ITS KIND. Every one of the
forty checks this script joins reads `docs/` and nothing else. They ask whether
the specification agrees with ITSELF -- undefined table references, duplicate
row ids, prose counts drifted from the rows they count, generated artifacts out
of step with their source. ⛔ NOT ONE OF THEM OPENS A FILE UNDER `src/` OR
`tests/`. So when a row leaves the manuscript, the withdrawal is checked into
the manuscript and the code that names the row is never looked at again: the
comment above the function goes on explaining behaviour by a row number that
means nothing, and the test beside it goes on printing green while quoting a
seat that was burnt months ago. Measured 2026-09-11, the day this file was
written: 328 places under `src/` and `tests/` named one of the IDs the
specification has retired on purpose, over 24 distinct retired IDs, and 117
more name an ID that resolves nowhere at all.

⚠️ THE NUMBERS IN THE PARAGRAPH ABOVE ARE OF 2026-09-11 BEFORE THE ROUND, AND
THE ROUND MOVED THEM. They are kept as the measurement that motivated this
check, not as a description of today. Re-measured after the cleanup's own
repairs and after seven deliberate retirements were booked into the set:
the set holds 61 IDs, and the live references are 145 over 23 distinct
retired IDs plus 18 over 8 IDs the manuscript never defined. ⭐ Run the check
for today's numbers rather than reading them here -- a count written into
prose is a claim, and this is the file that exists because such claims
rot.

⭐⭐ WHY BACKTICKS ARE NOT REQUIRED, WHICH IS THE WHOLE POINT. `specindex.py`'s
`REF_TOKEN` is `` `([A-Z]{1,3}-[0-9]+[a-z]?)` `` -- a reference only counts when
the manuscript wrapped it in a code span, which is the manuscript's own house
style. Code is not written that way. Measured 2026-09-11 over the 445 hits this
check makes: 263 of them (59.1%) sit OUTSIDE any code span -- `// IC-69 and
IC-70 stood here until 2026-09-02`, `Unit under test: UF-72 of table T-075`,
`[data-icon="IC-69"]` inside a selector string. A backtick-only rule would see
182 of the 445 and call the rest clean. ⇒ This check matches the bare token.

WHAT IS SCANNED. Every `.ts`, `.tsx`, `.js` and `.mjs` file under `src/` and
`tests/`, `node_modules` skipped. Measured 2026-09-11: 295 files, all of them
`.ts`; the other three extensions are named so that a later `.tsx` component or
a `.mjs` tool cannot slip in unread.

⚠️ NO PART OF THE FILE IS EXEMPT, and that is deliberate in three directions
this check was tempted to narrow and did not:
  - A token inside a STRING LITERAL counts. `[data-icon="IC-69"]` is a live
    selector against a retired icon row; hiding it would hide the one class of
    reference that can silently stop matching anything.
  - A token inside a COMMENT counts. A comment is where a row number does its
    work in this tree, and a wrong one is worse in a test than in `src/`: the
    assertion beside it goes on passing, so nothing ever contradicts the words.
  - A token inside a `code span` counts, alongside the bare ones.

HOW "THE SPECIFICATION DEFINES IT" IS DECIDED. `specindex.build()` parses the
manuscript once and is reused rather than re-implemented; its rows, UIDs and
table numbers are taken whole (2,124 IDs measured 2026-09-11: 1,825 rows, 150
UIDs, 138 tables). ⭐ FIGURES ARE ADDED HERE, and they are the one thing
`specindex` does not collect: a `**図 F-019 —` heading defines `F-019` exactly
as `**表 T-019 —` defines a table, and without them `F-019` alone accounted for
111 references that resolve perfectly well. Check 15 of `md-checks.py` reads
figure headings with the same pattern.

⭐ WHERE THE RETIRED LIST IS READ FROM: `retired.py`, imported like any other
module. It was not always so, and the history is why this paragraph is long.
Until 2026-09-11 there were TWO `RETIRED` sets in this directory and they
disagreed -- `md-checks.py` held the current one, `specindex.py` an eight-entry
subset frozen since 2026-08-25 -- so this check could neither import the short
one nor copy the long one without making a THIRD, which is the thing the
disagreement was made of. It lifted the literal out of `md-checks.py` with
`ast.literal_eval` instead, because `md-checks.py` runs checks 5 through 15 at
module level and importing it to reach one set would have executed and printed
every one of them. ⭐ THE SET NOW LIVES ALONE IN `retired.py`, which holds data
and runs nothing, so the parsing workaround has no reason left and a plain
import replaced it. ⛔ DO NOT RESTATE THE SET HERE, in any form -- a copy is
what the 29-day divergence was made of, and `retired.py`'s own docstring
records what that cost. A missing or unparseable `retired.py` now raises at
import instead of being diagnosed at run time; a traceback naming the file
says more than the sentence that used to be printed.

HOW "RESOLVES NOWHERE" IS DECIDED, AND THE TWO NARROWINGS THAT WERE TAKEN. A
token is faulted as undefined only when BOTH of these hold, and each one exists
because without it the count drowns:

  1. ⚠️ ITS PREFIX IS ONE THE SPECIFICATION USES. The prefix set is derived,
     not listed: every prefix appearing in a defined or a retired ID. Without
     it `UTF-8`, `SHA-256` and `ISO-8601` are ID-shaped and would be faulted.
     ⛔ WHAT THIS HIDES, MEASURED 2026-09-11: 855 occurrences over the prefixes
     ADR, B, CR, FNV, ISO, PRJ, RE, SHA, UTC and UTF. `CR-nnn` is the bulk of
     it and is a change-request number, which resolves to `change-request/`.
  2. ⚠️ IT IS NOT DEFINED BY ONE OF THE THREE REGISTRIES OUTSIDE THE
     MANUSCRIPT that code legitimately cites: a `DFC-nnn` or `PND-nnn` row of the
     ledgers under `docs/development-records/` (read as the first cell of a
     markdown table row, the same way `check-stale-blocked.py` reads a row),
     and a `CR-nnn` from a filename under `change-request/`. ⛔ THE ACCEPTANCE
     IS DELIBERATELY NARROW -- first table cell and filename only, never bold
     prose. An earlier draft accepted any ID appearing in a heading or in
     `**bold**` anywhere under `docs/` or `change-request/`, and it swallowed
     `IC-69` whole: CR-327 withdrew that icon row on 2026-09-02 and the change
     request naturally names it in bold, so the 13 live references to a row
     that no longer exists read as resolved. ⇒ A registry may only vouch for an
     ID it DEFINES, never for one it merely discusses.

⛔ WHAT THIS CHECK DOES NOT CLAIM.
  - NOT that the reference is wrong to exist. A comment saying 「IC-69 stood
    here until 2026-09-02」 is a true historical record and a good one to keep;
    it is still counted, because a mechanical rule cannot tell a dated record
    from a live claim, and the honest ones sit inside the baseline rather than
    being specially exempted -- the same bargain check 31 strikes.
  - NOT that the code is wrong where the ID is right. Nothing here reads what
    the row SAYS or whether the code obeys it.
  - NOT that every hit is a spec reference at all. Three false-positive classes
    were found by eye on 2026-09-11 and kept on purpose, because narrowing to
    remove them would have hidden real hits:
      * an English possessive written without its apostrophe -- `FR-085s`,
        `HF-17s`, `NT-1s`, `IV-10s` and five more, 17 occurrences. Dropping the
        optional trailing letter from the token pattern would take the count
        from 445 to 424, and would also stop matching the manuscript's own
        suffixed rows (`T-005a`, `PTD-4a`, `SK-11a`).
      * fixture data shaped like an ID -- `projectId: 'P-001'` in
        `tests/unit/uf-41-42.test.ts`, 10 occurrences.
      * a prose example of a prefix that must NOT match -- `FR-04`, `HF-120`
        and `UF-6n`, each written in a comment explaining why a lookup is
        anchored, 3 occurrences.

⛔⛔ THE COUNT IS PER OCCURRENCE, NOT PER LINE. Two retired IDs on one comment
line are two references to repair, and a repair that fixes one of them must
show as progress. Measured 2026-09-11: 445 occurrences over 405 distinct lines,
so the two units differ by 40 and either would have been defensible -- the
occurrence is the unit that cannot hide a half-finished line.

⚠️ WHAT A DIFFERENT RESOLUTION RULE WOULD HAVE COUNTED, so the number above can
be read against something. If nothing but the manuscript could resolve a token
-- no ledger, no change request, prefix gate still on -- the count is 2,790,
almost all of it `DFC-nnn` and `PND-nnn` references to the defect ledger, which
resolve perfectly well and are not this check's business.

⭐ THE BASELINE IS A RATCHET, in the shape `must-clause-coverage-baseline.txt`
and `stale-blocked-baseline.txt` already use: line 1 is the number, everything
after it is commentary. The count rising above the number FAILS the round --
new code may not be written against a burnt seat. The count falling prints OK
and invites lowering the number so the ground cannot be given back.

    python .claude/skills/spec-graph-check/check-spec-id-references.py

Exit 0 green, 1 red.
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import specindex                                              # noqa: E402
from retired import RETIRED                                   # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
BASELINE = os.path.join(HERE, 'spec-id-references-baseline.txt')
REL_BASELINE = '.claude/skills/spec-graph-check/spec-id-references-baseline.txt'

CODE_ROOTS = ('src', 'tests')
CODE_EXTS = ('.ts', '.tsx', '.js', '.mjs')
SKIP_DIRS = ('node_modules',)

RECORDS = os.path.join(ROOT, 'docs', 'development-records')
CHANGE_REQUESTS = os.path.join(ROOT, 'change-request')

# The manuscript's own row-ID grammar, borrowed verbatim from specindex.ROW_ID
# so the two cannot drift into disagreeing about what an ID looks like.
ID_BODY = r'[A-Z]{1,3}-[0-9]+[a-z]?'
ID_EXACT = re.compile(r'^' + ID_BODY + r'$')

# ⛔ NO BACKTICKS IN THIS PATTERN, and the module docstring says at length why.
ID_TOKEN = re.compile(r'\b(' + ID_BODY + r')\b')

# Figures, which specindex does not collect. Same shape as its TABLE_HEAD.
FIGURE_HEAD = re.compile(r'^\*\*図 (F-[0-9]+[a-z]?) —')

CR_FILENAME = re.compile(r'^(' + ID_BODY + r')-')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def load_defined():
    """Every ID the manuscript defines: specindex's rows, UIDs and tables,
    plus the figure numbers specindex has no reader for."""
    index = specindex.build(ROOT)
    defined = set(index.all_rows) | set(index.uids) | set(index.all_tables)
    for lines in index.lines.values():
        for line in lines:
            found = FIGURE_HEAD.match(line)
            if found:
                defined.add(found.group(1))
    return defined


def load_elsewhere():
    """IDs owned by the three registries outside the manuscript that code may
    legitimately cite: ledger rows under docs/development-records/ and change
    requests under change-request/.

    ⛔ A DEFINITION, NEVER A MENTION -- the first cell of a markdown table row,
    or the head of a filename. The docstring above records what a looser rule
    swallowed."""
    owned = set()
    if os.path.isdir(RECORDS):
        for name in sorted(os.listdir(RECORDS)):
            if not name.endswith('.md'):
                continue
            path = os.path.join(RECORDS, name)
            try:
                handle = io.open(path, encoding='utf-8', errors='ignore')
            except OSError:
                continue
            with handle:
                for line in handle:
                    stripped = line.strip()
                    if not stripped.startswith('|'):
                        continue
                    first = stripped.strip('|').split('|')[0].strip('`* ')
                    if ID_EXACT.match(first):
                        owned.add(first)
    if os.path.isdir(CHANGE_REQUESTS):
        for name in os.listdir(CHANGE_REQUESTS):
            found = CR_FILENAME.match(name)
            if found:
                owned.add(found.group(1))
    return owned


def code_files():
    """Every file this check reads, as (absolute path, repo-relative path)."""
    for base in CODE_ROOTS:
        top = os.path.join(ROOT, base)
        if not os.path.isdir(top):
            continue
        for dirpath, dirnames, filenames in os.walk(top):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in sorted(filenames):
                if not name.endswith(CODE_EXTS):
                    continue
                path = os.path.join(dirpath, name)
                yield path, os.path.relpath(path, ROOT).replace(os.sep, '/')


def scan(defined, retired, elsewhere):
    """Every faulted reference, as (rel_path, lineno, token, why).

    ⚠️ errors='ignore' on the read: one file under tests/ carries a NUL byte
    (a CSP hash fixture), and a decode failure there would take this check's
    whole count to zero while it printed a traceback about one file."""
    prefixes = {i.split('-')[0] for i in defined | retired}
    resolvable = defined | retired | elsewhere
    hits = []
    for path, rel in code_files():
        try:
            with io.open(path, encoding='utf-8', errors='ignore') as handle:
                text = handle.read()
        except OSError:
            continue
        for lineno, line in enumerate(text.split('\n'), 1):
            for found in ID_TOKEN.finditer(line):
                token = found.group(1)
                # ⛔ AN APOSTROPHE-LESS POSSESSIVE IS NOT A DEAD ID. This
                # project writes 「HM-4s own row」 for 「HM-4's own row」, and the
                # trailing [a-z] that lets T-005a and SK-11a match swallows that
                # `s`. Measured 2026-09-11 by a body reading its own findings:
                # HM-4s, IV-10s and PI-17s were faulted while HM-4, IV-10 and
                # PI-17 are all live rows -- and two of the three sit in a TEST
                # NAME, which a cleanup may not edit, so they could never have
                # been repaired at all.
                # ⭐ THE TRAILING LETTER IS DROPPED ONLY WHEN KEEPING IT
                # RESOLVES TO NOTHING AND DROPPING IT RESOLVES TO SOMETHING.
                # Widening ID_BODY to forbid the suffix outright would stop
                # matching T-005a, PTD-4a and SK-11a, which are real ids.
                if (token not in resolvable and token[-1].isalpha()
                        and token[:-1] in resolvable):
                    continue
                if token in retired:
                    hits.append((rel, lineno, token, 'retired'))
                elif token not in resolvable and token.split('-')[0] in prefixes:
                    hits.append((rel, lineno, token, 'not defined'))
    return hits


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    try:
        with io.open(BASELINE, encoding='utf-8') as handle:
            return int(handle.readline().strip())
    except (OSError, ValueError):
        return None


def main():
    defined = load_defined()
    if not defined:
        say('PROBLEM  specindex found no IDs under docs/spec -- the manuscript '
            'is missing or unreadable, and every reference would read as '
            'undefined')
        return 1

    hits = scan(defined, RETIRED, load_elsewhere())
    count = len(hits)
    n_retired = sum(1 for h in hits if h[3] == 'retired')
    n_undefined = count - n_retired
    held = read_baseline()

    if held is None:
        say('PROBLEM  %s has not been written yet; measured %d reference(s) '
            '(%d retired, %d undefined)'
            % (REL_BASELINE, count, n_retired, n_undefined))
        return 1

    if count > held:
        shown = hits[:12]
        say('FAIL     src/ and tests/: references to a retired or undefined '
            'specification ID went %d -> %d (%d retired, %d undefined). ⛔ New '
            'code may not be written against a burnt seat. ⛔ Repair the '
            'reference; raise the number in %s only to book a withdrawal '
            'deliberately, and say why in the commit.'
            % (held, count, n_retired, n_undefined, REL_BASELINE))
        for rel, lineno, token, why in shown:
            say('         %s:%d  %s (%s)' % (rel, lineno, token, why))
        if count > len(shown):
            say('         … and %d more' % (count - len(shown)))
        return 1

    if count < held:
        say('OK       src/ and tests/: %d reference(s) to a retired or '
            'undefined specification ID -- %d retired, %d undefined (was %d) '
            '-- ⭐ lower the baseline in %s to hold the ground'
            % (count, n_retired, n_undefined, held, REL_BASELINE))
        return 0

    say('OK       src/ and tests/: %d reference(s) to a retired or undefined '
        'specification ID -- %d retired, %d undefined, which is the baseline'
        % (count, n_retired, n_undefined))
    return 0


# ⛔ The success path prints a star and the FAIL path prints Japanese file
# names; a Windows console defaults to cp932 and cannot encode either.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

if __name__ == '__main__':
    sys.exit(main())
