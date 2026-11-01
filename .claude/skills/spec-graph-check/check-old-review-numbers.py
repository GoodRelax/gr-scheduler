# -*- coding: utf-8 -*-
"""Check 91 -- no new reference to a retired item number of rule 07.

WHY THIS EXISTS. Rule 07 (docs/development-rules/07-review-standards.md) was
rebuilt on 2026-10-24 from its master in gr-sw-maker, and its items lost their
numbers: an item is now named by its chapter and its perspective name
("R2 / SRP", not the dotted number it had). The old numbers live on in the specification, the
rules and the code comments, and 07 says not to write them in new text. A rule
that only says so comes back in the next note, so the numbers are stopped
here. CR-852 rewrites the references in the specification; the baseline goes
down as it lands.

WHERE THE NUMBERS COME FROM. The first column of the table in the section of
07 headed by the words for "old number table" -- the script holds no copy of
them. A number counts only when no Latin letter, digit, dot or underscore
stands right before it and no Latin letter, digit or underscore right after
it, so a number is not counted inside a longer one that has a letter or a
digit more. This file spells no old number itself (the self-test writes the
dot as "~"), so it needs no baseline line.

WHAT IS RED. A file in scope whose count is above its line in
old-review-numbers-baseline.txt (a file without a line has baseline 0). A
count BELOW the baseline is printed, not red; run --update to lower the lines.

NOT COUNTED. The old-number table itself (its section of 07 is cut out before
counting), generated build output, frozen copies and third-party references
(EXEMPT). Every other tracked text file counts, the ledgers included: a ledger
row is new text too, and its file's line catches a new row.

WHAT IT DOES NOT SEE. Whether a counted string really means a rule-07 item
(no other "R<digit>.<digit>" names are known in this tree); an item named by
its old number in words.

    python .claude/skills/spec-graph-check/check-old-review-numbers.py [--self-test | --update | --count]
"""
import io
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RULE = 'docs/development-rules/07-review-standards.md'
BASELINE = os.path.join(HERE, 'old-review-numbers-baseline.txt')
TABLE_HEADING = '## \u65e7\u756a\u53f7\u306e\u5bfe\u5fdc\u8868'  # "## old number table"
EXEMPT = (
    'dist/',
    'dist-relay/',
    'docs/reference/',
    'plan/gr-scheduler-plan-previous.json',
    'docs/development-records/history/',
    'docs/development-records/measurements/',
    '.claude/worktrees/',
    'package-lock.json',
)
SUFFIXES = ('.md', '.json', '.py', '.mjs', '.js', '.ts', '.sh', '.txt', '.yml', '.yaml',
            '.bat', '.html', '.css', '.sdoc', '.tsv')
OLD_NUMBER = re.compile(r'^R\d\.\d+[a-z]?$')


def table_section(text):
    """(start, end) character offsets of the old-number section of 07, or None."""
    start = text.find('\n' + TABLE_HEADING)
    if start < 0:
        return None
    end = text.find('\n## ', start + 1)
    return start, len(text) if end < 0 else end


def old_numbers(text):
    """The first column of the old-number table."""
    span = table_section(text)
    if span is None:
        return []
    numbers = []
    for line in text[span[0]:span[1]].splitlines():
        if line.startswith('|'):
            cell = line.strip().strip('|').split('|')[0].strip()
            if OLD_NUMBER.match(cell):
                numbers.append(cell)
    return numbers


def pattern(numbers):
    """One regex for all of them, longest first so a lettered number wins over its stem."""
    alternatives = '|'.join(re.escape(n) for n in sorted(numbers, key=len, reverse=True))
    return re.compile('(?<![A-Za-z0-9_.])(?:' + alternatives + ')(?![A-Za-z0-9_])')


def count(path, text, pat):
    if path == RULE:
        span = table_section(text)
        if span is not None:
            text = text[:span[0]] + text[span[1]:]
    return len(pat.findall(text))


def in_scope(path):
    return not path.startswith(EXEMPT) and path.endswith(SUFFIXES)


