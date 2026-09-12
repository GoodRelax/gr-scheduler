# -*- coding: utf-8 -*-
u"""Check 53 -- `D-` and `R-`, followed by a number, name no row any more.

⛔ WHY THIS EXISTS. One spelling numbered THREE unrelated things until
2026-09-13: 表 T-007's five devices and 表 T-008's nine routes in the
specification, the 494 defects and 44 rulings of the ledgers, and the local
tables of twenty-odd review documents. Measured that day, 131 spellings were
defined in more than one document and `D-3` in thirteen of them. The CR split
them -- `DEV-` / `CHN-` for the specification, `DFC-` / `JDG-` for the ledgers
-- and this check is what stops the fourth meaning from being written.

⭐⭐ THE EXCLUSIONS ARE THE POINT, NOT THE COUNT. Three kinds of `D-n` survive
on purpose, and every one of them is NAMED below with its reason, printed on
every green run:

  * the papers of the rename, which quote the spelling they remove;
  * `previous-project-result/` and `dist/`, out of scope and generated;
  * ⭐ the documents that number THEIR OWN rows from 1 under a column headed
    `#` or `ID`, or as `### D-n.` headings, or as 「**規則表 R-n**」 captions.
    The user's ruling of 2026-09-13 left those 309 rows alone -- they are read
    inside one document and collide with nothing a machine resolves.

⛔ AND THAT LAST LIST IS WRITTEN OUT ROW BY ROW RATHER THAN COMPUTED. A rule
like "any document with three or more of them is exempt" would quietly cover
the NEXT document that starts numbering `D-1`, which is exactly what the
ruling asked to stop. Naming the twenty-four series that exist means a new one
turns this check red and has to be argued for.

⚠️ EACH NAMED SERIES CARRIES ITS SIZE, AND THE SIZE IS CHECKED. If a document
grows its series past the highest row recorded here, the check goes red: the
exemption covers the rows that were ruled on, not a licence to add more.

WHAT IT LOOKS FOR. `D-` or `R-` immediately followed by a digit, in either
case, over every file git tracks. ⛔ NOT bare `D` or `R`: single letters stand
in ordinary prose, and a gate on them would fire on sentences that are right.

Usage:
    python check-dr-prefix-gone.py [repo-root]
"""
import io
import os
import re
import subprocess
import sys

PATTERN = re.compile(r'(?<![A-Za-z0-9_-])([DdRr])-([0-9]+)')

TREES = [
    ('previous-project-result/',
     u"a finished project's record, out of scope by the user's ruling of "
     u'2026-09-12 -- the CR renames what is being built, not what is over'),
    ('dist/',
     u'generated. `npx vite build` writes it from src/, so its copies of the '
     u'old spelling go when it is next built'),
]

FILES = [
    ('docs/review/dr-sites.jsonl',
     u'the inventory the rename was aimed by: one line per site, each RECORDING '
     u'the old spelling it replaced'),
    ('docs/review/dr-collision-plan.md',
     u'the plan, whose subject is the collision -- every spelling in it is an '
     u'example of the defect, not a pointer at a row'),
    ('docs/review/handover-2026-09-13.md',
     u"the day's handover, which records what the collision cost"),
    ('.claude/skills/spec-graph-check/quoted-source-baseline.txt',
     u'the baseline note explaining that `D-186` sat at exactly the '
     u'120-character attribution boundary and `DFC-186` needs 122'),
    ('docs/review/pd-sites.jsonl',
     u"CR-371 inventory, which records the test file paths as they stood "
     u"before this rename moved them"),
    ('.claude/skills/spec-graph-check/check-dr-prefix-gone.py',
     u'this check. Its docstring names the spelling it forbids'),
]

