# -*- coding: utf-8 -*-
"""Check 50 -- table T-023a's row ids against the PressRow type's values.

⛔ WHY THIS EXISTS. The press table's rows ARE the values of a TypeScript
type: `export type PressRow = 'PTD-1' | ... | 'PTD-5'` is a hand-written copy of
`表 T-023a` of docs/spec/01-04-requirements.md. Measured 2026-09-13:

    grep -rn PressRow tools/ .claude/  ->  0 hits

Nothing tied the two together. The manuscript could be renamed and the code
would stay green, because these strings never leave the product -- no exchange
format carries them, no Agent API member returns one -- so pressing the
shipped build cannot reveal a drift either. That is the same condition 6-3 of
the cleanup names for a comment: it rots and nobody notices. Here it is a
TYPE that rots.

⭐⭐ AND IT MATTERED. CR-371 abolished the `PD-` prefix, because the
specification's press rows and the ledger's pending decisions both spelled
themselves `PD-n` and meant unrelated things. On 2026-09-12 a classifier read
the specification's rows as closed ledger rows and a body stripped three live
pointers out of item-hit-area.ts before the collision was found. The rename
(表 T-023a -> `PTD-`) had to move the manuscript, the type, the tests and the
generated rosters together, and this check is what made "together" mechanical
rather than remembered.

⛔ IT WAS DELIBERATELY INSTALLED BEFORE THE RENAME, AND GREEN. A check added
afterwards would have let one rename through unmeasured -- the check would
have been born guarding something already broken. ⭐ MEASURED 2026-09-13,
after wave 1 had landed and both sides read `PTD-`: putting ONE member of the
union back to `PD-2` turns this check red and names both halves of the drift
(「in 表 T-023a and NOT in `PressRow`: PTD-2」 / 「in `PressRow` and NOT in
表 T-023a: PD-2」). That is the whole of what it is for, and it is the one
thing a docstring about a check should be able to show.

WHAT IT COMPARES. The first cell of every row of 表 T-023a, against the string
literals of the `PressRow` union in
src/adapter/input-command-translator/input-command-translator.ts. Both sides
are read as SETS: order is the manuscript's business (「上から評価し、最初に
成立した行で確定すること（MUST）」) and is checked by the tests, not here.

⚠️ WHAT IT DOES NOT DO. It does not look at comments, at tests, or at the
generated display-words rosters. Those are caught by check 42/44, by vitest,
and by `npm run gen:check` respectively. This one answers exactly one
question: do the manuscript and the type name the same rows.

Usage:
    python check-press-row-ids.py [repo-root]
"""
import io
import os
import re
import sys

SPEC = os.path.join('docs', 'spec', '01-04-requirements.md')
CODE = os.path.join('src', 'adapter', 'input-command-translator',
                    'input-command-translator.ts')

# The caption that owns the rows. ⛔ Matched on the caption line rather than on
# the row shape: 表 T-023b, T-023c and T-023d sit within a few hundred lines
# and their rows look identical.
CAPTION = re.compile(u'\\*\\*表\\s*T-023a\\s')
# Any following caption ends the block. ⚠️ T-023a carries a SECOND block with
# no row ids at all (generate_display_words.py records the same fact), so the
# walk must stop at the next caption and not at the first blank line.
NEXT_CAPTION = re.compile(u'\\*\\*表\\s*T-')
ROW = re.compile(r'^\|\s*\*{0,2}`?([A-Z]{1,4}-\d+[a-z]?)`?\*{0,2}\s*\|')

TYPE = re.compile(r'export type PressRow\s*=\s*([^\n]+)')
LITERAL = re.compile(r"'([A-Z]{1,4}-\d+[a-z]?)'")


def say(message):
    """⛔ The Windows console is cp932 and this file's messages quote the
    manuscript. Writing a row id raw is safe, but the caption is Japanese --
    same guard the generators use, so a bad manuscript names the row instead
    of dying inside the reporter."""
    try:
        print(message)
    except UnicodeEncodeError:
        sys.stdout.write(message.encode('utf-8', 'replace').decode('cp932', 'replace') + '\n')


def rows_of_table(root):
    path = os.path.join(root, SPEC)
    if not os.path.exists(path):
        return None, '%s is missing' % SPEC
    found = []
    inside = False
    for line in io.open(path, encoding='utf-8'):
        if CAPTION.search(line):
            inside = True
            continue
        if inside and NEXT_CAPTION.search(line):
            break
        if inside:
            m = ROW.match(line.strip())
            if m:
                found.append(m.group(1))
    if not found:
        return None, (u'表 T-023a holds no row this check recognises -- '
                      u'the caption moved, or the row shape changed')
    return found, None


def values_of_type(root):
    path = os.path.join(root, CODE)
    if not os.path.exists(path):
        return None, '%s is missing' % CODE
    m = TYPE.search(io.open(path, encoding='utf-8').read())
    if not m:
        return None, ('`export type PressRow` is not in %s -- it was renamed '
                      'or moved, and this check can no longer find it' % CODE)
    values = LITERAL.findall(m.group(1))
    if not values:
        return None, '`export type PressRow` holds no string literal'
    return values, None


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else '.'

    spec_rows, problem = rows_of_table(root)
    if problem:
        say('PROBLEM  %s' % problem)
        return 1
    code_values, problem = values_of_type(root)
    if problem:
        say('PROBLEM  %s' % problem)
        return 1

    a, b = set(spec_rows), set(code_values)
    if a == b:
        say(u'OK       表 T-023a and `PressRow` name the same %d row(s): %s'
            % (len(a), ' '.join(sorted(a))))
        return 0

    say(u'FAIL     表 T-023a and `PressRow` no longer name the same rows. '
        u'⛔ These two are one decision written twice, and nothing else '
        u'holds them together -- the values never leave the product, so '
        u'pressing the build cannot show the drift.')
    only_spec = sorted(a - b)
    only_code = sorted(b - a)
    if only_spec:
        say(u'         in 表 T-023a and NOT in `PressRow`: %s' % ' '.join(only_spec))
    if only_code:
        say(u'         in `PressRow` and NOT in 表 T-023a: %s' % ' '.join(only_code))
    say(u'         ⇒ Rename BOTH in one pass, with the tests and the '
        u'generated rosters (`npm run gen`). CR-371 carries the order.')
    return 1


sys.exit(main())