def tracked_files():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    return [p for p in out.stdout.splitlines() if in_scope(p)]


def counts(pat):
    found = {}
    for path in tracked_files():
        try:
            with open(os.path.join(ROOT, path), encoding='utf-8') as f:
                n = count(path, f.read(), pat)
        except (OSError, UnicodeDecodeError):
            continue
        if n:
            found[path] = n
    return found


def read_baseline():
    base = {}
    if os.path.exists(BASELINE):
        for line in open(BASELINE, encoding='utf-8'):
            if line.strip() and not line.startswith('#'):
                path, n = line.rstrip('\n').split('\t')
                base[path] = int(n)
    return base


def write_baseline(found):
    with open(BASELINE, 'w', encoding='utf-8', newline='\n') as f:
        f.write('# check 91: old rule-07 item numbers per file (path TAB count). Lower only; see the script.\n')
        for path in sorted(found):
            f.write('%s\t%d\n' % (path, found[path]))


def dotted(text):
    """The self-test's texts with '~' for the dot, so this file holds no old number."""
    return text.replace('~', '.')


def self_test():
    rule = dotted('# 07\n\nR2~2 here\n\n%s\n\n| a | b |\n|---|---|\n| R1~1 | x |\n| R1~10 | y |\n'
                  '| R2~2 | z |\n| R2~2a | w |\n| R2~2c | - |\n\n## next\n\nR1~1\n' % TABLE_HEADING)
    numbers = old_numbers(rule)
    pat = pattern(numbers)
    sample = dotted('R1~1 R1~10 R2~2a R2~2. CR2~2 R2~21 xR1~1 R1~1x (R2~2c) \u898f\u7d04R1~10\u3092')
    ok = (numbers == [dotted(n) for n in ('R1~1', 'R1~10', 'R2~2', 'R2~2a', 'R2~2c')]
          and count('x.md', sample, pat) == 6
          and count(RULE, rule, pat) == 2
          and in_scope('docs/spec/01-04-requirements.md')
          and in_scope('src/entity/x.ts')
          and not in_scope('dist/index.html'))
    print('self-test %s' % ('passed' if ok else 'FAILED'))
    return 0 if ok else 1


def main(argv):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='\n')
    if '--self-test' in argv:
        return self_test()
    with open(os.path.join(ROOT, RULE), encoding='utf-8') as f:
        numbers = old_numbers(f.read())
    if not numbers:
        print('FAIL check 91: no old-number table found in %s' % RULE)
        return 1
    found = counts(pattern(numbers))
    if '--update' in argv:
        base = read_baseline()
        raised = [p for p, n in found.items() if n > base.get(p, 0)]
        if base and raised:
            print('FAIL check 91: --update only lowers; %d file(s) are above their line (%s)'
                  % (len(raised), ', '.join(sorted(raised)[:5])))
            return 1
        write_baseline(found)
        print('baseline written: %d files, %d references' % (len(found), sum(found.values())))
        return 0
    if '--count' in argv:
        for path in sorted(found, key=lambda p: -found[p]):
            print('%6d  %s' % (found[path], path))
        print('%6d  total in %d files' % (sum(found.values()), len(found)))
        return 0
    base = read_baseline()
    red = [(p, n, base.get(p, 0)) for p, n in sorted(found.items()) if n > base.get(p, 0)]
    lower = [(p, found.get(p, 0), n) for p, n in sorted(base.items()) if found.get(p, 0) < n]
    for path, n, b in red:
        print('FAIL check 91: %s has %d old rule-07 item numbers, baseline %d -- name the item by '
              'chapter and perspective (the old-number table at the end of %s)' % (path, n, b, RULE))
    for path, n, b in lower:
        print('note check 91: %s is down to %d from %d; --update lowers the baseline' % (path, n, b))
    if not red:
        print('OK   check 91: no new old rule-07 item numbers (%d in %d files at or under the baseline)'
              % (sum(found.values()), len(found)))
    return 1 if red else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