# (path, prefix, how many rows, the highest number) -- measured 2026-09-13
SERIES = [
 ('docs/development-records/measurements/2026-09-05-performance.md', 'D', 3, 3),
 ('docs/review/comment-removal-logic.md', 'R', 5, 5),
 ('docs/review/datamodel-findings-2026-08-16.md', 'D', 8, 8),
 ('docs/review/inventory/A01-agent-api-spec.md', 'R', 13, 13),
 ('docs/review/inventory/A02-agent-api-requirements.md', 'D', 18, 18),
 ('docs/review/inventory/A02-agent-api-requirements.md', 'R', 16, 16),
 ('docs/review/inventory/A03-agent-open-items.md', 'R', 21, 21),
 ('docs/review/inventory/A05-user-order.md', 'D', 65, 65),
 ('docs/review/inventory/A05-user-order.md', 'R', 19, 19),
 ('docs/review/inventory/A06-readme-nextsteps.md', 'D', 30, 30),
 ('docs/review/inventory/A06-readme-nextsteps.md', 'R', 6, 6),
 ('docs/review/inventory/A07-security-a11y.md', 'D', 16, 16),
 ('docs/review/inventory/A08-poc-results.md', 'D', 19, 19),
 ('docs/review/inventory/A09-architecture-standard.md', 'D', 9, 9),
 ('docs/review/inventory/A10-mspdi-summaries.md', 'D', 6, 6),
 ('docs/review/inventory/E01-task-plan.md', 'D', 7, 7),
 ('docs/review/inventory/E03-dependency-taskgroup.md', 'D', 4, 4),
 ('docs/review/inventory/E07-visual-origin.md', 'R', 13, 13),
 ('docs/review/inventory/E08-comment-highlight.md', 'D', 3, 3),
 ('docs/review/inventory/E10-carry-roundtrip.md', 'R', 11, 11),
 ('docs/review/inventory/G1-settings-T201.md', 'D', 14, 14),
 ('docs/review/inventory/G5-pin-and-collapse.md', 'R', 7, 7),
 ('docs/review/requirement-gaps-2026-08-12.md', 'D', 12, 12),
 # ⚠️ five appear as table rows; the series itself is D-1 .. D-12, listed
 # in the A / B / C grouping at :41-:43
 ('docs/review/requirement-review-2026-08-13-round2.md', 'D', 12, 12),
]

# (path, a substring of the line, why) -- one line, one reason
SITES = [
 ('.claude/skills/spec-graph-check/list-asserted-claims.py',
  u'were spec rows',
  u"the paragraph recording what the collision was, and what dropping the "
  u"three prefixes whole used to cost"),
 ('.claude/skills/spec-graph-check/list-asserted-claims.py',
  u'in a comment was therefore invisible here',
  u'the same paragraph, second half'),
 ('.claude/skills/spec-graph-check/check-device-route-row-ids.py',
  u'spellings are defined in more than one document',
  u"check 52 record of the collision it was built for"),
 ('.claude/skills/spec-graph-check/check-device-route-row-ids.py',
  u'while the manuscript still says',
  u"check 52 DATED measurement of what it printed before the rename"),
 ('.claude/skills/spec-graph-check/check-device-route-row-ids.py',
  u'AND IT CAUGHT THE AUTHOR FIRST',
  u'the same measurement, and the author error it caught'),
 ('.claude/skills/spec-graph-check/check-device-route-row-ids.py',
  u'inside a `T_008_` fixture',
  u'that author error, quoted twice -- the docstring and the rule beside it'),
 ('change-request/CR-104-task-milestone-column.md',
  u'datamodel-findings-2026-08-16.md',
  u"a citation of ANOTHER document's own numbering, named in the sentence"),
 ('change-request/CR-116-resource-roster.md',
  u'datamodel-findings-2026-08-16.md',
  u"the same shape: it names the document whose row it means"),
 ('change-request/CR-117-autosave-idle-and-presentation-changes.md',
  u'POC-RESULTS-ja.md',
  u"a heading of previous-project-result/, which is out of scope"),
 ('docs/review/inventory/A01-agent-api-spec.md',
  u'A07-security-a11y.md',
  u"a citation of A07's own numbering, with the document named beside it"),
 ('.claude/skills/spec-graph-check/check.sh',
  u'which is what the ruling asked to stop',
  u'the line wiring this check in, explaining what naming the series one by '
  u'one buys'),
 ('.claude/skills/spec-graph-check/check.sh',
  u'the inventory scanned upper case only',
  u'the same comment, recording the 25 test file names this check found on '
  u'its first run'),
 ('docs/development-rules/07-review-standards.md',
  u'の見出しで',
  u'the rule itself, naming the heading shape a review document must not use'),
 ('docs/development-rules/07-review-standards.md',
  u'あり、',
  u'the rule, quoting the measurement that is its reason'),
 ('docs/development-rules/07-review-standards.md',
  u'から振り始める文書',
  u'the rule, naming what turns this check red'),
 ('docs/development-rules/09-tools.md',
  u'check-dr-prefix-gone.py',
  u"the tool inventory's row for this check"),
 ('docs/review/rulings-2026-08-23/RULINGS.md',
  u'案（D-4）',
  u'the proposal document the ruling answered, which is not in the tree'),
]


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def tracked(root):
    out = subprocess.check_output(['git', 'ls-files'], cwd=root)
    return [p for p in out.decode('utf-8').split('\n') if p.strip()]


