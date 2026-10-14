# -*- coding: utf-8 -*-
u"""Check 80 -- a ruling a change request is ordered to apply is cited by that change request.

THE RULE (JDG-2124). A row of docs/development-records/rulings.md whose state
cell reads `指示 —— CR-n が当てる` (rule 06 section 7: a drafted CR will apply
it) must be named by change-request/CR-n-*.md as soon as that file exists. A
CR that does not cite its ruling either drafted without it, or landed and left
the row reading 指示 forever.

WHY. Check 43 reads the state cell's FORM only. MEASURED 2026-10-15 on
81d363bd: 9 rows read that way; JDG-1492 waited on CR-676, which had been
applied to the specification on 2026-10-04 without citing it, so the row
still said 指示 eleven days later. The pairing was a habit in memory
(ruling-state-for-drafted-cr).

WHAT IT LOOKS FOR. Every such row whose CR file exists, and whose id (with no
digit after it) appears nowhere in that file. A CR number with no file yet is
green -- the draft has not been written.

WHAT IT DOES NOT SEE. A state written another way (`指示 —— CR-n のあいだ`),
and whether the CR applies what the row says rather than only naming it.

Usage:
    python check-drafted-ruling-cited.py [repo-root] [--self-test]

`--self-test` feeds three rows (cited, not cited, CR without a file) against
an in-memory CR set and expects exactly the one uncited row; red otherwise.
"""
import glob
import io
import os
import re
import sys

RULINGS = 'docs/development-records/rulings.md'
ROW = re.compile(r'^\| (JDG-\d+) \|')
ORDERED = re.compile(r'^指示 —— `?CR-(\d+)`?\s*が当てる')


def say(message):
    """The cp932 guard every check in this tree carries."""
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(message.encode(enc, 'replace').decode(enc) + '\n')


def ordered_rows(text):
    """[(ruling id, CR number)] for every row whose state cell orders a CR to apply it."""
    found = []
    for line in text.split('\n'):
        head = ROW.match(line)
        if not head:
            continue
        state = line.rstrip('\r').rstrip().rstrip('|').split(' | ')[-1].strip()
        ordered = ORDERED.match(state)
        if ordered:
            found.append((head.group(1), ordered.group(1)))
    return found


def uncited(rows, cr_texts):
    """[(ruling, CR number)] whose CR file exists and does not name the ruling."""
    misses = []
    for ruling, number in rows:
        text = cr_texts.get(number)
        if text is not None and not re.search(re.escape(ruling) + r'(?!\d)', text):
            misses.append((ruling, number))
    return misses


def cr_texts_of(root):
    texts = {}
    for path in glob.glob(os.path.join(root, 'change-request', '**', 'CR-*.md'), recursive=True):
        number = re.match(r'CR-(\d+)', os.path.basename(path))
        if number:
            with io.open(path, encoding='utf-8', errors='replace') as handle:
                texts[number.group(1)] = texts.get(number.group(1), '') + handle.read()
    return texts


def self_test():
    text = ('| # | 逐語 | 読み | 着地先 | 状態 |\n|---|---|---|---|---|\n'
            '| JDG-1 | a | b | c | 指示 —— `CR-10` が当てる |\n'
            '| JDG-2 | a | b | c | 指示 —— `CR-10` が当てる（予約済み） |\n'
            '| JDG-3 | a | b | c | 指示 —— `CR-11` が当てる |\n'
            '| JDG-4 | a | b | c | 適用済 —— FR-1 |\n')
    misses = uncited(ordered_rows(text), {'10': 'applies JDG-1 and JDG-21'})
    ok = misses == [('JDG-2', '10')]
    say('%s  self-test: %d uncited row(s) (want JDG-2 only): %s'
        % ('OK' if ok else 'FAIL', len(misses), misses))
    return 0 if ok else 1


def main(argv):
    if '--self-test' in argv:
        return self_test()
    root = next((one for one in argv if not one.startswith('--')), os.getcwd())
    with io.open(os.path.join(root, RULINGS), encoding='utf-8') as handle:
        rows = ordered_rows(handle.read())
    texts = cr_texts_of(root)
    misses = uncited(rows, texts)
    for ruling, number in misses:
        say('FAIL  %s reads 指示 —— CR-%s が当てる, and change-request/CR-%s-*.md does not cite it: '
            'cite it in the CR, or set the state the row has reached' % (ruling, number, number))
    waiting = len([1 for _, number in rows if number not in texts])
    say('%s  check 80: %d row(s) order a CR, %d wait for a CR file, %d uncited. Baseline 0'
        % ('OK' if not misses else 'FAIL', len(rows), waiting, len(misses)))
    return 0 if not misses else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