def main(argv):
    root = argv[1] if len(argv) > 1 else '.'
    files = dict(FILES)
    series = {}
    for path, pref, n, top in SERIES:
        series.setdefault(path, {})[pref] = (n, top)

    hits, overgrown, scanned = [], [], 0
    for rel in tracked(root):
        if any(rel.startswith(t) for t, _ in TREES) or rel in files:
            continue
        try:
            text = io.open(os.path.join(root, rel), 'rb').read().decode('utf-8')
        except (IOError, OSError, UnicodeDecodeError):
            continue
        scanned += 1
        mine = series.get(rel, {})
        for number, line in enumerate(text.split('\n'), 1):
            line = line.rstrip('\r')
            if not PATTERN.search(line):
                continue
            if any(rel == p and needle in line for p, needle, _ in SITES):
                continue
            for match in PATTERN.finditer(line):
                pref = match.group(1).upper()
                if pref in mine:
                    if int(match.group(2)) <= mine[pref][1]:
                        continue
                    overgrown.append((rel, number, match.group(0), mine[pref][1]))
                    continue
                hits.append((rel, number, match.start() + 1, line.strip()))

    if overgrown:
        say(u'FAIL     a document grew its own %s- series past the row the '
            u'ruling covered. ⛔ The exemption is for the rows that were '
            u'ruled on, not a licence to add more.' % overgrown[0][2][0])
        for rel, n, tok, top in overgrown[:20]:
            say(u'         %s:%d  %s, and the recorded series ends at %d'
                % (rel, n, tok, top))
    if hits:
        say(u'FAIL     `D-` or `R-` followed by a number is back: %d site(s) in '
            u'%d file(s). ⛔ The spelling numbered three different things -- '
            u'表 T-007 is `DEV-`, 表 T-008 is `CHN-`, the defects are `DFC-` '
            u'and the rulings `JDG-`. Write whichever one is meant.'
            % (len(hits), len(set(h[0] for h in hits))))
        for rel, n, col, line in hits[:40]:
            say(u'         %s:%d:%d  %s' % (rel, n, col, line[:100]))
        if len(hits) > 40:
            say(u'         ... and %d more' % (len(hits) - 40))
        say(u'         ⭐ If a site QUOTES the old spelling on purpose, add it '
            u'to SITES in this file WITH ITS REASON. ⛔ Never widen TREES or '
            u'FILES to cover it, and never add a document to SERIES to silence '
            u'a citation -- SERIES is for a document numbering its OWN rows.')
    if hits or overgrown:
        return 1

    say(u'OK       `D-` and `R-` name no row anywhere: %d file(s) scanned, '
        u'0 site(s). Excluded and named: %d tree(s), %d file(s), %d local '
        u'series, %d line(s).'
        % (scanned, len(TREES), len(FILES), len(SERIES), len(SITES)))
    for tree, why in TREES:
        say(u'           tree    %-40s %s' % (tree, why))
    for rel, why in FILES:
        say(u'           file    %-40s %s' % (rel.split('/')[-1], why))
    say(u'           series  %d document(s) number their own rows (ruling 3, '
        u'2026-09-13): %d rows in all'
        % (len(set(p for p, _, _, _ in SERIES)), sum(n for _, _, n, _ in SERIES)))
    for path, pref, n, top in SERIES:
        say(u'                   %-52s %s-1 .. %s-%d (%d)'
            % (path.split('/')[-1], pref, pref, top, n))
    for rel, needle, why in SITES:
        say(u'           line    %-40s %s'
            % (rel.split('/')[-1] + u'「' + needle[:14] + u'…」', why))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
